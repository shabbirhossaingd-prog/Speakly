"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarPlus, CheckCircle2, ChevronRight, Clock3, RefreshCw, Sparkles, Target } from "lucide-react";
import { api } from "@/lib/client-api";
import { lessonCatalog, type Lesson } from "@/lib/lesson-catalog";
import { saveStudyTask, type StudyTask } from "@/lib/local-study-db";

const stageLabels: Record<string, string> = {
  context: "Real context",
  input: "Listening / reading input",
  comprehension: "Understand the message",
  noticing: "Notice useful language",
  vocabulary: "Words & collocations",
  retrieval: "Recall without the answer",
  pronunciation: "Pronunciation practice",
  speaking: "Speaking output",
  writing: "Writing transfer",
  quiz: "Application check",
  feedback: "Focused feedback",
  retry: "Retry and improve",
  transfer: "Transfer to Study OS",
};

export function LearnClient() {
  const params = useSearchParams();
  const requested = params.get("lesson");
  const [recommended, setRecommended] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ lessons: Lesson[] }>("/api/lessons/recommendations")
      .then((data) => {
        setRecommended(data.lessons || []);
        const target = lessonCatalog.find((lesson) => lesson.id === requested) || data.lessons?.[0] || lessonCatalog[0] || null;
        setSelected(target);
      })
      .catch(() => setSelected(lessonCatalog.find((lesson) => lesson.id === requested) || lessonCatalog[0] || null));
  }, [requested]);

  const list = useMemo(() => {
    const seen = new Set<string>();
    return [...recommended, ...lessonCatalog].filter((lesson) => {
      if (seen.has(lesson.id)) return false;
      seen.add(lesson.id);
      return true;
    });
  }, [recommended]);

  async function complete() {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await api<{ progress: { xp: number } }>("/api/lessons/complete", {
        method: "POST",
        body: JSON.stringify({ lessonId: selected.id, skill: selected.primarySkill }),
      });
      setMessage(`Learning task recorded. Session XP: ${data.progress.xp}. Mastery still depends on review, retry and later use.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save lesson progress.");
    } finally {
      setBusy(false);
    }
  }

  async function scheduleReview() {
    if (!selected) return;
    const now = new Date();
    const due = new Date(now);
    due.setDate(due.getDate() + 1);
    due.setHours(19, 0, 0, 0);
    const task: StudyTask = {
      id: crypto.randomUUID(),
      title: `English review: ${selected.title}`,
      description: `Delayed retrieval for ${selected.cefrLevel} ${selected.primarySkill}. Retry the authentic task and recall the target phrases without looking first.`,
      subjectId: null,
      projectId: null,
      kind: "study",
      priority: "medium",
      status: "todo",
      startAt: null,
      dueAt: due.toISOString(),
      reminderAt: null,
      estimateMinutes: Math.min(15, selected.minutes),
      spentMinutes: 0,
      progress: 0,
      recurrence: "none",
      checklist: [
        { id: crypto.randomUUID(), text: "Recall target phrases without looking", done: false },
        { id: crypto.randomUUID(), text: "Retry the real speaking/writing task", done: false },
        { id: crypto.randomUUID(), text: "Review only the mistakes that remain", done: false },
      ],
      noteId: null,
      noteTitle: "",
      resources: [],
      teacher: "",
      room: "",
      tags: ["english", selected.cefrLevel.toLowerCase(), selected.id, "review"],
      parentTaskId: null,
      blockedByIds: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await saveStudyTask(task);
    setMessage("Delayed English review added to Tasks for tomorrow evening.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.38fr]">
      <aside className="space-y-3">
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-violet-600">COURSE</p><h2 className="mt-1 font-bold">Recommended next tasks</h2></div><Link href="/english/course-map" className="text-xs font-semibold text-violet-600">Map →</Link></div>
        </div>
        {list.map((lesson) => (
          <button key={lesson.id} onClick={() => { setSelected(lesson); setMessage(""); }} className={`card w-full p-4 text-left transition ${selected?.id === lesson.id ? "ring-2 ring-violet-500" : "hover:-translate-y-0.5"}`}>
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase text-violet-600">{lesson.cefrLevel} • {lesson.primarySkill}</p><span className="text-xs text-muted">{lesson.minutes}m</span></div>
            <p className="mt-2 font-bold">{lesson.title}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{lesson.canDo}</p>
          </button>
        ))}
      </aside>

      {selected && (
        <article className="space-y-5">
          <section className="card p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-violet-600 px-3 py-1.5 font-bold text-white">{selected.cefrLevel}</span><span className="rounded-full bg-violet-500/10 px-3 py-1.5 font-semibold text-violet-600">{selected.primarySkill}</span><span className="rounded-full bg-violet-500/10 px-3 py-1.5 font-semibold text-violet-600">{selected.domain}</span></div>
                <h2 className="mt-4 text-2xl font-black sm:text-3xl">{selected.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted">{selected.summary}</p>
              </div>
              <span className="muted-surface inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"><Clock3 size={14}/>{selected.minutes} min</span>
            </div>

            <div className="mt-6 rounded-2xl bg-violet-500/10 p-5">
              <div className="flex items-start gap-3"><Target className="mt-0.5 shrink-0 text-violet-600" size={19}/><div><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Can-do outcome</p><p className="mt-1 font-semibold">{selected.canDo}</p></div></div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="muted-surface rounded-2xl p-5"><p className="text-xs font-bold uppercase text-violet-600">Language resources</p><div className="mt-3 space-y-3 text-sm"><div><span className="font-semibold">Grammar:</span> <span className="text-muted">{selected.grammarFocus.join(" • ")}</span></div><div><span className="font-semibold">Vocabulary:</span> <span className="text-muted">{selected.targetVocabulary.join(", ")}</span></div><div><span className="font-semibold">Collocations:</span> <span className="text-muted">{selected.collocations.join(", ")}</span></div>{selected.pronunciationFocus && <div><span className="font-semibold">Pronunciation:</span> <span className="text-muted">{selected.pronunciationFocus}</span></div>}</div></div>
              <div className="muted-surface rounded-2xl p-5"><p className="text-xs font-bold uppercase text-violet-600">Authentic task</p><p className="mt-3 text-sm leading-6">{selected.authenticTask}</p>{selected.transferAction && <div className="mt-4 rounded-xl bg-violet-500/10 p-3 text-sm"><span className="font-semibold text-violet-600">Transfer:</span> {selected.transferAction}</div>}</div>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-violet-600">LEARNING LOOP</p><h3 className="mt-1 text-xl font-bold">Input → retrieval → production → feedback → retry</h3></div><Sparkles className="text-violet-600"/></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {selected.stages.map((stage, index) => <div className="muted-surface flex items-center gap-3 rounded-xl p-4" key={stage}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">{index + 1}</span><span className="font-semibold">{stageLabels[stage] || stage}</span><ChevronRight className="ml-auto text-muted" size={16}/></div>)}
            </div>
          </section>

          {message && <div className="rounded-xl bg-emerald-500/10 p-4 text-sm">{message}</div>}

          <div className="flex flex-wrap gap-3">
            <button onClick={complete} disabled={busy} className="button-primary"><CheckCircle2 size={17}/>{busy ? "Saving…" : "Record learning task"}</button>
            <button onClick={scheduleReview} className="button-secondary"><CalendarPlus size={17}/>Schedule delayed review</button>
            <Link href="/speaking" className="button-secondary"><RefreshCw size={17}/>Practice & retry</Link>
            {selected.tags.includes("projects") && <Link href="/updates" className="button-secondary">Transfer to Project Updates <ArrowRight size={15}/></Link>}
          </div>
        </article>
      )}
    </div>
  );
}
