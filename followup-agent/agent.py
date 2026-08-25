# Follow-up Agent (Google ADK)
#
# Reasons over Mateo's *entire* portfolio of pending commitments in one call --
# not one isolated classification per task -- so it can prioritize across tasks,
# notice cross-task patterns (e.g. one person behind on multiple items), and
# write a single consolidated digest instead of spamming one message per task.
#
# The bot only has a chat with Mateo (task owners like "Carla" never talk to
# it), so every message is addressed to him: a personal accountability
# assistant surfacing what's going stale, not a multi-user notifier.

import asyncio
import datetime
import json
import os

from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from google.cloud import firestore
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

ESCALATION_THRESHOLD = 2  # reminder_count >= this on a still-pending task -> escalate

_db = firestore.Client()


def get_task_events(task_id: str) -> list[dict]:
    """Returns the timestamped history of past reminder/escalation events for one task, oldest first.

    Each entry has "type" ("remind" or "escalate") and "timestamp" (ISO 8601, UTC).

    Call this for a task whose reminders_sent count is 1 or higher and whose pattern isn't
    obvious from the count alone -- the count by itself can't tell you whether those reminders
    were spread out over weeks (genuinely stuck, worth escalating hard) or all fired in the last
    couple of days (still fresh, a lighter touch is fine). Use the real timestamps to tell those
    apart before deciding how urgent to be. Not needed for tasks with 0 reminders sent.
    """
    events = (
        _db.collection("tasks").document(task_id).collection("events")
        .order_by("timestamp").stream()
    )
    result = []
    for e in events:
        data = e.to_dict()
        ts = data.get("timestamp")
        result.append({"type": data.get("type"), "timestamp": ts.isoformat() if ts else None})
    return result


PLANNING_INSTRUCTION = """You are Mateo's personal accountability assistant. You review his full list of currently pending commitments from meetings -- things other people (or he himself) agreed to do -- and decide what's worth surfacing today.

You are given today's date and a list of tasks. For each task you know: its id, description, who owns it, due date (or "none"), and how many times Mateo has already been sent a digest mentioning it. You also have a tool, get_task_events, that returns the real timestamped history for one task -- use it (not for every task, just ones where the count alone is ambiguous) to judge how long something has actually been stuck before deciding how urgent to be.

For each task, decide one action:
- "skip": not worth mentioning today -- comfortably far from its due date and never reminded yet.
- "remind": worth a mention today -- due soon, already overdue, or has no due date but was never checked on.
- "escalate": already mentioned {escalation_threshold} or more times and still pending. This needs a noticeably more urgent tone than a normal reminder.

Then look across ALL the tasks TOGETHER, not just one at a time, and notice anything genuinely useful: is the same person responsible for multiple stale items? Is one task far more overdue than the rest and deserves to be called out first? Only mention a pattern if there really is one -- don't force it.

Finally, write ONE short Telegram message addressed directly to Mateo (never to the task owners -- they don't use this bot, only he reads this) that:
- Leads with whatever needs the most urgent attention (escalations first).
- Mentions any cross-task pattern you noticed, if any.
- Omits every task you decided to "skip" -- don't clutter the message with them.
- Is natural, brief, and conversational -- not a bulleted status report.
- Is an empty string "" if every task was skipped, so nothing gets sent that day.

Return your decision for every task, plus the message.
""".format(escalation_threshold=ESCALATION_THRESHOLD)


class TaskDecision(BaseModel):
    task_id: str
    action: str  # "remind" | "escalate" | "skip"


class FollowUpPlan(BaseModel):
    digest_message: str
    decisions: list[TaskDecision]


_agent = Agent(
    name="followup_agent",
    model=MODEL,
    description="Reasons over the full pending-task portfolio and drafts one consolidated digest.",
    instruction=PLANNING_INSTRUCTION,
    tools=[get_task_events],
    output_schema=FollowUpPlan,
)

_runner = InMemoryRunner(agent=_agent, app_name=APP_NAME)


def plan_followups(tasks: list[dict]) -> dict:
    """tasks: [{"id", "description", "owner_name", "due_date" (datetime|None), "reminder_count"}, ...]

    Returns {"digest_message": str, "decisions": [{"task_id", "action"}, ...]}.
    """
    return asyncio.run(_plan_followups_async(tasks))


async def _plan_followups_async(tasks: list[dict]) -> dict:
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

    lines = [f"Today's date: {today}", "", "Pending tasks:"]
    for t in tasks:
        due = t["due_date"].strftime("%Y-%m-%d") if t.get("due_date") else "none"
        lines.append(
            f"- id={t['id']} | description=\"{t['description']}\" | owner={t['owner_name']} "
            f"| due_date={due} | reminders_sent={t.get('reminder_count', 0)}"
        )
    prompt = "\n".join(lines)

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
