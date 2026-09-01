"use client";

import { type ChangeEvent, type ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  Braces,
  CheckSquare2,
  Code2,
  Copy,
  Download,
  FilePlus2,
  Focus,
  Hash,
  ImagePlus,
  List,
  ListChecks,
  MonitorUp,
  Quote,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Trash2,
  Type,
  WandSparkles,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, type ApiError } from "@/lib/client-api";
import { downloadTextPdf } from "@/lib/pdf-export";
import {
  deleteStudyAsset,
  deleteStudyNote,
  listStudyAssets,
  listStudyNotes,
  saveStudyAsset,
  saveStudyFlashcard,
  saveStudyNote,
  type StudyAsset,
  type StudyNote,
} from "@/lib/local-study-db";

type AssetView = StudyAsset & { url: string };
type AiResult = {
  action: string;
  title: string;
  summary: string;
  content?: string;
  slides?: { title: string; bullets: string[]; speakerNotes: string }[];
  flashcards?: { front: string; back: string }[];
  quiz?: { question: string; options: string[]; answer: string; explanation: string }[];
};
type Template = { label: string; subject: string; tags: string[]; body: string };

const aiActions = [
  ["explain", "Explain Easy", WandSparkles],
  ["summary", "Summarize", Sparkles],
  ["revision", "Revision", ListChecks],
  ["presentation", "Presentation", MonitorUp],
  ["flashcards", "Flashcards", BrainCircuit],
  ["quiz", "Quiz Me", CheckSquare2],
  ["cse-viva", "CSE Viva", Braces],
  ["code-review", "Code Review", Code2],
  ["algorithm", "Algorithm", List],
  ["database", "Database", Table2],
] as const;

const templates: Record<string, Template> = {
  lecture: {
    label: "CSE Lecture",
    subject: "CSE",
    tags: ["cse", "lecture"],
    body: `# Topic\n\n## Core concepts\n- \n\n## How it works\n1. \n2. \n3. \n\n## Example\n\n## Important terms\n- \n\n## Questions\n- [ ] \n\n## Viva answer\n`,
  },
  algorithm: {
    label: "Algorithm / DSA",
    subject: "Data Structures & Algorithms",
    tags: ["cse", "dsa", "algorithm"],
    body: `# Algorithm / Data Structure\n\n## Problem it solves\n\n## Intuition\n\n## Steps\n1. \n2. \n\n## Pseudocode\n\`\`\`text\n\n\`\`\`\n\n## Complexity\n- Time: O()\n- Space: O()\n\n## Edge cases\n- \n\n## Example\n\n## Viva questions\n- \n`,
  },
  coding: {
    label: "Code / Debugging",
    subject: "Programming",
    tags: ["cse", "code", "debug"],
    body: `# Problem / Feature\n\n## Expected\n\n## Current behavior\n\n## Code\n\`\`\`ts\n\n\`\`\`\n\n## Error / logs\n\`\`\`text\n\n\`\`\`\n\n## Root cause\n\n## Fix\n\n## Tests\n- [ ] Happy path\n- [ ] Invalid input\n- [ ] Edge case\n\n## What I learned\n`,
  },
  database: {
    label: "Database / SQL",
    subject: "Database Systems",
    tags: ["cse", "database", "sql"],
    body: `# Database Topic\n\n## Requirement\n\n## Entities & relationships\n- \n\n## Schema\n| Table | Key fields | Purpose |\n| --- | --- | --- |\n|  |  |  |\n\n## SQL\n\`\`\`sql\n\n\`\`\`\n\n## Constraints / normalization\n\n## Performance\n\n## Viva questions\n- \n`,
  },
  system: {
    label: "System Design",
    subject: "Software Engineering / System Design",
    tags: ["cse", "system-design"],
    body: `# System Design\n\n## Requirements\n- \n\n## Architecture\n\n## Components\n- Client:\n- API:\n- Database:\n- Cache:\n\n## Data model\n\n## API\n\n## Trade-offs\n\n## Security\n\n## Failure cases\n`,
  },
  viva: {
    label: "Viva Prep",
    subject: "CSE Viva",
    tags: ["cse", "viva"],
    body: `# Viva Topic\n\n## One sentence\n\n## 30-second answer\n\n## 2-minute answer\n\n## Why is it used?\n\n## How does it work?\n\n## Compare\n\n## Real example\n\n## Follow-up\n- Q:\n  A:\n`,
  },
  project: {
    label: "Project / Thesis",
    subject: "CSE Project",
    tags: ["cse", "project"],
    body: `# Project\n\n## Problem\n\n## Solution\n\n## Tech stack\n- Frontend:\n- Backend:\n- Database:\n\n## Architecture\n\n## Features\n- [ ] \n\n## API / DB decisions\n\n## Security\n\n## Testing\n\n## Challenges\n\n## Demo / presentation\n`,
  },
};

