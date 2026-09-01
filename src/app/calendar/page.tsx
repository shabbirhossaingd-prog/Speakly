"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, FolderKanban, ListTodo } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { listStudyProjects, listStudyTasks, type StudyProject, type StudyTask } from "@/lib/local-study-db";

type View = "day" | "week" | "month";

type EventItem = {
  id: string;
  title: string;
  at: string;
  type: "task" | "project";
  href: string;
  status: string;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function weekStart(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([listStudyTasks(), listStudyProjects()])
      .then(([nextTasks, nextProjects]) => { setTasks(nextTasks); setProjects(nextProjects); })
      .catch(() => setMessage("Calendar data is unavailable in this browser."));
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const events = useMemo<EventItem[]>(() => {
    const taskEvents = tasks
      .filter((task) => task.status !== "done" && (task.dueAt || task.startAt))
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        at: task.dueAt || task.startAt || new Date().toISOString(),
        type: "task" as const,
        href: "/tasks",
        status: task.priority,
      }));
    const projectEvents = projects
      .filter((project) => !["completed", "archived"].includes(project.status) && project.dueAt)
      .map((project) => ({
        id: `project-${project.id}`,
        title: project.name,
        at: project.dueAt || new Date().toISOString(),
        type: "project" as const,
        href: `/projects?project=${project.id}`,
        status: project.status,
      }));
    return [...taskEvents, ...projectEvents].sort((a, b) => a.at.localeCompare(b.at));
  }, [tasks, projects]);

  async function enableReminders() {
    if (typeof Notification === "undefined") return setMessage("Browser notifications are not supported here.");
    const result = await Notification.requestPermission();
    setPermission(result);
    setMessage(result === "granted" ? "Task reminders are enabled while Speakly is available on this device." : "Notification permission was not granted.");
  }

  function move(direction: number) {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    if (view === "week") next.setDate(next.getDate() + direction * 7);
    if (view === "day") next.setDate(next.getDate() + direction);
    setCursor(next);
  }

  const days = useMemo(() => {
    if (view === "day") return [startOfDay(cursor)];
    if (view === "week") {
      const start = weekStart(cursor);
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
      });
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const gridStart = weekStart(first);
    const cells = Math.ceil((gridStart.getDay() + last.getDate()) / 7) * 7 || 35;
    return Array.from({ length: Math.max(35, cells) }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [cursor, view]);

  function label() {
    if (view === "day") return cursor.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (view === "week") {
      const start = weekStart(cursor);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${end.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  return (
    <AppShell subtitle="Tasks + projects" title="Calendar">
      {message && <div className="muted-surface mb-5 rounded-xl p-3 text-sm">{message}</div>}

      <section className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["day", "week", "month"] as View[]).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize ${view === item ? "bg-violet-600 text-white" : "muted-surface"}`}>{item}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => move(-1)} className="button-secondary px-3"><ChevronLeft size={17}/></button>
            <button onClick={() => setCursor(new Date())} className="button-secondary">Today</button>
            <button onClick={() => move(1)} className="button-secondary px-3"><ChevronRight size={17}/></button>
            <button onClick={enableReminders} className="button-primary"><Bell size={17}/>{permission === "granted" ? "Reminders on" : "Enable reminders"}</button>
          </div>
        </div>
        <h2 className="mt-5 text-xl font-black">{label()}</h2>
        <p className="mt-1 text-sm text-muted">Task due dates, task start times and project deadlines share one schedule.</p>
      </section>

      {view === "month" && (
        <section className="card mt-5 overflow-hidden p-3 sm:p-5">
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-violet-500/10">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="surface p-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted">{day}</div>)}
            {days.map((date) => {
              const dayEvents = events.filter((event) => sameDay(new Date(event.at), date));
              const inMonth = date.getMonth() === cursor.getMonth();
              return (
                <div key={date.toISOString()} className={`surface min-h-28 p-2 ${inMonth ? "" : "opacity-40"}`}>
                  <p className={`text-xs font-bold ${sameDay(date, new Date()) ? "text-violet-600" : ""}`}>{date.getDate()}</p>
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => <Link key={event.id} href={event.href} className="block truncate rounded-md bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-700">{event.type === "project" ? "◆ " : ""}{event.title}</Link>)}
                    {dayEvents.length > 3 && <p className="text-[10px] text-muted">+{dayEvents.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {view === "week" && (
        <section className="mt-5 grid gap-3 md:grid-cols-7">
          {days.map((date) => {
            const dayEvents = events.filter((event) => sameDay(new Date(event.at), date));
            return (
              <div key={date.toISOString()} className="card p-4">
                <p className="text-xs font-bold uppercase text-muted">{date.toLocaleDateString(undefined, { weekday: "short" })}</p>
                <p className={`mt-1 text-lg font-black ${sameDay(date, new Date()) ? "text-violet-600" : ""}`}>{date.getDate()}</p>
                <div className="mt-4 space-y-2">{dayEvents.map((event) => <Link key={event.id} href={event.href} className="muted-surface block rounded-xl p-3"><p className="text-xs font-semibold">{event.title}</p><p className="mt-1 text-[10px] text-muted">{new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {event.type}</p></Link>)}</div>
              </div>
            );
          })}
        </section>
      )}

      {view === "day" && (
        <section className="card mt-5 p-5">
          <div className="space-y-3">
            {events.filter((event) => sameDay(new Date(event.at), cursor)).map((event) => (
              <Link key={event.id} href={event.href} className="muted-surface flex items-center gap-4 rounded-xl p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">{event.type === "project" ? <FolderKanban size={18}/> : <ListTodo size={18}/>}</span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{event.title}</span><span className="mt-1 block text-xs text-muted">{new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {event.type} • {event.status}</span></span>
              </Link>
            ))}
            {!events.some((event) => sameDay(new Date(event.at), cursor)) && <div className="muted-surface rounded-xl p-6 text-center text-sm text-muted"><CalendarDays className="mx-auto mb-3 text-violet-600"/>No dated work for this day.</div>}
          </div>
        </section>
      )}
    </AppShell>
  );
}
