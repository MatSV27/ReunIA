# Follow-up Agent (Google ADK)
#
# Given a pending task's state (reminder_count, due_date, description, owner),
# decides autonomously whether to: send a reminder, escalate, or do nothing —
# and drafts the message text/tone via Gemini.
#
# TODO (Día 2/4): wire up the actual ADK Agent + Gemini call here.

ESCALATION_THRESHOLD = 2  # reminder_count >= this -> escalate instead of remind

DECISION_PROMPT = """You are a follow-up assistant deciding how to nudge someone about a pending task.

Task: {description}
Owner: {owner_name}
Due date: {due_date}
Reminders already sent: {reminder_count}

Decide one action: "remind", "escalate", or "skip".
- "remind" if nothing urgent yet.
- "escalate" if reminder_count >= {escalation_threshold} and the task is still pending.
- "skip" if there's no reason to act right now (e.g. due date far in the future).

Then draft a short Telegram message with an appropriate tone (more urgent as
reminder_count increases). Return JSON: {{"action": ..., "tone": ..., "message": ...}}
"""


def decide_action(task: dict) -> dict:
    """Returns {"action": "remind"|"escalate"|"skip", "tone": str, "message": str}."""
    raise NotImplementedError("Wire up ADK Agent + Gemini call here (Día 4)")
