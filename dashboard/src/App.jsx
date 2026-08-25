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
  remind: "Reminded",
  escalate: "Escalated",
};

function formatDueDate(due_date) {
  if (!due_date) return { label: "No due date", overdue: false };
  const date = due_date.toDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date - today) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

function EventsTimeline({ taskId }) {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "tasks", taskId, "events"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [taskId]);

  if (events === null) return <p className="detail-loading">Loading history…</p>;
  if (events.length === 0) return <p className="detail-empty">No autonomous actions yet — the daily agent hasn't needed to act on this one.</p>;

  return (
    <ol className="timeline">
      {events.map((e) => (
        <li key={e.id} className={`timeline-item timeline-${e.type}`}>
          <span className="timeline-dot" aria-hidden="true" />
          <div className="timeline-body">
            <span className="timeline-type">{EVENT_LABEL[e.type] ?? e.type}</span>
            <span className="timeline-time">{timeAgo(e.timestamp?.toDate?.())}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TaskDetail({ task }) {
  return (
    <div className="task-detail">
      {task.raw_transcript && (
        <div className="detail-block">
          <h3>Original message</h3>
          <p className="transcript">"{task.raw_transcript}"</p>
        </div>
      )}
      <div className="detail-block">
        <h3>Autonomous history</h3>
        <EventsTimeline taskId={task.id} />
      </div>
    </div>
  );
}

function TaskCard({ task, index, expanded, onToggle, onMarkDone }) {
  const due = formatDueDate(task.due_date);
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
        <div className="task-main">
          <p className="task-description">{task.description}</p>
          <div className="task-meta">
            <span className="task-owner">{task.owner_name}</span>
            <span className="task-meta-dot" aria-hidden="true" />
            <span className={due.overdue ? "task-due is-overdue" : "task-due"}>{due.label}</span>
            {task.reminder_count > 0 && (
              <>
                <span className="task-meta-dot" aria-hidden="true" />
                <span className="task-reminders">
                  {task.reminder_count} reminder{task.reminder_count === 1 ? "" : "s"} sent
                </span>
              </>
            )}
          </div>
        </div>
        <div className="task-actions">
          <span className={`status-badge status-${task.status}`}>{task.status}</span>
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

function InsightsBar({ tasks, filterOwner, onFilterOwner }) {
  const open = tasks.filter((t) => t.status !== "done");
  const escalated = tasks.filter((t) => t.status === "escalated");

  const byOwner = useMemo(() => {
    const map = new Map();
    for (const t of open) {
      if (!map.has(t.owner_name)) map.set(t.owner_name, { count: 0, hasEscalated: false });
      const entry = map.get(t.owner_name);
      entry.count += 1;
      if (t.status === "escalated") entry.hasEscalated = true;
    }
    return [...map.entries()]
      .map(([owner, v]) => ({ owner, ...v }))
      .sort((a, b) => b.count - a.count || b.hasEscalated - a.hasEscalated);
  }, [open]);

  return (
    <div className="insights">
      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-value">{open.length}</span>
          <span className="stat-label">Open</span>
        </div>
        <div className="stat-tile stat-tile-danger">
          <span className="stat-value">{escalated.length}</span>
          <span className="stat-label">Escalated</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{tasks.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      {byOwner.length > 1 && (
        <div className="owner-chips">
          {byOwner.map(({ owner, count, hasEscalated }) => (
            <button
              key={owner}
              className={`owner-chip ${hasEscalated ? "owner-chip-danger" : ""} ${filterOwner === owner ? "is-active" : ""}`}
              onClick={() => onFilterOwner(filterOwner === owner ? null : owner)}
            >
              {owner} <span className="owner-chip-count">{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterOwner, setFilterOwner] = useState(null);

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
      <Toaster position="bottom-right" theme="dark" richColors closeButton />

      <header>
        <h1>Meeting Follow-up Agent</h1>
        <p className="subtitle">
          {loading ? "Loading…" : "Every task your agents are tracking on your behalf."}
        </p>
      </header>

      {!loading && tasks.length === 0 && (
        <div className="empty-state">
          <p>No tasks yet.</p>
          <p className="empty-state-hint">Send a voice note or text to the Telegram bot to get started.</p>
        </div>
      )}

      {tasks.length > 0 && <InsightsBar tasks={tasks} filterOwner={filterOwner} onFilterOwner={setFilterOwner} />}

      {filterOwner && (
        <div className="filter-banner">
          Showing tasks for <strong>{filterOwner}</strong>
          <button className="filter-clear" onClick={() => setFilterOwner(null)}>
            Clear
          </button>
        </div>
      )}

      {grouped.map((group) => (
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
      ))}
    </div>
  );
}
