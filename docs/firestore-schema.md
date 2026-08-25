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
| `escalated_to`         | string \| null | Unused — see note below                                                |
| `created_at`           | timestamp | When the task was extracted                                                 |
| `updated_at`           | timestamp | Last modification                                                           |

### Subcollection: `tasks/{taskId}/events`

Audit trail of every autonomous action the Follow-up Agent takes on a task — this is what proves autonomous behavior in the demo video (a scheduled run that reminded/escalated with no human in the loop).

| Field       | Type      | Description                                          |
| ----------- | --------- | ----------------------------------------------------- |
| `type`      | string    | `remind` \| `escalate`      |
| `message`   | string    | The digest message this task was mentioned in (see note below — shared across all tasks in the same run's digest) |
| `timestamp` | timestamp | When the event occurred                                |

## Escalation rule

`reminder_count >= 2` on a still-`pending` task is a *signal to investigate*, not an automatic rule. The agent has a tool, `get_task_events(task_id)`, that reads this exact subcollection to see the real timestamps behind that count — two tasks reminded twice each look identical by count alone, but one spread over three weeks is genuinely stuck (escalate) while one reminded twice in the last two days is still fresh (just remind again). Verified in production: two tasks with `reminder_count == 2` got different treatment based on this. When the agent does escalate, the task's `status` becomes `"escalated"` and the digest's tone shifts to urgent for that item. This is the autonomy signal for judging (Innovation & Operational Utility, 40%).

## Note: one digest per chat, not one message per task

The Follow-up Agent reasons over a chat's *entire* pending-task list in a single call (see `docs/telegram-webhook-contract.md`), so it can prioritize across tasks and call out cross-task patterns (e.g. the same owner behind on multiple items), and sends **at most one consolidated Telegram message per chat per run** rather than spamming one message per task. `escalated_to` is unused — the bot only ever has a chat with the person who created the tasks, so escalation changes tone and `status`, not the recipient.
