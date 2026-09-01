"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Download,
  ExternalLink,
  FileImage,
  Heading2,
  ImagePlus,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { downloadTextPdf } from "@/lib/pdf-export";
import {
  deleteStudyWorkLog,
  deleteStudyWorkLogAsset,
  listStudyProjects,
  listStudyTasks,
  listStudyWorkLogAssets,
  listStudyWorkLogs,
  saveStudyWorkLog,
  saveStudyWorkLogAsset,
  type StudyProject,
  type StudyTask,
  type StudyWorkLog,
  type StudyWorkLogAsset,
  type StudyWorkLogLink,
  type StudyWorkLogStatus,
} from "@/lib/local-study-db";

type AssetView = StudyWorkLogAsset & { url: string };

const statusLabels: Record<StudyWorkLogStatus, string> = {
  working: "Working",
  blocked: "Blocked",
  review: "Review",
  done: "Done",
};

function nowIso() {
  return new Date().toISOString();
}

function toLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : nowIso();
}

function newWorkLog(task?: StudyTask, project?: StudyProject): StudyWorkLog {
  const now = nowIso();
  return {
    id: crypto.randomUUID(),
    occurredAt: now,
    projectId: project?.id || task?.projectId || null,
    projectName: project?.name || "",
    title: "Work update",
    taskId: task?.id || null,
    taskTitle: task?.title || "",
    status: "working",
    workDone: "",
    problem: "",
    solution: "",
    nextStep: "",
    timeMinutes: 0,
    commitRef: "",
    tags: task?.tags || [],
    links: [],
    createdAt: now,
    updatedAt: now,
  };
}

function statusClass(status: StudyWorkLogStatus) {
  if (status === "blocked") return "text-red-600";
  if (status === "done") return "text-emerald-600";
  if (status === "review") return "text-amber-600";
  return "text-violet-600";
}

