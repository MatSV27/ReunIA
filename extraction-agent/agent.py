# Extraction Agent (Google ADK)
#
# Takes the content of an incoming Telegram message (text or a voice note, as
# a list of google.genai.types.Part) and returns the transcript plus a
# structured list of action items.

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

APP_NAME = "extraction-agent"
USER_ID = "extraction-agent"  # single-tenant service account identity for the ADK session, not a Telegram user

EXTRACTION_INSTRUCTION = """You process meeting notes shared via Telegram (a voice note or a text message) and extract action items.

The first part of the input is always a line stating today's date, e.g. "Context: today's date is 2026-08-25.". Use it to resolve relative dates ("Friday", "next week", "in 3 days") to absolute ISO dates. Do not include that context line in the transcript you return.

After that context line, the rest of the input is the actual content: if it's audio, first transcribe it faithfully in its original language; if it's already text, use it directly.

Then identify every action item (task) mentioned. For each one:
- description: what needs to be done, concise
- owner_name: who is responsible, as stated or clearly implied. If genuinely unclear, use "unassigned".
- due_date: an ISO 8601 date (YYYY-MM-DD) if a deadline was mentioned or can be resolved from a relative date, otherwise null.

If there are no action items, return an empty tasks list. Do not invent tasks that weren't actually said.
"""


class TaskItem(BaseModel):
    description: str
    owner_name: str
    due_date: str | None = None


class ExtractionResult(BaseModel):
    transcript: str
    tasks: list[TaskItem]


_agent = Agent(
    name="extraction_agent",
    model=MODEL,
    description="Extracts action items from a meeting voice note or text message.",
    instruction=EXTRACTION_INSTRUCTION,
    output_schema=ExtractionResult,
)

_runner = InMemoryRunner(agent=_agent, app_name=APP_NAME)


def extract_tasks(parts: list[types.Part]) -> dict:
    """Runs the Extraction Agent on the given message parts.

    Returns {"transcript": str, "tasks": [{"description", "owner_name", "due_date"}, ...]}.
    """
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    date_context = types.Part.from_text(text=f"Context: today's date is {today}.")
    return asyncio.run(_extract_tasks_async([date_context, *parts]))


async def _extract_tasks_async(parts: list[types.Part]) -> dict:
    session = await _runner.session_service.create_session(app_name=APP_NAME, user_id=USER_ID)

    final_text = None
    async for event in _runner.run_async(
        user_id=USER_ID,
        session_id=session.id,
        new_message=types.Content(role="user", parts=parts),
    ):
        if event.content and event.content.parts:
            text = "".join(p.text for p in event.content.parts if p.text)
            if text:
                final_text = text

    if not final_text:
        raise RuntimeError("Extraction Agent returned no output")

    return json.loads(final_text)
