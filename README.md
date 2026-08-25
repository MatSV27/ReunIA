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

Uses an `--env-vars-file` (YAML) rather than passing `.env` directly, since `.env`'s comments/blank lines aren't valid `KEY=VALUE,KEY=VALUE` syntax. Generate one from `.env` (excluding comments/blank lines):

```
grep -v '^#' .env | grep -v '^$' | sed 's/^/"/;s/=/": "/;s/$/"/' > /tmp/env-vars.yaml
# or just hand-write extraction-agent/env-vars.yaml / followup-agent/env-vars.yaml (gitignored) with:
#   TELEGRAM_BOT_TOKEN: "..."
#   TELEGRAM_WEBHOOK_SECRET: "..."
#   GCP_PROJECT_ID: "meeting-followup-agent-mtsv"
#   GEMINI_MODEL: "gemini-3.5-flash"
#   VERTEX_AI_LOCATION: "global"

gcloud functions deploy extraction-webhook \
  --gen2 --runtime=python312 --region=us-central1 \
  --source=extraction-agent --entry-point=extraction_webhook \
  --trigger-http --allow-unauthenticated \
  --env-vars-file=extraction-agent/env-vars.yaml

gcloud functions deploy followup-run \
  --gen2 --runtime=python312 --region=us-central1 \
  --source=followup-agent --entry-point=followup_run \
  --trigger-http --no-allow-unauthenticated \
  --env-vars-file=followup-agent/env-vars.yaml
```

Then register the Telegram webhook (pointing at the deployed `extraction-webhook` URL, with `X-Telegram-Bot-Api-Secret-Token` set to `TELEGRAM_WEBHOOK_SECRET`) and a Cloud Scheduler job (pointing at `followup-run`, daily, with an OIDC token since it's not publicly invokable).

## Status

Day 2 of 6 — Extraction Agent is fully wired up (voice/text → Gemini 3.5 Flash on Vertex AI → structured tasks → Firestore → Telegram confirmation) and deployed to Cloud Functions, verified end-to-end with real Telegram messages. Follow-up Agent is still a stub.

Note on Vertex AI model location: `gemini-3.5-flash` (and other recent Gemini models) are only served from the `global` Vertex AI location in this project, not regional ones like `us-central1` — see `VERTEX_AI_LOCATION` in `.env.example`. Infra (Cloud Functions, Firestore) stays in `us-central1`; only the model calls use `global`.
