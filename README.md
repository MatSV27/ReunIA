# Meeting Follow-up Agent

Turns meeting voice notes / text sent to a Telegram bot into tracked action items, and follows up on them autonomously — reminding, and escalating when reminders go unanswered.

Built for the **All Things Agentic Hackathon** (Taskmaster track).

## Architecture

- **Extraction Agent** (Google ADK, Gemini) — Cloud Function triggered by a Telegram webhook. Transcribes voice notes, extracts action items as structured JSON, writes them to Firestore, confirms back on Telegram.
- **Follow-up Agent** (Google ADK, Gemini) — Cloud Function triggered daily by Cloud Scheduler. Reviews pending tasks and autonomously decides whether to remind or escalate (after 2 unanswered reminders, tone shifts and/or a different person gets notified).
- **Firestore** — task state (see `docs/firestore-schema.md`).
- **Dashboard** — minimal React app reading Firestore directly (view tasks, mark as done).

See `docs/telegram-webhook-contract.md` for the full request/response contract.

## Project structure

```
extraction-agent/   Cloud Function: Telegram webhook -> transcription -> extraction -> Firestore
followup-agent/     Cloud Function: Cloud Scheduler -> pending task review -> reminder/escalation
dashboard/          React app (Firestore reader)
docs/               Schema + webhook contract docs
```

## Setup

### 1. Prerequisites

- Python 3.12+, Node 20+
- `gcloud` CLI authenticated (`gcloud auth login`) with the project set:
  ```
  gcloud config set project meeting-followup-agent-mtsv
  ```
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### 2. Environment variables

Copy `.env.example` to `.env` and fill in `TELEGRAM_BOT_TOKEN` (from BotFather) and `GEMINI_API_KEY` (if not using Vertex AI ADC). `GCP_PROJECT_ID`, `GCP_REGION`, `TELEGRAM_WEBHOOK_SECRET` are already set for this project.

### 3. Local development

Each Cloud Function has its own `requirements.txt`:

```
cd extraction-agent
python -m venv .venv && .venv/Scripts/activate  # Windows
pip install -r requirements.txt
functions-framework --target=extraction_webhook --debug
```

```
cd followup-agent
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
functions-framework --target=followup_run --debug
```

### 4. Deploy

```
gcloud functions deploy extraction-webhook \
  --gen2 --runtime=python312 --region=us-central1 \
  --source=extraction-agent --entry-point=extraction_webhook \
  --trigger-http --allow-unauthenticated \
  --set-env-vars="$(cat .env | tr '\n' ',')"

gcloud functions deploy followup-run \
  --gen2 --runtime=python312 --region=us-central1 \
  --source=followup-agent --entry-point=followup_run \
  --trigger-http --no-allow-unauthenticated \
  --set-env-vars="$(cat .env | tr '\n' ',')"
```

Then register the Telegram webhook (pointing at the deployed `extraction-webhook` URL) and a Cloud Scheduler job (pointing at `followup-run`, daily).

## Status

Day 1 of 6 — GCP project, Firestore, and Cloud Function scaffolds are in place. Extraction/Follow-up agent logic (Gemini prompts) still to be wired up.
