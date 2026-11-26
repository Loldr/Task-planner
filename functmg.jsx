import { useState, useEffect, useMemo } from "react";
import "./App.css";

const STORAGE_KEY = "task-tracker:v1";

const SEED = [
  { id: 1, title: "Plan this week’s priorities", priority: "high", due: "", done: false },
  { id: 2, title: "Reply to open emails", priority: "medium", due: "", done: false },
  { id: 3, title: "Book a dentist appointment", priority: "low", due: "", done: true },
];

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore storage errors and fall back to the seed tasks
  }
  return SEED;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const formatDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

function Task({ task, onToggle, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const overdue = task.due && !task.done && task.due < todayStr();

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onRename(task.id, trimmed);
    else setDraft(task.title);
    setEditing(false);
  };

  return (
    <li className={`task ${task.priority} ${task.done ? "done" : ""}`}>
      <input
        type="checkbox"
        className="check"
        checked={task.done}
        onChange={() => onToggle(task.id)}
        aria-label={`Mark “${task.title}” as done`}
      />

      <div className="body">
        {editing ? (
          <input
            className="edit"
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(task.title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <div
            className="name"
            onDoubleClick={() => setEditing(true)}
            title="Double-click to edit"
          >
            {task.title}
          </div>
        )}

        <div className="meta">
          {task.priority} priority
          {task.due && (
            <span>
              {" · "}
              <span className={overdue ? "overdue" : ""}>
                {overdue ? "Overdue, " : "Due "}
                {formatDate(task.due)}
              </span>
            </span>
          )}
        </div>
      </div>

      <button
        className="del"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete “${task.title}”`}
      >
        ×
      </button>
    </li>
  );
}

export default function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [filter, setFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");
  const [theme, setTheme] = useState(null); // null = follow system

  // Persist tasks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      // Ignore storage errors
    }
  }, [tasks]);

  // Apply manual theme override
  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const addTask = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTasks([{ id: Date.now(), title: trimmed, priority, due, done: false }, ...tasks]);
    setTitle("");
    setDue("");
  };

  const toggleTask = (id) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const deleteTask = (id) => setTasks(tasks.filter((t) => t.id !== id));

  const renameTask = (id, newTitle) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, title: newTitle } : t)));

  const doneCount = tasks.filter((t) => t.done).length;

  const visibleTasks = useMemo(() => {
    const list = tasks.filter((t) =>
      filter === "all" ? true : filter === "done" ? t.done : !t.done
    );
    return [...list].sort(
      (a, b) => a.done - b.done || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    );
  }, [tasks, filter]);

  const isDark = theme
    ? theme === "dark"
    : window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

  const emptyText =
    tasks.length === 0
      ? "No tasks yet. Add your first one above."
      : filter === "done"
      ? "Nothing completed yet."
      : "All caught up. Nice work.";

  return (
    <div className="app">
      <header>
        <div>
          <h1>Tasks</h1>
          <p className="sub">Double-click a task to rename it.</p>
        </div>
        <button
          className="icon-btn"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle light and dark theme"
        >
          {isDark ? "☀" : "☾"}
        </button>
      </header>

      <div className="meter" aria-label={`${doneCount} of ${tasks.length} tasks done`}>
        <div className="segments">
          {tasks.slice(0, 24).map((t, i) => (
            <div key={t.id} className={`seg ${i < doneCount ? "on" : ""}`} />
          ))}
        </div>
        <div className="meter-text">
          <span>
            <strong>{doneCount}</strong> of {tasks.length} done
          </span>
          <span>{tasks.length - doneCount} remaining</span>
        </div>
      </div>

      <form className="add" onSubmit={addTask}>
        <input
          className="title"
          type="text"
          placeholder="What needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Task title"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Priority"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Due date"
        />
        <button className="btn" type="submit">
          Add task
        </button>
      </form>

      <div className="tabs" role="group" aria-label="Filter tasks">
        {["all", "active", "done"].map((f) => (
          <button
            key={f}
            className="tab"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {visibleTasks.length === 0 ? (
        <div className="empty">{emptyText}</div>
      ) : (
        <ul>
          {visibleTasks.map((t) => (
            <Task
              key={t.id}
              task={t}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onRename={renameTask}
            />
          ))}
        </ul>
      )}

      {doneCount > 0 && (
        <div className="foot">
          <span>{doneCount} completed</span>
          <button
            className="link"
            onClick={() => setTasks(tasks.filter((t) => !t.done))}
          >
            Clear completed
          </button>
        </div>
      )}
    </div>
  );
}
