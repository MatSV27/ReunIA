# Handoff notes

Read `Context.md` first for the full hackathon plan (deadline, judging criteria, day-by-day schedule, tech constraints). This file is a snapshot of what has actually been built, deployed, and verified as of **2026-08-25, end of Day 3 of 6** — read it before touching anything, so you don't redo work or re-fight gotchas that are already solved below.

Deadline: **31 ago 2026, 7:00pm GMT-5**.

## What exists right now

All three core pieces are built, deployed to GCP, and verified working end-to-end with real Telegram messages and real (or deliberately-seeded) Firestore data. Git history (4 commits) tells the story in order; this doc is the "why" and "what's still fragile" layer on top.

1. **Extraction Agent** (`extraction-agent/`) — Cloud Function, public HTTP webhook. Telegram (voice or text) → ADK agent (`gemini-3.5-flash` via Vertex AI) transcribes + extracts action items as structured JSON → writes to Firestore `tasks` → confirms back over Telegram.
2. **Follow-up Agent** (`followup-agent/`) — Cloud Function, authenticated only. Triggered daily by Cloud Scheduler → for each pending task, ADK agent autonomously decides `remind` / `escalate` / `skip` based on due date + `reminder_count`, drafts the message, sends via Telegram, updates Firestore + appends to `tasks/{id}/events` (audit trail).
3. **Dashboard** (`dashboard/`) — React + Vite, no backend of its own. Reads `tasks` straight from Firestore via the client SDK in real time, lets you mark a task done. Gated by Firestore security rules, not auth (see Known simplifications below).

Submission checklist still open: **architecture diagram, demo video (≤4 min), submission text/write-up.** No more core functionality is strictly required — see `Context.md` §6 for the full checklist.

## Infrastructure inventory

- **GCP project**: `meeting-followup-agent-mtsv`, owned by **`matsv2703@gmail.com`** (a personal Gmail — *not* `mateo.solorzano@neo.com.pe`, which is the corporate account and has no access to this project). Any new terminal/agent session needs `gcloud config get-value account` to confirm it's `matsv2703@gmail.com` before running gcloud commands against this project.
- **Billing**: linked to billing account "Pruebas" (`01FBD3-3EC3C4-0FC43D`), which holds the $150 hackathon credit.
- **Firestore**: default database, Native mode, region `us-central1`. Collections: `tasks` (schema in `docs/firestore-schema.md`), each with an `events` subcollection.
- **Cloud Functions** (gen2, region `us-central1`, both `512Mi` / `1 CPU` — the default `0.1666` CPU causes 504 timeouts cold-starting `google-adk`):
  - `extraction-webhook` — public (`--allow-unauthenticated`), 180s timeout. URL: `https://us-central1-meeting-followup-agent-mtsv.cloudfunctions.net/extraction-webhook`.
  - `followup-run` — private (`--no-allow-unauthenticated`), 300s timeout. URL: `https://us-central1-meeting-followup-agent-mtsv.cloudfunctions.net/followup-run`.
- **Cloud Scheduler**: job `followup-daily`, cron `0 9 * * *`, timezone `America/Lima`, invokes `followup-run` via OIDC token as service account `scheduler-invoker@meeting-followup-agent-mtsv.iam.gserviceaccount.com` (has `roles/run.invoker` on the `followup-run` Cloud Run service). `matsv2703@gmail.com` also has `roles/iam.serviceAccountTokenCreator` on that SA, for impersonation during manual testing (see below).
- **Firebase**: enabled on the same GCP project. One web app registered: `1:301099090359:web:5af68df20d8c311ef06832`. Firestore security rules deployed (source in `dashboard/firestore.rules`): public read on `tasks`/`events`, writes limited to `status`+`updated_at` only, no create/delete from the client.
- **Telegram bot**: token lives in `.env` (root, gitignored) and in `extraction-agent/env-vars.yaml` / `followup-agent/env-vars.yaml` (gitignored, **not reconstructable from git** — if missing, get the token from `.env` or re-ask the user for it; do not generate a new bot). Webhook is registered pointing at `extraction-webhook`.

## Secrets/config that are NOT in git (must exist locally for anything to work)

These are all gitignored by design. If a fresh clone/agent doesn't have them, most things will fail with confusing errors until they're recreated:

- `.env` (root) — Telegram token/webhook secret, `GCP_PROJECT_ID`, `GEMINI_MODEL=gemini-3.5-flash`, `VERTEX_AI_LOCATION=global`. Template: `.env.example`.
- `extraction-agent/env-vars.yaml`, `followup-agent/env-vars.yaml` — same values, YAML format, used for `gcloud functions deploy --env-vars-file=...`. Not templated separately; see root README §4 for the exact keys each needs.
- `dashboard/.env` — Firebase Web SDK config (`VITE_FIREBASE_*`). Template: `dashboard/.env.example`. Values are also in this doc's Infrastructure Inventory section (Firebase web app) and can be re-fetched with `firebase apps:sdkconfig web 1:301099090359:web:5af68df20d8c311ef06832 --project meeting-followup-agent-mtsv` (see Firebase CLI gotcha below — that command needs a working `firebase login` and may need the REST fallback instead).

If any of these need regenerating from scratch, root README.md §2-3 has the setup steps.

## Gotchas already solved — don't rediscover these

