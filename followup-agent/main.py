import datetime
from collections import defaultdict

import functions_framework
from google.cloud import firestore

from telegram_client import send_message
from agent import plan_followups

db = firestore.Client()


@functions_framework.http
def followup_run(request):
    """Triggered by Cloud Scheduler (daily). Reasons over all pending tasks per
    chat as one portfolio, and sends at most one consolidated digest per chat."""
    pending_docs = list(db.collection("tasks").where("status", "==", "pending").stream())

    by_chat = defaultdict(list)
    for doc in pending_docs:
        by_chat[doc.to_dict()["source_chat_id"]].append(doc)

    now = datetime.datetime.now(datetime.timezone.utc)
    digests_sent = 0
    tasks_acted_on = 0

    for chat_id, docs in by_chat.items():
        docs_by_id = {doc.id: doc for doc in docs}
        tasks = [{"id": doc.id, **doc.to_dict()} for doc in docs]

        plan = plan_followups(tasks)

        if plan["digest_message"]:
            send_message(chat_id, plan["digest_message"])
            digests_sent += 1

        for decision in plan["decisions"]:
            if decision["action"] == "skip":
                continue

            doc = docs_by_id.get(decision["task_id"])
            if doc is None:
                continue  # ignore hallucinated/stale ids rather than crash the whole run

            task = doc.to_dict()
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
                "message": plan["digest_message"],
                "timestamp": now,
            })
            tasks_acted_on += 1

    return (f"Sent {digests_sent} digest(s), acted on {tasks_acted_on} task(s)", 200)
