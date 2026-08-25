# Extraction Agent (Google ADK)
#
# Takes a meeting transcript (from voice or text) and returns a structured
# list of action items as JSON: [{ description, owner_name, due_date }, ...]
#
# TODO (Día 2): wire up the actual ADK Agent + Gemini call here. Left as a
# stub for now so the Cloud Function scaffold (main.py) can be deployed and
# tested end-to-end with a fake extraction before the real prompt is built.

EXTRACTION_PROMPT = """You are an assistant that extracts action items from a meeting transcript.

Given the transcript below, return a JSON array of action items. Each item must have:
- "description": what needs to be done (concise)
- "owner_name": who is responsible, as stated or implied in the transcript
- "due_date": ISO 8601 date if mentioned, otherwise null

Only return the JSON array, nothing else.

Transcript:
{transcript}
"""


def extract_tasks(transcript: str) -> list[dict]:
    """Returns a list of {description, owner_name, due_date} dicts."""
    raise NotImplementedError("Wire up ADK Agent + Gemini call here (Día 2)")
