import datetime

import functions_framework
from google.cloud import firestore

from telegram_client import send_message
from agent import decide_action

db = firestore.Client()


@functions_framework.http
def followup_run(request):
    """Triggered by Cloud Scheduler (daily). Scans pending tasks and acts autonomously."""
    pending = db.collection("tasks").where("status", "==", "pending").stream()

    acted_on = 0
    now = datetime.datetime.now(datetime.timezone.utc)

    for doc in pending:
        task = doc.to_dict()
        decision = decide_action(task)

        if decision["action"] == "skip":
            continue

        target_chat_id = task["source_chat_id"]
        if decision["action"] == "escalate" and task.get("escalated_to"):
            target_chat_id = task["escalated_to"]

        send_message(target_chat_id, decision["message"])

        update = {
            "reminder_count": task.get("reminder_count", 0) + 1,
            "last_reminder_at": now,
            "updated_at": now,
        }
        if decision["action"] == "escalate":
            update["escalated"] = True
            update["status"] = "escalated"

        doc.reference.update(update)
        doc.reference.collection("events").add({
            "type": decision["action"],
            "tone": decision.get("tone"),
            "message": decision["message"],
            "timestamp": now,
        })
        acted_on += 1

    return (f"Processed {acted_on} task(s)", 200)
