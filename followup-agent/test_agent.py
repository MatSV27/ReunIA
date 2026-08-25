import os
import datetime

os.environ.setdefault("GCP_PROJECT_ID", "meeting-followup-agent-mtsv")

from agent import decide_action

today = datetime.datetime.now(datetime.timezone.utc)

cases = [
    {"description": "no due date, first check", "owner_name": "Pedro", "due_date": None, "reminder_count": 0},
    {"description": "due tomorrow, no reminders yet", "owner_name": "Pedro", "due_date": today + datetime.timedelta(days=1), "reminder_count": 0},
    {"description": "due in 10 days, no reminders yet", "owner_name": "Pedro", "due_date": today + datetime.timedelta(days=10), "reminder_count": 0},
    {"description": "overdue, already reminded once", "owner_name": "Pedro", "due_date": today - datetime.timedelta(days=1), "reminder_count": 1},
    {"description": "overdue, already reminded twice", "owner_name": "Pedro", "due_date": today - datetime.timedelta(days=2), "reminder_count": 2},
]

for c in cases:
    result = decide_action(c)
    print(f"reminder_count={c['reminder_count']} due={c['due_date']} -> {result}")
