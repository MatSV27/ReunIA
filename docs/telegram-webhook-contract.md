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

- `sendMessage` — confirmations (Extraction Agent), reminders/escalations (Follow-up Agent)
- `getFile` + file download — fetching voice note audio (Extraction Agent)

## Trigger: Follow-up Agent (Cloud Scheduler → HTTP)

Cloud Scheduler calls `POST /followup-run` (followup-agent Cloud Function) on a cron schedule (daily). No Telegram involvement on the inbound side — this endpoint is protected by a separate check (Cloud Scheduler's OIDC token), not the Telegram secret.

**Processing:**
1. Query Firestore `tasks` where `status == "pending"`.
2. For each task, Follow-up Agent (Gemini) decides: send reminder, escalate, or skip — based on `due_date` proximity and `reminder_count`.
3. Sends the resulting message via Telegram `sendMessage` to `source_chat_id` (or `escalated_to` if escalating).
4. Updates the task doc (`reminder_count`, `last_reminder_at`, `escalated`) and appends an entry to `tasks/{taskId}/events`.
