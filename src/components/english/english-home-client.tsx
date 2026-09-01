"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Brain, BookOpen, Gauge, Goal, Languages, RefreshCw, Sparkles, Target } from "lucide-react";
import { api } from "@/lib/client-api";
import { legacyLevelToCefr, percentToCefr, trackFor } from "@/lib/english-curriculum";
import type { Lesson } from "@/lib/lesson-catalog";
import type { LearningProfile } from "@/lib/learning-profile";

type Progress = { xp: number; streak: number; completedLessons: string[]; skills: Record<string, number>; weakAreas: string[] };
type Word = { id: string; word: string; meaning: string; example: string; mastery: number; nextReview: string };

export function EnglishHomeClient() {
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("speakly-learning-profile");
    if (raw) {
      try { setProfile(JSON.parse(raw) as LearningProfile); } catch {}
    }
    Promise.all([
      api<Progress>("/api/progress"),
      api<{ lessons: Lesson[] }>("/api/lessons/recommendations"),
      api<{ words: Word[] }>("/api/vocabulary"),
    ]).then(([nextProgress, nextLessons, nextWords]) => {
      setProgress(nextProgress);
      setLessons(nextLessons.lessons || []);
      setWords(nextWords.words || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const level = legacyLevelToCefr(profile?.englishLevel);
  const track = trackFor(level);
  const dueWords = words.filter((word) => new Date(word.nextReview).getTime() <= Date.now());
  const nextLesson = lessons[0];
  const skills = useMemo(() => {
    const source = progress?.skills || { Speaking: 50, Listening: 50, Reading: 50, Writing: 50, Vocabulary: 50, Grammar: 50 };
    return Object.entries(source).slice(0, 6).map(([skill, value]) => ({ skill, value, ...percentToCefr(value) }));
  }, [progress]);
  const goal = profile?.goals?.[0] || (profile?.field ? `${profile.field} English` : "Practical study & professional English");

  if (loading) return <div className="card p-6 text-sm text-muted">Building your English learning view…</div>;

  return (
    <div className="space-y-6">
      <section className="brand-gradient overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"><Sparkles size={14}/>English inside your Study OS</div>
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-sm text-violet-100">Estimated level • not a certificate</p>
              <h2 className="mt-1 text-4xl font-black">{track.cefr} {track.name}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-violet-100">{track.position} — {track.focus}</p>
            </div>
            <Link href="/placement" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold"><RefreshCw size={16}/>Update estimate</Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5"><Gauge className="text-violet-600"/><p className="mt-4 text-xs text-muted">WHERE AM I?</p><p className="mt-1 text-lg font-bold">{track.cefr} • {track.name}</p><p className="mt-1 text-xs text-muted">Approximate learning estimate</p></div>
        <div className="card p-5"><Brain className="text-violet-600"/><p className="mt-4 text-xs text-muted">WHAT AM I FORGETTING?</p><p className="mt-1 text-lg font-bold">{dueWords.length} review due</p><Link href="/vocabulary" className="mt-2 inline-flex text-xs font-semibold text-violet-600">Open review →</Link></div>
        <div className="card p-5"><Goal className="text-violet-600"/><p className="mt-4 text-xs text-muted">CURRENT GOAL</p><p className="mt-1 line-clamp-2 text-lg font-bold">{goal}</p></div>
        <div className="card p-5"><Target className="text-violet-600"/><p className="mt-4 text-xs text-muted">LEARNING EVIDENCE</p><p className="mt-1 text-lg font-bold">{progress?.completedLessons.length || 0} tasks completed</p><p className="mt-1 text-xs text-muted">Completion is only one signal</p></div>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-violet-600">WHAT SHOULD I DO NEXT?</p>
            <h2 className="mt-1 text-2xl font-black">{nextLesson?.title || "Start your course map"}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{nextLesson?.canDo || "Choose a CEFR-aligned module built around a real communication outcome."}</p>
            {nextLesson && <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-violet-500/10 px-3 py-1.5 font-semibold text-violet-600">{nextLesson.cefrLevel}</span><span className="rounded-full bg-violet-500/10 px-3 py-1.5 font-semibold text-violet-600">{nextLesson.primarySkill}</span><span className="rounded-full bg-violet-500/10 px-3 py-1.5 font-semibold text-violet-600">{nextLesson.minutes} min</span></div>}
          </div>
          <div className="flex flex-wrap gap-2"><Link href={nextLesson ? `/learn?lesson=${nextLesson.id}` : "/english/course-map"} className="button-primary">Continue <ArrowRight size={16}/></Link><Link href="/english/course-map" className="button-secondary">Course map</Link></div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-violet-600">AM I IMPROVING?</p><h2 className="mt-1 text-xl font-bold">Skill signals</h2></div><Link href="/progress" className="text-sm font-semibold text-violet-600">Full progress →</Link></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {skills.map(({ skill, value, level: skillLevel }) => <div key={skill} className="muted-surface rounded-xl p-4"><div className="flex items-center justify-between"><span className="font-semibold">{skill}</span><span className="text-sm font-bold text-violet-600">{skillLevel}</span></div><div className="mt-3 h-2 rounded-full bg-violet-500/10"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${Math.max(5, Math.min(100, value))}%` }}/></div><p className="mt-2 text-[11px] text-muted">{value}% current evidence signal</p></div>)}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <p className="text-sm font-semibold text-violet-600">ONE CONNECTED WORKFLOW</p>
          <h2 className="mt-1 text-xl font-bold">Learn → use → review → transfer</h2>
          <div className="mt-5 space-y-3 text-sm">
            {["Learn a real communication skill", "Use it in speaking or writing", "Get focused feedback and retry", "Send weak phrases to Vocabulary & Review", "Schedule review in Tasks", "Save improved work to Projects or Notes"].map((item, index) => <div key={item} className="muted-surface flex items-center gap-3 rounded-xl p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">{index + 1}</span><span>{item}</span></div>)}
          </div>
        </section>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/speaking" className="card p-5"><BookOpen className="text-violet-600"/><h3 className="mt-4 font-bold">Speaking Lab</h3><p className="mt-2 text-sm text-muted">Task-based practice with retry.</p></Link>
        <Link href="/vocabulary" className="card p-5"><Languages className="text-violet-600"/><h3 className="mt-4 font-bold">Vocabulary & Review</h3><p className="mt-2 text-sm text-muted">Words, phrases and delayed retrieval.</p></Link>
        <Link href="/grammar" className="card p-5"><Brain className="text-violet-600"/><h3 className="mt-4 font-bold">Grammar in Context</h3><p className="mt-2 text-sm text-muted">Use grammar to accomplish real tasks.</p></Link>
        <Link href="/ielts" className="card p-5"><Target className="text-violet-600"/><h3 className="mt-4 font-bold">IELTS Practice</h3><p className="mt-2 text-sm text-muted">Exam practice without false certification claims.</p></Link>
      </section>
    </div>
  );
}
