"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Github,
  GraduationCap,
  Link2,
  ListChecks,
  Play,
  Plus,
  Repeat2,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { downloadTextPdf } from "@/lib/pdf-export";
import {
  deleteStudySubject,
  deleteStudyTask,
  listStudyNotes,
  listStudySubjects,
  listStudyTasks,
  saveStudySubject,
  saveStudyTask,
  type StudyChecklistItem,
  type StudyNote,
  type StudySubject,
  type StudyTask,
  type StudyTaskKind,
  type StudyTaskResource,
} from "@/lib/local-study-db";

type ViewKey = "today" | "upcoming" | "routine" | "class" | "assignments" | "exam" | "projects" | "completed";

type Template = {
  label: string;
  kind: StudyTaskKind;
  description: string;
  estimateMinutes: number;
  checklist: string[];
  tags: string[];
};

const views: { key: ViewKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "routine", label: "Routine" },
  { key: "class", label: "Class" },
  { key: "assignments", label: "Assignments" },
  { key: "exam", label: "Exam" },
  { key: "projects", label: "Projects" },
  { key: "completed", label: "Completed" },
];

const kindLabels: Record<StudyTaskKind, string> = {
  class: "Class",
  study: "Study",
  assignment: "Assignment",
  revision: "Revision",
  exam: "Exam Prep",
  lab: "Lab",
  coding: "Coding",
  viva: "Viva",
  presentation: "Presentation",
  project: "Project",
  reading: "Reading",
  routine: "Routine",
  personal: "Personal",
};

