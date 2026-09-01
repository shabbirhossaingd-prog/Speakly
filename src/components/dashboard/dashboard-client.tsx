"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Brain, CalendarClock, Flame, Gauge, Languages, LibraryBig, ListTodo, Mic2, NotebookPen, Sparkles, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/client-api";
import type { Lesson } from "@/lib/lesson-catalog";
import type { LearningProfile } from "@/lib/learning-profile";
import { listStudyFlashcards, listStudyNotes, listStudySubjects, listStudyTasks, type StudyTask } from "@/lib/local-study-db";

type Progress = { xp: number; streak: number; completedLessons: string[]; skills: Record<string, number>; weakAreas: string[] };
type LocalStats = { subjects: number; notes: number; dueCards: number; tasks: StudyTask[]; openTasks: number };

export function DashboardClient() {
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [local, setLocal] = useState<LocalStats>({ subjects: 0, notes: 0, dueCards: 0, tasks: [], openTasks: 0 });

  useEffect(() => {
    const raw = localStorage.getItem("speakly-learning-profile");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LearningProfile;
        setProfile(parsed);
        fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed) }).catch(() => {});
      } catch {}
    }

    Promise.all([api<Progress>("/api/progress"), api<{ lessons: Lesson[] }>("/api/lessons/recommendations")])
      .then(([nextProgress, nextLessons]) => { setProgress(nextProgress); setLessons(nextLessons.lessons); })
      .catch(() => {});

    Promise.all([listStudySubjects(), listStudyNotes(), listStudyFlashcards(), listStudyTasks()])
      .then(([subjects, notes, cards, tasks]) => {
        const open = tasks.filter((task) => task.status !== "done");
        setLocal({
          subjects: subjects.length,
          notes: notes.length,
          dueCards: cards.filter((card) => new Date(card.nextReviewAt).getTime() <= Date.now()).length,
          tasks: open.slice(0, 5),
          openTasks: open.length,
        });
      })
      .catch(() => {});
  }, []);

  const learnerContext = useMemo(() => {
    if (!profile) return "Your study goals";
    if (profile.field) return profile.field;
    if (profile.studyGroup && profile.studyGroup !== "none") return `${profile.studyGroup} background`;
    if (profile.classLevel) return profile.classLevel;
    return "Your study goals";
  }, [profile]);

  return <AppShell subtitle="English + Study OS" title="Your Study Home">
    <section className="brand-gradient relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
      <div className="relative z-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"><Sparkles size={14}/>One app for learning + study</div>
        <h2 className="mt-4 text-3xl font-black sm:text-4xl">Study your subjects and improve your English at the same time.</h2>
        <p className="mt-3 text-violet-100">{learnerContext} • {profile?.englishLevel?.replace("-", " ") || "Standard-to-Advanced"}</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/learn" className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-violet-700">Start English lesson →</Link><Link href="/tasks" className="inline-flex rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white">Open Tasks & Plan →</Link></div>
      </div>
    </section>

    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: "Daily streak", value: `${progress?.streak || 0} day`, icon: Flame }, { label: "XP earned", value: String(progress?.xp || 0), icon: Trophy }, { label: "Open tasks", value: String(local.openTasks), icon: ListTodo }, { label: "Review due", value: String(local.dueCards), icon: Brain }].map(({ label, value, icon: Icon }) => <div className="card flex items-center gap-4 p-4" key={label}><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Icon size={20}/></span><div><p className="text-xs text-muted">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div></div>)}
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
      <div className="space-y-6">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-violet-600">TODAY&apos;S MISSION</p><h3 className="mt-1 text-xl font-bold">Tasks & deadlines</h3></div><CalendarClock className="text-violet-600"/></div>
          <div className="mt-5 space-y-3">{local.tasks.length ? local.tasks.map((task) => <Link href="/tasks" key={task.id} className="muted-surface block rounded-xl p-4"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"}`}/><div className="min-w-0 flex-1"><p className="truncate font-semibold">{task.title}</p><p className="mt-1 text-xs text-muted">{task.kind}{task.dueAt ? ` • due ${new Date(task.dueAt).toLocaleString()}` : ""}</p></div></div></Link>) : <div className="muted-surface rounded-xl p-5 text-sm text-muted">No open study tasks. Add a class task, routine, assignment, coding work, revision or exam plan in Tasks.</div>}</div>
          <Link href="/tasks" className="mt-4 inline-flex text-sm font-semibold text-violet-600">Manage Tasks & Planner →</Link>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex justify-between"><div><p className="text-sm font-semibold text-violet-600">ENGLISH FOR YOU</p><h3 className="mt-1 text-xl font-bold">Recommended lessons</h3></div><Sparkles className="text-violet-600"/></div>
          <div className="mt-5 space-y-3">{lessons.slice(0, 4).map((lesson, index) => <Link href={`/learn?lesson=${lesson.id}`} key={lesson.id} className="muted-surface flex items-center gap-4 rounded-2xl p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">{index + 1}</span><span className="flex-1"><span className="font-semibold">{lesson.title}</span><span className="mt-1 block text-xs text-muted">{lesson.track} • {lesson.minutes} min</span></span></Link>)}</div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/notes" className="card p-5"><NotebookPen className="text-violet-600"/><h3 className="mt-5 text-lg font-bold">Notes Lab</h3><p className="mt-2 text-sm leading-6 text-muted">{local.notes} local notes. Add screenshots, AI revision and presentation study material.</p><p className="mt-5 text-sm font-semibold text-violet-600">Open notes →</p></Link>
          <Link href="/flashcards" className="card p-5"><Brain className="text-violet-600"/><h3 className="mt-5 text-lg font-bold">Flashcards</h3><p className="mt-2 text-sm leading-6 text-muted">Spaced revision for subjects, vocabulary, formulas and viva questions.</p><p className="mt-5 text-sm font-semibold text-violet-600">Review now →</p></Link>
          <Link href="/exam" className="card p-5"><Gauge className="text-violet-600"/><h3 className="mt-5 text-lg font-bold">Exam Mode</h3><p className="mt-2 text-sm leading-6 text-muted">Turn your local flashcards into a timed self-test without paid APIs.</p><p className="mt-5 text-sm font-semibold text-violet-600">Start exam →</p></Link>
        </section>

        <Link href="/books" className="card flex items-center gap-4 p-5 sm:p-6"><LibraryBig className="text-violet-600"/><div><h3 className="font-bold">My Books</h3><p className="mt-1 text-sm text-muted">Read, download and turn your own PDFs into notes, English practice and revision.</p></div><span className="ml-auto text-sm font-semibold text-violet-600">Open →</span></Link>
      </div>

      <div className="space-y-6">
        <section className="card p-5"><h3 className="font-bold">Skill progress</h3><div className="mt-5 space-y-4">{Object.entries(progress?.skills || { Speaking: 50, Vocabulary: 50, Grammar: 50, Listening: 50 }).slice(0, 4).map(([skill, value]) => <div key={skill}><div className="mb-2 flex justify-between text-sm"><span>{skill}</span><span className="text-muted">{value}%</span></div><div className="h-2 rounded-full bg-violet-500/10"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${value}%` }}/></div></div>)}</div><Link href="/progress" className="mt-5 inline-flex text-sm font-semibold text-violet-600">View full progress →</Link></section>
        <Link href="/tasks" className="card block p-5"><ListTodo className="text-violet-600"/><h3 className="mt-3 font-bold">Tasks & Planner</h3><p className="mt-2 text-sm leading-6 text-muted">Plan class, routines, assignments, CSE coding, labs, projects and exams. Your {local.subjects} subject(s) work as filters.</p><p className="mt-4 text-sm font-semibold text-violet-600">Open tasks →</p></Link>
        <Link href="/speaking" className="card block p-5"><Mic2 className="text-violet-600"/><h3 className="mt-3 font-bold">Speaking Lab</h3><p className="mt-2 text-sm text-muted">Interview, IELTS, meetings, presentations and subject viva.</p></Link>
        <section className="card p-5"><Languages className="text-violet-600"/><h3 className="mt-3 font-bold">English vocabulary</h3><p className="mt-2 text-sm text-muted">Keep your English word bank separate from subject revision flashcards.</p><Link href="/vocabulary" className="button-secondary mt-4 w-full">Review words</Link></section>
        <Link href="/ielts" className="card block p-5"><p className="text-sm font-semibold text-violet-600">IELTS</p><h3 className="mt-1 font-bold">Practice exam skills</h3><p className="mt-2 text-sm text-muted">Reading, writing structure, speaking and mock-style tasks.</p></Link>
      </div>
    </div>
  </AppShell>;
}