1. **ADC quota-project mismatch.** `gcloud auth login` and `gcloud auth application-default login` are separate credential stores. This machine had stale ADC from a different Google account/project (`neoc-hr`, from the user's employer). Symptom: Vertex AI calls fail with `403 PERMISSION_DENIED` on `aiplatform.endpoints.predict` even with `roles/owner`. Fix already applied: ran `gcloud auth application-default login` as `matsv2703@gmail.com`, which correctly set the quota project. If this resurfaces, check `google.auth.default()`'s `quota_project_id` in Python (don't print raw tokens — see Security note below).
2. **`gemini-3.5-flash` (and other recent Gemini models) only serve from Vertex AI location `global`**, not `us-central1` in this project. Symptom: `404 NOT_FOUND` on the publisher model resource. Fix: `agent.py` in both agents sets `GOOGLE_CLOUD_LOCATION` from `VERTEX_AI_LOCATION` (default `"global"`), decoupled from `GCP_REGION` (`us-central1`, used for Cloud Functions/Firestore infra only).
3. **Cloud Functions default resources (`0.1666` CPU) cause 504 timeouts** cold-starting `google-adk` + a live Gemini call. Fixed by deploying with `--memory=512Mi --cpu=1` and longer `--timeout`.
4. **Model Garden "Habilita las APIs" one-time click.** Early on, Vertex AI calls were denied even after `gcloud services enable aiplatform.googleapis.com`; the user had to click "Enable APIs" inside Vertex AI → Model Garden in the console once. If a *new* GCP project is ever used, expect to hit this again — it's a console-only step, no CLI equivalent found.
5. **Firebase CLI can't run interactively in this dev environment.** `firebase login` fails with "Cannot run login in non-interactive mode" even via the `!`-prefixed shell passthrough (unlike `gcloud auth login`, which works fine that way). Everything Firebase-related here was done instead via direct REST calls to `firebase.googleapis.com` (Management API) and `firebaserules.googleapis.com` (Rules API), authenticated with `gcloud auth print-access-token --account=matsv2703@gmail.com` plus an `x-goog-user-project: meeting-followup-agent-mtsv` header (needed — without it you get a `SERVICE_DISABLED`/quota-project error). If `firebase login` ever works in a future session, the CLI equivalents are simpler and are what `dashboard/README.md` documents as the "normal" path.
6. **Cloud Scheduler jobs created with `gcloud scheduler jobs run` don't block/return output**, and `gcloud scheduler jobs describe` doesn't reliably show recent attempt status either. To test `followup-run` on demand without waiting for the daily cron, impersonate the scheduler SA directly and curl it:
   ```
   TOKEN=$(gcloud auth print-identity-token \
     --impersonate-service-account=scheduler-invoker@meeting-followup-agent-mtsv.iam.gserviceaccount.com \
     --audiences="https://us-central1-meeting-followup-agent-mtsv.cloudfunctions.net/followup-run")
   curl -X POST "https://us-central1-meeting-followup-agent-mtsv.cloudfunctions.net/followup-run" \
     -H "Authorization: Bearer $TOKEN" -d ''
   ```
   (`-d ''` matters — a POST with no body at all gets rejected with `411 Length Required`.)

## Known, intentional simplifications (not bugs — mention in the write-up, don't silently "fix")

- **Dashboard has no auth.** Firestore rules allow public read on `tasks`, and writes are restricted to the `status`/`updated_at` fields only (verified by a standalone test script during development — see commit `c1f6711`). Fine for a solo demo with non-sensitive seeded data; a real deployment would add Firebase Auth. Say this explicitly in the video/write-up rather than letting a judge assume it's an oversight.
- **`escalated_to` is always `null`.** The escalation path currently re-notifies the same Telegram chat with an urgent tone rather than pinging a second person — there's no mechanism yet to configure who else to notify. The autonomy signal (tone shift + status change to `escalated`, no human input) is still real and demonstrated; multi-person escalation was scoped out for time.
- **Firestore currently holds one synthetic seeded task** (`seeb3bsPAiRoPGQ5aqe2`, "Enviar el informe de avance semanal", due date backdated) used to demonstrate the full `remind → remind → escalate` cycle without waiting real days — see commit `d6c69f6` message. Be transparent about this in the demo video (e.g. "I seeded a task with a past due date to show escalation without waiting days") — the Cloud Scheduler run, the Gemini calls, and the Firestore writes for that demonstration were all real, nothing about the *mechanism* was faked.
- **`shared/` directory is empty** — a leftover placeholder from initial scaffolding, never used. Safe to delete or ignore.

## Suggested next steps (in priority order)

1. **Architecture diagram** — required for submission (`Context.md` §6). All three components and their GCP services are stable now; a good time to draw this since nothing about the architecture is expected to change further.
2. **Demo video** (≤4 min, must show Google Cloud backend running — Cloud Console, function logs, or the `.run.app` URL). Suggested beats: (a) send a real voice note/text to the bot, show the Firestore write + Telegram confirmation live; (b) show the dashboard with the escalated seeded task and explain how it got there; (c) show Cloud Scheduler / Cloud Functions logs as deployment proof.
3. **Submission write-up** — features, tech stack, data sources, learnings. `Context.md` §6 has the exact checklist.
4. Optional, time-permitting: deploy the dashboard to Firebase Hosting for a live URL (`dashboard/README.md` has the commands — same CLI-login caveat as above may apply; may need the REST-API approach again, or ask the user to run `firebase login` themselves via a truly interactive terminal outside this session).

## Security note for whoever picks this up

Real secrets (Telegram bot token, Firebase API key) are already floating in this conversation's history and in gitignored local files — that's expected for this project. But avoid *new* exposure: don't print raw OAuth access/ID tokens to stdout or write them to disk (a past mistake in this session did that once with `gcloud auth print-access-token > file`, then deleted it immediately — prefer piping tokens straight into `Authorization` headers via shell variables, never through a saved file).
