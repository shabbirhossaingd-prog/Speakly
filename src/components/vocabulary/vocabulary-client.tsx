"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brain, Clock3, Languages, Plus, Sparkles } from "lucide-react";
import { api } from "@/lib/client-api";

type Kind = "word" | "phrase" | "collocation" | "phrasal-verb" | "idiom";
type Rating = "again" | "hard" | "good" | "easy";
type Word = {
  id: string;
  word: string;
  meaning: string;
  example: string;
  kind: Kind;
  cefr: string;
  register: string;
  source: string;
  mastery: number;
  nextReview: string;
  reviewCount: number;
};

const kindLabels: Record<Kind, string> = { word: "Word", phrase: "Phrase", collocation: "Collocation", "phrasal-verb": "Phrasal verb", idiom: "Idiom" };

export function VocabularyClient() {
  const [words, setWords] = useState<Word[]>([]);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [kind, setKind] = useState<Kind>("word");
  const [cefr, setCefr] = useState("B1");
  const [register, setRegister] = useState("Neutral");
  const [source, setSource] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api<{ words: Word[] }>("/api/vocabulary");
    setWords(data.words || []);
  }

  useEffect(() => { load().catch(() => setMessage("Review queue could not be loaded.")); }, []);

  const due = useMemo(() => words.filter((item) => new Date(item.nextReview).getTime() <= Date.now()), [words]);
  const visible = showAll ? words : due;

  async function add(event: FormEvent) {
    event.preventDefault();
    await api("/api/vocabulary", { method: "POST", body: JSON.stringify({ word, meaning, example, kind, cefr, register, source }) });
    setWord(""); setMeaning(""); setExample(""); setSource("");
    setMessage("Saved to Vocabulary & Review. New targets enter the review queue immediately.");
    await load();
  }

  async function review(id: string, rating: Rating) {
    await api("/api/vocabulary", { method: "POST", body: JSON.stringify({ action: "review", id, rating }) });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <form onSubmit={add} className="card h-fit p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Plus size={18}/></span><div><h2 className="font-bold">Add a language target</h2><p className="mt-1 text-sm leading-6 text-muted">Save words, useful phrases, collocations, phrasal verbs and idioms from lessons, projects or PDFs.</p></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><select value={kind} onChange={(event) => setKind(event.target.value as Kind)} className="surface rounded-xl px-3 py-3 text-sm">{Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select value={cefr} onChange={(event) => setCefr(event.target.value)} className="surface rounded-xl px-3 py-3 text-sm">{["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level}>{level}</option>)}</select></div>
          <input required value={word} onChange={(event) => setWord(event.target.value)} className="surface mt-3 w-full rounded-xl px-4 py-3" placeholder={kind === "collocation" ? "e.g. meet a deadline" : "Word / phrase"}/>
          <input required value={meaning} onChange={(event) => setMeaning(event.target.value)} className="surface mt-3 w-full rounded-xl px-4 py-3" placeholder="Meaning / explanation"/>
          <textarea value={example} onChange={(event) => setExample(event.target.value)} className="surface mt-3 min-h-24 w-full rounded-xl p-4" placeholder="Example sentence in a real context"/>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={register} onChange={(event) => setRegister(event.target.value)} className="surface rounded-xl px-4 py-3" placeholder="Register: neutral / formal"/><input value={source} onChange={(event) => setSource(event.target.value)} className="surface rounded-xl px-4 py-3" placeholder="Source lesson / project / PDF"/></div>
          <button className="button-primary mt-4">Save target</button>
        </form>

        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-violet-600">DELAYED RETRIEVAL</p><h2 className="mt-1 text-xl font-bold">Review queue</h2></div><div className="flex gap-2"><button onClick={() => setShowAll(false)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${!showAll ? "bg-violet-600 text-white" : "muted-surface"}`}>Due {due.length}</button><button onClick={() => setShowAll(true)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${showAll ? "bg-violet-600 text-white" : "muted-surface"}`}>All {words.length}</button></div></div>
          <p className="mt-2 text-sm leading-6 text-muted">Try to recall the meaning and produce your own sentence before looking at the example. Ratings change the next review interval.</p>

          <div className="mt-5 space-y-3">
            {visible.length ? visible.map((item) => (
              <div className="muted-surface rounded-2xl p-4" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-lg font-bold">{item.word}</p><span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-600">{item.cefr || "—"} • {kindLabels[item.kind || "word"]}</span></div><p className="mt-2 text-sm">{item.meaning}</p>{item.example && <p className="mt-2 text-sm italic text-muted">“{item.example}”</p>}<div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted">{item.register && <span>{item.register}</span>}{item.source && <span>• {item.source}</span>}<span>• Review #{item.reviewCount || 0}</span></div></div><div className="text-right"><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600">Mastery {item.mastery}/5</span><p className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted"><Clock3 size={11}/>{new Date(item.nextReview).getTime() <= Date.now() ? "Due now" : new Date(item.nextReview).toLocaleDateString()}</p></div></div>
                <div className="mt-4 rounded-xl bg-violet-500/10 p-3 text-sm"><span className="font-semibold text-violet-600">Production prompt:</span> Use “{item.word}” in a new sentence connected to your study, project or work.</div>
                <div className="mt-4 grid grid-cols-4 gap-2"><button onClick={() => review(item.id, "again")} className="button-secondary px-2 py-2 text-xs">Again</button><button onClick={() => review(item.id, "hard")} className="button-secondary px-2 py-2 text-xs">Hard</button><button onClick={() => review(item.id, "good")} className="button-primary px-2 py-2 text-xs">Good</button><button onClick={() => review(item.id, "easy")} className="button-secondary px-2 py-2 text-xs">Easy</button></div>
              </div>
            )) : <div className="muted-surface rounded-2xl p-8 text-center text-sm text-muted"><Brain className="mx-auto mb-3 text-violet-600"/>No review is due right now. Add language from lessons, projects or your Library.</div>}
          </div>
        </section>
      </div>

      {message && <div className="rounded-xl bg-emerald-500/10 p-4 text-sm">{message}</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><Languages className="text-violet-600"/><h3 className="mt-4 font-bold">Recognition</h3><p className="mt-2 text-sm text-muted">Recall meaning without rereading the answer.</p></div>
        <div className="card p-5"><Sparkles className="text-violet-600"/><h3 className="mt-4 font-bold">Production</h3><p className="mt-2 text-sm text-muted">Create a new sentence or short spoken response.</p></div>
        <div className="card p-5"><Brain className="text-violet-600"/><h3 className="mt-4 font-bold">Transfer</h3><p className="mt-2 text-sm text-muted">Use the target later in a new project, writing or conversation task.</p></div>
      </section>
    </div>
  );
}
