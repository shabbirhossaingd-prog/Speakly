"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { deleteStudyNote, listStudyNotes, saveStudyNote, type StudyNote } from "@/lib/local-study-db";

function blankNote(): StudyNote {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title: "Untitled note", subject: "", body: "", tags: [], createdAt: now, updatedAt: now };
}

export function SimpleNotesClient() {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [current, setCurrent] = useState<StudyNote | null>(null);
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState("Saved");

  async function load() {
    const items = await listStudyNotes();
    if (items.length) {
      setNotes(items);
      setCurrent((value) => items.find((item) => item.id === value?.id) || items[0]);
      return;
    }
    const first = blankNote();
    await saveStudyNote(first);
    setNotes([first]);
    setCurrent(first);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  useEffect(() => {
    if (!current) return;
    setSaveState("Saving…");
    const timer = window.setTimeout(async () => {
      const saved = { ...current, title: current.title.trim() || "Untitled note", updatedAt: new Date().toISOString() };
      await saveStudyNote(saved);
      setCurrent(saved);
      setNotes((items) => [saved, ...items.filter((item) => item.id !== saved.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setSaveState("Saved");
    }, 650);
    return () => window.clearTimeout(timer);
  }, [current?.title, current?.subject, current?.body, current?.tags.join("|")]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return notes;
    return notes.filter((note) => `${note.title} ${note.subject} ${note.tags.join(" ")} ${note.body}`.toLowerCase().includes(value));
  }, [notes, query]);

  async function createNote() {
    const note = blankNote();
    await saveStudyNote(note);
    setNotes((items) => [note, ...items]);
    setCurrent(note);
  }

  async function removeNote(note: StudyNote) {
    if (!window.confirm(`Delete “${note.title || "Untitled note"}”?`)) return;
    await deleteStudyNote(note.id);
    const remaining = notes.filter((item) => item.id !== note.id);
    if (!remaining.length) {
      const next = blankNote();
      await saveStudyNote(next);
      setNotes([next]);
      setCurrent(next);
    } else {
      setNotes(remaining);
      if (current?.id === note.id) setCurrent(remaining[0]);
    }
  }

  function update(patch: Partial<StudyNote>) {
    setCurrent((value) => value ? { ...value, ...patch } : value);
  }

  return (
    <AppShell title="Notes" subtitle="Keep ideas, class notes and project thinking in one place.">
      <div className="grid min-h-[calc(100vh-130px)] overflow-hidden rounded-xl border bg-[rgb(var(--surface))] lg:grid-cols-[250px_minmax(0,1fr)]" style={{ borderColor: "rgb(var(--border))" }}>
        <aside className="border-b lg:border-b-0 lg:border-r" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="flex items-center gap-2 p-3">
            <div className="relative min-w-0 flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg bg-[rgb(var(--surface-muted))] py-2 pl-9 pr-3 text-sm outline-none" placeholder="Search notes"/>
            </div>
            <button onClick={createNote} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white" aria-label="New note"><Plus size={17}/></button>
          </div>

          <div className="max-h-56 overflow-y-auto px-2 pb-2 lg:max-h-[calc(100vh-190px)]">
            {filtered.map((note) => {
              const active = note.id === current?.id;
              return (
                <button key={note.id} onClick={() => setCurrent(note)} className={`mb-1 w-full rounded-lg px-3 py-2.5 text-left transition ${active ? "bg-violet-500/10" : "hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"}`}>
                  <p className={`truncate text-sm ${active ? "font-semibold text-violet-700 dark:text-violet-300" : "font-medium"}`}>{note.title || "Untitled note"}</p>
                  <p className="mt-1 truncate text-[11px] text-muted">{note.subject || "General"} · {new Date(note.updatedAt).toLocaleDateString()}</p>
                </button>
              );
            })}
            {!filtered.length && <p className="px-3 py-8 text-center text-xs text-muted">No matching notes.</p>}
          </div>
        </aside>

        {current ? (
          <section className="min-w-0">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-3" style={{ borderColor: "rgb(var(--border))" }}>
              <span className="text-xs text-muted">{saveState}</span>
              <div className="flex items-center gap-2">
                <Link href="/notes/lab" className="rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-violet-500/10 hover:text-violet-700">Study tools</Link>
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-lg p-2 text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.05]" aria-label="Note options"><MoreHorizontal size={17}/></summary>
                  <div className="surface absolute right-0 top-9 z-30 w-40 rounded-lg p-1 shadow-lg">
                    <button onClick={() => removeNote(current)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-500/10"><Trash2 size={13}/>Delete note</button>
                  </div>
                </details>
              </div>
            </div>

            <div className="mx-auto max-w-3xl px-5 py-7 sm:px-8 sm:py-10">
              <input value={current.title} onChange={(event) => update({ title: event.target.value })} className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none" placeholder="Note title"/>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                <input value={current.subject} onChange={(event) => update({ subject: event.target.value })} className="w-40 bg-transparent outline-none placeholder:text-muted" placeholder="Add subject"/>
                <span>•</span>
                <input value={current.tags.join(", ")} onChange={(event) => update({ tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="min-w-48 flex-1 bg-transparent outline-none placeholder:text-muted" placeholder="Add tags"/>
              </div>

              <textarea
                value={current.body}
                onChange={(event) => update({ body: event.target.value })}
                className="mt-8 min-h-[60vh] w-full resize-none bg-transparent text-[15px] leading-7 outline-none"
                placeholder="Start writing…"
                spellCheck
              />
            </div>
          </section>
        ) : <div className="grid place-items-center text-sm text-muted">Select a note.</div>}
      </div>
    </AppShell>
  );
}
