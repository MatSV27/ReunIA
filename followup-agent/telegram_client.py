import os
import requests

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"


def send_message(chat_id, text):
    resp = requests.post(f"{API_BASE}/sendMessage", json={"chat_id": chat_id, "text": text})
    resp.raise_for_status()
    return resp.json()
