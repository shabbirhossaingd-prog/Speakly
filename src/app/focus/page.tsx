"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Pause, Play, RotateCcw, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { listStudyProjects, listStudyTasks, saveStudyTask, type StudyProject, type StudyTask } from "@/lib/local-study-db";

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function FocusPage() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [taskId, setTaskId] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const interval = useRef<number | null>(null);

  async function refresh() {
    const [nextTasks, nextProjects] = await Promise.all([listStudyTasks(), listStudyProjects()]);
    const open = nextTasks.filter((task) => task.status !== "done");
    setTasks(open);
    setProjects(nextProjects);
    setTaskId((current) => current || open.find((task) => task.status === "in_progress")?.id || open[0]?.id || "");
  }

  useEffect(() => { refresh().catch(() => setMessage("Task storage is unavailable.")); }, []);

  useEffect(() => {
    if (!running) {
      if (interval.current) window.clearInterval(interval.current);
      interval.current = null;
      return;
    }
    interval.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => {
      if (interval.current) window.clearInterval(interval.current);
      interval.current = null;
    };
  }, [running]);

  const task = tasks.find((item) => item.id === taskId) || null;
  const project = useMemo(() => projects.find((item) => item.id === task?.projectId) || null, [projects, task]);

  async function finish() {
    if (!task || seconds < 1) return;
    const added = Math.max(1, Math.round(seconds / 60));
    await saveStudyTask({
      ...task,
      status: task.status === "todo" ? "in_progress" : task.status,
      spentMinutes: (task.spentMinutes || 0) + added,
      updatedAt: new Date().toISOString(),
    });
    setRunning(false);
    setSeconds(0);
    setMessage(`${added} minute${added === 1 ? "" : "s"} added to ${task.title}.`);
    await refresh();
  }

  return (
    <AppShell subtitle="Deep work" title="Focus Timer">
      {message && <div className="muted-surface mb-5 rounded-xl p-3 text-sm">{message}</div>}
      <div className="mx-auto max-w-3xl">
        <section className="card p-6 sm:p-8">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Clock3 size={21}/></span><div><p className="font-bold">Track real effort</p><p className="text-sm text-muted">Focus time is saved into the selected task and contributes to project history.</p></div></div>

          <label className="mt-6 block text-sm font-semibold">Task
            <select value={taskId} onChange={(event) => { setTaskId(event.target.value); setRunning(false); setSeconds(0); }} className="surface mt-2 w-full rounded-xl px-3 py-3 font-normal outline-none">
              {!tasks.length && <option value="">No open tasks</option>}
              {tasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>

          {task && (
            <div className="muted-surface mt-4 rounded-2xl p-4">
              <p className="font-semibold">{task.title}</p>
              <p className="mt-1 text-xs text-muted">{project ? `Project: ${project.name} • ` : ""}{task.spentMinutes || 0}m already logged • estimated {task.estimateMinutes || 0}m</p>
            </div>
          )}

          <div className="py-12 text-center">
            <p className="font-mono text-5xl font-black tracking-tight sm:text-7xl">{formatTime(seconds)}</p>
            <p className="mt-3 text-sm text-muted">{running ? "Focus session running" : "Ready when you are"}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button disabled={!task} onClick={() => setRunning((value) => !value)} className="button-primary disabled:opacity-40">{running ? <Pause size={18}/> : <Play size={18}/>} {running ? "Pause" : "Start"}</button>
            <button disabled={!seconds} onClick={() => { setRunning(false); setSeconds(0); }} className="button-secondary disabled:opacity-40"><RotateCcw size={18}/>Reset</button>
            <button disabled={!task || !seconds} onClick={finish} className="button-secondary disabled:opacity-40"><Save size={18}/>Save session</button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
