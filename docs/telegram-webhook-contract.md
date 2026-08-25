# Telegram Webhook Contract

## Inbound: `POST /extraction-webhook` (extraction-agent Cloud Function)

Telegram calls this URL for every update in the bot's chat, set via `setWebhook`.

**Security:** every request must carry header `X-Telegram-Bot-Api-Secret-Token` equal to `TELEGRAM_WEBHOOK_SECRET`. Requests without a matching header are rejected with `401`.

**Body:** a Telegram [Update](https://core.telegram.org/bots/api#update) object. We only act on `message` updates containing either:
- `message.voice` — a voice note (`file_id` used to download via `getFile`)
- `message.text` — plain text

**Processing:**
1. If `voice`: download the audio via Telegram `getFile`, send to Gemini for transcription.
2. If `text`: use directly as the transcript.
3. Extraction Agent (ADK, Gemini) parses the transcript into a JSON list of action items: `{ description, owner_name, due_date }`.
4. Each item is written to Firestore `tasks` (see `firestore-schema.md`), with `source_chat_id` / `source_message_id` from the update.
5. Reply to the same `chat_id` via `sendMessage` summarizing what was registered.

**Response:** `200 OK` with empty body (Telegram only cares about the status code).

## Outbound: Bot API calls made by our agents

Both agents call the Telegram Bot API directly (`https://api.telegram.org/bot<TOKEN>/...`):

- `sendMessage` — confirmations (Extraction Agent), consolidated digests (Follow-up Agent)
- `getFile` + file download — fetching voice note audio (Extraction Agent)

## Trigger: Follow-up Agent (Cloud Scheduler → HTTP)

Cloud Scheduler calls `POST /followup-run` (followup-agent Cloud Function) on a cron schedule (daily). No Telegram involvement on the inbound side — this endpoint is protected by a separate check (Cloud Scheduler's OIDC token), not the Telegram secret.

The bot only ever has a chat with Mateo — task owners (e.g. "Carla") never talk to it — so this agent acts as *his* personal accountability assistant: every message is addressed to him, never to a task's owner, and it reasons over his whole portfolio of pending tasks in one shot rather than firing an isolated message per task.

**Processing:**
1. Query Firestore `tasks` where `status == "pending"`, grouped by `source_chat_id`.
2. For each chat's task list, Follow-up Agent (Gemini) reasons over the *entire* list at once — not one task in isolation — and returns: a per-task decision (`remind` / `escalate` / `skip`, based on `due_date` proximity and `reminder_count`) plus **one** consolidated digest message. It's also asked to call out cross-task patterns (e.g. the same owner behind on multiple items) when there genuinely is one.
3. If the digest is non-empty, sends it via Telegram `sendMessage` to that `source_chat_id` — at most one message per chat per run, never one per task.
4. For each non-`skip` task, updates its doc (`reminder_count`, `last_reminder_at`, `escalated`) and appends an entry to `tasks/{taskId}/events`.

`escalated_to` in the schema is currently unused (see `docs/firestore-schema.md`) — escalation means the digest's tone shifts and the task's `status` becomes `"escalated"`, not that a second person gets messaged (the bot has no way to reach anyone but Mateo).