const templates: Template[] = [
  {
    label: "CSE Coding Assignment",
    kind: "coding",
    description: "Plan, implement, test and submit a programming assignment.",
    estimateMinutes: 120,
    checklist: ["Read requirements", "Design algorithm / approach", "Implement", "Test edge cases", "Commit to GitHub", "Prepare submission"],
    tags: ["cse", "coding"],
  },
  {
    label: "Lab Task",
    kind: "lab",
    description: "Complete the lab work, evidence and report.",
    estimateMinutes: 90,
    checklist: ["Review lab instruction", "Set up tools", "Complete experiment / code", "Collect screenshots", "Write report", "Submit"],
    tags: ["cse", "lab"],
  },
  {
    label: "Class Note Follow-up",
    kind: "revision",
    description: "Clean the class note and turn confusing points into active revision.",
    estimateMinutes: 40,
    checklist: ["Clean class note", "Mark confusing points", "Add missing examples", "Create flashcards", "Review again"],
    tags: ["class-note", "revision"],
  },
  {
    label: "Exam Preparation",
    kind: "exam",
    description: "Prepare a topic or subject using revision, recall and mock practice.",
    estimateMinutes: 180,
    checklist: ["Check syllabus", "Review notes", "Review important formulas / concepts", "Flashcards", "Practice questions", "Viva / mock test"],
    tags: ["exam", "revision"],
  },
  {
    label: "Project Milestone",
    kind: "project",
    description: "Break a CSE project milestone into a trackable delivery.",
    estimateMinutes: 180,
    checklist: ["Define outcome", "Break into subtasks", "Implement", "Test", "Update documentation", "Demo / review"],
    tags: ["cse", "project"],
  },
  {
    label: "Presentation",
    kind: "presentation",
    description: "Prepare content, slides, speaker notes and practice delivery.",
    estimateMinutes: 90,
    checklist: ["Research", "Create outline", "Build slides", "Add speaker notes", "Practice timing", "Final review"],
    tags: ["presentation"],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function minutesLabel(minutes = 0) {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`;
}

function subjectName(subjects: StudySubject[], id: string | null) {
  return subjects.find((subject) => subject.id === id)?.name || "General";
}

function newTask(title = "", template?: Template): StudyTask {
  const now = nowIso();
  return {
    id: crypto.randomUUID(),
    title: title || template?.label || "New task",
    description: template?.description || "",
    subjectId: null,
    kind: template?.kind || "study",
    priority: "medium",
    status: "todo",
    startAt: null,
    dueAt: null,
    reminderAt: null,
    estimateMinutes: template?.estimateMinutes || 30,
    spentMinutes: 0,
    progress: 0,
    recurrence: template?.kind === "routine" ? "daily" : "none",
    checklist: (template?.checklist || []).map((text) => ({ id: crypto.randomUUID(), text, done: false })),
    noteId: null,
    noteTitle: "",
    resources: [],
    teacher: "",
    room: "",
    tags: template?.tags || [],
    parentTaskId: null,
    blockedByIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeTask(task: StudyTask): StudyTask {
  return {
    ...task,
    description: task.description || "",
    status: task.status || "todo",
    startAt: task.startAt || null,
    reminderAt: task.reminderAt || null,
    estimateMinutes: task.estimateMinutes ?? 30,
    spentMinutes: task.spentMinutes ?? 0,
    progress: task.progress ?? (task.status === "done" ? 100 : 0),
    recurrence: task.recurrence || "none",
    checklist: task.checklist || [],
    noteId: task.noteId || null,
    noteTitle: task.noteTitle || "",
    resources: task.resources || [],
    teacher: task.teacher || "",
    room: task.room || "",
    tags: task.tags || [],
    parentTaskId: task.parentTaskId || null,
    blockedByIds: task.blockedByIds || [],
  };
}

function sameLocalDay(value: string | null | undefined, date = new Date()) {
  if (!value) return false;
  const target = new Date(value);
  return target.getFullYear() === date.getFullYear() && target.getMonth() === date.getMonth() && target.getDate() === date.getDate();
}

function TaskStatusIcon({ status }: { status: StudyTask["status"] }) {
  if (status === "done") return <CheckCircle2 size={20} className="text-emerald-600" />;
  if (status === "in_progress") return <Play size={20} className="text-violet-600" />;
  return <Circle size={20} className="text-muted" />;
}

export function TasksClient() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [view, setView] = useState<ViewKey>("today");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickKind, setQuickKind] = useState<StudyTaskKind>("study");
  const [quickDue, setQuickDue] = useState("");
  const [quickSubject, setQuickSubject] = useState("");
  const [editing, setEditing] = useState<StudyTask | null>(null);
  const [checkText, setCheckText] = useState("");
  const [resourceType, setResourceType] = useState<StudyTaskResource["type"]>("drive");
  const [resourceLabel, setResourceLabel] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [showSubjects, setShowSubjects] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const [nextTasks, nextSubjects, nextNotes] = await Promise.all([listStudyTasks(), listStudySubjects(), listStudyNotes()]);
    setTasks(nextTasks.map(normalizeTask));
    setSubjects(nextSubjects);
    setNotes(nextNotes);
  }

  useEffect(() => {
    refresh().catch(() => setMessage("Local task storage is unavailable in this browser."));
  }, []);

  const visibleTasks = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 86400000;
    return tasks.filter((task) => {
      if (subjectFilter && task.subjectId !== subjectFilter) return false;
      if (view === "completed") return task.status === "done";
      if (task.status === "done") return false;
      if (view === "today") return sameLocalDay(task.startAt) || sameLocalDay(task.dueAt) || (!task.dueAt && task.status === "in_progress");
      if (view === "upcoming") return Boolean(task.dueAt && new Date(task.dueAt).getTime() > now && new Date(task.dueAt).getTime() <= week);
      if (view === "routine") return task.kind === "routine" || task.recurrence !== "none";
      if (view === "class") return task.kind === "class";
      if (view === "assignments") return ["assignment", "lab", "coding", "presentation"].includes(task.kind);
      if (view === "exam") return ["exam", "revision", "viva"].includes(task.kind);
      if (view === "projects") return task.kind === "project";
      return true;
    });
  }, [tasks, subjectFilter, view]);

  const openTasks = tasks.filter((task) => task.status !== "done");
  const todayCount = tasks.filter((task) => task.status !== "done" && (sameLocalDay(task.startAt) || sameLocalDay(task.dueAt))).length;
  const highCount = openTasks.filter((task) => task.priority === "high").length;
  const plannedMinutes = visibleTasks.reduce((sum, task) => sum + (task.estimateMinutes || 0), 0);

  async function quickAdd() {
    if (!quickTitle.trim()) return setMessage("Task title লিখুন।");
    const task = newTask(quickTitle.trim());
    task.kind = quickKind;
    task.subjectId = quickSubject || null;
    task.dueAt = fromLocalInput(quickDue);
    await saveStudyTask(task);
    setQuickTitle("");
    setQuickDue("");
    setMessage("Task saved on this device.");
    await refresh();
  }

  function openTemplate(template: Template) {
    setEditing(newTask("", template));
  }

  function updateEditing(patch: Partial<StudyTask>) {
    setEditing((current) => (current ? { ...current, ...patch } : current));
  }

  async function saveEditing() {
    if (!editing?.title.trim()) return setMessage("Task title is required.");
    const completed = editing.checklist?.filter((item) => item.done).length || 0;
    const total = editing.checklist?.length || 0;
    const checklistProgress = total ? Math.round((completed / total) * 100) : editing.progress || 0;
    const saved: StudyTask = {
      ...editing,
      title: editing.title.trim(),
      progress: editing.status === "done" ? 100 : Math.max(editing.progress || 0, checklistProgress),
      updatedAt: nowIso(),
    };
    await saveStudyTask(saved);
    setEditing(null);
    setMessage("Task details saved locally.");
    await refresh();
  }

  async function changeStatus(task: StudyTask) {
    const nextStatus: StudyTask["status"] = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    await saveStudyTask({ ...task, status: nextStatus, progress: nextStatus === "done" ? 100 : task.progress, updatedAt: nowIso() });
    await refresh();
  }

  async function removeTask(task: StudyTask) {
    await deleteStudyTask(task.id);
    if (editing?.id === task.id) setEditing(null);
    await refresh();
  }

  function addChecklistItem() {
    if (!editing || !checkText.trim()) return;
    const item: StudyChecklistItem = { id: crypto.randomUUID(), text: checkText.trim(), done: false };
    updateEditing({ checklist: [...(editing.checklist || []), item] });
    setCheckText("");
  }

  function toggleChecklist(id: string) {
    if (!editing) return;
    updateEditing({ checklist: (editing.checklist || []).map((item) => item.id === id ? { ...item, done: !item.done } : item) });
  }

  function addResource() {
    if (!editing || !resourceUrl.trim()) return;
    const resource: StudyTaskResource = {
      id: crypto.randomUUID(),
      type: resourceType,
      label: resourceLabel.trim() || resourceType,
      url: resourceUrl.trim(),
    };
    updateEditing({ resources: [...(editing.resources || []), resource] });
    setResourceLabel("");
    setResourceUrl("");
  }

  function linkNote(noteId: string) {
    if (!editing) return;
    const note = notes.find((item) => item.id === noteId);
    updateEditing({ noteId: note?.id || null, noteTitle: note?.title || "" });
  }

  async function addSubject() {
    if (!subjectDraft.trim()) return;
    const now = nowIso();
    const subject: StudySubject = {
      id: crypto.randomUUID(),
      name: subjectDraft.trim(),
      code: "",
      category: "CSE",
      goal: "",
      createdAt: now,
      updatedAt: now,
    };
    await saveStudySubject(subject);
    setSubjectDraft("");
    await refresh();
  }

  async function removeSubject(subject: StudySubject) {
    await deleteStudySubject(subject.id);
    if (subjectFilter === subject.id) setSubjectFilter("");
    await refresh();
  }

  async function exportTask(task: StudyTask) {
    const checklist = (task.checklist || []).map((item) => `${item.done ? "[x]" : "[ ]"} ${item.text}`).join("\n") || "No checklist";
    const resources = (task.resources || []).map((item) => `${item.label}: ${item.url}`).join("\n") || "No external resources";
    await downloadTextPdf({
      fileName: task.title,
      title: task.title,
      subtitle: `${kindLabels[task.kind]} • ${subjectName(subjects, task.subjectId)} • ${task.priority} priority`,
      sections: [
        { heading: "Plan", body: `Status: ${task.status.replace("_", " ")}\nStart: ${task.startAt ? new Date(task.startAt).toLocaleString() : "Not set"}\nDue: ${task.dueAt ? new Date(task.dueAt).toLocaleString() : "Not set"}\nEstimate: ${minutesLabel(task.estimateMinutes)}\nSpent: ${minutesLabel(task.spentMinutes)}\nProgress: ${task.progress || 0}%\nRoutine: ${task.recurrence || "none"}` },
        { heading: "Description", body: task.description || "No description" },
        { heading: "Class / Context", body: `Teacher: ${task.teacher || "—"}\nRoom: ${task.room || "—"}\nTags: ${(task.tags || []).join(", ") || "—"}\nLinked note: ${task.noteTitle || "—"}` },
        { heading: "Checklist", body: checklist },
        { heading: "Resources", body: resources },
      ],
    });
  }

  async function exportView() {
    const body = visibleTasks.length
      ? visibleTasks.map((task, index) => `${index + 1}. ${task.title}\n   ${kindLabels[task.kind]} • ${subjectName(subjects, task.subjectId)} • ${task.priority}\n   Due: ${task.dueAt ? new Date(task.dueAt).toLocaleString() : "No deadline"} • Progress: ${task.progress || 0}%`).join("\n\n")
      : "No tasks in this view.";
    await downloadTextPdf({
      fileName: `tasks-${view}`,
      title: `Tasks — ${views.find((item) => item.key === view)?.label || view}`,
      subtitle: `${visibleTasks.length} task(s) • ${minutesLabel(plannedMinutes)} planned`,
      sections: [{ heading: "Study plan", body }],
    });
  }

  return (
    <AppShell subtitle="Local-first Study OS" title="Tasks & Planner">
      {message && <div className="muted-surface mb-5 flex items-center justify-between gap-3 rounded-xl p-3 text-sm"><span>{message}</span><button onClick={() => setMessage("")}><X size={15}/></button></div>}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-600">WHAT DO I NEED TO DO?</p>
            <h2 className="mt-1 text-2xl font-black">One place for class, routine, assignments and CSE work.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Tasks stay on this device. Subject is used as a filter, while the task tells you what to do next. Link class notes, Drive, GitHub and study resources to the same task.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditing(newTask())} className="button-primary"><Plus size={17}/>Detailed task</button>
            <button onClick={exportView} className="button-secondary"><Download size={17}/>Export view PDF</button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_190px_200px_auto]">
          <input value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && quickAdd()} className="muted-surface rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500" placeholder="Quick task: DBMS chapter 4 revise"/>
          <select value={quickKind} onChange={(event) => setQuickKind(event.target.value as StudyTaskKind)} className="muted-surface rounded-xl px-3 py-3 text-sm outline-none">{Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          <select value={quickSubject} onChange={(event) => setQuickSubject(event.target.value)} className="muted-surface rounded-xl px-3 py-3 text-sm outline-none"><option value="">General / no subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
          <input type="datetime-local" value={quickDue} onChange={(event) => setQuickDue(event.target.value)} className="muted-surface rounded-xl px-3 py-3 text-sm outline-none"/>
          <button onClick={quickAdd} className="button-primary"><Plus size={17}/>Add</button>
        </div>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Open tasks", value: openTasks.length, icon: ListChecks },
          { label: "Today", value: todayCount, icon: CalendarDays },
          { label: "High priority", value: highCount, icon: Sparkles },
          { label: "This view", value: minutesLabel(plannedMinutes), icon: Clock3 },
        ].map(({ label, value, icon: Icon }) => <div className="card flex items-center gap-4 p-4" key={label}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Icon size={18}/></span><div><p className="text-xs text-muted">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div></div>)}
      </div>

      <section className="card mt-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {views.map((item) => <button key={item.key} onClick={() => setView(item.key)} className={`rounded-xl px-3 py-2 text-xs font-bold ${view === item.key ? "bg-violet-600 text-white" : "muted-surface"}`}>{item.label}</button>)}
          <div className="ml-auto flex items-center gap-2">
            <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="muted-surface rounded-xl px-3 py-2 text-xs font-semibold outline-none"><option value="">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select>
            <button onClick={() => setShowSubjects((value) => !value)} className="button-secondary px-3 py-2 text-xs">Subjects <ChevronDown size={14}/></button>
          </div>
        </div>

        {showSubjects && <div className="muted-surface mt-4 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2"><input value={subjectDraft} onChange={(event) => setSubjectDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSubject()} className="surface min-w-56 flex-1 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Add subject e.g. Database Management System"/><button onClick={addSubject} className="button-primary px-3 py-2"><Plus size={15}/>Add subject</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{subjects.map((subject) => <span key={subject.id} className="surface inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">{subject.name}<button onClick={() => removeSubject(subject)} aria-label={`Remove ${subject.name}`}><X size={13}/></button></span>)}</div>
          <p className="mt-3 text-xs text-muted">Subjects organize tasks, notes and revision; they are not a separate main workspace.</p>
        </div>}
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-600">CSE + STUDY TEMPLATES</p><h3 className="mt-1 text-lg font-bold">Start with a workflow</h3></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{templates.map((template) => <button key={template.label} onClick={() => openTemplate(template)} className="card p-4 text-left transition hover:-translate-y-0.5"><div className="flex items-center gap-2 text-violet-600">{template.kind === "coding" ? <Code2 size={17}/> : template.kind === "exam" ? <GraduationCap size={17}/> : <ListChecks size={17}/>}<span className="text-xs font-bold">{kindLabels[template.kind]}</span></div><h4 className="mt-3 font-bold">{template.label}</h4><p className="mt-1 text-xs leading-5 text-muted">{template.description}</p><p className="mt-3 text-xs font-semibold text-violet-600">{template.checklist.length} steps • {minutesLabel(template.estimateMinutes)}</p></button>)}</div>
      </section>

      <section className="card mt-5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-600">{views.find((item) => item.key === view)?.label}</p><h3 className="mt-1 text-xl font-bold">Your plan</h3></div><span className="text-xs font-semibold text-muted">{visibleTasks.length} task(s)</span></div>
        <div className="mt-4 space-y-3">
          {visibleTasks.map((task) => {
            const checked = task.checklist?.filter((item) => item.done).length || 0;
            const total = task.checklist?.length || 0;
            return <article key={task.id} className="muted-surface rounded-2xl p-4">
              <div className="flex flex-wrap items-start gap-3">
                <button onClick={() => changeStatus(task)} className="mt-0.5" title="Cycle status"><TaskStatusIcon status={task.status}/></button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h4 className={`font-bold ${task.status === "done" ? "line-through" : ""}`}>{task.title}</h4><span className="surface rounded-full px-2 py-1 text-[10px] font-bold">{kindLabels[task.kind]}</span>{task.recurrence !== "none" && <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-600"><Repeat2 size={11}/>{task.recurrence}</span>}</div>
                  <p className="mt-1 text-xs text-muted">{subjectName(subjects, task.subjectId)} • {task.priority} priority{task.dueAt ? ` • due ${new Date(task.dueAt).toLocaleString()}` : ""}</p>
                  {task.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{task.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-muted"><span>{task.progress || 0}% progress</span><span>{minutesLabel(task.estimateMinutes)} estimate</span>{total > 0 && <span>{checked}/{total} checklist</span>}{task.noteTitle && <span>Note: {task.noteTitle}</span>}{Boolean(task.resources?.length) && <span>{task.resources?.length} resource(s)</span>}</div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-500/10"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(100, task.progress || 0)}%` }}/></div>
                </div>
                <div className="flex flex-wrap gap-2"><button onClick={() => setEditing(normalizeTask(task))} className="button-secondary px-3 py-2 text-xs">Edit</button><button onClick={() => exportTask(task)} className="button-secondary px-3 py-2 text-xs"><Download size={14}/>PDF</button><button onClick={() => removeTask(task)} className="button-secondary px-3 py-2" aria-label="Delete task"><Trash2 size={14}/></button></div>
              </div>
            </article>;
          })}
          {visibleTasks.length === 0 && <div className="rounded-2xl border border-dashed p-10 text-center"><CheckCircle2 className="mx-auto text-violet-600"/><h4 className="mt-3 font-bold">Nothing here yet</h4><p className="mt-1 text-sm text-muted">Quick-add a task or use a CSE workflow template above.</p></div>}
        </div>
      </section>

      {editing && <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/45 p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
        <div className="surface mx-auto max-w-5xl rounded-3xl p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-600">ADVANCED TASK</p><h2 className="mt-1 text-2xl font-black">Plan the work, not just the deadline.</h2></div><button onClick={() => setEditing(null)} className="muted-surface rounded-xl p-2"><X size={18}/></button></div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2"><label className="text-xs font-bold text-muted">TASK TITLE</label><input value={editing.title} onChange={(event) => updateEditing({ title: event.target.value })} className="muted-surface mt-1 w-full rounded-xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-violet-500"/></div>
            <div className="lg:col-span-2"><label className="text-xs font-bold text-muted">DESCRIPTION / PLAN</label><textarea value={editing.description || ""} onChange={(event) => updateEditing({ description: event.target.value })} className="muted-surface mt-1 min-h-28 w-full rounded-xl p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-violet-500" placeholder="What needs to be done? Add requirements, class instructions or coding context..."/></div>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-4">
              <label className="text-xs font-bold text-muted">SUBJECT<select value={editing.subjectId || ""} onChange={(event) => updateEditing({ subjectId: event.target.value || null })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"><option value="">General</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
              <label className="text-xs font-bold text-muted">TYPE<select value={editing.kind} onChange={(event) => updateEditing({ kind: event.target.value as StudyTaskKind })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none">{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-xs font-bold text-muted">STATUS<select value={editing.status} onChange={(event) => updateEditing({ status: event.target.value as StudyTask["status"] })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
              <label className="text-xs font-bold text-muted">PRIORITY<select value={editing.priority} onChange={(event) => updateEditing({ priority: event.target.value as StudyTask["priority"] })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            </div>

            <label className="text-xs font-bold text-muted">START<input type="datetime-local" value={toLocalInput(editing.startAt)} onChange={(event) => updateEditing({ startAt: fromLocalInput(event.target.value) })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"/></label>
            <label className="text-xs font-bold text-muted">DEADLINE<input type="datetime-local" value={toLocalInput(editing.dueAt)} onChange={(event) => updateEditing({ dueAt: fromLocalInput(event.target.value) })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"/></label>
            <label className="text-xs font-bold text-muted">REMINDER<input type="datetime-local" value={toLocalInput(editing.reminderAt)} onChange={(event) => updateEditing({ reminderAt: fromLocalInput(event.target.value) })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"/></label>
            <label className="text-xs font-bold text-muted">REPEAT<select value={editing.recurrence || "none"} onChange={(event) => updateEditing({ recurrence: event.target.value as StudyTask["recurrence"] })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"><option value="none">No repeat</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>

            <label className="text-xs font-bold text-muted">ESTIMATE (MIN)<input type="number" min="0" value={editing.estimateMinutes || 0} onChange={(event) => updateEditing({ estimateMinutes: Number(event.target.value) || 0 })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"/></label>
            <label className="text-xs font-bold text-muted">SPENT (MIN)<input type="number" min="0" value={editing.spentMinutes || 0} onChange={(event) => updateEditing({ spentMinutes: Number(event.target.value) || 0 })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"/></label>
            <label className="text-xs font-bold text-muted">TEACHER / MENTOR<input value={editing.teacher || ""} onChange={(event) => updateEditing({ teacher: event.target.value })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none" placeholder="Optional"/></label>
            <label className="text-xs font-bold text-muted">ROOM / CLASS<input value={editing.room || ""} onChange={(event) => updateEditing({ room: event.target.value })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none" placeholder="Room / lab / online"/></label>

            <div className="lg:col-span-2"><div className="flex justify-between text-xs font-bold text-muted"><span>PROGRESS</span><span>{editing.progress || 0}%</span></div><input type="range" min="0" max="100" step="5" value={editing.progress || 0} onChange={(event) => updateEditing({ progress: Number(event.target.value) })} className="mt-2 w-full accent-violet-600"/></div>
            <div className="lg:col-span-2"><label className="text-xs font-bold text-muted">TAGS</label><input value={(editing.tags || []).join(", ")} onChange={(event) => updateEditing({ tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="muted-surface mt-1 w-full rounded-xl px-3 py-3 text-sm outline-none" placeholder="cse, dbms, midterm, backend"/></div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section className="muted-surface rounded-2xl p-4"><div className="flex items-center gap-2"><ListChecks size={17} className="text-violet-600"/><h3 className="font-bold">Checklist / Subtasks</h3></div><div className="mt-3 space-y-2">{(editing.checklist || []).map((item) => <div key={item.id} className="surface flex items-center gap-2 rounded-xl p-2.5"><button onClick={() => toggleChecklist(item.id)}>{item.done ? <CheckCircle2 size={17} className="text-emerald-600"/> : <Circle size={17}/>}</button><span className={`min-w-0 flex-1 text-sm ${item.done ? "line-through text-muted" : ""}`}>{item.text}</span><button onClick={() => updateEditing({ checklist: editing.checklist?.filter((entry) => entry.id !== item.id) })}><X size={14}/></button></div>)}</div><div className="mt-3 flex gap-2"><input value={checkText} onChange={(event) => setCheckText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addChecklistItem()} className="surface min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Add step"/><button onClick={addChecklistItem} className="button-secondary px-3 py-2"><Plus size={15}/></button></div></section>

            <section className="muted-surface rounded-2xl p-4"><div className="flex items-center gap-2"><BookOpen size={17} className="text-violet-600"/><h3 className="font-bold">Linked class note</h3></div><select value={editing.noteId || ""} onChange={(event) => linkNote(event.target.value)} className="surface mt-3 w-full rounded-xl px-3 py-2.5 text-sm outline-none"><option value="">No linked note</option>{notes.map((note) => <option value={note.id} key={note.id}>{note.title} — {note.subject || "General"}</option>)}</select>{editing.noteId && <Link href="/notes" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-600">Open Notes Lab <ExternalLink size={12}/></Link>}<p className="mt-3 text-xs leading-5 text-muted">Use this for “class note → revise later” workflows. The task keeps the link while the note stays in device storage.</p></section>
          </div>

          <section className="muted-surface mt-5 rounded-2xl p-4"><div className="flex items-center gap-2"><Link2 size={17} className="text-violet-600"/><div><h3 className="font-bold">Resources & links</h3><p className="text-xs text-muted">Google Drive, GitHub, YouTube, docs or any study reference.</p></div></div><div className="mt-3 grid gap-2 md:grid-cols-[150px_180px_1fr_auto]"><select value={resourceType} onChange={(event) => setResourceType(event.target.value as StudyTaskResource["type"])} className="surface rounded-xl px-3 py-2.5 text-sm outline-none"><option value="drive">Google Drive</option><option value="github">GitHub</option><option value="youtube">YouTube</option><option value="website">Website</option><option value="note">Note link</option><option value="other">Other</option></select><input value={resourceLabel} onChange={(event) => setResourceLabel(event.target.value)} className="surface rounded-xl px-3 py-2.5 text-sm outline-none" placeholder="Label"/><input value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} className="surface rounded-xl px-3 py-2.5 text-sm outline-none" placeholder="https://..."/><button onClick={addResource} className="button-primary px-3 py-2"><Plus size={15}/>Add</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{(editing.resources || []).map((resource) => <div key={resource.id} className="surface flex items-center gap-3 rounded-xl p-3">{resource.type === "github" ? <Github size={16} className="text-violet-600"/> : <ExternalLink size={16} className="text-violet-600"/>}<a href={resource.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold">{resource.label}</a><button onClick={() => updateEditing({ resources: editing.resources?.filter((item) => item.id !== resource.id) })}><Trash2 size={14}/></button></div>)}</div></section>

          <div className="mt-6 flex flex-wrap justify-between gap-3"><div className="flex gap-2"><button onClick={() => exportTask(editing)} className="button-secondary"><Download size={16}/>Export PDF</button>{tasks.some((task) => task.id === editing.id) && <button onClick={() => removeTask(editing)} className="button-secondary"><Trash2 size={16}/>Delete</button>}</div><div className="flex gap-2"><button onClick={() => setEditing(null)} className="button-secondary">Cancel</button><button onClick={saveEditing} className="button-primary"><Save size={16}/>Save task</button></div></div>
        </div>
      </div>}
    </AppShell>
  );
}
