# Meeting Follow-up Agent

Turns meeting voice notes / text sent to a Telegram bot into tracked action items, and follows up on them autonomously: a daily agent reasons over your *entire* pending-task portfolio at once — not one task in isolation — prioritizing, spotting cross-task patterns (e.g. the same person behind on multiple commitments), and escalating tone when reminders go unanswered, all folded into a single consolidated digest instead of one message per task.

Built for the **All Things Agentic Hackathon** (Taskmaster track).

## Architecture

![Architecture diagram: two independent flows share one Firestore database. A human-triggered flow (indigo) goes Telegram -> Extraction Agent -> Firestore -> confirmation back to Telegram. An autonomous flow (amber) goes Cloud Scheduler -> Follow-up Agent -> Firestore (with an optional tool call to check a task's reminder history) -> a consolidated digest back to Telegram, running daily with no human involved. A dashboard reads and writes Firestore directly, bypassing both Cloud Functions.](docs/architecture-diagram.svg)

[Interactive version with theme support and captions](https://claude.ai/code/artifact/b1484177-d594-4c80-85d5-2f9378e21471)

- **Extraction Agent** (Google ADK, Gemini) — Cloud Function triggered by a Telegram webhook. Transcribes voice notes, extracts action items as structured JSON, writes them to Firestore, confirms back on Telegram.
- **Follow-up Agent** (Google ADK, Gemini, with a real tool call) — Cloud Function triggered daily by Cloud Scheduler. Reasons over the *whole* pending-task list per chat in one call (not per-task classification), decides remind/escalate/skip per task, notices cross-task patterns, and sends at most one consolidated digest — always addressed to the person who owns the chat, never to a task's owner (they never talk to the bot). Can call `get_task_events(task_id)` itself when a task's reminder count alone doesn't tell the whole story.
- **Firestore** — task state (see `docs/firestore-schema.md`).
- **Dashboard** — minimal React app reading Firestore directly (view tasks, mark as done).

See `docs/telegram-webhook-contract.md` for the full request/response contract.

## Project structure

```
extraction-agent/   Cloud Function: Telegram webhook -> transcription -> extraction -> Firestore
followup-agent/     Cloud Function: Cloud Scheduler -> portfolio-wide review -> one digest/chat
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

Day 3 of 6 — Both agents and the dashboard are built and deployed:
- **Extraction Agent**: voice/text → Gemini 3.5 Flash on Vertex AI → structured tasks → Firestore → Telegram confirmation. Verified end-to-end with real Telegram messages.
- **Follow-up Agent**: Cloud Scheduler (daily, `America/Lima`) → one Gemini call reasons over the *entire* pending-task portfolio per chat → per-task remind/escalate/skip decisions + one consolidated, prioritized digest (never one message per task) → updates Firestore + `events` audit trail. The agent has a real ADK tool, `get_task_events(task_id)`, and decides itself when to call it — e.g. two tasks reminded twice each look identical by count alone, but one whose reminders span three weeks is genuinely stuck while one reminded twice in the last two days is still fresh; the tool lets it tell those apart from real timestamps rather than a flat threshold. Verified end-to-end in production twice: (1) a portfolio with two overdue tasks from the same owner produced one message calling out the pattern and escalating only the one past threshold, while an unrelated task 15 days out was silently skipped; (2) two tasks with an identical `reminder_count` got different treatment (one escalated, one didn't) after the agent called `get_task_events` and read the actual timestamps. No human in the loop either time. This is a deliberate upgrade from an earlier per-task-classification design with no tool use — see `HANDOFF.md` for why.
- **Dashboard**: React + Firestore client SDK, no backend of its own. Lists tasks (escalated first), lets you mark one done. Access controlled by Firestore security rules (public read, writes limited to `status`/`updated_at`), verified with a standalone script that confirmed both the allowed update and a rejected one. See `dashboard/README.md`.

Still to do: architecture diagram, demo video, submission write-up.

## Notes on gotchas hit during development

- **Vertex AI model location**: `gemini-3.5-flash` (and other recent Gemini models) are only served from the `global` Vertex AI location in this project, not regional ones like `us-central1` — see `VERTEX_AI_LOCATION` in `.env.example`. Infra (Cloud Functions, Firestore) stays in `us-central1`; only the model calls use `global`.
- **Firebase setup without the `firebase` CLI**: `firebase login` requires a real interactive terminal/browser flow that wasn't available in the dev environment used here. Firebase was instead added to the GCP project and the web app registered via direct calls to the Firebase Management API (`firebase.googleapis.com`) and Firebase Rules API (`firebaserules.googleapis.com`), authenticated with the already-logged-in `gcloud` user token (`gcloud auth print-access-token`) plus an `x-goog-user-project` header. If you have a working `firebase login`, the equivalent CLI commands are simpler — see `dashboard/README.md`.
- **ADC quota project**: if Vertex AI calls fail with `PERMISSION_DENIED` despite correct IAM roles, check `gcloud auth application-default set-quota-project` — stale Application Default Credentials from a different project/account on the same machine will cause exactly this.
