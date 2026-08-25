# Architecture diagram — hand-drawing blueprint

Exact content and layout to recreate the diagram by hand (PowerPoint, Figma, whiteboard, paper). Nothing here is guesswork — the flow, labels, and grouping were already validated through several rendered iterations; only the automated rendering kept breaking, not the content.

## Rough layout (not to scale)

```
 ┌──────────────┐        ╔═══════════════ GOOGLE CLOUD (dashed box) ═══════════════╗       ┌──────────────┐
 │     YOU      │        ║                                                        ║       │  DASHBOARD   │
 │ Telegram chat│        ║   ┌─────────────────┐                                  ║       │ React browser│
 │ with the bot │        ║   │ EXTRACTION AGENT│                                  ║       │  no backend  │
 └──────┬───▲───┘        ║   └────────┬────────┘                                  ║       └──────▲───────┘
        │   │            ║            │                                          ║              │
    (1) │   │ (3)        ║            │ (2)                    ┌──────────────┐  ║              │
        │   │            ║            └───────────────────────►│              │  ║  (dashed,     │
        └───┼────────────╫───────────────────────────────────► │  FIRESTORE   │◄─╫──both ways)───┘
            │            ║                                     │ (shared DB)  │  ║
            │            ║   ┌─────────────────┐         (4)   │              │  ║
            │       (6)  ║   │ CLOUD SCHEDULER │────┐   ┌──────►│              │  ║
            └────────────╫───│  daily, 9am     │    │   │  (5, dashed)         │  ║
                         ║   └─────────────────┘    │   │  tool call            │  ║
                         ║            triggers ▼    │   │                       │  ║
                         ║   ┌─────────────────┐    │   │                       │  ║
                         ║   │ FOLLOW-UP AGENT │◄───┘   └───────────────────────┘  ║
                         ║   └─────────────────┘                                   ║
                         ╚═════════════════════════════════════════════════════════╝
```

## The two boxes outside "Google Cloud"

**You**
- Box style: light gray fill, thin border, plain rectangle. No icon needed (or a simple chat-bubble icon).
- Text: "**You**" (bold, larger) then "Telegram chat with the bot" (smaller, gray).

**Dashboard**
- Same plain box style as "You".
- Text: "**Dashboard**" (bold) then "React, browser only, no backend" (smaller, gray).

## The "Google Cloud" container

One big rounded rectangle with a **dashed border**, light gray fill, labeled top-left: **"GOOGLE CLOUD — runs by itself, nothing inside needs a human to operate it"**. If you have access to official icons (draw.io/Lucid GCP libraries, or Google's icon site), use the real "Google Cloud" logo container shape — it has the small colored Google logo in the corner.

Inside it, four boxes:

1. **Extraction Agent** — icon: Cloud Functions. Text: "Extraction Agent" (bold) / "Cloud Function (Gen2)" / "Google ADK · Gemini 3.5" (smaller, gray).
2. **Cloud Scheduler** — icon: a clock/timer. Text: "Cloud Scheduler" (bold) / "daily, 9am — nobody clicks anything".
3. **Follow-up Agent** — icon: Cloud Functions (same icon as Extraction Agent — it's the same GCP service). Text: "Follow-up Agent" (bold) / "Cloud Function (Gen2)" / "Google ADK · Gemini 3.5".
4. **Firestore** — icon: database/cylinder, or the official Firestore icon. Text: "Firestore" (bold) / "the shared memory".

Layout inside the box: Extraction Agent top-left, Cloud Scheduler below it, Follow-up Agent below that (so it reads top-to-bottom: Extraction → Scheduler → Follow-up). Firestore sits to the right, roughly vertically centered between Extraction Agent and Follow-up Agent, since both connect to it.

## Colors (the whole point of the diagram)

Three colors, used consistently for both arrows and the legend:

| Color | Meaning | Hex (if you want exact) |
|---|---|---|
| 🟦 Indigo | **You act** — triggered by a message you send | `#3D4FC0` |
| 🟧 Amber | **It acts on its own** — triggered by a clock, not a person | `#B9631A` |
| 🟩 Teal | **Live view** — same data both agents write, no Cloud Function needed | `#157A63` |

## Arrows, in order

Draw these as labeled arrows. Solid = normal action. Dashed = the two "special" mechanisms (tool call, and the dashboard's direct-to-database link).

| # | Color | Style | From → To | Label |
|---|---|---|---|---|
| 1 | Indigo | solid | You → Extraction Agent | "sends a voice note or text" |
| 2 | Indigo | solid | Extraction Agent → Firestore | "extracts & saves tasks" |
| 3 | Indigo | solid | Extraction Agent → You (return arrow) | "confirms what got saved" |
| — | Amber | solid | Cloud Scheduler → Follow-up Agent | "triggers — no human" |
| 4 | Amber | solid | Follow-up Agent → Firestore | "reviews every pending task" |
| 5 | Amber | **dashed** | Follow-up Agent ↔ Firestore | "tool call: checks a task's history (only if the count alone is ambiguous)" |
| 6 | Amber | solid | Follow-up Agent → You (return arrow) | "sends one digest, only if something needs attention" |
| 7 | Teal | **dashed**, both directions | Firestore ↔ Dashboard | "reads live · marks done — no Cloud Function in between" |

Tip to avoid overlap when you draw arrows 1 and 3 (both connect You and Extraction Agent, opposite directions): route arrow 1 from the **top** of the You box to the **left side** of Extraction Agent, and route arrow 3 from the **bottom** of Extraction Agent back to a **lower point** on the You box. Same trick for arrows 4/5/6 around Follow-up Agent — spread their connection points (top/middle/bottom) on the box edges so the lines don't stack on each other.

## One-paragraph caption (put this under the diagram)

> Two independent loops share one Firestore database. The indigo loop only runs when you write to the bot. The amber loop runs on Cloud Scheduler's clock, once a day, whether or not you've touched anything — it decides on its own who to remind, escalates the ones that have gone unanswered, and can pull a task's real history before deciding, instead of trusting a raw count. The dashboard is the odd one out: it never goes through a Cloud Function at all — it's a browser talking straight to Firestore, gated by security rules instead of a server.

## "Built with" footer (small text/chips at the bottom, optional but useful for judges scanning quickly)

`Gemini 3.5 Flash` · `Google ADK` · `Cloud Functions (Gen2)` · `Cloud Firestore` · `Cloud Scheduler` · `Firebase Hosting + Security Rules` · `Telegram Bot API` · `React`