function minutesLabel(minutes: number) {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`;
}

export function UpdatesClient() {
  const [logs, setLogs] = useState<StudyWorkLog[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [editing, setEditing] = useState<StudyWorkLog | null>(null);
  const [assets, setAssets] = useState<AssetView[]>([]);
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [relatedUpdateId, setRelatedUpdateId] = useState("");
  const [message, setMessage] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLTextAreaElement>(null);

  async function refresh() {
    const [nextLogs, nextTasks, nextProjects] = await Promise.all([listStudyWorkLogs(), listStudyTasks(), listStudyProjects()]);
    setLogs(nextLogs);
    setTasks(nextTasks);
    setProjects(nextProjects);
    return { nextLogs, nextTasks, nextProjects };
  }

  useEffect(() => {
    refresh()
      .then(({ nextLogs, nextTasks, nextProjects }) => {
        const params = new URLSearchParams(window.location.search);
        const openId = params.get("open");
        const taskId = params.get("task");
        if (openId) {
          const log = nextLogs.find((item) => item.id === openId);
          if (log) setEditing(log);
          return;
        }
        if (taskId) {
          const task = nextTasks.find((item) => item.id === taskId);
          if (task) {
            const project = nextProjects.find((item) => item.id === task.projectId);
            setEditing(newWorkLog(task, project));
          }
        }
      })
      .catch(() => setMessage("Project update storage is unavailable in this browser."));
  }, []);

  useEffect(() => {
    if (!editing) {
      setAssets((old) => {
        old.forEach((asset) => URL.revokeObjectURL(asset.url));
        return [];
      });
      return;
    }
    let active = true;
    listStudyWorkLogAssets(editing.id).then((items) => {
      if (!active) return;
      setAssets((old) => {
        old.forEach((asset) => URL.revokeObjectURL(asset.url));
        return items.map((asset) => ({ ...asset, url: URL.createObjectURL(asset.blob) }));
      });
    }).catch(() => {});
    return () => { active = false; };
  }, [editing?.id]);

  const projectNames = useMemo(
    () => Array.from(new Set([...projects.map((project) => project.name), ...logs.map((log) => log.projectName)].filter(Boolean))).sort(),
    [logs, projects],
  );

  const filteredLogs = useMemo(() => {
    const text = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (projectFilter && log.projectName !== projectFilter) return false;
      if (statusFilter && log.status !== statusFilter) return false;
      if (!text) return true;
      const links = log.links.map((link) => `${link.label} ${link.url}`).join(" ");
      return [log.projectName, log.title, log.taskTitle, log.workDone, log.problem, log.solution, log.nextStep, log.commitRef, log.tags.join(" "), links]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [logs, projectFilter, query, statusFilter]);

  function updateEditing(patch: Partial<StudyWorkLog>) {
    setEditing((current) => current ? { ...current, ...patch } : current);
  }

  function changeProjectName(value: string) {
    const project = projects.find((item) => item.name.trim().toLowerCase() === value.trim().toLowerCase());
    updateEditing({ projectName: value, projectId: project?.id || null });
  }

  function chooseTask(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    const project = task?.projectId ? projects.find((item) => item.id === task.projectId) : undefined;
    updateEditing({
      taskId: task?.id || null,
      taskTitle: task?.title || "",
      projectId: project?.id || editing?.projectId || null,
      projectName: editing?.projectName || project?.name || "",
    });
  }

  function insertText(text: string, lineMode?: "bullet" | "number") {
    if (!editing) return;
    const input = bodyInput.current;
    const body = editing.workDone || "";
    if (!input) return updateEditing({ workDone: body + text });
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = body.slice(start, end);
    let nextText = text;
    if (lineMode && selected) {
      nextText = selected
        .split("\n")
        .map((line, index) => `${lineMode === "bullet" ? "•" : `${index + 1}.`} ${line}`)
        .join("\n");
    }
    const next = body.slice(0, start) + nextText + body.slice(end);
    updateEditing({ workDone: next });
    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + nextText.length;
      input.setSelectionRange(cursor, cursor);
    });
  }

  function addRelatedUpdate() {
    if (!editing || !relatedUpdateId) return;
    const log = logs.find((item) => item.id === relatedUpdateId);
    if (!log) return;
    const link: StudyWorkLogLink = {
      id: crypto.randomUUID(),
      label: `Update: ${log.projectName} — ${log.title}`,
      url: `/updates?open=${log.id}`,
    };
    updateEditing({ links: [...editing.links, link] });
    setRelatedUpdateId("");
  }

  function addLink() {
    if (!editing || !linkUrl.trim()) return;
    const link: StudyWorkLogLink = {
      id: crypto.randomUUID(),
      label: linkLabel.trim() || "Reference",
      url: linkUrl.trim(),
    };
    updateEditing({ links: [...editing.links, link] });
    setLinkLabel("");
    setLinkUrl("");
  }

  async function saveEditing() {
    if (!editing) return;
    if (!editing.projectName.trim()) return setMessage("Add the project name at the top first.");
    if (!editing.workDone.trim() && !editing.problem.trim() && !editing.solution.trim()) return setMessage("Write a short update before saving.");
    const saved: StudyWorkLog = {
      ...editing,
      projectName: editing.projectName.trim(),
      title: editing.title.trim() || "Work update",
      updatedAt: nowIso(),
    };
    await saveStudyWorkLog(saved);
    setEditing(saved);
    setMessage("Project update saved.");
    await refresh();
  }

  async function removeLog(log: StudyWorkLog) {
    await deleteStudyWorkLog(log.id);
    if (editing?.id === log.id) setEditing(null);
    setMessage("Update removed.");
    await refresh();
  }

  async function addScreenshots(event: ChangeEvent<HTMLInputElement>) {
    if (!editing) return;
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    await saveStudyWorkLog({ ...editing, updatedAt: nowIso() });
    for (const file of files) {
      await saveStudyWorkLogAsset({
        id: crypto.randomUUID(),
        logId: editing.id,
        name: file.name,
        type: file.type,
        blob: file,
        createdAt: nowIso(),
      });
    }
    const next = await listStudyWorkLogAssets(editing.id);
    setAssets((old) => {
      old.forEach((asset) => URL.revokeObjectURL(asset.url));
      return next.map((asset) => ({ ...asset, url: URL.createObjectURL(asset.blob) }));
    });
    event.target.value = "";
    setMessage(`${files.length} image${files.length === 1 ? "" : "s"} added.`);
    await refresh();
  }

  async function removeAsset(asset: AssetView) {
    await deleteStudyWorkLogAsset(asset.id);
    URL.revokeObjectURL(asset.url);
    setAssets((items) => items.filter((item) => item.id !== asset.id));
  }

  async function exportLog(log: StudyWorkLog) {
    const logAssets = await listStudyWorkLogAssets(log.id);
    await downloadTextPdf({
      fileName: `${log.projectName}-${log.title}`,
      title: log.title,
      subtitle: `${log.projectName} • ${new Date(log.occurredAt).toLocaleString()} • ${statusLabels[log.status]}`,
      sections: [
        { heading: "Update", body: log.workDone || "—" },
        { heading: "Linked task", body: log.taskTitle || "No linked task" },
        { heading: "Problem / blocker", body: log.problem || "—" },
        { heading: "Solution / decision", body: log.solution || "—" },
        { heading: "Next step", body: log.nextStep || "—" },
        { heading: "Technical context", body: `Time spent: ${minutesLabel(log.timeMinutes)}\nCommit / branch / version: ${log.commitRef || "—"}\nTags: ${log.tags.join(", ") || "—"}` },
        { heading: "References", body: log.links.length ? log.links.map((link) => `${link.label}: ${link.url}`).join("\n") : "—" },
        { heading: "Images", body: logAssets.length ? logAssets.map((asset) => asset.name).join("\n") : "No images attached" },
      ],
    });
  }

  async function exportTimeline() {
    const body = filteredLogs.length ? filteredLogs.map((log, index) => [
      `${index + 1}. ${log.projectName} — ${log.title}`,
      `${new Date(log.occurredAt).toLocaleString()} • ${statusLabels[log.status]}${log.taskTitle ? ` • Task: ${log.taskTitle}` : ""}`,
      log.workDone || "—",
      log.problem ? `Problem: ${log.problem}` : "",
      log.solution ? `Solution: ${log.solution}` : "",
      log.nextStep ? `Next: ${log.nextStep}` : "",
    ].filter(Boolean).join("\n")).join("\n\n") : "No matching project updates.";
    await downloadTextPdf({
      fileName: projectFilter ? `${projectFilter}-history` : "project-update-history",
      title: projectFilter ? `${projectFilter} — Work History` : "Project Work History",
      subtitle: `${filteredLogs.length} update(s)`,
      sections: [{ heading: "Timeline", body }],
    });
  }

  return <AppShell subtitle="A simple work journal you can search later" title="Project Updates">
    {message && <div className="mb-5 flex items-center justify-between gap-3 border-b pb-3 text-sm" style={{ borderColor: "rgb(var(--border))" }}><span>{message}</span><button onClick={() => setMessage("")} className="text-muted"><X size={15}/></button></div>}

    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-2xl text-sm leading-6 text-muted">Save what changed, why it changed and what to do next. Keep the page quiet so the work itself stays easy to read.</p>
      <div className="flex items-center gap-2">
        <button onClick={() => setEditing(newWorkLog())} className="button-primary"><Plus size={16}/>New update</button>
        <button onClick={exportTimeline} className="button-secondary" title="Export visible history"><Download size={16}/><span className="hidden sm:inline">PDF</span></button>
      </div>
    </div>

    <div className="mt-6 flex flex-col gap-2 border-y py-3 lg:flex-row lg:items-center" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="relative min-w-0 flex-1"><Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-muted"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent py-2 pl-6 pr-3 text-sm outline-none" placeholder="Search updates, bugs, decisions, tasks…"/></div>
      <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="bg-transparent py-2 text-sm text-muted outline-none"><option value="">All projects</option>{projectNames.map((project) => <option key={project} value={project}>{project}</option>)}</select>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bg-transparent py-2 text-sm text-muted outline-none"><option value="">All status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </div>

    <section className="mx-auto mt-4 max-w-4xl">
      {filteredLogs.map((log) => (
        <article key={log.id} className="border-b py-7" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold text-violet-600">{log.projectName}</span>
            <span className={statusClass(log.status)}>{statusLabels[log.status]}</span>
            <span className="text-muted">{new Date(log.occurredAt).toLocaleString()}</span>
            {log.taskTitle && <span className="text-muted">Task: {log.taskTitle}</span>}
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{log.title}</h2>
          {log.workDone && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-muted">{log.workDone}</p>}
          {(log.problem || log.solution || log.nextStep) && <div className="mt-4 space-y-2 text-sm leading-6">
            {log.problem && <p><span className="font-medium">Blocker:</span> <span className="text-muted">{log.problem}</span></p>}
            {log.solution && <p><span className="font-medium">Decision:</span> <span className="text-muted">{log.solution}</span></p>}
            {log.nextStep && <p><span className="font-medium">Next:</span> <span className="text-muted">{log.nextStep}</span></p>}
          </div>}
          {log.links.length > 0 && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">{log.links.map((link) => <a key={link.id} href={link.url} className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:underline" target={link.url.startsWith("http") ? "_blank" : undefined} rel={link.url.startsWith("http") ? "noreferrer" : undefined}><ExternalLink size={12}/>{link.label}</a>)}</div>}
          <div className="mt-5 flex items-center gap-4 text-xs font-medium text-muted">
            <button onClick={() => setEditing(log)} className="hover:text-violet-600">Open</button>
            <button onClick={() => exportLog(log)} className="hover:text-violet-600">Export PDF</button>
            <button onClick={() => removeLog(log)} className="hover:text-red-600">Delete</button>
            {log.timeMinutes > 0 && <span className="ml-auto">{minutesLabel(log.timeMinutes)}</span>}
          </div>
        </article>
      ))}
      {filteredLogs.length === 0 && <div className="py-20 text-center"><Activity className="mx-auto text-muted" size={26}/><h2 className="mt-4 font-semibold">No updates yet</h2><p className="mt-1 text-sm text-muted">Create one short update. You can add more context later.</p><button onClick={() => setEditing(newWorkLog())} className="button-primary mt-5"><Plus size={16}/>New update</button></div>}
    </section>

    {editing && <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/40 sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
      <div className="mx-auto min-h-screen w-full max-w-5xl bg-white text-zinc-900 shadow-2xl dark:bg-zinc-950 dark:text-zinc-100 sm:min-h-[calc(100vh-2.5rem)] sm:rounded-2xl">
        <div className="flex h-14 items-center gap-2 border-b px-4 sm:px-6" style={{ borderColor: "rgb(var(--border))" }}>
          <span className="mr-auto text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">Project update</span>
          <button onClick={() => exportLog(editing)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/5 dark:hover:bg-white/5" title="Export PDF"><Download size={16}/></button>
          <button onClick={saveEditing} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700"><Save size={14}/>Save</button>
          <button onClick={() => setEditing(null)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/5 dark:hover:bg-white/5" aria-label="Close"><X size={18}/></button>
        </div>

        <header className="px-6 pb-6 pt-8 sm:px-10 sm:pt-10">
          <input
            list="project-update-projects"
            value={editing.projectName}
            onChange={(event) => changeProjectName(event.target.value)}
            className="w-full bg-transparent text-sm font-semibold uppercase tracking-[0.12em] text-violet-600 outline-none placeholder:text-violet-300"
            placeholder="PROJECT NAME"
          />
          <datalist id="project-update-projects">{projectNames.map((name) => <option value={name} key={name}/>)}</datalist>
          <input value={editing.title} onChange={(event) => updateEditing({ title: event.target.value })} className="mt-2 w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-zinc-300 sm:text-4xl" placeholder="What changed today?"/>

          <div className="mt-7 grid gap-x-7 gap-y-4 border-b pb-6 text-sm sm:grid-cols-3" style={{ borderColor: "rgb(var(--border))" }}>
            <label className="block"><span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">Date & time</span><input type="datetime-local" value={toLocalInput(editing.occurredAt)} onChange={(event) => updateEditing({ occurredAt: fromLocalInput(event.target.value) })} className="mt-1 w-full bg-transparent py-1 outline-none"/></label>
            <label className="block"><span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">Status</span><select value={editing.status} onChange={(event) => updateEditing({ status: event.target.value as StudyWorkLogStatus })} className="mt-1 w-full bg-transparent py-1 outline-none">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block"><span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">Linked task</span><select value={editing.taskId || ""} onChange={(event) => chooseTask(event.target.value)} className="mt-1 w-full bg-transparent py-1 outline-none"><option value="">No linked task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          </div>
        </header>

        <div className="sticky top-0 z-10 flex items-center gap-1 border-y bg-white/95 px-5 py-2 backdrop-blur dark:bg-zinc-950/95 sm:px-9" style={{ borderColor: "rgb(var(--border))" }}>
          <button onClick={() => insertText("## ")} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-white" title="Heading"><Heading2 size={16}/></button>
          <button onClick={() => insertText("• ", "bullet")} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-white" title="Bullet list"><List size={16}/></button>
          <button onClick={() => insertText("1. ", "number")} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-white" title="Numbered list"><ListOrdered size={16}/></button>
          <span className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800"/>
          <button onClick={() => editing.taskTitle && insertText(`\nTask: ${editing.taskTitle}\n`)} disabled={!editing.taskTitle} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted hover:bg-black/5 hover:text-zinc-900 disabled:opacity-30 dark:hover:bg-white/5 dark:hover:text-white" title="Insert linked task"><ListTodo size={15}/><span className="hidden sm:inline">Task</span></button>
          <button onClick={() => imageInput.current?.click()} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-white" title="Add image"><ImagePlus size={15}/><span className="hidden sm:inline">Image</span></button>
          <details className="relative ml-1">
            <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-white"><Link2 size={15}/><span className="hidden sm:inline">Reference</span></summary>
            <div className="absolute left-0 top-10 z-20 w-[300px] rounded-xl border bg-white p-3 shadow-xl dark:bg-zinc-950" style={{ borderColor: "rgb(var(--border))" }}>
              <p className="text-xs font-semibold">Link another update</p>
              <div className="mt-2 flex gap-2"><select value={relatedUpdateId} onChange={(event) => setRelatedUpdateId(event.target.value)} className="min-w-0 flex-1 rounded-md border bg-transparent px-2 py-2 text-xs outline-none" style={{ borderColor: "rgb(var(--border))" }}><option value="">Choose update</option>{logs.filter((log) => log.id !== editing.id).map((log) => <option key={log.id} value={log.id}>{log.projectName} — {log.title}</option>)}</select><button onClick={addRelatedUpdate} className="rounded-md bg-violet-600 px-2.5 text-xs font-semibold text-white">Add</button></div>
              <p className="mt-4 text-xs font-semibold">Add any link</p>
              <input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} className="mt-2 w-full border-b bg-transparent py-2 text-xs outline-none" style={{ borderColor: "rgb(var(--border))" }} placeholder="Label: GitHub, Drive, Live…"/>
              <div className="flex gap-2"><input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addLink()} className="min-w-0 flex-1 border-b bg-transparent py-2 text-xs outline-none" style={{ borderColor: "rgb(var(--border))" }} placeholder="Paste URL"/><button onClick={addLink} className="px-2 text-xs font-semibold text-violet-600">Add</button></div>
            </div>
          </details>
          <input ref={imageInput} hidden type="file" accept="image/*" multiple onChange={addScreenshots}/>
        </div>

        <main className="px-6 pb-16 pt-2 sm:px-10">
          <textarea
            ref={bodyInput}
            value={editing.workDone}
            onChange={(event) => updateEditing({ workDone: event.target.value })}
            className="min-h-[48vh] w-full resize-none bg-transparent py-7 text-[16px] leading-8 outline-none placeholder:text-zinc-300 sm:min-h-[52vh]"
            placeholder="Start writing…\n\nKeep it short or write a full update. Use the small toolbar for headings, bullet points, numbered points, task references, links and images."
          />

          {editing.links.length > 0 && <section className="border-t py-6" style={{ borderColor: "rgb(var(--border))" }}><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">References</p><div className="mt-3 space-y-2">{editing.links.map((link) => <div key={link.id} className="flex items-center gap-3 text-sm"><a href={link.url} target={link.url.startsWith("http") ? "_blank" : undefined} rel={link.url.startsWith("http") ? "noreferrer" : undefined} className="min-w-0 flex-1 truncate text-violet-600 hover:underline">{link.label}</a><button onClick={() => updateEditing({ links: editing.links.filter((item) => item.id !== link.id) })} className="text-muted hover:text-red-600"><X size={14}/></button></div>)}</div></section>}

          {assets.length > 0 && <section className="border-t py-6" style={{ borderColor: "rgb(var(--border))" }}><div className="mb-4 flex items-center gap-2"><FileImage size={15} className="text-muted"/><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Images</p></div><div className="space-y-5">{assets.map((asset) => <figure key={asset.id} className="group relative"><a href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt={asset.name} className="max-h-[620px] w-full rounded-lg object-contain bg-zinc-50 dark:bg-zinc-900"/></a><figcaption className="mt-1 flex items-center gap-2 text-xs text-muted"><span className="min-w-0 flex-1 truncate">{asset.name}</span><button onClick={() => removeAsset(asset)} className="opacity-0 transition group-hover:opacity-100"><Trash2 size={13}/></button></figcaption></figure>)}</div></section>}

          <details className="border-t py-6" style={{ borderColor: "rgb(var(--border))" }}>
            <summary className="cursor-pointer text-sm font-medium text-muted hover:text-zinc-900 dark:hover:text-white">More context <span className="ml-1 text-xs">— blocker, decision, next step, time, Git, tags</span></summary>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Problem / blocker</span><textarea value={editing.problem} onChange={(event) => updateEditing({ problem: event.target.value })} className="mt-1 min-h-24 w-full resize-none border-b bg-transparent py-2 text-sm leading-6 outline-none" style={{ borderColor: "rgb(var(--border))" }} placeholder="What got in the way?"/></label>
              <label className="block"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Solution / decision</span><textarea value={editing.solution} onChange={(event) => updateEditing({ solution: event.target.value })} className="mt-1 min-h-24 w-full resize-none border-b bg-transparent py-2 text-sm leading-6 outline-none" style={{ borderColor: "rgb(var(--border))" }} placeholder="What decision worked and why?"/></label>
              <label className="block sm:col-span-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Next step</span><textarea value={editing.nextStep} onChange={(event) => updateEditing({ nextStep: event.target.value })} className="mt-1 min-h-20 w-full resize-none border-b bg-transparent py-2 text-sm leading-6 outline-none" style={{ borderColor: "rgb(var(--border))" }} placeholder="What should happen next?"/></label>
              <label className="block"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Time spent (minutes)</span><input type="number" min="0" value={editing.timeMinutes} onChange={(event) => updateEditing({ timeMinutes: Number(event.target.value) || 0 })} className="mt-1 w-full border-b bg-transparent py-2 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }}/></label>
              <label className="block"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Commit / branch / version</span><input value={editing.commitRef} onChange={(event) => updateEditing({ commitRef: event.target.value })} className="mt-1 w-full border-b bg-transparent py-2 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }} placeholder="main@abc123, feature/tasks…"/></label>
              <label className="block sm:col-span-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Tags</span><input value={editing.tags.join(", ")} onChange={(event) => updateEditing({ tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="mt-1 w-full border-b bg-transparent py-2 text-sm outline-none" style={{ borderColor: "rgb(var(--border))" }} placeholder="nextjs, ui, bug, client-feedback"/></label>
            </div>
          </details>

          <div className="mt-8 flex items-center justify-between border-t pt-5" style={{ borderColor: "rgb(var(--border))" }}>
            <p className="text-xs text-muted">Saved locally with your project history.</p>
            <div className="flex items-center gap-3"><button onClick={() => setEditing(null)} className="text-sm font-medium text-muted hover:text-zinc-900 dark:hover:text-white">Close</button><button onClick={saveEditing} className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"><Save size={15}/>Save update</button></div>
          </div>
        </main>
      </div>
    </div>}
  </AppShell>;
}
