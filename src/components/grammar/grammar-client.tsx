"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, Search, Sparkles } from "lucide-react";
import { grammarGroups, grammarTopics } from "@/lib/grammar-catalog";

export function GrammarClient() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [open, setOpen] = useState<string | null>("sentence-structure");
  const [easyMode, setEasyMode] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return grammarTopics.filter((topic) => {
      const matchGroup = group === "All" || topic.group === group;
      const matchQuery = !q || `${topic.title} ${topic.group} ${topic.easy} ${topic.rule}`.toLowerCase().includes(q);
      return matchGroup && matchQuery;
    });
  }, [query, group]);

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-600"><Sparkles size={16}/>Basic / Easy Explain</div>
            <h2 className="mt-2 text-xl font-bold sm:text-2xl">Grammar without confusing textbook language</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Start from sentence structure, then learn all 12 tenses, parts of speech, questions, modals, conditionals, voice, clauses and writing rules. Use this as help whenever a Standard-to-Advanced lesson feels difficult.</p>
          </div>
          <button type="button" onClick={() => setEasyMode((value) => !value)} className={easyMode ? "button-primary shrink-0" : "button-secondary shrink-0"}>
            <BookOpenCheck size={17}/>{easyMode ? "Easy Explain: ON" : "Easy Explain: OFF"}
          </button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="surface flex items-center gap-3 rounded-xl px-4 py-3">
            <Search size={17} className="text-muted"/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tense, article, sentence, conditional..." className="w-full bg-transparent text-sm outline-none"/>
          </label>
          <select value={group} onChange={(event) => setGroup(event.target.value)} className="surface rounded-xl px-4 py-3 text-sm font-semibold outline-none">
            <option>All</option>
            {grammarGroups.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {filtered.map((topic) => {
          const expanded = open === topic.id;
          return (
            <article key={topic.id} className="card overflow-hidden">
              <button type="button" onClick={() => setOpen(expanded ? null : topic.id)} className="flex w-full items-start gap-4 p-5 text-left sm:p-6">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{topic.group}</p>
                  <h3 className="mt-2 text-lg font-bold">{topic.title}</h3>
                  {easyMode && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{topic.easy}</p>}
                </div>
                <ChevronDown size={19} className={`mt-1 shrink-0 text-muted transition ${expanded ? "rotate-180" : ""}`}/>
              </button>
              {expanded && (
                <div className="border-t px-5 pb-5 pt-4 sm:px-6 sm:pb-6" style={{ borderColor: "rgb(var(--border))" }}>
                  {easyMode && (
                    <div className="rounded-2xl bg-violet-500/10 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Easy explanation</p>
                      <p className="mt-2 text-sm leading-7">{topic.easy}</p>
                    </div>
                  )}
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">Rule</p>
                    <p className="mt-2 text-sm leading-7">{topic.rule}</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">Examples</p>
                    <div className="mt-2 space-y-2">
                      {topic.examples.map((example) => <div key={example} className="muted-surface rounded-xl px-3 py-2.5 text-sm leading-6">{example}</div>)}
                    </div>
                  </div>
                  {topic.commonMistake && (
                    <div className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm leading-6">
                      <span className="font-semibold">Common mistake: </span>{topic.commonMistake}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
      {filtered.length === 0 && <div className="card py-14 text-center text-sm text-muted">No grammar topic matched your search.</div>}
    </div>
  );
}
