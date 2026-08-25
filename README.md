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

Uses an `--env-vars-file` (YAML) rather than passing `.env` directly, since `.env`'s comments/blank lines aren't valid `KEY=VALUE,KEY=VALUE` syntax. Hand-write `extraction-agent/env-vars.yaml` and `followup-agent/env-vars.yaml` (gitignored, never commit these):

```yaml
TELEGRAM_BOT_TOKEN: "..."
TELEGRAM_WEBHOOK_SECRET: "..."   # extraction-agent only
GCP_PROJECT_ID: "meeting-followup-agent-mtsv"
GEMINI_MODEL: "gemini-3.5-flash"
VERTEX_AI_LOCATION: "global"
```

```
gcloud functions deploy extraction-webhook \
  --gen2 --runtime=python312 --region=us-central1 \
  --source=extraction-agent --entry-point=extraction_webhook \
  --trigger-http --allow-unauthenticated \
  --env-vars-file=extraction-agent/env-vars.yaml \
  --memory=512Mi --cpu=1 --timeout=180s

gcloud functions deploy followup-run \
  --gen2 --runtime=python312 --region=us-central1 \
  --source=followup-agent --entry-point=followup_run \
  --trigger-http --no-allow-unauthenticated \
  --env-vars-file=followup-agent/env-vars.yaml \
  --memory=512Mi --cpu=1 --timeout=300s
```

`--memory=512Mi --cpu=1` (default is a much smaller `0.1666` CPU) — needed because cold-starting `google-adk` plus a live Gemini call regularly took longer than the default resources allow, causing 504s.

Then register the Telegram webhook:

```
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://us-central1-meeting-followup-agent-mtsv.cloudfunctions.net/extraction-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

### 5. Cloud Scheduler (Follow-up Agent)

`followup-run` is deployed with `--no-allow-unauthenticated`, so Cloud Scheduler needs a dedicated service account with `roles/run.invoker` on it:

```
gcloud iam service-accounts create scheduler-invoker \
  --display-name="Cloud Scheduler invoker for followup-run"

gcloud run services add-iam-policy-binding followup-run \
  --region=us-central1 \
  --member="serviceAccount:scheduler-invoker@meeting-followup-agent-mtsv.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud scheduler jobs create http followup-daily \
  --schedule="0 9 * * *" \
  --uri="https://us-central1-meeting-followup-agent-mtsv.cloudfunctions.net/followup-run" \
  --http-method=POST \
  --oidc-service-account-email="scheduler-invoker@meeting-followup-agent-mtsv.iam.gserviceaccount.com" \
  --oidc-token-audience="https://us-central1-meeting-followup-agent-mtsv.cloudfunctions.net/followup-run" \
  --location=us-central1 \
  --time-zone="America/Lima" \
  --attempt-deadline=300s
```

To test without waiting for the daily schedule: `gcloud scheduler jobs run followup-daily --location=us-central1`, or invoke directly with an impersonated identity token (see git history / commit notes for the exact command used during development).

## Status

Day 3 of 6 — Both agents are fully wired up and deployed:
- **Extraction Agent**: voice/text → Gemini 3.5 Flash on Vertex AI → structured tasks → Firestore → Telegram confirmation. Verified end-to-end with real Telegram messages.
- **Follow-up Agent**: Cloud Scheduler (daily, `America/Lima`) → reviews pending tasks → autonomously reminds or escalates via Gemini → updates Firestore + `events` audit trail. Verified end-to-end through 3 live invocations against a real task: `remind (neutral)` → `remind (friendly-reminder)` → `escalate (urgent)`, with `status` flipping to `escalated` on the third run — no human in the loop.

Dashboard (React) is still to be built.

Note on Vertex AI model location: `gemini-3.5-flash` (and other recent Gemini models) are only served from the `global` Vertex AI location in this project, not regional ones like `us-central1` — see `VERTEX_AI_LOCATION` in `.env.example`. Infra (Cloud Functions, Firestore) stays in `us-central1`; only the model calls use `global`.
