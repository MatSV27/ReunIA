import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { Toaster, toast } from "sonner";
import { db } from "./firebase";
import "./App.css";

const GROUPS = [
  { status: "escalated", label: "Needs attention" },
  { status: "pending", label: "Pending" },
  { status: "done", label: "Done" },
];

const EVENT_LABEL = {
  remind: "Follow-up Agent sent a reminder",
  escalate: "Follow-up Agent escalated this task",
};

const STATUS_EXPLAIN = {
  pending: "Waiting on the owner. The Follow-up Agent checks in on it during its next run.",
  escalated:
    "The Follow-up Agent read this task's full reminder history and decided, on its own, that it's genuinely stuck — not just recently nudged.",
  done: "Marked complete.",
};

// Validated categorical hues (blue/orange/aqua/yellow/magenta/violet) — green and red
// are deliberately excluded, since those already mean "done" and "escalated" elsewhere.
const OWNER_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#4a3aa7"];

function ownerColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return OWNER_COLORS[hash % OWNER_COLORS.length];
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function OwnerAvatar({ name, size = "" }) {
  return (
    <span className={`owner-avatar ${size}`} style={{ "--owner-color": ownerColor(name) }} title={name}>
      {initials(name)}
    </span>
  );
}

// Demo tasks were seeded straight into Firestore (backdated due dates, hand-authored
// event history) to show escalation without waiting real days for it to happen.
// They're flagged with this exact placeholder instead of a real transcript.
function isSyntheticTranscript(text) {
  if (!text) return false;
  return text.trim().replace(/^\(|\)$/g, "").toLowerCase() === "synthetic";
}

function formatDueDate(due_date) {
  if (!due_date) return { label: "No due date", overdue: false };
  const date = due_date.toDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date - today) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffDays < 0) return { label: `${label} · overdue`, overdue: true };
  if (diffDays === 0) return { label: `${label} · today`, overdue: false };
  return { label, overdue: false };
}

