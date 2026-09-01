"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Activity, CalendarDays, CheckCircle2, ExternalLink, ImagePlus, Link2, ListTodo, Save, Search, X } from "lucide-react";
import {
  listStudyTasks,
  listStudyWorkLogs,
  saveStudyTask,
  saveStudyWorkLog,
  saveStudyWorkLogAsset,
  type StudyTask,
  type StudyWorkLog,
} from "@/lib/local-study-db";

type Mode = "update" | "tasks" | "search";

function nowIso() {
  return new Date().toISOString();
}

function localInputNow() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : nowIso();
}

function searchableText(log: StudyWorkLog) {
  return [
    log.projectName,
    log.title,
    log.taskTitle,
    log.workDone,
    log.problem,
    log.solution,
    log.nextStep,
    log.commitRef,
    log.tags.join(" "),
    log.links.map((link) => `${link.label} ${link.url}`).join(" "),
  ].join(" ").toLowerCase();
}

function searchableTask(task: StudyTask) {
  return [
    task.title,
    task.description || "",
    task.noteTitle || "",
    task.teacher || "",
    task.room || "",
    (task.tags || []).join(" "),
    (task.resources || []).map((item) => `${item.label} ${item.url}`).join(" "),
  ].join(" ").toLowerCase();
}

export function QuickUpdateDock() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("update");
  const [logs, setLogs] = useState<StudyWorkLog[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [occurredAt, setOccurredAt] = useState(localInputNow());
  const [projectName, setProjectName] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [query, setQuery] = useState("");
  const [taskQuery, setTaskQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [message, setMessage] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    const [nextLogs, nextTasks] = await Promise.all([listStudyWorkLogs(), listStudyTasks()]);
    setLogs(nextLogs);
    setTasks(nextTasks);
  }

  useEffect(() => {
    if (!open) return;
    refresh().catch(() => setMessage("Local Study OS storage is unavailable."));
  }, [open]);

  const projects = useMemo(
    () => Array.from(new Set(logs.map((log) => log.projectName).filter(Boolean))).sort(),
    [logs],
  );

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    const matches = text ? logs.filter((log) => searchableText(log).includes(text)) : logs;
    return matches.slice(0, 12);
  }, [logs, query]);

  const taskResults = useMemo(() => {
    const text = taskQuery.trim().toLowerCase();
    const matches = text ? tasks.filter((task) => searchableTask(task).includes(text)) : tasks;
    return matches.slice(0, 18);
  }, [tasks, taskQuery]);

  const selected = logs.find((log) => log.id === selectedId) || null;

  function addScreenshots(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (files.length) setScreenshots((items) => [...items, ...files]);
    event.target.value = "";
  }

  async function saveQuickUpdate() {
    if (!projectName.trim()) return setMessage("Project name দিন।");
    if (!workDone.trim()) return setMessage("আজ কী কাজ করছেন সেটা লিখুন।");

    const now = nowIso();
    const log: StudyWorkLog = {
      id: crypto.randomUUID(),
      occurredAt: fromLocalInput(occurredAt),
      projectName: projectName.trim(),
      title: "Quick work update",
      taskId: null,
      taskTitle: "",
      status: "working",
      workDone: workDone.trim(),
      problem: "",
      solution: "",
      nextStep: "",
      timeMinutes: 0,
      commitRef: "",
      tags: ["quick-update"],
      links: linkUrl.trim() ? [{ id: crypto.randomUUID(), label: "Reference", url: linkUrl.trim() }] : [],
      createdAt: now,
      updatedAt: now,
    };

    await saveStudyWorkLog(log);
    for (const file of screenshots) {
      await saveStudyWorkLogAsset({
        id: crypto.randomUUID(),
        logId: log.id,
        name: file.name,
        type: file.type,
        blob: file,
        createdAt: now,
      });
    }

    setWorkDone("");
    setLinkUrl("");
    setScreenshots([]);
    setOccurredAt(localInputNow());
    setMessage("Update saved on this device.");
    await refresh();
  }

  async function saveQuickTask() {
    if (!editingTask) return;
    if (!editingTask.title.trim()) return setMessage("Task title is required.");
    const saved: StudyTask = {
      ...editingTask,
      title: editingTask.title.trim(),
      progress: editingTask.status === "done" ? 100 : editingTask.progress,
      updatedAt: nowIso(),
    };
    await saveStudyTask(saved);
    setEditingTask(saved);
    setMessage("Task updated on this device.");
    await refresh();
  }

  async function cycleTask(task: StudyTask) {
    const nextStatus: StudyTask["status"] = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    await saveStudyTask({ ...task, status: nextStatus, progress: nextStatus === "done" ? 100 : task.progress, updatedAt: nowIso() });
    if (editingTask?.id === task.id) setEditingTask({ ...task, status: nextStatus, progress: nextStatus === "done" ? 100 : task.progress, updatedAt: nowIso() });
    await refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[70] inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-2xl transition hover:-translate-y-0.5 lg:bottom-6 lg:right-6"
        aria-label="Open update and tasks"
      >
        <Activity size={18}/><span>Update</span>
      </button>
    );
  }

  return (
    <section className="surface fixed bottom-24 right-4 z-[70] w-[min(94vw,460px)] overflow-hidden rounded-3xl border shadow-2xl lg:bottom-6 lg:right-6" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "rgb(var(--border))" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Quick access</p>
          <h3 className="text-base font-black">Update & Tasks</h3>
        </div>
        <button onClick={() => setOpen(false)} className="muted-surface rounded-xl p-2" aria-label="Close quick dock"><X size={17}/></button>
      </div>

      <div className="grid grid-cols-3 gap-1 border-b p-2" style={{ borderColor: "rgb(var(--border))" }}>
        <button onClick={() => setMode("update")} className={`rounded-xl px-3 py-2 text-xs font-bold ${mode === "update" ? "bg-violet-600 text-white" : "text-muted"}`}>Update</button>
        <button onClick={() => setMode("tasks")} className={`rounded-xl px-3 py-2 text-xs font-bold ${mode === "tasks" ? "bg-violet-600 text-white" : "text-muted"}`}>Tasks</button>
        <button onClick={() => setMode("search")} className={`rounded-xl px-3 py-2 text-xs font-bold ${mode === "search" ? "bg-violet-600 text-white" : "text-muted"}`}>Search</button>
      </div>

      {mode === "update" && (
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          <p className="text-xs leading-5 text-muted">Quick log: date, project, what you are doing, link and screenshot.</p>

          <label className="block text-[11px] font-bold text-muted">DATE / TIME
            <input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} className="muted-surface mt-1 block w-full rounded-xl px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-violet-500"/>
          </label>

          <label className="block text-[11px] font-bold text-muted">PROJECT NAME
            <input list="quick-update-projects" value={projectName} onChange={(event) => setProjectName(event.target.value)} className="muted-surface mt-1 block w-full rounded-xl px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. Speakly, Apon UK, Client Dashboard"/>
            <datalist id="quick-update-projects">{projects.map((project) => <option value={project} key={project}/>)}</datalist>
          </label>

          <label className="block text-[11px] font-bold text-muted">WHAT AM I WORKING ON?
            <textarea value={workDone} onChange={(event) => setWorkDone(event.target.value)} className="muted-surface mt-1 min-h-28 w-full rounded-xl p-3 text-sm font-normal leading-6 outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. Reworking task planner UI and fixing responsive spacing..."/>
          </label>

          <label className="block text-[11px] font-bold text-muted">LINK
            <div className="relative mt-1"><Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} className="muted-surface w-full rounded-xl py-2.5 pl-9 pr-3 text-sm font-normal outline-none focus:ring-2 focus:ring-violet-500" placeholder="GitHub, Drive, live page, Figma, reference..."/></div>
          </label>

          <div>
            <input ref={imageInput} hidden type="file" accept="image/*" multiple onChange={addScreenshots}/>
            <button onClick={() => imageInput.current?.click()} className="button-secondary w-full justify-center"><ImagePlus size={16}/>Upload screenshot</button>
            {screenshots.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{screenshots.map((file, index) => <span key={`${file.name}-${index}`} className="muted-surface max-w-full truncate rounded-lg px-2 py-1 text-[10px]">{file.name}</span>)}</div>}
          </div>

          {message && <div className="rounded-xl bg-violet-500/10 px-3 py-2 text-xs text-violet-700">{message}</div>}
          <button onClick={saveQuickUpdate} className="button-primary w-full justify-center"><Save size={16}/>Save update</button>
        </div>
      )}

      {mode === "tasks" && (
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
            <input value={taskQuery} onChange={(event) => { setTaskQuery(event.target.value); setEditingTask(null); }} className="muted-surface w-full rounded-xl py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-violet-500" placeholder="Search task, note, tag, teacher, link..."/>
          </div>

          <div className="mt-3 space-y-2">
            {taskResults.map((task) => (
              <div key={task.id} className="muted-surface rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <button onClick={() => cycleTask(task)} className="mt-0.5" title="Change task status">
                    {task.status === "done" ? <CheckCircle2 size={18} className="text-emerald-600"/> : <ListTodo size={18} className={task.status === "in_progress" ? "text-violet-600" : "text-muted"}/>} 
                  </button>
                  <button onClick={() => setEditingTask((current) => current?.id === task.id ? null : { ...task })} className="min-w-0 flex-1 text-left">
                    <p className={`truncate text-sm font-bold ${task.status === "done" ? "line-through" : ""}`}>{task.title}</p>
                    <p className="mt-1 text-[10px] text-muted">{task.status.replace("_", " ")} • {task.priority}{task.dueAt ? ` • ${new Date(task.dueAt).toLocaleDateString()}` : ""}</p>
                  </button>
                </div>

                {editingTask?.id === task.id && <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "rgb(var(--border))" }}>
                  <input value={editingTask.title} onChange={(event) => setEditingTask({ ...editingTask, title: event.target.value })} className="surface w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500"/>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editingTask.status} onChange={(event) => setEditingTask({ ...editingTask, status: event.target.value as StudyTask["status"] })} className="surface rounded-xl px-3 py-2 text-xs outline-none"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select>
                    <select value={editingTask.priority} onChange={(event) => setEditingTask({ ...editingTask, priority: event.target.value as StudyTask["priority"] })} className="surface rounded-xl px-3 py-2 text-xs outline-none"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
                  </div>
                  <label className="block text-[10px] font-bold text-muted">DEADLINE
                    <input type="datetime-local" value={toLocalInput(editingTask.dueAt)} onChange={(event) => setEditingTask({ ...editingTask, dueAt: event.target.value ? new Date(event.target.value).toISOString() : null })} className="surface mt-1 w-full rounded-xl px-3 py-2 text-xs font-normal outline-none"/>
                  </label>
                  <button onClick={saveQuickTask} className="button-primary w-full justify-center px-3 py-2 text-xs"><Save size={14}/>Save task changes</button>
                </div>}
              </div>
            ))}
            {taskResults.length === 0 && <p className="py-8 text-center text-xs text-muted">No matching task found.</p>}
          </div>

          {message && <div className="mt-3 rounded-xl bg-violet-500/10 px-3 py-2 text-xs text-violet-700">{message}</div>}
          <Link href="/tasks" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-600">Open full Tasks <ExternalLink size={12}/></Link>
        </div>
      )}

      {mode === "search" && (
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
            <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }} className="muted-surface w-full rounded-xl py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-violet-500" placeholder="Search project, old work, bug, solution, link..."/>
          </div>

          <div className="mt-3 space-y-2">
            {results.map((log) => (
              <button key={log.id} onClick={() => setSelectedId((id) => id === log.id ? null : log.id)} className="muted-surface w-full rounded-xl p-3 text-left transition hover:ring-2 hover:ring-violet-500">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{log.projectName}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{log.workDone || log.problem || log.solution || log.title}</p></div>
                  <span className="shrink-0 text-[10px] text-muted">{new Date(log.occurredAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
            {results.length === 0 && <p className="py-8 text-center text-xs text-muted">No matching update found.</p>}
          </div>

          {selected && <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: "rgb(var(--border))" }}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-violet-600">{selected.projectName}</p><p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted"><CalendarDays size={11}/>{new Date(selected.occurredAt).toLocaleString()}</p></div><span className="muted-surface rounded-full px-2 py-1 text-[10px] font-bold">{selected.status}</span></div>
            {selected.workDone && <div className="mt-3"><p className="text-[10px] font-bold text-muted">WORK</p><p className="mt-1 text-xs leading-5">{selected.workDone}</p></div>}
            {selected.problem && <div className="mt-3"><p className="text-[10px] font-bold text-muted">PROBLEM</p><p className="mt-1 text-xs leading-5">{selected.problem}</p></div>}
            {selected.solution && <div className="mt-3"><p className="text-[10px] font-bold text-muted">SOLUTION</p><p className="mt-1 text-xs leading-5">{selected.solution}</p></div>}
            {selected.links.length > 0 && <div className="mt-3 space-y-1">{selected.links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate text-xs font-semibold text-violet-600"><ExternalLink size={12}/>{link.label}</a>)}</div>}
          </div>}

          <Link href="/updates" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-600">Open full project history <ExternalLink size={12}/></Link>
        </div>
      )}
    </section>
  );
}
