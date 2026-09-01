"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Check, Download, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { downloadTextPdf } from "@/lib/pdf-export";
import {
  deleteStudyFlashcard,
  listStudyFlashcards,
  listStudySubjects,
  saveStudyFlashcard,
  scheduleFlashcard,
  type StudyFlashcard,
  type StudySubject,
} from "@/lib/local-study-db";

function nowIso() { return new Date().toISOString(); }

export function FlashcardsClient() {
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [cards, setCards] = useState<StudyFlashcard[]>([]);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [tags, setTags] = useState("");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const [nextSubjects, nextCards] = await Promise.all([listStudySubjects(), listStudyFlashcards()]);
    setSubjects(nextSubjects);
    setCards(nextCards);
  }

  useEffect(() => { refresh().catch(() => setMessage("Local flashcard storage is unavailable.")); }, []);

  const dueCards = useMemo(() => cards.filter((card) => new Date(card.nextReviewAt).getTime() <= Date.now()), [cards]);
  const reviewCard = dueCards[reviewIndex % Math.max(1, dueCards.length)] || null;
  const subjectName = (id: string | null) => subjects.find((subject) => subject.id === id)?.name || "General";

  async function addCard() {
    if (!front.trim() || !back.trim()) return setMessage("Add both the question/front and answer/back.");
    const now = nowIso();
    await saveStudyFlashcard({ id: crypto.randomUUID(), subjectId: subjectId || null, front: front.trim(), back: back.trim(), tags: tags.split(",").map((item) => item.trim()).filter(Boolean), mastery: 0, nextReviewAt: now, createdAt: now, updatedAt: now });
    setFront(""); setBack(""); setTags("");
    setMessage("Flashcard saved on this device and added to review.");
    await refresh();
  }

  async function review(rating: "again" | "hard" | "good" | "easy") {
    if (!reviewCard) return;
    await saveStudyFlashcard(scheduleFlashcard(reviewCard, rating));
    setShowBack(false); setReviewIndex(0); await refresh();
  }

  async function remove(id: string) { await deleteStudyFlashcard(id); await refresh(); }

  async function exportPdf() {
    await downloadTextPdf({
      fileName: "speakly-flashcards",
      title: "Speakly Flashcard Bank",
      subtitle: `${cards.length} card(s) • ${dueCards.length} due for review`,
      sections: cards.length ? cards.map((card, index) => ({ heading: `${index + 1}. ${card.front}`, body: `${card.back}\n\nSubject: ${subjectName(card.subjectId)} • Mastery: ${card.mastery}% • Next review: ${new Date(card.nextReviewAt).toLocaleString()}${card.tags.length ? `\nTags: ${card.tags.join(", ")}` : ""}` })) : [{ body: "No flashcards yet." }],
    });
  }

  return <AppShell subtitle="Spaced Revision" title="Flashcards">
    {message && <div className="muted-surface mb-5 rounded-xl p-3 text-sm">{message}</div>}
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-3"><Plus className="text-violet-600"/><div><h2 className="text-xl font-bold">Create a flashcard</h2><p className="text-sm text-muted">Store formulas, definitions, English vocabulary, viva questions or exam facts locally.</p></div></div>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="muted-surface mt-5 w-full rounded-xl px-4 py-3 text-sm outline-none"><option value="">General</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
        <textarea value={front} onChange={(e) => setFront(e.target.value)} className="muted-surface mt-3 min-h-28 w-full rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-violet-500" placeholder="Front: What is database normalization?"/>
        <textarea value={back} onChange={(e) => setBack(e.target.value)} className="muted-surface mt-3 min-h-32 w-full rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-violet-500" placeholder="Back: A process of organizing data to reduce redundancy..."/>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className="muted-surface mt-3 w-full rounded-xl px-4 py-3 text-sm outline-none" placeholder="Tags: midterm, chapter 2, vocabulary"/>
        <button onClick={addCard} className="button-primary mt-4"><Plus size={17}/>Save flashcard</button>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-violet-600">TODAY&apos;S REVIEW</p><h2 className="mt-1 text-xl font-bold">{dueCards.length} card{dueCards.length === 1 ? "" : "s"} due</h2></div><Brain className="text-violet-600"/></div>
        {reviewCard ? <div className="mt-6"><button onClick={() => setShowBack((value) => !value)} className="muted-surface flex min-h-64 w-full flex-col items-center justify-center rounded-2xl p-8 text-center"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">{subjectName(reviewCard.subjectId)} • mastery {reviewCard.mastery}%</p><p className="mt-5 text-xl font-bold leading-8">{showBack ? reviewCard.back : reviewCard.front}</p><p className="mt-5 text-xs text-muted">Tap to {showBack ? "show question" : "reveal answer"}</p></button>{showBack && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><button onClick={() => review("again")} className="rounded-xl bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-600">Again</button><button onClick={() => review("hard")} className="rounded-xl bg-amber-500/10 px-3 py-3 text-sm font-semibold text-amber-600">Hard</button><button onClick={() => review("good")} className="rounded-xl bg-emerald-500/10 px-3 py-3 text-sm font-semibold text-emerald-600">Good</button><button onClick={() => review("easy")} className="rounded-xl bg-violet-500/10 px-3 py-3 text-sm font-semibold text-violet-600">Easy</button></div>}</div> : <div className="mt-6 rounded-2xl bg-emerald-500/10 p-8 text-center"><Check className="mx-auto text-emerald-600"/><h3 className="mt-3 font-bold">Review complete</h3><p className="mt-2 text-sm text-muted">Nothing is due right now. New cards will appear here automatically.</p></div>}
      </section>
    </div>

    <section className="card mt-6 p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2"><RotateCcw size={18} className="text-violet-600"/><h2 className="font-bold">Your flashcard bank</h2><button onClick={exportPdf} className="button-secondary ml-auto px-3 py-2"><Download size={15}/>Export PDF</button></div><div className="mt-4 space-y-3">{cards.map((card) => <div key={card.id} className="muted-surface flex items-start gap-3 rounded-xl p-4"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-violet-600">{subjectName(card.subjectId)} • {card.mastery}% mastery</p><p className="mt-1 font-semibold">{card.front}</p><p className="mt-2 text-sm text-muted">{card.back}</p><p className="mt-2 text-xs text-muted">Next review: {new Date(card.nextReviewAt).toLocaleString()}</p></div><button onClick={() => remove(card.id)} className="text-muted hover:text-red-500" aria-label="Delete flashcard"><Trash2 size={16}/></button></div>)}{cards.length === 0 && <p className="py-8 text-center text-sm text-muted">No flashcards yet.</p>}</div></section>
  </AppShell>;
}
