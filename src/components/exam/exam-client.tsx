"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { listStudyFlashcards, listStudySubjects, type StudyFlashcard, type StudySubject } from "@/lib/local-study-db";

type Answer = { cardId: string; correct: boolean };

export function ExamClient() {
  const [cards, setCards] = useState<StudyFlashcard[]>([]);
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(10);
  const [examCards, setExamCards] = useState<StudyFlashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => { Promise.all([listStudyFlashcards(), listStudySubjects()]).then(([c, s]) => { setCards(c); setSubjects(s); }); }, []);

  const available = useMemo(() => cards.filter((card) => !subjectId || card.subjectId === subjectId), [cards, subjectId]);
  const current = examCards[index] || null;
  const score = answers.filter((answer) => answer.correct).length;

  useEffect(() => {
    if (!examCards.length || finished || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [examCards.length, finished, secondsLeft]);

  useEffect(() => {
    if (examCards.length && secondsLeft <= 0 && !finished) setFinished(true);
  }, [secondsLeft, examCards.length, finished]);

  function start() {
    const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, Math.min(count, available.length));
    setExamCards(shuffled); setIndex(0); setTyped(""); setRevealed(false); setAnswers([]); setSecondsLeft(minutes * 60); setFinished(false);
  }

  function mark(correct: boolean) {
    if (!current) return;
    const nextAnswers = [...answers, { cardId: current.id, correct }];
    setAnswers(nextAnswers);
    if (index + 1 >= examCards.length) { setFinished(true); return; }
    setIndex((value) => value + 1); setTyped(""); setRevealed(false);
  }

  function reset() { setExamCards([]); setAnswers([]); setIndex(0); setTyped(""); setRevealed(false); setFinished(false); setSecondsLeft(0); }
  const clock = `${String(Math.max(0, Math.floor(secondsLeft / 60))).padStart(2, "0")}:${String(Math.max(0, secondsLeft % 60)).padStart(2, "0")}`;

  return <AppShell subtitle="Local Self-Test" title="Exam Mode">
    {!examCards.length ? <section className="card mx-auto max-w-2xl p-6 sm:p-8">
      <h2 className="text-2xl font-bold">Build a quick exam from your flashcards</h2>
      <p className="mt-2 text-sm leading-6 text-muted">No AI or server is required. Your own flashcards become timed viva/written questions on this device.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="muted-surface rounded-xl px-3 py-3 text-sm"><option value="">All subjects</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="muted-surface rounded-xl px-3 py-3 text-sm"><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={20}>20 questions</option></select>
        <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="muted-surface rounded-xl px-3 py-3 text-sm"><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option></select>
      </div>
      <div className="muted-surface mt-5 rounded-xl p-4 text-sm"><strong>{available.length}</strong> flashcard question{available.length === 1 ? "" : "s"} available for this selection.</div>
      {available.length ? <button onClick={start} className="button-primary mt-5">Start exam</button> : <Link href="/flashcards" className="button-primary mt-5">Create flashcards first</Link>}
    </section> : finished ? <section className="card mx-auto max-w-2xl p-7 text-center sm:p-10">
      <CheckCircle2 className="mx-auto text-emerald-600" size={42}/><p className="mt-4 text-sm font-semibold text-violet-600">EXAM COMPLETE</p><h2 className="mt-2 text-4xl font-black">{score}/{examCards.length}</h2><p className="mt-3 text-muted">{Math.round((score / Math.max(1, examCards.length)) * 100)}% self-checked score. Use missed cards in your next revision session.</p><button onClick={reset} className="button-primary mt-6"><RotateCcw size={17}/>New exam</button>
    </section> : <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <section className="card p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-violet-600">QUESTION {index + 1} OF {examCards.length}</p><span className="muted-surface inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold"><Clock3 size={16}/>{clock}</span></div><h2 className="mt-8 text-2xl font-bold leading-9">{current?.front}</h2><textarea value={typed} onChange={(e) => setTyped(e.target.value)} className="muted-surface mt-6 min-h-36 w-full rounded-2xl p-4 outline-none focus:ring-2 focus:ring-violet-500" placeholder="Type your answer from memory..."/><button onClick={() => setRevealed(true)} className="button-primary mt-4" disabled={revealed}>Reveal model answer</button>{revealed && <div className="mt-6 rounded-2xl bg-violet-500/10 p-5"><p className="text-xs font-bold text-violet-600">MODEL ANSWER / CARD BACK</p><p className="mt-3 leading-7">{current?.back}</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => mark(false)} className="rounded-xl bg-red-500/10 px-4 py-3 font-semibold text-red-600"><XCircle size={17} className="mr-2 inline"/>I missed it</button><button onClick={() => mark(true)} className="rounded-xl bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-600"><CheckCircle2 size={17} className="mr-2 inline"/>I got it</button></div></div>}</section>
      <aside className="card p-5"><p className="text-xs font-bold uppercase text-violet-600">Progress</p><div className="mt-4 h-2 rounded-full bg-violet-500/10"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${((index + (revealed ? 0.5 : 0)) / examCards.length) * 100}%` }}/></div><p className="mt-4 text-sm text-muted">Correct so far</p><p className="mt-1 text-3xl font-black">{score}</p><p className="mt-5 text-xs leading-5 text-muted">Self-check keeps this mode fully local and free. Later AI marking can be added for longer written answers.</p></aside>
    </div>}
  </AppShell>;
}
