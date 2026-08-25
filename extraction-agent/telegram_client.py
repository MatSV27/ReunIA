import os
import requests

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"


def send_message(chat_id, text):
    resp = requests.post(f"{API_BASE}/sendMessage", json={"chat_id": chat_id, "text": text})
    resp.raise_for_status()
    return resp.json()


def get_file_path(file_id):
    resp = requests.get(f"{API_BASE}/getFile", params={"file_id": file_id})
    resp.raise_for_status()
    return resp.json()["result"]["file_path"]


def download_file(file_path):
    resp = requests.get(f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}")
    resp.raise_for_status()
    return resp.content
