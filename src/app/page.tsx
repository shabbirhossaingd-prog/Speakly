"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, FolderKanban, ListTodo } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  listStudyProjects,
  listStudyTasks,
  listStudyWorkLogs,
  type StudyProject,
  type StudyTask,
  type StudyWorkLog,
} from "@/lib/local-study-db";

function sameDay(value: string | null | undefined, date = new Date()) {
  if (!value) return false;
  const target = new Date(value);
  return target.getFullYear() === date.getFullYear() && target.getMonth() === date.getMonth() && target.getDate() === date.getDate();
}

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function projectProgress(project: StudyProject, tasks: StudyTask[]) {
  const linked = tasks.filter((task) => task.projectId === project.id);
  if (!linked.length) return project.progress || (project.status === "completed" ? 100 : 0);
  return Math.round((linked.filter((task) => task.status === "done").length / linked.length) * 100);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [logs, setLogs] = useState<StudyWorkLog[]>([]);

  useEffect(() => {
    Promise.all([listStudyTasks(), listStudyProjects(), listStudyWorkLogs()])
      .then(([nextTasks, nextProjects, nextLogs]) => {
        setTasks(nextTasks);
        setProjects(nextProjects);
        setLogs(nextLogs);
      })
      .catch(() => {});
  }, []);

  const open = tasks.filter((task) => task.status !== "done");
  const today = open.filter((task) => sameDay(task.dueAt) || task.status === "in_progress").slice(0, 6);
  const activeProjects = projects.filter((project) => !["completed", "archived"].includes(project.status)).slice(0, 5);
  const upcoming = open.filter((task) => task.dueAt && new Date(task.dueAt).getTime() > Date.now() && !sameDay(task.dueAt)).sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || "")).slice(0, 5);

  return (
    <AppShell title="Home">
      <div className="mx-auto max-w-5xl">
        <section className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: "rgb(var(--border))" }}>
          <div>
            <p className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
            <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{greeting()}. What&apos;s next?</h2>
            <p className="mt-2 text-sm text-muted">{open.length ? `${open.length} open task${open.length === 1 ? "" : "s"}` : "You are clear for now"} · {activeProjects.length} active project{activeProjects.length === 1 ? "" : "s"}</p>
          </div>
          <Link href="/tasks" className="button-primary self-start sm:self-auto"><ListTodo size={16}/>Add or open tasks</Link>
        </section>

        <div className="grid gap-10 py-7 lg:grid-cols-[1.15fr_0.85fr]">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Today</h3>
              <Link href="/tasks" className="text-xs text-muted hover:text-violet-600">View all</Link>
            </div>

            <div className="mt-3 divide-y" style={{ borderColor: "rgb(var(--border))" }}>
              {today.map((task) => (
                <Link href="/tasks" key={task.id} className="flex items-center gap-3 py-3.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: "rgb(var(--border))" }}><Check size={12} className="opacity-0"/></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{task.title}</span><span className="mt-1 block text-xs text-muted">{task.dueAt ? new Date(task.dueAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "In progress"}{task.priority === "high" ? " · High priority" : ""}</span></span>
                  <ArrowRight size={15} className="text-muted"/>
                </Link>
              ))}
              {!today.length && <div className="py-10 text-center"><Check size={24} className="mx-auto text-violet-500"/><p className="mt-2 text-sm font-medium">Nothing urgent today</p><p className="mt-1 text-xs text-muted">Add a task when something comes up.</p></div>}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Active projects</h3>
              <Link href="/projects" className="text-xs text-muted hover:text-violet-600">View all</Link>
            </div>
            <div className="mt-3 divide-y" style={{ borderColor: "rgb(var(--border))" }}>
              {activeProjects.map((project) => {
                const progress = projectProgress(project, tasks);
                return (
                  <Link href={`/projects?project=${project.id}`} key={project.id} className="block py-3.5">
                    <div className="flex items-center gap-3"><FolderKanban size={17} className="text-muted"/><span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span><span className="text-xs text-muted">{progress}%</span></div>
                    <div className="ml-7 mt-2 h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"><div className="h-full bg-violet-500" style={{ width: `${progress}%` }}/></div>
                  </Link>
                );
              })}
              {!activeProjects.length && <Link href="/projects" className="block py-8 text-center text-sm text-muted">Create your first project →</Link>}
            </div>
          </section>
        </div>

        <div className="grid gap-10 border-t py-7 lg:grid-cols-2" style={{ borderColor: "rgb(var(--border))" }}>
          <section>
            <div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">Upcoming</h3><Link href="/calendar" className="text-xs text-muted hover:text-violet-600">Calendar</Link></div>
            <div className="mt-3 divide-y" style={{ borderColor: "rgb(var(--border))" }}>
              {upcoming.map((task) => <Link href="/tasks" key={task.id} className="flex items-center gap-3 py-3"><CalendarDays size={16} className="text-muted"/><span className="min-w-0 flex-1 truncate text-sm">{task.title}</span><span className="text-xs text-muted">{task.dueAt ? new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}</span></Link>)}
              {!upcoming.length && <p className="py-5 text-sm text-muted">No upcoming deadlines.</p>}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">Recent work</h3><Link href="/updates" className="text-xs text-muted hover:text-violet-600">Project updates</Link></div>
            <div className="mt-3 divide-y" style={{ borderColor: "rgb(var(--border))" }}>
              {logs.slice(0, 4).map((log) => <Link href="/updates" key={log.id} className="block py-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium">{log.projectName || "Project"}</p><span className="shrink-0 text-xs text-muted">{relativeTime(log.occurredAt)}</span></div><p className="mt-1 truncate text-xs text-muted">{log.title || log.workDone || log.nextStep || "Saved project update"}</p></Link>)}
              {!logs.length && <p className="py-5 text-sm text-muted">No project updates yet.</p>}
            </div>
          </section>
        </div>

        <section className="flex flex-col gap-3 border-t py-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgb(var(--border))" }}>
          <div><p className="text-sm font-medium">English today</p><p className="mt-1 text-xs text-muted">Continue your level, speaking or review when you have time.</p></div>
          <Link href="/english" className="text-sm font-medium text-violet-700 hover:text-violet-600 dark:text-violet-300">Open English →</Link>
        </section>
      </div>
    </AppShell>
  );
}
