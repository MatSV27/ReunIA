import os
import datetime

import functions_framework
from google.cloud import firestore

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
        transcript = transcribe(audio_bytes)  # TODO (Día 2): Gemini transcription
    elif "text" in message:
        transcript = message["text"]
    else:
        return ("OK", 200)

    tasks = extract_tasks(transcript)

    now = datetime.datetime.now(datetime.timezone.utc)
    for task in tasks:
        db.collection("tasks").add({
            "description": task["description"],
            "owner_name": task["owner_name"],
            "due_date": task.get("due_date"),
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

    summary = "\n".join(f"- {t['description']} ({t['owner_name']})" for t in tasks) or "No action items found."
    send_message(chat_id, f"Registered {len(tasks)} task(s):\n{summary}")

    return ("OK", 200)


def transcribe(audio_bytes: bytes) -> str:
    raise NotImplementedError("Wire up Gemini audio transcription here (Día 2)")
