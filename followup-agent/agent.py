# Follow-up Agent (Google ADK)
#
# Given a pending task's state (reminder_count, due_date, description, owner),
# decides autonomously whether to: send a reminder, escalate, or do nothing —
# and drafts the message text/tone via Gemini.

import asyncio
import datetime
import json
import os

from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from google.genai import types
from pydantic import BaseModel

os.environ.setdefault("GOOGLE_CLOUD_PROJECT", os.environ.get("GCP_PROJECT_ID", ""))
# Vertex AI model location is independent of the infra region (Cloud Functions/Firestore
# stay in GCP_REGION) -- newer Gemini models (e.g. gemini-3.5-flash) are only served from "global".
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", os.environ.get("VERTEX_AI_LOCATION", "global"))
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")

APP_NAME = "followup-agent"
USER_ID = "followup-agent"  # single-tenant service account identity for the ADK session

ESCALATION_THRESHOLD = 2  # reminder_count >= this -> escalate instead of remind

DECISION_INSTRUCTION = """You are a follow-up assistant that autonomously nudges people about pending meeting action items via Telegram.

The input describes today's date and one pending task: its description, owner, due date (or "none"), and how many reminders have already been sent for it.

Decide exactly one action:
- "escalate": the task has already been reminded {escalation_threshold} or more times and is still pending. Shift to a noticeably more urgent tone than a normal reminder.
- "remind": a nudge is warranted now (due date is today, already passed, within the next couple of days, or no due date was given but it's reasonable to check in).
- "skip": no reason to act right now — e.g. reminder_count is 0 and the due date is comfortably far in the future (more than 3 days away).

Then draft a short, natural Telegram message (1-3 sentences) addressed to the owner by name, in the same language as the task description, with a tone matching the action:
- "remind" -> tone "neutral" (first nudge) or "friendly-reminder" (later nudge)
- "escalate" -> tone "urgent"
- "skip" -> tone "none", message ""

Return your decision as the required structured output.
""".format(escalation_threshold=ESCALATION_THRESHOLD)


class FollowUpDecision(BaseModel):
    action: str  # "remind" | "escalate" | "skip"
    tone: str
    message: str


_agent = Agent(
    name="followup_agent",
    model=MODEL,
    description="Decides whether to remind or escalate a pending task, and drafts the message.",
    instruction=DECISION_INSTRUCTION,
    output_schema=FollowUpDecision,
)

_runner = InMemoryRunner(agent=_agent, app_name=APP_NAME)


def decide_action(task: dict) -> dict:
    """Returns {"action": "remind"|"escalate"|"skip", "tone": str, "message": str}."""
    return asyncio.run(_decide_action_async(task))


async def _decide_action_async(task: dict) -> dict:
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    due_date = task.get("due_date")
    due_date_str = due_date.strftime("%Y-%m-%d") if due_date else "none"

    prompt = (
        f"Today's date: {today}\n"
        f"Task: {task['description']}\n"
        f"Owner: {task['owner_name']}\n"
        f"Due date: {due_date_str}\n"
        f"Reminders already sent: {task.get('reminder_count', 0)}"
    )

    session = await _runner.session_service.create_session(app_name=APP_NAME, user_id=USER_ID)

    final_text = None
    async for event in _runner.run_async(
        user_id=USER_ID,
        session_id=session.id,
        new_message=types.Content(role="user", parts=[types.Part.from_text(text=prompt)]),
    ):
        if event.content and event.content.parts:
            text = "".join(p.text for p in event.content.parts if p.text)
            if text:
                final_text = text

    if not final_text:
        raise RuntimeError("Follow-up Agent returned no output")

    return json.loads(final_text)
