"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Brain, Gauge, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import { api } from "@/lib/client-api";
import { legacyLevelToCefr, percentToCefr, trackFor } from "@/lib/english-curriculum";
import type { Lesson } from "@/lib/lesson-catalog";
import type { LearningProfile } from "@/lib/learning-profile";

type Progress = { xp: number; streak: number; completedLessons: string[]; skills: Record<string, number>; weakAreas: string[] };
type Word = { id: string; word: string; meaning: string; mastery: number; nextReview: string };
type Placement = { cefr?: string; confidence?: string; skillProfile?: Record<string, number>; limitations?: string };

export function ProgressClient() {
  const [data, setData] = useState<Progress | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    const rawProfile = localStorage.getItem("speakly-learning-profile");
    if (rawProfile) { try { setProfile(JSON.parse(rawProfile)); } catch {} }
    const rawPlacement = localStorage.getItem("speakly-placement-result");
    if (rawPlacement) { try { setPlacement(JSON.parse(rawPlacement)); } catch {} }
    Promise.all([
      api<Progress>("/api/progress"),
      api<{ words: Word[] }>("/api/vocabulary"),
      api<{ lessons: Lesson[] }>("/api/lessons/recommendations"),
    ]).then(([nextProgress, nextWords, nextLessons]) => {
      setData(nextProgress);
      setWords(nextWords.words || []);
      setLessons(nextLessons.lessons || []);
    }).catch(() => {});
  }, []);

  const overallLevel = placement?.cefr || legacyLevelToCefr(profile?.englishLevel);
  const track = trackFor(overallLevel as ReturnType<typeof legacyLevelToCefr>);
  const due = words.filter((word) => new Date(word.nextReview).getTime() <= Date.now());
  const retention = words.length ? Math.round((words.filter((word) => word.mastery >= 3).length / words.length) * 100) : 0;
  const skillSignals = useMemo(() => {
    if (!data) return [];
    const merged: Record<string, number> = { ...data.skills };
    Object.entries(placement?.skillProfile || {}).forEach(([skill, value]) => {
      if (!(skill in merged)) merged[skill] = value;
    });
    return Object.entries(merged).slice(0, 8).map(([skill, value]) => ({ skill, value, ...percentToCefr(value) }));
  }, [data, placement]);
  const priority = data?.weakAreas?.[0] || (skillSignals.length ? [...skillSignals].sort((a, b) => a.value - b.value)[0]?.skill : "Speaking production");
  const nextLesson = lessons[0];

  if (!data) return <div className="card p-6 text-muted">Loading English learning evidence…</div>;

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div><p className="text-sm font-semibold text-violet-600">ESTIMATED ENGLISH PROFILE</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 className="text-4xl font-black">{track.cefr} {track.name}</h2><span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-600">Confidence: {placement?.confidence || "developing"}</span></div><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">This is a learning estimate built from current evidence. It is not official CEFR, IELTS or TOEFL certification.</p></div>
          <Link href="/placement" className="button-secondary"><RefreshCw size={16}/>Update placement</Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5"><Brain className="text-violet-600"/><p className="mt-4 text-xs text-muted">RETENTION</p><p className="mt-1 text-2xl font-black">{retention}%</p><p className="mt-1 text-xs text-muted">Saved targets at mastery 3+</p></div>
        <div className="card p-5"><Target className="text-violet-600"/><p className="mt-4 text-xs text-muted">REVIEW DUE</p><p className="mt-1 text-2xl font-black">{due.length}</p><Link href="/vocabulary" className="mt-1 inline-flex text-xs font-semibold text-violet-600">Review now →</Link></div>
        <div className="card p-5"><TrendingUp className="text-violet-600"/><p className="mt-4 text-xs text-muted">LEARNING TASKS</p><p className="mt-1 text-2xl font-black">{data.completedLessons.length}</p><p className="mt-1 text-xs text-muted">Completion is not mastery by itself</p></div>
        <div className="card p-5"><Gauge className="text-violet-600"/><p className="mt-4 text-xs text-muted">CURRENT PRIORITY</p><p className="mt-1 line-clamp-2 text-lg font-black">{priority || "Build more evidence"}</p></div>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-violet-600">SKILL GRAPH</p><h2 className="mt-1 text-xl font-bold">Different skills can sit at different frontiers.</h2></div><Sparkles className="text-violet-600"/></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {skillSignals.map(({ skill, value, level }) => <div key={skill} className="muted-surface rounded-xl p-4"><div className="flex items-center justify-between gap-3"><span className="font-semibold">{skill}</span><span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-600">{level} signal</span></div><div className="mt-3 h-2 rounded-full bg-violet-500/10"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${Math.max(5, Math.min(100, value))}%` }}/></div><p className="mt-2 text-[11px] text-muted">Evidence score {value}%</p></div>)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="card p-5 sm:p-6"><p className="text-sm font-semibold text-violet-600">NEXT HIGH-VALUE ACTION</p><h2 className="mt-1 text-xl font-bold">{nextLesson?.title || "Choose your next module"}</h2><p className="mt-2 text-sm leading-6 text-muted">{nextLesson?.canDo || "Continue with a task that creates new evidence rather than chasing completion percentages."}</p><Link href={nextLesson ? `/learn?lesson=${nextLesson.id}` : "/english/course-map"} className="button-primary mt-5">Continue learning <ArrowRight size={16}/></Link></section>
        <section className="card p-5 sm:p-6"><p className="text-sm font-semibold text-violet-600">MASTERY RULE</p><h2 className="mt-1 text-xl font-bold">Use evidence that survives time and transfer.</h2><div className="mt-4 space-y-2 text-sm">{["Delayed retrieval", "Successful real task", "Unseen application", "Retry improvement", "Repeated success over time"].map((item) => <div key={item} className="muted-surface rounded-xl px-4 py-3">{item}</div>)}</div></section>
      </div>
    </div>
  );
}
