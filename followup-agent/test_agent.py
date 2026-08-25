import os
import datetime

os.environ.setdefault("GCP_PROJECT_ID", "meeting-followup-agent-mtsv")

from agent import plan_followups

today = datetime.datetime.now(datetime.timezone.utc)

tasks = [
    {
        "id": "t1",
        "description": "Enviar el dashboard de métricas",
        "owner_name": "Carla",
        "due_date": today - datetime.timedelta(days=3),
        "reminder_count": 2,
    },
    {
        "id": "t2",
        "description": "Revisar el contrato con legal",
        "owner_name": "Carla",
        "due_date": today - datetime.timedelta(days=1),
        "reminder_count": 1,
    },
    {
        "id": "t3",
        "description": "Coordinar la siguiente sesión con el cliente",
        "owner_name": "Mateo",
        "due_date": None,
        "reminder_count": 0,
    },
    {
        "id": "t4",
        "description": "Preparar el reporte trimestral",
        "owner_name": "Jorge",
        "due_date": today + datetime.timedelta(days=15),
        "reminder_count": 0,
    },
]

result = plan_followups(tasks)
print("=== Digest message ===")
print(result["digest_message"])
print()
print("=== Per-task decisions ===")
for d in result["decisions"]:
    print(d)
