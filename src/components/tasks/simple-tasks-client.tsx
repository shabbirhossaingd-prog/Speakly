"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, Circle, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  deleteStudyTask,
  listStudyProjects,
  listStudySubjects,
  listStudyTasks,
  saveStudyTask,
  type StudyProject,
  type StudySubject,
  type StudyTask,
} from "@/lib/local-study-db";

type View = "today" | "upcoming" | "all" | "done";

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function fromDateInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isToday(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function dueLabel(value: string | null | undefined) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (isToday(value)) return `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function blankTask(title = ""): StudyTask {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    description: "",
    subjectId: null,
    projectId: null,
    kind: "study",
    priority: "medium",
    status: "todo",
    startAt: null,
    dueAt: null,
    reminderAt: null,
    estimateMinutes: 0,
    spentMinutes: 0,
    progress: 0,
    recurrence: "none",
    checklist: [],
    resources: [],
    tags: [],
    blockedByIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function SimpleTasksClient() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [view, setView] = useState<View>("today");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [showAddDetails, setShowAddDetails] = useState(false);
  const [priority, setPriority] = useState<StudyTask["priority"]>("medium");
  const [subjectId, setSubjectId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [editing, setEditing] = useState<StudyTask | null>(null);

  async function refresh() {
    const [nextTasks, nextProjects, nextSubjects] = await Promise.all([listStudyTasks(), listStudyProjects(), listStudySubjects()]);
    setTasks(nextTasks);
    setProjects(nextProjects);
    setSubjects(nextSubjects);
  }

  useEffect(() => { refresh().catch(() => {}); }, []);

  const visible = useMemo(() => {
    const open = tasks.filter((task) => task.status !== "done");
    if (view === "done") return tasks.filter((task) => task.status === "done");
    if (view === "today") return open.filter((task) => isToday(task.dueAt) || task.status === "in_progress");
    if (view === "upcoming") return open.filter((task) => task.dueAt && !isToday(task.dueAt) && new Date(task.dueAt).getTime() > Date.now()).sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || ""));
    return open;
  }, [tasks, view]);

  const counts = useMemo(() => ({
    today: tasks.filter((task) => task.status !== "done" && (isToday(task.dueAt) || task.status === "in_progress")).length,
    upcoming: tasks.filter((task) => task.status !== "done" && task.dueAt && !isToday(task.dueAt) && new Date(task.dueAt).getTime() > Date.now()).length,
    all: tasks.filter((task) => task.status !== "done").length,
    done: tasks.filter((task) => task.status === "done").length,
  }), [tasks]);

  async function addTask() {
    if (!title.trim()) return;
    const task = blankTask(title.trim());
    task.dueAt = fromDateInput(due);
    task.priority = priority;
    task.subjectId = subjectId || null;
    task.projectId = projectId || null;
    await saveStudyTask(task);
    setTitle("");
    setDue("");
    setPriority("medium");
    setSubjectId("");
    setProjectId("");
    setShowAddDetails(false);
    await refresh();
  }

  async function toggleDone(task: StudyTask) {
    const done = task.status === "done";
    await saveStudyTask({ ...task, status: done ? "todo" : "done", progress: done ? task.progress || 0 : 100, updatedAt: new Date().toISOString() });
    await refresh();
  }

  async function saveEdit() {
    if (!editing || !editing.title.trim()) return;
    await saveStudyTask({ ...editing, title: editing.title.trim(), updatedAt: new Date().toISOString() });
    setEditing(null);
    await refresh();
  }

  async function remove(task: StudyTask) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    await deleteStudyTask(task.id);
    setEditing(null);
    await refresh();
  }

  function subjectName(id: string | null | undefined) {
    return subjects.find((subject) => subject.id === id)?.name || "";
  }

  function projectName(id: string | null | undefined) {
    return projects.find((project) => project.id === id)?.name || "";
  }

  return (
    <AppShell title="Tasks" subtitle="Write it down, choose when, and get it done.">
      <div className="mx-auto max-w-4xl">
        <section className="border-b pb-5" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addTask()}
              className="min-w-0 flex-1 rounded-lg border bg-[rgb(var(--surface))] px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10"
              style={{ borderColor: "rgb(var(--border))" }}
              placeholder="What do you need to do?"
            />
            <button onClick={addTask} disabled={!title.trim()} className="button-primary px-4 disabled:opacity-40"><Plus size={16}/>Add</button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} className="rounded-lg border bg-transparent px-3 py-2 text-xs text-muted outline-none" style={{ borderColor: "rgb(var(--border))" }}/>
            <button onClick={() => setShowAddDetails((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-black/[0.035] dark:hover:bg-white/[0.05]">More details <ChevronDown size={13} className={showAddDetails ? "rotate-180" : ""}/></button>
          </div>

          {showAddDetails && (
            <div className="mt-3 grid gap-2 rounded-lg bg-[rgb(var(--surface-muted))] p-3 sm:grid-cols-3">
              <label className="text-[11px] text-muted">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as StudyTask["priority"])} className="mt-1 block w-full rounded-md border bg-[rgb(var(--surface))] px-2.5 py-2 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
              <label className="text-[11px] text-muted">Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 block w-full rounded-md border bg-[rgb(var(--surface))] px-2.5 py-2 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }}><option value="">None</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
              <label className="text-[11px] text-muted">Project<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-1 block w-full rounded-md border bg-[rgb(var(--surface))] px-2.5 py-2 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }}><option value="">None</option>{projects.filter((project) => !["completed", "archived"].includes(project.status)).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            </div>
          )}
        </section>

        <div className="mt-5 flex items-center gap-1 overflow-x-auto border-b" style={{ borderColor: "rgb(var(--border))" }}>
          {([
            ["today", "Today"],
            ["upcoming", "Upcoming"],
            ["all", "All"],
            ["done", "Completed"],
          ] as [View, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm ${view === key ? "border-violet-600 font-semibold text-violet-700 dark:text-violet-300" : "border-transparent text-muted hover:text-[rgb(var(--foreground))]"}`}>
              {label} <span className="ml-1 text-xs opacity-60">{counts[key]}</span>
            </button>
          ))}
          <Link href="/tasks/advanced" className="ml-auto whitespace-nowrap px-3 py-2.5 text-xs text-muted hover:text-violet-600">Advanced planner →</Link>
        </div>

        <section className="divide-y" style={{ borderColor: "rgb(var(--border))" }}>
          {visible.map((task) => {
            const subject = subjectName(task.subjectId);
            const project = projectName(task.projectId);
            return (
              <div key={task.id} className="group flex items-start gap-3 py-3.5">
                <button onClick={() => toggleDone(task)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${task.status === "done" ? "border-violet-600 bg-violet-600 text-white" : "text-transparent hover:border-violet-500"}`} style={task.status === "done" ? undefined : { borderColor: "rgb(var(--border))" }} aria-label={task.status === "done" ? "Mark not done" : "Mark done"}>{task.status === "done" ? <Check size={13}/> : <Circle size={0}/>}</button>

                <button onClick={() => setEditing({ ...task })} className="min-w-0 flex-1 text-left">
                  <p className={`text-sm font-medium ${task.status === "done" ? "text-muted line-through" : ""}`}>{task.title}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    <span className={task.dueAt && new Date(task.dueAt).getTime() < Date.now() && task.status !== "done" ? "text-red-600" : ""}>{dueLabel(task.dueAt)}</span>
                    {project && <span>{project}</span>}
                    {!project && subject && <span>{subject}</span>}
                    {task.priority === "high" && <span className="text-amber-600">High priority</span>}
                  </div>
                </button>

                <details className="relative opacity-60 group-hover:opacity-100">
                  <summary className="cursor-pointer list-none rounded-md p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]" aria-label="Task actions"><MoreHorizontal size={17}/></summary>
                  <div className="surface absolute right-0 top-8 z-30 w-36 rounded-lg p-1 shadow-lg">
                    <button onClick={() => setEditing({ ...task })} className="w-full rounded-md px-3 py-2 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">Edit</button>
                    <button onClick={() => remove(task)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-500/10"><Trash2 size={13}/>Delete</button>
                  </div>
                </details>
              </div>
            );
          })}

          {!visible.length && (
            <div className="py-16 text-center">
              <Check size={28} className="mx-auto text-violet-500"/>
              <h2 className="mt-3 text-base font-semibold">{view === "today" ? "Nothing urgent today" : view === "done" ? "No completed tasks yet" : "No tasks here"}</h2>
              <p className="mt-1 text-sm text-muted">Use the box above to add your next task.</p>
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
          <div className="surface w-full max-w-lg rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Edit task</h2><button onClick={() => setEditing(null)} className="rounded-md p-1.5 text-muted hover:bg-black/5"><X size={17}/></button></div>
            <div className="mt-4 space-y-3">
              <input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm font-medium outline-none focus:border-violet-400" style={{ borderColor: "rgb(var(--border))" }}/>
              <textarea value={editing.description || ""} onChange={(event) => setEditing({ ...editing, description: event.target.value })} className="min-h-24 w-full rounded-lg border bg-transparent p-3 text-sm outline-none focus:border-violet-400" style={{ borderColor: "rgb(var(--border))" }} placeholder="Optional notes"/>
              <label className="block text-xs text-muted">Deadline<input type="datetime-local" value={toDateInput(editing.dueAt)} onChange={(event) => setEditing({ ...editing, dueAt: fromDateInput(event.target.value) })} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }}/></label>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs text-muted">Priority<select value={editing.priority} onChange={(event) => setEditing({ ...editing, priority: event.target.value as StudyTask["priority"] })} className="mt-1 block w-full rounded-lg border bg-[rgb(var(--surface))] px-2.5 py-2.5 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                <label className="text-xs text-muted">Subject<select value={editing.subjectId || ""} onChange={(event) => setEditing({ ...editing, subjectId: event.target.value || null })} className="mt-1 block w-full rounded-lg border bg-[rgb(var(--surface))] px-2.5 py-2.5 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }}><option value="">None</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <label className="text-xs text-muted">Project<select value={editing.projectId || ""} onChange={(event) => setEditing({ ...editing, projectId: event.target.value || null })} className="mt-1 block w-full rounded-lg border bg-[rgb(var(--surface))] px-2.5 py-2.5 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }}><option value="">None</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button onClick={() => remove(editing)} className="text-xs text-red-600">Delete task</button>
              <div className="flex gap-2"><button onClick={() => setEditing(null)} className="button-secondary">Cancel</button><button onClick={saveEdit} className="button-primary">Save</button></div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
