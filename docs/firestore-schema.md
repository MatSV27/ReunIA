# Firestore Schema

## Collection: `tasks`

One document per action item extracted from a meeting note.

| Field                 | Type      | Description                                                                 |
| ---------------------- | --------- | ----------------------------------------------------------------------------- |
| `description`         | string    | What needs to be done                                                       |
| `owner_name`           | string    | Person responsible (as stated in the meeting)                               |
| `due_date`             | timestamp \| null | Deadline, if one was mentioned                                     |
| `status`               | string    | `pending` \| `done` \| `escalated`                                     |
| `source_chat_id`       | string    | Telegram chat ID where the task originated                                  |
| `source_message_id`    | string    | Telegram message ID of the original voice note / text                      |
| `raw_transcript`       | string \| null | Original transcript (if the source was a voice note)                   |
| `reminder_count`       | number    | How many reminders have been sent (default `0`)                             |
| `last_reminder_at`     | timestamp \| null | When the last reminder was sent                                    |
| `escalated`            | boolean   | Whether the task has been escalated (default `false`)                       |
| `escalated_to`         | string \| null | Who was notified on escalation                                         |
| `created_at`           | timestamp | When the task was extracted                                                 |
| `updated_at`           | timestamp | Last modification                                                           |

### Subcollection: `tasks/{taskId}/events`

Audit trail of every autonomous action the Follow-up Agent takes on a task — this is what proves autonomous behavior in the demo video (a scheduled run that reminded/escalated with no human in the loop).

| Field       | Type      | Description                                          |
| ----------- | --------- | ----------------------------------------------------- |
| `type`      | string    | `reminder` \| `escalation` \| `completed`      |
| `tone`      | string \| null | Tone Gemini chose for the message (e.g. `neutral`, `urgent`) |
| `message`   | string \| null | The actual message text sent via Telegram         |
| `timestamp` | timestamp | When the event occurred                                |

## Escalation rule

`reminder_count >= 2` and still `pending` → next Follow-up Agent run escalates instead of reminding again: tone shifts to urgent and/or `escalated_to` gets notified. This is the autonomy signal for judging (Innovation & Operational Utility, 40%).
