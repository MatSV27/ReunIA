import datetime
import os

import functions_framework
from google.cloud import firestore
from google.genai import types

from telegram_client import send_message, get_file_path, download_file
from agent import extract_tasks

WEBHOOK_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")

db = firestore.Client()


@functions_framework.http
def extraction_webhook(request):
    if request.headers.get("X-Telegram-Bot-Api-Secret-Token") != WEBHOOK_SECRET:
        return ("Unauthorized", 401)

    update = request.get_json(silent=True) or {}
    message = update.get("message")
    if not message:
        return ("OK", 200)

    chat_id = message["chat"]["id"]
    message_id = message["message_id"]

    if "voice" in message:
        file_path = get_file_path(message["voice"]["file_id"])
        audio_bytes = download_file(file_path)
        parts = [types.Part.from_bytes(data=audio_bytes, mime_type=message["voice"]["mime_type"])]
    elif "text" in message:
        parts = [types.Part.from_text(text=message["text"])]
    else:
        return ("OK", 200)

    try:
        result = extract_tasks(parts)
    except Exception:
        send_message(chat_id, "Sorry, I couldn't process that message. Please try again.")
        raise

    tasks = result.get("tasks", [])
    transcript = result.get("transcript", "")

    now = datetime.datetime.now(datetime.timezone.utc)
    for task in tasks:
        due_date = _parse_due_date(task.get("due_date"))
        db.collection("tasks").add({
            "description": task["description"],
            "owner_name": task["owner_name"],
            "due_date": due_date,
            "status": "pending",
            "source_chat_id": str(chat_id),
            "source_message_id": str(message_id),
            "raw_transcript": transcript,
            "reminder_count": 0,
            "last_reminder_at": None,
            "escalated": False,
            "escalated_to": None,
            "created_at": now,
            "updated_at": now,
        })

    if tasks:
        summary = "\n".join(f"- {t['description']} ({t['owner_name']})" for t in tasks)
        send_message(chat_id, f"Registered {len(tasks)} task(s):\n{summary}")
    else:
        send_message(chat_id, "I didn't find any action items in that message.")

    return ("OK", 200)


def _parse_due_date(value):
    if not value:
        return None
    try:
        return datetime.datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc)
    except ValueError:
        return None