function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function EventsTimeline({ taskId }) {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "tasks", taskId, "events"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [taskId]);

  if (events === null) return <p className="detail-loading">Loading activity…</p>;
  if (events.length === 0)
    return (
      <p className="detail-empty">
        Nothing yet — the Follow-up Agent runs once a day and hasn't needed to act on this task.
      </p>
    );

  return (
    <ol className="timeline">
      {events.map((e) => (
        <li key={e.id} className={`timeline-item timeline-${e.type}`}>
          <span className="timeline-dot" aria-hidden="true" />
          <div className="timeline-body">
            <div className="timeline-head">
              <span className="timeline-type">{EVENT_LABEL[e.type] ?? e.type}</span>
              <span className="timeline-time">{timeAgo(e.timestamp?.toDate?.())}</span>
            </div>
            {e.message && (
              <details className="timeline-message">
                <summary>What the agent actually said</summary>
                <p>{e.message}</p>
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function TaskDetail({ task }) {
  const synthetic = isSyntheticTranscript(task.raw_transcript);

  return (
    <div className="task-detail">
      {synthetic ? (
        <div className="detail-block">
          <h3>Demo data</h3>
          <p className="synthetic-note">
            Seeded directly in Firestore (backdated due date + hand-authored activity) to
            demonstrate escalation without waiting real days for it — not from an actual message.
          </p>
        </div>
      ) : (
        task.raw_transcript && (
          <div className="detail-block">
            <h3>Original message</h3>
            <p className="transcript">"{task.raw_transcript}"</p>
          </div>
        )
      )}
      <div className="detail-block">
        <h3>Agent activity</h3>
        <EventsTimeline taskId={task.id} />
      </div>
    </div>
  );
}

function TaskCard({ task, index, expanded, onToggle, onMarkDone }) {
  const due = formatDueDate(task.due_date);
  const synthetic = isSyntheticTranscript(task.raw_transcript);
  const [leaving, setLeaving] = useState(false);

  const handleMarkDone = (e) => {
    e.stopPropagation();
    setLeaving(true);
    window.setTimeout(() => onMarkDone(task), 180);
  };

  return (
    <div
      className={`task-card status-${task.status} ${leaving ? "is-leaving" : ""} ${expanded ? "is-expanded" : ""}`}
      style={{ "--stagger": index }}
      onClick={() => onToggle(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onToggle(task.id)}
    >
      <div className="task-row">
        <OwnerAvatar name={task.owner_name} size="owner-avatar-lg" />
        <div className="task-main">
          <p className="task-description">{task.description}</p>
          <div className="task-meta">
            <span className="task-owner">{task.owner_name}</span>
            <span className="task-meta-dot" aria-hidden="true" />
            <span className={due.overdue ? "task-due is-overdue" : "task-due"}>📅 {due.label}</span>
            {task.reminder_count > 0 && (
              <>
                <span className="task-meta-dot" aria-hidden="true" />
                <span className="task-reminders">
                  🔔 {task.reminder_count} reminder{task.reminder_count === 1 ? "" : "s"} sent
                </span>
              </>
            )}
            {synthetic && <span className="task-tag-demo">Demo data</span>}
          </div>
        </div>
        <div className="task-actions">
          <span className={`status-badge status-${task.status}`} title={STATUS_EXPLAIN[task.status]}>
            {task.status}
          </span>
          {task.status !== "done" && (
            <button className="mark-done-btn" onClick={handleMarkDone}>
              Mark done
            </button>
          )}
        </div>
        <span className="expand-chevron" aria-hidden="true">
          ⌄
        </span>
      </div>
      {expanded && (
        <div onClick={(e) => e.stopPropagation()}>
          <TaskDetail task={task} />
        </div>
      )}
    </div>
  );
}

function AgentPipeline() {
  return (
    <div className="pipeline" role="note" aria-label="How this system works">
      <div className="pipeline-step">
        <span className="pipeline-icon" aria-hidden="true">
          🎙
        </span>
        <div>
          <p className="pipeline-title">Extraction Agent</p>
          <p className="pipeline-copy">Turns a Telegram voice note or text into a task — owner, due date, description.</p>
        </div>
      </div>
      <span className="pipeline-arrow" aria-hidden="true">
        →
      </span>
      <div className="pipeline-step">
        <span className="pipeline-icon" aria-hidden="true">
          🔁
        </span>
        <div>
          <p className="pipeline-title">Follow-up Agent</p>
          <p className="pipeline-copy">
            Runs daily, decides who needs a nudge, and escalates on its own when someone's gone quiet.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ tasks }) {
  const total = tasks.length;
  if (total === 0) return null;

  const done = tasks.filter((t) => t.status === "done").length;
  const escalated = tasks.filter((t) => t.status === "escalated").length;
  const pending = total - done - escalated;

  return (
    <div className="status-bar">
      <div className="status-bar-track" role="img" aria-label={`${done} done, ${pending} pending, ${escalated} needing attention, out of ${total} tasks`}>
        {done > 0 && <span className="status-bar-seg seg-done" style={{ flex: `${done} 1 0%` }} />}
        {pending > 0 && <span className="status-bar-seg seg-pending" style={{ flex: `${pending} 1 0%` }} />}
        {escalated > 0 && <span className="status-bar-seg seg-escalated" style={{ flex: `${escalated} 1 0%` }} />}
      </div>
      <div className="status-bar-legend">
        <span>
          <i className="dot dot-done" aria-hidden="true" /> {done} done
        </span>
        <span>
          <i className="dot dot-pending" aria-hidden="true" /> {pending} pending
        </span>
        <span>
          <i className="dot dot-escalated" aria-hidden="true" /> {escalated} need attention
        </span>
      </div>
    </div>
  );
}

function OwnerWorkload({ tasks, filterOwner, onFilterOwner }) {
  const open = tasks.filter((t) => t.status !== "done");

  const byOwner = useMemo(() => {
    const map = new Map();
    for (const t of open) {
      if (!map.has(t.owner_name)) map.set(t.owner_name, { count: 0, escalated: 0 });
      const entry = map.get(t.owner_name);
      entry.count += 1;
      if (t.status === "escalated") entry.escalated += 1;
    }
    return [...map.entries()]
      .map(([owner, v]) => ({ owner, ...v }))
      .sort((a, b) => b.count - a.count || b.escalated - a.escalated);
  }, [open]);

  if (byOwner.length === 0) return null;

  const max = Math.max(...byOwner.map((o) => o.count));

  return (
    <div className="workload">
      {byOwner.map(({ owner, count, escalated }) => (
        <button
          key={owner}
          className={`workload-row ${filterOwner === owner ? "is-active" : ""}`}
          onClick={() => onFilterOwner(filterOwner === owner ? null : owner)}
          title={escalated > 0 ? `${escalated} of ${count} needs attention` : `${count} open`}
        >
          <OwnerAvatar name={owner} />
          <span className="workload-name">{owner}</span>
          <span className="workload-track">
            <span className="workload-fill" style={{ width: `${(count / max) * 100}%` }}>
              {escalated > 0 && (
                <span className="workload-fill-escalated" style={{ width: `${(escalated / count) * 100}%` }} />
              )}
            </span>
          </span>
          <span className="workload-count">{count}</span>
        </button>
      ))}
    </div>
  );
}

function InsightsBar({ tasks, filterOwner, onFilterOwner }) {
  const open = tasks.filter((t) => t.status !== "done");
  const escalated = tasks.filter((t) => t.status === "escalated");

  return (
    <div className="insights">
      <div className="stat-tiles">
        <div className="stat-tile" title="Tasks not yet marked done">
          <span className="stat-value">{open.length}</span>
          <span className="stat-label">Open</span>
        </div>
        <div className="stat-tile stat-tile-danger" title={STATUS_EXPLAIN.escalated}>
          <span className="stat-value">{escalated.length}</span>
          <span className="stat-label">Needs attention</span>
        </div>
        <div className="stat-tile" title="Everything the Extraction Agent has ever captured, including finished tasks">
          <span className="stat-value">{tasks.length}</span>
          <span className="stat-label">All tasks</span>
        </div>
      </div>

      <StatusBar tasks={tasks} />

      <p className="panel-heading">Who's carrying what</p>
      <OwnerWorkload tasks={tasks} filterOwner={filterOwner} onFilterOwner={onFilterOwner} />
    </div>
  );
}

function CalendarView({ tasks, expandedId, onToggle, onMarkDone }) {
  // Until the viewer navigates manually, center on whichever open task's due date
  // is closest to today — usually the most pressing thing to look at first.
  const [manualMonth, setManualMonth] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const autoMonth = useMemo(() => {
    const dated = tasks.filter((t) => t.due_date && t.status !== "done");
    if (dated.length === 0) return null;
    const now = new Date();
    const closest = dated.reduce((best, t) =>
      Math.abs(t.due_date.toDate() - now) < Math.abs(best.due_date.toDate() - now) ? t : best
    );
    return startOfMonth(closest.due_date.toDate());
  }, [tasks]);

  const monthCursor = manualMonth ?? autoMonth ?? startOfMonth(new Date());

  const tasksByDate = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = dateKey(t.due_date.toDate());
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return map;
  }, [tasks]);

  const undated = tasks.filter((t) => !t.due_date);
  const todayKey = dateKey(new Date());

  const firstWeekday = monthCursor.getDay();
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstWeekday + 1;
    const cellDate = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), dayNum);
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const key = dateKey(cellDate);
    cells.push({ key, date: cellDate, inMonth, tasks: tasksByDate.get(key) ?? [] });
  }

  const changeMonth = (delta) => {
    setManualMonth(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1));
    setSelectedDate(null);
  };

  const selectedTasks = selectedDate ? (tasksByDate.get(selectedDate) ?? []) : [];
  let stagger = 0;

  return (
    <>
      <div className="calendar">
        <div className="calendar-header">
          <span className="calendar-title">
            {monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <div className="calendar-nav">
            <button onClick={() => changeMonth(-1)} aria-label="Previous month">
              ‹
            </button>
            <button onClick={() => changeMonth(1)} aria-label="Next month">
              ›
            </button>
          </div>
        </div>
        <div className="calendar-weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((cell) => {
            const hasTasks = cell.tasks.length > 0;
            const shown = cell.tasks.slice(0, 3);
            const overflow = cell.tasks.length - shown.length;
            return (
              <div
                key={cell.key}
                className={`calendar-cell ${cell.inMonth ? "" : "is-out"} ${cell.key === todayKey ? "is-today" : ""} ${hasTasks ? "has-tasks" : ""} ${selectedDate === cell.key ? "is-selected" : ""}`}
                onClick={hasTasks ? () => setSelectedDate(selectedDate === cell.key ? null : cell.key) : undefined}
                role={hasTasks ? "button" : undefined}
                tabIndex={hasTasks ? 0 : undefined}
                onKeyDown={hasTasks ? (e) => e.key === "Enter" && setSelectedDate(selectedDate === cell.key ? null : cell.key) : undefined}
              >
                <span className="calendar-daynum">{cell.date.getDate()}</span>
                {hasTasks && (
                  <span className="calendar-dots">
                    {shown.map((t) => (
                      <span key={t.id} className={`calendar-dot calendar-dot-${t.status}`} />
                    ))}
                    {overflow > 0 && <span className="calendar-overflow">+{overflow}</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate ? (
        <div className="calendar-day-panel">
          <p className="panel-heading">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            <button className="panel-heading-clear" onClick={() => setSelectedDate(null)}>
              Clear
            </button>
          </p>
          <div className="task-list">
            {selectedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                index={stagger++}
                expanded={expandedId === task.id}
                onToggle={onToggle}
                onMarkDone={onMarkDone}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="calendar-hint">Click a day with dots to see what's due.</p>
      )}

      {undated.length > 0 && (
        <div className="calendar-day-panel">
          <p className="panel-heading">No due date ({undated.length})</p>
          <div className="task-list">
            {undated.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                index={stagger++}
                expanded={expandedId === task.id}
                onToggle={onToggle}
                onMarkDone={onMarkDone}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterOwner, setFilterOwner] = useState(null);
  const [viewMode, setViewMode] = useState("list");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => {
        const aDue = a.due_date?.toMillis?.() ?? Infinity;
        const bDue = b.due_date?.toMillis?.() ?? Infinity;
        return aDue - bDue;
      });
      setTasks(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const visibleTasks = filterOwner ? tasks.filter((t) => t.owner_name === filterOwner) : tasks;

  const grouped = useMemo(() => {
    return GROUPS.map((g) => ({
      ...g,
      items: visibleTasks.filter((t) => t.status === g.status),
    })).filter((g) => g.items.length > 0);
  }, [visibleTasks]);

  const markDone = async (task) => {
    await updateDoc(doc(db, "tasks", task.id), {
      status: "done",
      updated_at: serverTimestamp(),
    });
    toast.success("Marked as done", { description: task.description });
  };

  const toggleExpanded = (id) => setExpandedId((cur) => (cur === id ? null : id));

  let runningIndex = 0;

  return (
    <div className="app">
      <Toaster position="bottom-right" theme="light" richColors closeButton />

      <header>
        <h1>
          <img src="/reunia-logo.jpg" alt="ReunIA" className="brand-logo" />
        </h1>
        <p className="subtitle">
          {loading
            ? "Loading…"
            : "Two Gemini agents turn meeting notes into tracked tasks, then follow up until they're done."}
        </p>
      </header>

      <AgentPipeline />

      {!loading && tasks.length === 0 && (
        <div className="empty-state">
          <p>No tasks yet.</p>
          <p className="empty-state-hint">Send a voice note or text to the Telegram bot to get started.</p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="app-body">
          <aside className="app-sidebar">
            <InsightsBar tasks={tasks} filterOwner={filterOwner} onFilterOwner={setFilterOwner} />
          </aside>

          <div className="app-main">
            {filterOwner && (
              <div className="filter-banner">
                Showing tasks for <strong>{filterOwner}</strong>
                <button className="filter-clear" onClick={() => setFilterOwner(null)}>
                  Clear
                </button>
              </div>
            )}

            <div className="view-toggle" role="tablist" aria-label="Choose how to view tasks">
              <button role="tab" aria-selected={viewMode === "list"} className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")}>
                List
              </button>
              <button role="tab" aria-selected={viewMode === "calendar"} className={viewMode === "calendar" ? "is-active" : ""} onClick={() => setViewMode("calendar")}>
                Calendar
              </button>
            </div>

            {viewMode === "list"
              ? grouped.map((group) => (
                  <section key={group.status} className="task-group">
                    <h2 className={`group-label group-label-${group.status}`}>{group.label}</h2>
                    <div className="task-list">
                      {group.items.map((task) => {
                        const idx = runningIndex++;
                        return (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={idx}
                            expanded={expandedId === task.id}
                            onToggle={toggleExpanded}
                            onMarkDone={markDone}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))
              : (
                  <CalendarView tasks={visibleTasks} expandedId={expandedId} onToggle={toggleExpanded} onMarkDone={markDone} />
                )}
          </div>
        </div>
      )}
    </div>
  );
}