function blankNote(): StudyNote {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title: "Untitled note", subject: "", body: "", tags: [], createdAt: now, updatedAt: now };
}

function aiResultText(result: AiResult) {
  const sections = [result.summary];
  if (result.content) sections.push(result.content);
  if (result.slides?.length) result.slides.forEach((slide, index) => sections.push(`Slide ${index + 1}: ${slide.title}\n${slide.bullets.map((item) => `• ${item}`).join("\n")}\nSpeaker notes: ${slide.speakerNotes}`));
  if (result.flashcards?.length) sections.push(result.flashcards.map((card, index) => `${index + 1}. ${card.front}\n${card.back}`).join("\n\n"));
  if (result.quiz?.length) sections.push(result.quiz.map((item, index) => `${index + 1}. ${item.question}\n${item.options.join(" | ")}\nAnswer: ${item.answer}\nWhy: ${item.explanation}`).join("\n\n"));
  return sections.join("\n\n");
}

function imageName(blob: Blob, index: number) {
  const subtype = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return `pasted-image-${Date.now()}-${index + 1}.${subtype}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotesClient() {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [current, setCurrent] = useState<StudyNote | null>(null);
  const [assets, setAssets] = useState<AssetView[]>([]);
  const [message, setMessage] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [busy, setBusy] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [noteQuery, setNoteQuery] = useState("");
  const [templateKey, setTemplateKey] = useState("lecture");
  const [focusMode, setFocusMode] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listStudyNotes().then(async (items) => {
      if (items.length) {
        setNotes(items);
        setCurrent(items[0]);
      } else {
        const first = blankNote();
        await saveStudyNote(first);
        setNotes([first]);
        setCurrent(first);
      }
    }).catch(() => setMessage("Local notes storage is unavailable in this browser."));
  }, []);

  useEffect(() => {
    if (!current) return;
    let active = true;
    listStudyAssets(current.id).then((items) => {
      if (!active) return;
      setAssets((old) => {
        old.forEach((asset) => URL.revokeObjectURL(asset.url));
        return items.map((asset) => ({ ...asset, url: URL.createObjectURL(asset.blob) }));
      });
    }).catch(() => setMessage("Could not load note images."));
    return () => { active = false; };
  }, [current?.id]);

  useEffect(() => {
    if (!current) return;
    setSaveState("Saving…");
    const timer = window.setTimeout(async () => {
      const saved = { ...current, title: current.title.trim() || "Untitled note", updatedAt: new Date().toISOString() };
      try {
        await saveStudyNote(saved);
        setNotes((items) => [saved, ...items.filter((item) => item.id !== saved.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        setSaveState("Saved");
      } catch {
        setSaveState("Save failed");
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [current?.title, current?.subject, current?.body, current?.tags.join("|")]);

  const filteredNotes = useMemo(() => {
    const query = noteQuery.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((note) => `${note.title} ${note.subject} ${note.tags.join(" ")} ${note.body}`.toLowerCase().includes(query));
  }, [notes, noteQuery]);

  const stats = useMemo(() => {
    const body = current?.body || "";
    return {
      words: body.trim() ? body.trim().split(/\s+/).length : 0,
      codeBlocks: Math.floor((body.match(/```/g)?.length || 0) / 2),
      tasks: (body.match(/- \[[ xX]\]/g) || []).length,
    };
  }, [current?.body]);

  function update(patch: Partial<StudyNote>) {
    setCurrent((value) => value ? { ...value, ...patch } : value);
  }

  async function save() {
    if (!current) return;
    const saved = { ...current, title: current.title.trim() || "Untitled note", updatedAt: new Date().toISOString() };
    await saveStudyNote(saved);
    setCurrent(saved);
    setNotes((items) => [saved, ...items.filter((note) => note.id !== saved.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setSaveState("Saved");
  }

  async function createNote(template?: Template) {
    const note = blankNote();
    if (template) {
      note.title = template.label;
      note.subject = template.subject;
      note.tags = template.tags;
      note.body = template.body;
    }
    await saveStudyNote(note);
    setNotes((items) => [note, ...items]);
    setCurrent(note);
    setAiResult(null);
    setMessage("");
  }

  async function duplicateNote() {
    if (!current) return;
    const now = new Date().toISOString();
    const copy = { ...current, id: crypto.randomUUID(), title: `${current.title} copy`, createdAt: now, updatedAt: now };
    await saveStudyNote(copy);
    setNotes((items) => [copy, ...items]);
    setCurrent(copy);
    setMessage("Note duplicated.");
  }

  async function removeNoteById(id: string) {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    if (!window.confirm(`Delete “${note.title || "Untitled note"}”? This removes its saved screenshots too.`)) return;
    await deleteStudyNote(id);
    const remaining = notes.filter((item) => item.id !== id);
    if (!remaining.length) {
      const next = blankNote();
      await saveStudyNote(next);
      setNotes([next]);
      setCurrent(next);
    } else {
      setNotes(remaining);
      if (current?.id === id) setCurrent(remaining[0]);
    }
    setAiResult(null);
  }

  function selectNote(note: StudyNote) {
    setCurrent(note);
    setAiResult(null);
    setMessage("");
  }

  function insertText(prefix: string, suffix = "", placeholder = "text") {
    if (!current) return;
    const start = editor.current?.selectionStart ?? current.body.length;
    const end = editor.current?.selectionEnd ?? current.body.length;
    const selected = current.body.slice(start, end) || placeholder;
    update({ body: `${current.body.slice(0, start)}${prefix}${selected}${suffix}${current.body.slice(end)}` });
    requestAnimationFrame(() => editor.current?.focus());
  }

  async function refreshAssets(noteId: string) {
    const refreshed = await listStudyAssets(noteId);
    setAssets((old) => {
      old.forEach((asset) => URL.revokeObjectURL(asset.url));
      return refreshed.map((asset) => ({ ...asset, url: URL.createObjectURL(asset.blob) }));
    });
  }

  async function storeImageBlobs(blobs: Blob[], names?: string[]) {
    if (!current || !blobs.length) return;
    for (let index = 0; index < blobs.length; index += 1) {
      const blob = blobs[index];
      await saveStudyAsset({
        id: crypto.randomUUID(),
        noteId: current.id,
        name: names?.[index] || imageName(blob, index),
        type: blob.type || "image/png",
        blob,
        createdAt: new Date().toISOString(),
      });
    }
    await refreshAssets(current.id);
    setMessage(`${blobs.length} image${blobs.length === 1 ? "" : "s"} saved with this note.`);
  }

  async function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    await storeImageBlobs(files, files.map((file) => file.name));
    event.target.value = "";
  }

  async function pasteIntoNote(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!images.length) return;
    event.preventDefault();
    await storeImageBlobs(images);
  }

  async function protectStorage() {
    if (!navigator.storage?.persist) return setMessage("Persistent browser storage is not supported here.");
    const granted = await navigator.storage.persist();
    setMessage(granted ? "Browser granted persistent device storage." : "Browser kept normal storage rules. Export important notes as PDF backup.");
  }

  async function useAi(action: string) {
    if (!current) return;
    setBusy(true);
    setMessage("");
    try {
      setAiResult(await api<AiResult>("/api/notes/ai", {
        method: "POST",
        body: JSON.stringify({ action, title: current.title, subject: current.subject, body: current.body }),
      }));
    } catch (error) {
      const apiError = error as ApiError;
      const data = apiError.data as { message?: string; error?: string } | undefined;
      setMessage(data?.message || data?.error || apiError.message);
    } finally {
      setBusy(false);
    }
  }

  function appendAiResult() {
    if (!current || !aiResult) return;
    update({ body: `${current.body.trim()}\n\n---\n\n${aiResultText(aiResult)}\n` });
  }

  async function saveAiFlashcards() {
    if (!aiResult?.flashcards?.length) return;
    const now = new Date().toISOString();
    await Promise.all(aiResult.flashcards.map((card) => saveStudyFlashcard({
      id: crypto.randomUUID(),
      subjectId: null,
      front: card.front,
      back: card.back,
      tags: [current?.subject || "CSE", "notes"].filter(Boolean),
      mastery: 0,
      nextReviewAt: now,
      createdAt: now,
      updatedAt: now,
    })));
    setMessage(`${aiResult.flashcards.length} flashcards saved to your local Flashcard Bank.`);
  }

  async function downloadNote() {
    if (!current) return;
    await downloadTextPdf({
      fileName: current.title,
      title: current.title,
      subtitle: `${current.subject || "General"} • ${(current.tags || []).join(", ") || "Study note"}`,
      sections: [{ heading: "Note", body: current.body || "Empty note" }],
    });
  }

  async function downloadAiResult() {
    if (!aiResult) return;
    await downloadTextPdf({
      fileName: `${aiResult.action}-${aiResult.title}`,
      title: aiResult.title,
      subtitle: `Study AI • ${current?.subject || "General"}`,
      sections: [{ heading: aiResult.action, body: aiResultText(aiResult) }],
    });
  }

  async function downloadPresentation() {
    if (!aiResult?.slides?.length) return;
    await downloadTextPdf({
      fileName: `${aiResult.title}-presentation`,
      title: aiResult.title,
      subtitle: `${current?.subject || "Study"} • Presentation / speaker notes`,
      sections: aiResult.slides.map((slide, index) => ({
        heading: `Slide ${index + 1}: ${slide.title}`,
        body: `${slide.bullets.map((bullet) => `• ${bullet}`).join("\n")}\n\nSpeaker notes: ${slide.speakerNotes}`,
      })),
    });
  }

  return (
    <AppShell subtitle="Knowledge workspace" title="Notes">
      <div className={focusMode ? "mx-auto max-w-5xl" : "grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"}>
        {!focusMode && (
          <aside className="card flex min-h-[560px] flex-col overflow-hidden lg:sticky lg:top-4 lg:h-[calc(100vh-122px)]">
            <div className="p-4 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">My notes</p>
                  <p className="mt-0.5 text-[11px] text-muted">{notes.length} note{notes.length === 1 ? "" : "s"} on this device</p>
                </div>
                <button onClick={() => createNote()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm" title="New note" aria-label="New note"><FilePlus2 size={16}/></button>
              </div>

              <label className="muted-surface mt-4 flex h-10 items-center gap-2 rounded-xl px-3">
                <Search size={15} className="text-muted"/>
                <input value={noteQuery} onChange={(event) => setNoteQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search notes"/>
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {filteredNotes.map((note) => {
                const active = current?.id === note.id;
                return (
                  <div key={note.id} className={`group mb-1 flex items-start gap-1 rounded-xl border px-1 py-1 transition ${active ? "border-violet-500/20 bg-violet-500/10" : "border-transparent hover:bg-violet-500/5"}`}>
                    <button onClick={() => selectNote(note)} className="min-w-0 flex-1 rounded-lg px-2.5 py-2.5 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-violet-600" : "bg-black/15 dark:bg-white/20"}`}/>
                        <p className={`truncate text-sm font-semibold ${active ? "text-violet-700 dark:text-violet-300" : ""}`}>{note.title || "Untitled note"}</p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 pl-3.5 text-[10px] text-muted">
                        <span className="truncate">{note.subject || "General"}</span><span>•</span><span className="shrink-0">{formatDate(note.updatedAt)}</span>
                      </div>
                    </button>
                    <button onClick={() => removeNoteById(note.id)} className="mt-2 rounded-lg p-2 text-muted opacity-100 transition hover:bg-red-500/10 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100" title="Delete note" aria-label={`Delete ${note.title}`}><Trash2 size={13}/></button>
                  </div>
                );
              })}
              {!filteredNotes.length && <p className="px-3 py-10 text-center text-xs text-muted">No notes found.</p>}
            </div>

            <div className="border-t p-3 text-[10px] leading-5 text-muted" style={{ borderColor: "rgb(var(--border))" }}>
              Notes autosave locally. Use PDF export for an extra copy.
            </div>
          </aside>
        )}

        <div className="min-w-0">
          {message && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-violet-500/10 px-4 py-3 text-sm">
              <span>{message}</span><button onClick={() => setMessage("")} className="rounded-lg p-1 text-muted hover:bg-black/5 dark:hover:bg-white/5"><X size={15}/></button>
            </div>
          )}

          {current && (
            <section className="card overflow-visible">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5" style={{ borderColor: "rgb(var(--border))" }}>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1.5 font-semibold ${saveState === "Save failed" ? "text-red-600" : "text-muted"}`}><Save size={13}/>{saveState}</span>
                  <span className="text-muted/60">•</span>
                  <span className="text-muted">{stats.words} words</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button onClick={() => imageInput.current?.click()} className="button-secondary px-2.5 py-2 text-xs" title="Add image"><ImagePlus size={15}/><span className="hidden sm:inline">Image</span></button>
                  <input ref={imageInput} hidden type="file" accept="image/*" multiple onChange={addImages}/>
                  <button onClick={downloadNote} className="button-secondary px-2.5 py-2 text-xs" title="Export PDF"><Download size={15}/><span className="hidden sm:inline">PDF</span></button>
                  <button onClick={() => setFocusMode((value) => !value)} className={`button-secondary px-2.5 py-2 text-xs ${focusMode ? "ring-2 ring-violet-500" : ""}`} title="Focus mode"><Focus size={15}/><span className="hidden sm:inline">{focusMode ? "Exit focus" : "Focus"}</span></button>

                  <details className="relative">
                    <summary className="button-secondary cursor-pointer list-none px-3 py-2 text-xs">More</summary>
                    <div className="surface absolute right-0 top-11 z-50 w-48 space-y-1 rounded-xl border p-2 shadow-xl" style={{ borderColor: "rgb(var(--border))" }}>
                      <button onClick={save} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-violet-500/10"><Save size={14}/>Save now</button>
                      <button onClick={duplicateNote} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-violet-500/10"><Copy size={14}/>Duplicate</button>
                      <button onClick={protectStorage} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-violet-500/10"><ShieldCheck size={14}/>Protect storage</button>
                    </div>
                  </details>
                </div>
              </div>

              {!focusMode && (
                <div className="px-5 pb-4 pt-6 sm:px-8 sm:pt-8">
                  <input value={current.title} onChange={(event) => update({ title: event.target.value })} className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none sm:text-[34px]" placeholder="Untitled note"/>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input value={current.subject} onChange={(event) => update({ subject: event.target.value })} className="min-w-0 flex-1 border-b bg-transparent px-0 py-2 text-sm outline-none focus:border-violet-500" style={{ borderColor: "rgb(var(--border))" }} placeholder="Subject or course"/>
                    <input value={current.tags.join(", ")} onChange={(event) => update({ tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="min-w-0 flex-1 border-b bg-transparent px-0 py-2 text-sm outline-none focus:border-violet-500" style={{ borderColor: "rgb(var(--border))" }} placeholder="Tags — cse, database, midterm"/>
                  </div>
                </div>
              )}

              {!focusMode && (
                <div className="flex flex-wrap items-center gap-2 border-y px-4 py-2.5 sm:px-5" style={{ borderColor: "rgb(var(--border))" }}>
                  <details className="relative">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted hover:bg-violet-500/10 hover:text-violet-600"><Braces size={14}/>Templates</summary>
                    <div className="surface absolute left-0 top-10 z-40 w-64 rounded-xl border p-3 shadow-xl" style={{ borderColor: "rgb(var(--border))" }}>
                      <select value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} className="muted-surface h-10 w-full rounded-lg px-3 text-xs font-semibold outline-none">
                        {Object.entries(templates).map(([key, template]) => <option key={key} value={key}>{template.label}</option>)}
                      </select>
                      <button onClick={() => createNote(templates[templateKey])} className="button-primary mt-2 w-full justify-center px-3 py-2 text-xs">Create from template</button>
                    </div>
                  </details>

                  <details className="relative">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg bg-violet-500/10 px-2.5 py-2 text-xs font-bold text-violet-600"><Sparkles size={14}/>Study AI</summary>
                    <div className="surface absolute left-0 top-10 z-40 w-[310px] rounded-xl border p-3 shadow-xl sm:w-[380px]" style={{ borderColor: "rgb(var(--border))" }}>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">Work with this note</p>
                      <div className="grid grid-cols-2 gap-2">
                        {aiActions.map(([action, label, Icon]) => (
                          <button key={action} disabled={busy} onClick={() => useAi(action)} className="muted-surface inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold disabled:opacity-50"><Icon size={14}/>{busy ? "Working…" : label}</button>
                        ))}
                      </div>
                    </div>
                  </details>

                  <span className="ml-auto hidden text-[10px] text-muted sm:inline">Markdown-friendly • paste images with Ctrl+V</span>
                </div>
              )}

              {aiResult && !focusMode && (
                <div className="border-b bg-violet-500/[0.04] px-5 py-4 sm:px-8" style={{ borderColor: "rgb(var(--border))" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><Sparkles size={15} className="text-violet-600"/><p className="text-xs font-bold text-violet-600">AI · {aiResult.action}</p></div>
                      <h2 className="mt-1.5 font-bold">{aiResult.title}</h2>
                      <p className="mt-1.5 text-sm leading-6 text-muted">{aiResult.summary}</p>
                    </div>
                    <button onClick={() => setAiResult(null)} className="rounded-lg p-2 text-muted hover:bg-violet-500/10"><X size={15}/></button>
                  </div>
                  {aiResult.content && <div className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-black/[0.025] p-4 text-sm leading-6 dark:bg-white/[0.035]">{aiResult.content}</div>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={appendAiResult} className="button-primary px-3 py-2 text-xs"><FilePlus2 size={14}/>Add to note</button>
                    {aiResult.flashcards?.length ? <button onClick={saveAiFlashcards} className="button-secondary px-3 py-2 text-xs"><BrainCircuit size={14}/>Save flashcards</button> : null}
                    {aiResult.slides?.length ? <button onClick={downloadPresentation} className="button-secondary px-3 py-2 text-xs"><MonitorUp size={14}/>Presentation PDF</button> : null}
                    <button onClick={downloadAiResult} className="button-secondary px-3 py-2 text-xs"><Download size={14}/>Result PDF</button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1 border-b px-4 py-2 sm:px-5" style={{ borderColor: "rgb(var(--border))" }}>
                <button onClick={() => insertText("# ", "", "Heading")} className="rounded-lg p-2 text-muted hover:bg-violet-500/10 hover:text-violet-600" title="Heading"><Hash size={15}/></button>
                <button onClick={() => insertText("## ", "", "Section")} className="rounded-lg p-2 text-muted hover:bg-violet-500/10 hover:text-violet-600" title="Section"><Type size={15}/></button>
                <button onClick={() => insertText("**", "**", "bold text")} className="rounded-lg px-2.5 py-2 text-xs font-black text-muted hover:bg-violet-500/10 hover:text-violet-600" title="Bold">B</button>
                <button onClick={() => insertText("- ", "", "item")} className="rounded-lg p-2 text-muted hover:bg-violet-500/10 hover:text-violet-600" title="List"><List size={15}/></button>
                <button onClick={() => insertText("- [ ] ", "", "task")} className="rounded-lg p-2 text-muted hover:bg-violet-500/10 hover:text-violet-600" title="Checklist"><CheckSquare2 size={15}/></button>
                <button onClick={() => insertText("> ", "", "important note")} className="rounded-lg p-2 text-muted hover:bg-violet-500/10 hover:text-violet-600" title="Quote"><Quote size={15}/></button>
                <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10"/>
                <button onClick={() => insertText("\n```ts\n", "\n```\n", "// TypeScript code")} className="rounded-lg px-2.5 py-2 text-[10px] font-bold text-muted hover:bg-violet-500/10 hover:text-violet-600">TS</button>
                <button onClick={() => insertText("\n```python\n", "\n```\n", "# Python code")} className="rounded-lg px-2.5 py-2 text-[10px] font-bold text-muted hover:bg-violet-500/10 hover:text-violet-600">PY</button>
                <button onClick={() => insertText("\n```sql\n", "\n```\n", "SELECT * FROM table_name;")} className="rounded-lg px-2.5 py-2 text-[10px] font-bold text-muted hover:bg-violet-500/10 hover:text-violet-600">SQL</button>
                <button onClick={() => insertText("\n| Column | Description |\n| --- | --- |\n| ", " |  |\n", "value")} className="rounded-lg p-2 text-muted hover:bg-violet-500/10 hover:text-violet-600" title="Table"><Table2 size={15}/></button>
                <div className="ml-auto hidden items-center gap-3 text-[10px] text-muted sm:flex"><span>{stats.codeBlocks} code</span><span>{stats.tasks} tasks</span></div>
              </div>

              <div className={focusMode ? "mx-auto max-w-4xl" : "mx-auto max-w-[920px]"}>
                <textarea
                  ref={editor}
                  value={current.body}
                  onChange={(event) => update({ body: event.target.value })}
                  onPaste={pasteIntoNote}
                  spellCheck
                  className={`w-full resize-y bg-transparent px-6 py-8 text-[15px] leading-8 outline-none sm:px-10 sm:py-10 ${focusMode ? "min-h-[calc(100vh-220px)]" : "min-h-[calc(100vh-385px)]"}`}
                  placeholder={"Start writing…\n\nUse # for headings, - [ ] for tasks, or paste an image with Ctrl+V."}
                />
              </div>

              <div className="border-t px-4 py-3 sm:px-5" style={{ borderColor: "rgb(var(--border))" }}>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
                  <span>Device-local</span><span>•</span><span>Autosave</span><span className="sm:hidden">• {stats.words} words</span>
                </div>

                {assets.length > 0 && !focusMode && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {assets.map((asset) => (
                      <div key={asset.id} className="group relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border" style={{ borderColor: "rgb(var(--border))" }}>
                        <a href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt={asset.name} className="h-full w-full object-cover"/></a>
                        <button onClick={async () => { await deleteStudyAsset(asset.id); URL.revokeObjectURL(asset.url); setAssets((items) => items.filter((item) => item.id !== asset.id)); }} className="absolute right-1 top-1 rounded-lg bg-black/65 p-1.5 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Delete ${asset.name}`}><Trash2 size={13}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
