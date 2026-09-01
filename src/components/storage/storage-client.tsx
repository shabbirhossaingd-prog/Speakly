"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Database, Download, FileText, FolderKanban, HardDrive, Image, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  exportStudyBackup,
  importStudyBackup,
  listStudyBooks,
  listStudyFlashcards,
  listStudyNotes,
  listStudyProjects,
  listStudySemesters,
  listStudySubjects,
  listStudyTasks,
  listStudyWorkLogs,
  type StudyBackup,
} from "@/lib/local-study-db";

type Stats = {
  usage: number;
  quota: number;
  persisted: boolean;
  books: number;
  bookBytes: number;
  notes: number;
  semesters: number;
  subjects: number;
  tasks: number;
  flashcards: number;
  projects: number;
  workLogs: number;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageClient() {
  const [stats, setStats] = useState<Stats>({ usage: 0, quota: 0, persisted: false, books: 0, bookBytes: 0, notes: 0, semesters: 0, subjects: 0, tasks: 0, flashcards: 0, projects: 0, workLogs: 0 });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    const [books, notes, semesters, subjects, tasks, flashcards, projects, workLogs, estimate, persisted] = await Promise.all([
      listStudyBooks(),
      listStudyNotes(),
      listStudySemesters(),
      listStudySubjects(),
      listStudyTasks(),
      listStudyFlashcards(),
      listStudyProjects(),
      listStudyWorkLogs(),
      navigator.storage?.estimate?.() || Promise.resolve({ usage: 0, quota: 0 }),
      navigator.storage?.persisted?.() || Promise.resolve(false),
    ]);
    setStats({
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      persisted,
      books: books.length,
      bookBytes: books.reduce((sum, book) => sum + book.size, 0),
      notes: notes.length,
      semesters: semesters.length,
      subjects: subjects.length,
      tasks: tasks.length,
      flashcards: flashcards.length,
      projects: projects.length,
      workLogs: workLogs.length,
    });
  }

  useEffect(() => { refresh().catch(() => setMessage("Storage details are not available in this browser.")); }, []);

  async function protect() {
    if (!navigator.storage?.persist) return setMessage("Persistent storage request is not supported here.");
    const granted = await navigator.storage.persist();
    setMessage(granted ? "Persistent device storage granted." : "The browser did not grant persistent storage. Export a full backup regularly.");
    await refresh();
  }

  async function exportFullBackup() {
    setBusy(true);
    setMessage("Preparing full backup including PDFs and image attachments…");
    try {
      const payload = await exportStudyBackup();
      const json = JSON.stringify(payload);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `speakly-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`Full backup exported (${formatBytes(new Blob([json]).size)}). It includes projects, work logs, notes, screenshots/attachments, semesters, tasks, flashcards and PDF blobs.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not export the full backup.");
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(file: File) {
    setBusy(true);
    setMessage("Reading backup…");
    try {
      const backup = JSON.parse(await file.text()) as StudyBackup;
      await importStudyBackup(backup, { replace: replaceOnImport });
      setMessage(replaceOnImport ? "Backup restored and previous local workspace data was replaced." : "Backup imported and merged with current local data.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import this backup.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const percent = stats.quota ? Math.min(100, Math.round((stats.usage / stats.quota) * 100)) : 0;

  return <AppShell subtitle="Local-first" title="Device Storage Manager">
    {message && <div className="muted-surface mb-5 rounded-xl p-3 text-sm">{message}</div>}

    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3"><HardDrive className="text-violet-600"/><div><h2 className="text-xl font-bold">Browser/app storage</h2><p className="mt-1 text-sm text-muted">Your working data stays on this device by default. Backup and restore now cover the complete local workspace.</p></div></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${stats.persisted ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{stats.persisted ? "Persistent storage" : "Normal storage"}</span>
      </div>
      <div className="mt-6 flex items-end justify-between"><div><p className="text-3xl font-black">{formatBytes(stats.usage)}</p><p className="mt-1 text-xs text-muted">used of approx. {formatBytes(stats.quota)} available quota</p></div><p className="text-sm font-semibold">{percent}%</p></div>
      <div className="mt-3 h-3 rounded-full bg-violet-500/10"><div className="h-3 rounded-full bg-violet-600" style={{ width: `${percent}%` }}/></div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={protect} className="button-secondary"><ShieldCheck size={17}/>Protect storage</button>
        <button disabled={busy} onClick={exportFullBackup} className="button-primary disabled:opacity-50"><Download size={17}/>{busy ? "Working…" : "Export full backup"}</button>
        <button disabled={busy} onClick={() => fileInput.current?.click()} className="button-secondary disabled:opacity-50"><Upload size={17}/>Import backup</button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) importBackup(file); }}/>
      </div>
      <label className="mt-4 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={replaceOnImport} onChange={(event) => setReplaceOnImport(event.target.checked)}/>Replace current local data when importing instead of merging.</label>
    </section>

    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "PDF / resources", value: `${stats.books} • ${formatBytes(stats.bookBytes)}`, icon: FileText, href: "/books" },
        { label: "Notes", value: String(stats.notes), icon: Image, href: "/notes" },
        { label: "Projects / updates", value: `${stats.projects} / ${stats.workLogs}`, icon: FolderKanban, href: "/projects" },
        { label: "Subjects / tasks", value: `${stats.subjects} / ${stats.tasks}`, icon: Database, href: "/tasks" },
        { label: "Semesters", value: String(stats.semesters), icon: RotateCcw, href: "/books" },
        { label: "Flashcards", value: String(stats.flashcards), icon: HardDrive, href: "/flashcards" },
      ].map(({ label, value, icon: Icon, href }) => <Link href={href} key={label} className="card p-5"><Icon className="text-violet-600"/><p className="mt-4 text-sm text-muted">{label}</p><p className="mt-1 text-xl font-bold">{value}</p><p className="mt-4 text-xs font-semibold text-violet-600">Manage →</p></Link>)}
    </div>

    <section className="muted-surface mt-6 rounded-2xl p-5 text-sm leading-6">
      <strong>Full backup rule:</strong> the exported JSON now includes project objects, work logs, notes, note attachments/screenshots, semesters, subjects, tasks, flashcards, PDF files and work-log attachments. Clearing browser/app data can still remove local data, so keep the backup somewhere outside this browser profile.
    </section>
  </AppShell>;
}
