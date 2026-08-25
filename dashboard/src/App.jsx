import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import "./App.css";

const STATUS_ORDER = { escalated: 0, pending: 1, done: 2 };

function formatDueDate(due_date) {
  if (!due_date) return "No due date";
  const date = due_date.toDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date - today) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diffDays < 0) return { label: `${label} (overdue)`, overdue: true };
  if (diffDays === 0) return { label: `${label} (today)`, overdue: false };
  return { label, overdue: false };
}

function TaskCard({ task, onMarkDone }) {
  const due = formatDueDate(task.due_date);
  const dueLabel = typeof due === "string" ? due : due.label;
  const dueOverdue = typeof due === "string" ? false : due.overdue;

  return (
    <div className={`task-card status-${task.status}`}>
      <div className="task-main">
        <div className="task-description">{task.description}</div>
        <div className="task-meta">
          <span className="task-owner">{task.owner_name}</span>
          <span className={`task-due ${dueOverdue ? "overdue" : ""}`}>{dueLabel}</span>
          {task.reminder_count > 0 && (
            <span className="task-reminders">{task.reminder_count} reminder(s) sent</span>
          )}
        </div>
      </div>
      <div className="task-actions">
        <span className={`status-badge status-${task.status}`}>{task.status}</span>
        {task.status !== "done" && (
          <button onClick={() => onMarkDone(task.id)}>Mark done</button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => {
        const statusDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
        if (statusDiff !== 0) return statusDiff;
        const aDue = a.due_date?.toMillis?.() ?? Infinity;
        const bDue = b.due_date?.toMillis?.() ?? Infinity;
        return aDue - bDue;
      });
      setTasks(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const markDone = async (taskId) => {
    await updateDoc(doc(db, "tasks", taskId), {
      status: "done",
      updated_at: serverTimestamp(),
    });
  };

  const pendingCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="app">
      <header>
        <h1>Meeting Follow-up Agent</h1>
        <p className="subtitle">
          {loading ? "Loading..." : `${pendingCount} open task(s) of ${tasks.length} total`}
        </p>
      </header>

      {!loading && tasks.length === 0 && (
        <p className="empty-state">No tasks yet — send a voice note or text to the Telegram bot.</p>
      )}

      <div className="task-list">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onMarkDone={markDone} />
        ))}
      </div>
    </div>
  );
}
