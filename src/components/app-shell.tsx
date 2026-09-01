"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  BookOpen,
  Brain,
  CalendarDays,
  Clock3,
  FolderKanban,
  GraduationCap,
  HardDrive,
  Home,
  LibraryBig,
  ListTodo,
  Menu,
  NotebookPen,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { lessonCatalog } from "@/lib/lesson-catalog";
import {
  listStudyBooks,
  listStudyNotes,
  listStudyProjects,
  listStudyTasks,
  listStudyWorkLogs,
  type StudyTask,
} from "@/lib/local-study-db";

const mainNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/books", label: "Library", icon: LibraryBig },
  { href: "/english", label: "English", icon: BookOpen },
];

const moreNav = [
  { href: "/updates", label: "Project Updates", icon: Activity },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/flashcards", label: "Flashcards", icon: Brain },
  { href: "/exam", label: "Exam Mode", icon: GraduationCap },
  { href: "/portfolio", label: "Portfolio", icon: Sparkles },
  { href: "/focus", label: "Focus Timer", icon: Clock3 },
  { href: "/storage", label: "Storage & Backup", icon: HardDrive },
];

type SearchItem = { id: string; type: string; title: string; subtitle: string; href: string };
type NavItem = { href: string; label: string; icon: LucideIcon };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/english") return pathname === "/english" || pathname.startsWith("/english/") || ["/learn", "/practice", "/speaking", "/vocabulary", "/grammar", "/ielts", "/progress", "/placement"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (href === "/tasks") return pathname === "/tasks" || pathname.startsWith("/tasks/");
  if (href === "/notes") return pathname === "/notes" || pathname.startsWith("/notes/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ pathname, item }: { pathname: string; item: NavItem }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-violet-500/10 font-semibold text-violet-700 dark:text-violet-300" : "text-muted hover:bg-black/[0.035] hover:text-[rgb(var(--foreground))] dark:hover:bg-white/[0.05]"}`}
    >
      <Icon size={17}/><span>{item.label}</span>
    </Link>
  );
}

function ReminderBridge() {
  useEffect(() => {
    let stopped = false;
    async function check() {
      if (stopped || typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const tasks = await listStudyTasks().catch(() => [] as StudyTask[]);
      const now = Date.now();
      for (const task of tasks) {
        if (task.status === "done" || !task.reminderAt) continue;
        const due = new Date(task.reminderAt).getTime();
        if (!Number.isFinite(due) || due > now) continue;
        const key = `speakly-reminder:${task.id}:${task.reminderAt}`;
        if (localStorage.getItem(key)) continue;
        new Notification(task.title, { body: task.dueAt ? `Due ${new Date(task.dueAt).toLocaleString()}` : "This task needs your attention.", tag: `speakly-task-${task.id}` });
        localStorage.setItem(key, new Date().toISOString());
      }
    }
    check();
    const timer = window.setInterval(check, 30_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);
  return null;
}

function WorkspaceSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([listStudyTasks(), listStudyProjects(), listStudyNotes(), listStudyWorkLogs(), listStudyBooks()])
      .then(([tasks, projects, notes, logs, books]) => setItems([
        ...projects.map((project) => ({ id: `project-${project.id}`, type: "Project", title: project.name, subtitle: project.client || project.status, href: `/projects?project=${project.id}` })),
        ...tasks.map((task) => ({ id: `task-${task.id}`, type: "Task", title: task.title, subtitle: task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : task.kind, href: "/tasks" })),
        ...notes.map((note) => ({ id: `note-${note.id}`, type: "Note", title: note.title, subtitle: note.subject || "Note", href: "/notes" })),
        ...logs.map((log) => ({ id: `log-${log.id}`, type: "Update", title: log.title || log.workDone || "Project update", subtitle: log.projectName, href: "/updates" })),
        ...books.map((book) => ({ id: `book-${book.id}`, type: "Library", title: book.name, subtitle: book.subject || "Resource", href: "/books" })),
        ...lessonCatalog.map((lesson) => ({ id: `english-${lesson.id}`, type: "English", title: lesson.title, subtitle: `${lesson.cefrLevel} • ${lesson.primarySkill}`, href: `/learn?lesson=${lesson.id}` })),
      ]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => { if (!open) setQuery(""); }, [open]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 10);
    return items.filter((item) => `${item.type} ${item.title} ${item.subtitle}`.toLowerCase().includes(q)).slice(0, 20);
  }, [items, query]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/30 px-4 pt-[10vh]" onMouseDown={onClose}>
      <div className="surface w-full max-w-xl overflow-hidden rounded-xl shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b px-4" style={{ borderColor: "rgb(var(--border))" }}>
          <Search size={18} className="text-muted"/>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, projects, notes…" className="w-full bg-transparent py-4 text-sm outline-none"/>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-black/5" aria-label="Close search"><X size={17}/></button>
        </div>
        <div className="max-h-[58vh] overflow-y-auto p-2">
          {loading && <p className="p-4 text-sm text-muted">Searching…</p>}
          {!loading && !results.length && <p className="p-4 text-sm text-muted">Nothing found.</p>}
          {results.map((item) => (
            <Link key={item.id} href={item.href} onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-black/[0.035] dark:hover:bg-white/[0.05]">
              <span className="w-16 shrink-0 text-[11px] font-medium text-muted">{item.type}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-0.5 block truncate text-xs text-muted">{item.subtitle}</span></span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectUpdateAction() {
  return (
    <Link
      href="/updates"
      className="fixed bottom-[78px] right-3 z-50 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 px-3.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] ring-1 ring-white/25 transition duration-150 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_14px_34px_rgba(168,85,247,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-300/70 lg:bottom-5 lg:right-5 lg:px-4"
      aria-label="Add project update"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/18"><Activity size={16}/></span>
      <span className="hidden sm:inline">Project update</span>
    </Link>
  );
}

export function AppShell({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const moreActive = moreNav.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((value) => !value); }
      if (event.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="min-h-screen pb-20 lg:pb-0">
      <ReminderBridge/>
      <div className="mx-auto w-full max-w-[1500px] lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r bg-[rgb(var(--surface))] p-4 lg:flex lg:flex-col" style={{ borderColor: "rgb(var(--border))" }}>
          <Link href="/" className="flex items-center gap-3 px-2 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">S</span>
            <div><p className="font-semibold">Speakly</p><p className="text-[11px] text-muted">Study & Portfolio</p></div>
          </Link>

          <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
            {mainNav.map((item) => <NavLink key={item.href} pathname={pathname} item={item}/>)}
            <details className="pt-2" open={moreActive}>
              <summary className={`flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${moreActive ? "bg-violet-500/10 font-semibold text-violet-700 dark:text-violet-300" : "text-muted hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"}`}>
                <Menu size={17}/><span>More</span>
              </summary>
              <div className="mt-1 space-y-1 pl-3">
                {moreNav.map((item) => <NavLink key={item.href} pathname={pathname} item={item}/>)}
              </div>
            </details>
          </nav>

          <button onClick={() => setSearchOpen(true)} className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-muted hover:bg-black/[0.035] dark:hover:bg-white/[0.05]">
            <Search size={16}/><span className="flex-1">Search</span><kbd className="text-[10px]">Ctrl K</kbd>
          </button>
        </aside>

        <section className="min-w-0 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <header className="mb-6 flex min-h-10 items-center justify-between gap-4">
            <div className="min-w-0">
              {title && <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]" aria-label="Search"><Search size={18}/></button>
              <ThemeToggle/>
              <Link href="/login" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]" aria-label="Account"><UserRound size={18}/></Link>
            </div>
          </header>
          {children}
        </section>
      </div>

      <ProjectUpdateAction/>
      <WorkspaceSearch open={searchOpen} onClose={() => setSearchOpen(false)}/>

      <nav className="surface fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 rounded-xl p-1.5 shadow-lg lg:hidden">
        {[
          { href: "/", label: "Home", icon: Home },
          { href: "/tasks", label: "Tasks", icon: ListTodo },
          { href: "/projects", label: "Projects", icon: FolderKanban },
          { href: "/notes", label: "Notes", icon: NotebookPen },
          { href: "/more", label: "More", icon: Menu },
        ].map((item) => {
          const Icon = item.icon;
          const active = item.href === "/more" ? moreActive || isActive(pathname, "/books") || isActive(pathname, "/english") : isActive(pathname, item.href);
          return <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] ${active ? "bg-violet-500/10 font-semibold text-violet-700 dark:text-violet-300" : "text-muted"}`}><Icon size={18}/>{item.label}</Link>;
        })}
      </nav>
    </main>
  );
}
