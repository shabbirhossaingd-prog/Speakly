"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderKanban,
  Link2,
  ListTodo,
  NotebookPen,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  deleteStudyProject,
  listStudyNotes,
  listStudyProjects,
  listStudyTasks,
  listStudyWorkLogs,
  saveStudyNote,
  saveStudyProject,
  saveStudyTask,
  saveStudyWorkLog,
  type StudyNote,
  type StudyProject,
  type StudyProjectStatus,
  type StudyTask,
  type StudyWorkLog,
} from "@/lib/local-study-db";

type Tab = "overview" | "tasks" | "updates" | "files" | "notes" | "activity";

function nowIso() {
  return new Date().toISOString();
}

function createProject(name = "New project"): StudyProject {
  const now = nowIso();
  return {
    id: crypto.randomUUID(),
    name,
    description: "",
    client: "",
    role: "",
    category: "",
    status: "active",
    startAt: now.slice(0, 10),
    dueAt: null,
    progress: 0,
    portfolioVisible: false,
    links: [],
    createdAt: now,
    updatedAt: now,
  };
}

function progressFor(project: StudyProject, tasks: StudyTask[]) {
  const linked = tasks.filter((task) => task.projectId === project.id);
  if (!linked.length) return project.status === "completed" ? 100 : project.progress || 0;
  return Math.round((linked.filter((task) => task.status === "done").length / linked.length) * 100);
}

