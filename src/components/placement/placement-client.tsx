"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";

type Question = { id: string; prompt: string; options: string[]; skill: string; level: string };
type PlacementResult = {
  percent: number;
  level: string;
  cefr: string;
  confidence: string;
  skillProfile: Record<string, number>;
  recommendedModule: string;
  limitations: string;
};

export function PlacementClient() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<{ questions: Question[] }>("/api/placement").then((data) => setQuestions(data.questions)).catch(() => setMessage("Placement questions could not be loaded."));
  }, []);

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const data = await api<PlacementResult>("/api/placement", { method: "POST", body: JSON.stringify({ answers }) });
      setResult(data);
      localStorage.setItem("speakly-placement-result", JSON.stringify({ ...data, takenAt: new Date().toISOString() }));
      const raw = localStorage.getItem("speakly-learning-profile");
      if (raw) {
        const profile = JSON.parse(raw);
        profile.englishLevel = data.level;
        localStorage.setItem("speakly-learning-profile", JSON.stringify(profile));
        await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not score placement.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <section className="card p-6 sm:p-8">
          <p className="text-sm font-semibold text-violet-600">ESTIMATED STARTING POINT</p>
          <div className="mt-3 flex flex-wrap items-end gap-4"><h2 className="text-4xl font-black">{result.cefr}</h2><span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-600">Confidence: {result.confidence}</span></div>
          <p className="mt-3 text-sm leading-6 text-muted">Diagnostic score: {result.percent}%. {result.limitations}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {Object.entries(result.skillProfile).map(([skill, value]) => <div key={skill} className="muted-surface rounded-xl p-4"><div className="flex justify-between text-sm"><span className="font-semibold">{skill}</span><span className="font-bold text-violet-600">{value}%</span></div><div className="mt-3 h-2 rounded-full bg-violet-500/10"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${value}%` }}/></div></div>)}
          </div>
          <div className="mt-6 rounded-2xl bg-amber-500/10 p-4 text-sm leading-6"><strong>Important:</strong> this is an approximate learning estimate, not official CEFR certification. Speaking and writing should add separate productive evidence before the profile becomes more confident.</div>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/english" className="button-primary">Go to English Home</Link><Link href="/english/course-map" className="button-secondary">Open course map</Link><button onClick={() => { setResult(null); setAnswers({}); }} className="button-secondary">Retake</button></div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6"><p className="text-sm font-semibold text-violet-600">PLACEMENT V2</p><h2 className="mt-1 text-2xl font-black">Build an approximate skill profile, not one opaque score.</h2><p className="mt-2 text-sm leading-6 text-muted">This first routing block samples grammar, vocabulary, reading and pragmatic choices from A2 to C1. Productive speaking/writing evidence will be added as a separate layer rather than pretending multiple choice can measure everything.</p></section>
      {message && <div className="rounded-xl bg-red-500/10 p-4 text-sm">{message}</div>}
      {questions.map((question, index) => (
        <div className="card p-5" key={question.id}>
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-violet-600">QUESTION {index + 1} • {question.skill}</p><span className="text-[10px] font-bold text-muted">{question.level} signal</span></div>
          <h3 className="mt-2 font-bold">{question.prompt}</h3>
          <div className="mt-4 grid gap-2">{question.options.map((option, optionIndex) => <button key={option} onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${answers[question.id] === optionIndex ? "border-violet-500 bg-violet-500/10" : "surface"}`}>{option}</button>)}</div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4"><p className="text-xs text-muted">{Object.keys(answers).length}/{questions.length} answered</p><button disabled={busy || Object.keys(answers).length !== questions.length} onClick={submit} className="button-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Scoring…" : "Finish estimated placement"}</button></div>
    </div>
  );
}
