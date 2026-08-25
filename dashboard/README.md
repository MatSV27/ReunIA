# Dashboard

Minimal React app reading Firestore's `tasks` collection directly (no backend of its own): lists tasks by status (escalated first, then pending, then done), shows owner/due date/reminder count, and lets you mark a task done.

## Setup

Copy `.env.example` to `.env` and fill in the Firebase Web SDK config for this project (Firebase console → Project settings → General → Your apps, or `firebase apps:sdkconfig web <appId>`).

```
npm install
npm run dev
```

## How access control works

There's no login. The app reads/writes Firestore directly from the browser using the public Web API key, and `firestore.rules` (deployed separately, see below) is what actually gates access:

- Anyone can **read** `tasks` and their `events` subcollection.
- Writes are restricted to changing only `status` and `updated_at` on a task (what "Mark done" does) — no other field, and no create/delete from the client.

This is an intentional simplification for a solo hackathon demo with non-sensitive data, not a production security posture — a real deployment would put this behind Firebase Auth.

To deploy rule changes (requires a Firebase-enabled GCP project; see root README for how this project's Firebase setup was created without the `firebase` CLI, since it couldn't run interactively in this environment):

```
firebase deploy --only firestore:rules --project meeting-followup-agent-mtsv
```

## Deploy (optional, for a live demo URL)

```
npm run build
firebase deploy --only hosting --project meeting-followup-agent-mtsv
```