function linkedLogs(project: StudyProject, logs: StudyWorkLog[]) {
  return logs.filter((log) => log.projectId === project.id || (!log.projectId && log.projectName.trim().toLowerCase() === project.name.trim().toLowerCase()));
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [logs, setLogs] = useState<StudyWorkLog[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState<StudyProject | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newUpdate, setNewUpdate] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [message, setMessage] = useState("");

  async function refresh(preferredId?: string) {
    const [nextProjects, nextTasks, nextLogs, nextNotes] = await Promise.all([listStudyProjects(), listStudyTasks(), listStudyWorkLogs(), listStudyNotes()]);
    setProjects(nextProjects);
    setTasks(nextTasks);
    setLogs(nextLogs);
    setNotes(nextNotes);
    const id = preferredId || selectedId || nextProjects[0]?.id || "";
    setSelectedId(id);
    setEditing(nextProjects.find((project) => project.id === id) || null);
  }

  useEffect(() => {
    const initialId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("project") || "" : "";
    Promise.all([listStudyProjects(), listStudyTasks(), listStudyWorkLogs(), listStudyNotes()])
      .then(([nextProjects, nextTasks, nextLogs, nextNotes]) => {
        setProjects(nextProjects);
        setTasks(nextTasks);
        setLogs(nextLogs);
        setNotes(nextNotes);
        const id = initialId && nextProjects.some((project) => project.id === initialId) ? initialId : nextProjects[0]?.id || "";
        setSelectedId(id);
        setEditing(nextProjects.find((project) => project.id === id) || null);
      })
      .catch(() => setMessage("Project storage is unavailable in this browser."));
  }, []);

  const project = projects.find((item) => item.id === selectedId) || null;
  const projectTasks = project ? tasks.filter((task) => task.projectId === project.id) : [];
  const projectLogs = project ? linkedLogs(project, logs) : [];
  const projectNotes = project ? notes.filter((note) => note.projectId === project.id) : [];
  const progress = project ? progressFor(project, tasks) : 0;

  const fileLinks = useMemo(() => {
    if (!project) return [];
    const projectItems = (project.links || []).map((link) => ({ id: `project-${link.id}`, label: link.label, url: link.url, source: "Project" }));
    const taskItems = projectTasks.flatMap((task) => (task.resources || []).map((resource) => ({ id: `task-${task.id}-${resource.id}`, label: resource.label, url: resource.url, source: task.title })));
    const logItems = projectLogs.flatMap((log) => (log.links || []).map((link) => ({ id: `log-${log.id}-${link.id}`, label: link.label, url: link.url, source: log.title || "Update" })));
    return [...projectItems, ...taskItems, ...logItems];
  }, [project, projectTasks, projectLogs]);

  async function addProject() {
    const next = createProject(`Project ${projects.length + 1}`);
    await saveStudyProject(next);
    setMessage("Project created.");
    await refresh(next.id);
  }

  function chooseProject(id: string) {
    setSelectedId(id);
    setEditing(projects.find((item) => item.id === id) || null);
    setTab("overview");
    if (typeof window !== "undefined") window.history.replaceState({}, "", `/projects?project=${id}`);
  }

  async function saveProject() {
    if (!editing?.name.trim()) return setMessage("Project name is required.");
    const saved = { ...editing, name: editing.name.trim(), progress: progressFor(editing, tasks), updatedAt: nowIso() };
    await saveStudyProject(saved);
    setMessage("Project saved.");
    await refresh(saved.id);
  }

  async function removeProject() {
    if (!project) return;
    await deleteStudyProject(project.id);
    setMessage("Project removed. Linked tasks and history were kept.");
    setSelectedId("");
    setEditing(null);
    await refresh();
  }

  async function addTask() {
    if (!project || !newTaskTitle.trim()) return;
    const now = nowIso();
    const task: StudyTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      description: "",
      subjectId: null,
      projectId: project.id,
      kind: "project",
      priority: "medium",
      status: "todo",
      startAt: null,
      dueAt: project.dueAt,
      reminderAt: null,
      estimateMinutes: 60,
      spentMinutes: 0,
      progress: 0,
      recurrence: "none",
      checklist: [],
      noteId: null,
      noteTitle: "",
      resources: [],
      teacher: "",
      room: "",
      tags: ["project"],
      parentTaskId: null,
      blockedByIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveStudyTask(task);
    setNewTaskTitle("");
    setMessage("Project task added.");
    await refresh(project.id);
  }

  async function toggleTask(task: StudyTask) {
    const status: StudyTask["status"] = task.status === "done" ? "todo" : "done";
    await saveStudyTask({ ...task, status, progress: status === "done" ? 100 : task.progress || 0, updatedAt: nowIso() });
    await refresh(project?.id);
  }

  async function addUpdate() {
    if (!project || !newUpdate.trim()) return;
    const now = nowIso();
    const log: StudyWorkLog = {
      id: crypto.randomUUID(),
      occurredAt: now,
      projectId: project.id,
      projectName: project.name,
      title: newUpdate.trim(),
      taskId: null,
      taskTitle: "",
      status: "working",
      workDone: newUpdate.trim(),
      problem: "",
      solution: "",
      nextStep: "",
      timeMinutes: 0,
      commitRef: "",
      tags: ["project"],
      links: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveStudyWorkLog(log);
    setNewUpdate("");
    setMessage("Project update saved.");
    await refresh(project.id);
  }

  async function addNote() {
    if (!project || !newNoteTitle.trim()) return;
    const now = nowIso();
    const note: StudyNote = {
      id: crypto.randomUUID(),
      title: newNoteTitle.trim(),
      subject: project.name,
      body: newNoteBody.trim(),
      tags: ["project", project.name],
      projectId: project.id,
      createdAt: now,
      updatedAt: now,
    };
    await saveStudyNote(note);
    setNewNoteTitle("");
    setNewNoteBody("");
    setMessage("Project note saved.");
    await refresh(project.id);
  }

  function addLink() {
    if (!editing || !linkUrl.trim()) return;
    setEditing({
      ...editing,
      links: [...(editing.links || []), { id: crypto.randomUUID(), label: linkLabel.trim() || "Project link", url: linkUrl.trim() }],
    });
    setLinkLabel("");
    setLinkUrl("");
  }

  return (
    <AppShell subtitle="Work portfolio" title="Projects">
      {message && <div className="muted-surface mb-5 rounded-xl p-3 text-sm">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <button onClick={addProject} className="button-primary w-full"><Plus size={17}/>New Project</button>
          <div className="space-y-3">
            {projects.map((item) => {
              const itemProgress = progressFor(item, tasks);
              return (
                <button key={item.id} onClick={() => chooseProject(item.id)} className={`card w-full p-4 text-left transition ${item.id === selectedId ? "ring-2 ring-violet-500" : ""}`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{item.name}</p><p className="mt-1 truncate text-xs text-muted">{item.client || item.category || "Personal project"}</p></div><span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-600">{item.status}</span></div>
                  <div className="mt-4 h-2 rounded-full bg-violet-500/10"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${itemProgress}%` }}/></div>
                  <div className="mt-2 flex justify-between text-xs text-muted"><span>{itemProgress}%</span><span>{tasks.filter((task) => task.projectId === item.id).length} tasks</span></div>
                </button>
              );
            })}
            {!projects.length && <div className="muted-surface rounded-2xl p-5 text-sm text-muted">No real project object exists yet. Create one to connect tasks, updates, notes and portfolio history.</div>}
          </div>
        </aside>

        <section className="min-w-0">
          {!project || !editing ? (
            <div className="card p-8 text-center"><FolderKanban className="mx-auto text-violet-600" size={34}/><h2 className="mt-4 text-xl font-bold">Create your first project</h2><p className="mx-auto mt-2 max-w-lg text-sm text-muted">Projects are now first-class workspace items instead of only a text name inside Project Updates.</p><button onClick={addProject} className="button-primary mt-5"><Plus size={17}/>New Project</button></div>
          ) : (
            <>
              <section className="card p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-600">{project.status}</span>{project.portfolioVisible && <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">Portfolio</span>}</div>
                    <h2 className="mt-3 text-2xl font-black">{project.name}</h2>
                    <p className="mt-2 text-sm text-muted">{project.description || "Add a clear description, client, role and deadline."}</p>
                    <div className="mt-4 h-2 max-w-xl rounded-full bg-violet-500/10"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${progress}%` }}/></div>
                    <p className="mt-2 text-xs text-muted">{progress}% complete • {projectTasks.length} tasks • {projectLogs.length} updates</p>
                  </div>
                  <div className="flex gap-2"><button onClick={saveProject} className="button-primary"><Save size={17}/>Save</button><button onClick={removeProject} className="button-secondary"><Trash2 size={17}/>Delete</button></div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {(["overview", "tasks", "updates", "files", "notes", "activity"] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize ${tab === item ? "bg-violet-600 text-white" : "muted-surface"}`}>{item}</button>)}
                </div>
              </section>

              {tab === "overview" && (
                <section className="card mt-5 p-5 sm:p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold">Project name<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className="surface mt-2 w-full rounded-xl px-3 py-2.5 font-normal outline-none"/></label>
                    <label className="text-sm font-semibold">Client / organization<input value={editing.client} onChange={(event) => setEditing({ ...editing, client: event.target.value })} className="surface mt-2 w-full rounded-xl px-3 py-2.5 font-normal outline-none"/></label>
                    <label className="text-sm font-semibold">Role<input value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value })} className="surface mt-2 w-full rounded-xl px-3 py-2.5 font-normal outline-none"/></label>
                    <label className="text-sm font-semibold">Category<input value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className="surface mt-2 w-full rounded-xl px-3 py-2.5 font-normal outline-none"/></label>
                    <label className="text-sm font-semibold">Status<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as StudyProjectStatus })} className="surface mt-2 w-full rounded-xl px-3 py-2.5 font-normal outline-none">{["planning", "active", "blocked", "review", "completed", "archived"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                    <label className="text-sm font-semibold">Deadline<input type="date" value={editing.dueAt?.slice(0, 10) || ""} onChange={(event) => setEditing({ ...editing, dueAt: event.target.value ? new Date(`${event.target.value}T23:59:00`).toISOString() : null })} className="surface mt-2 w-full rounded-xl px-3 py-2.5 font-normal outline-none"/></label>
                  </div>
                  <label className="mt-4 block text-sm font-semibold">Description<textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} rows={4} className="surface mt-2 w-full rounded-xl px-3 py-2.5 font-normal outline-none"/></label>
                  <label className="mt-4 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={editing.portfolioVisible} onChange={(event) => setEditing({ ...editing, portfolioVisible: event.target.checked })}/>Show this project in Portfolio</label>
                  <div className="mt-5 grid gap-3 md:grid-cols-[0.8fr_1.2fr_auto]"><input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Link label (GitHub, Figma…)" className="surface rounded-xl px-3 py-2.5 text-sm outline-none"/><input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://…" className="surface rounded-xl px-3 py-2.5 text-sm outline-none"/><button onClick={addLink} className="button-secondary"><Link2 size={17}/>Add link</button></div>
                  <div className="mt-3 flex flex-wrap gap-2">{(editing.links || []).map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="muted-surface inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold">{link.label}<ExternalLink size={13}/></a>)}</div>
                </section>
              )}

              {tab === "tasks" && (
                <section className="card mt-5 p-5 sm:p-6">
                  <div className="flex gap-2"><input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addTask()} placeholder="Add project task…" className="surface min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"/><button onClick={addTask} className="button-primary"><Plus size={17}/>Add</button></div>
                  <div className="mt-4 space-y-2">{projectTasks.map((task) => <button key={task.id} onClick={() => toggleTask(task)} className="muted-surface flex w-full items-center gap-3 rounded-xl p-4 text-left"><CheckCircle2 size={19} className={task.status === "done" ? "text-emerald-600" : "text-muted"}/><span className="flex-1"><span className={`block font-semibold ${task.status === "done" ? "line-through opacity-60" : ""}`}>{task.title}</span><span className="mt-1 block text-xs text-muted">{task.spentMinutes || 0}m logged{task.dueAt ? ` • due ${new Date(task.dueAt).toLocaleDateString()}` : ""}</span></span></button>)}</div>
                  {!projectTasks.length && <p className="mt-4 text-sm text-muted">No tasks linked yet. Tasks created here are linked to this project automatically.</p>}
                </section>
              )}

              {tab === "updates" && (
                <section className="card mt-5 p-5 sm:p-6">
                  <div className="flex gap-2"><input value={newUpdate} onChange={(event) => setNewUpdate(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addUpdate()} placeholder="What changed in this project?" className="surface min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"/><button onClick={addUpdate} className="button-primary"><Activity size={17}/>Save</button></div>
                  <div className="mt-4 space-y-3">{projectLogs.map((log) => <div key={log.id} className="muted-surface rounded-xl p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{log.title || log.workDone || "Project update"}</p><span className="text-xs text-muted">{new Date(log.occurredAt).toLocaleString()}</span></div>{log.problem && <p className="mt-2 text-sm text-muted"><strong>Problem:</strong> {log.problem}</p>}{log.solution && <p className="mt-1 text-sm text-muted"><strong>Solution:</strong> {log.solution}</p>}{log.nextStep && <p className="mt-1 text-sm text-muted"><strong>Next:</strong> {log.nextStep}</p>}</div>)}</div>
                  <Link href="/updates" className="mt-4 inline-flex text-sm font-semibold text-violet-600">Open full Project Updates →</Link>
                </section>
              )}

              {tab === "files" && (
                <section className="card mt-5 p-5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2">{fileLinks.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="muted-surface flex items-center gap-3 rounded-xl p-4"><FileText className="text-violet-600" size={19}/><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{item.label}</span><span className="mt-1 block truncate text-xs text-muted">{item.source}</span></span><ExternalLink size={14}/></a>)}</div>
                  {!fileLinks.length && <p className="text-sm text-muted">Add project links above, or attach links/resources to linked tasks and project updates.</p>}
                </section>
              )}

              {tab === "notes" && (
                <section className="card mt-5 p-5 sm:p-6">
                  <div className="grid gap-3"><input value={newNoteTitle} onChange={(event) => setNewNoteTitle(event.target.value)} placeholder="Project note title" className="surface rounded-xl px-3 py-2.5 text-sm outline-none"/><textarea value={newNoteBody} onChange={(event) => setNewNoteBody(event.target.value)} rows={4} placeholder="Ideas, meeting notes, decisions…" className="surface rounded-xl px-3 py-2.5 text-sm outline-none"/><button onClick={addNote} className="button-primary w-fit"><NotebookPen size={17}/>Save note</button></div>
                  <div className="mt-5 space-y-3">{projectNotes.map((note) => <div key={note.id} className="muted-surface rounded-xl p-4"><p className="font-semibold">{note.title}</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{note.body || "No note body."}</p></div>)}</div>
                </section>
              )}

              {tab === "activity" && (
                <section className="card mt-5 p-5 sm:p-6">
                  <div className="space-y-4">
                    {[...projectLogs.map((log) => ({ id: `log-${log.id}`, at: log.occurredAt, icon: Activity, title: log.title || log.workDone || "Project update", detail: "Update" })), ...projectTasks.map((task) => ({ id: `task-${task.id}`, at: task.updatedAt, icon: ListTodo, title: task.title, detail: `Task • ${task.status}` })), ...projectNotes.map((note) => ({ id: `note-${note.id}`, at: note.updatedAt, icon: NotebookPen, title: note.title, detail: "Note" }))].sort((a, b) => b.at.localeCompare(a.at)).map(({ id, at, icon: Icon, title, detail }) => <div key={id} className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Icon size={17}/></span><div><p className="font-semibold">{title}</p><p className="mt-1 text-xs text-muted">{detail} • {new Date(at).toLocaleString()}</p></div></div>)}
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
