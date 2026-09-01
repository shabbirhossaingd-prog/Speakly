import Link from "next/link";
import {
  Activity,
  BookOpen,
  Brain,
  CalendarDays,
  Clock3,
  Gauge,
  GraduationCap,
  HardDrive,
  Home,
  Languages,
  LibraryBig,
  Map,
  Mic2,
  Sparkles,
  SpellCheck2,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";

const items = [
  { href: "/updates", label: "Project Updates", text: "Save work history, blockers and next steps.", icon: Activity },
  { href: "/calendar", label: "Calendar", text: "See tasks and project deadlines together.", icon: CalendarDays },
  { href: "/books", label: "My Library", text: "Semester PDFs, notes and study resources.", icon: LibraryBig },
  { href: "/flashcards", label: "Flashcards", text: "Spaced review for study material.", icon: Brain },
  { href: "/exam", label: "Exam Mode", text: "Focused self-testing from your saved material.", icon: GraduationCap },
  { href: "/portfolio", label: "Portfolio", text: "Preview projects marked for your portfolio.", icon: Sparkles },
  { href: "/focus", label: "Focus Timer", text: "Track time against real tasks.", icon: Clock3 },
  { href: "/storage", label: "Device Storage", text: "Backup, restore and protect local data.", icon: HardDrive },
];

const english = [
  { href: "/english", label: "English Home", icon: Home },
  { href: "/english/course-map", label: "Course Map", icon: Map },
  { href: "/learn", label: "Structured Lessons", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: Target },
  { href: "/speaking", label: "Speaking Lab", icon: Mic2 },
  { href: "/vocabulary", label: "Vocabulary & Review", icon: Languages },
  { href: "/grammar", label: "Grammar", icon: SpellCheck2 },
  { href: "/ielts", label: "IELTS", icon: GraduationCap },
  { href: "/progress", label: "English Progress", icon: Gauge },
];

export default function MorePage() {
  return (
    <AppShell subtitle="All tools" title="More">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ href, label, text, icon: Icon }) => <Link key={href} href={href} className="card p-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Icon size={20}/></span><h2 className="mt-4 font-bold">{label}</h2><p className="mt-2 text-sm leading-6 text-muted">{text}</p></Link>)}
      </div>
      <section className="card mt-6 p-5">
        <div className="flex items-center gap-3"><BookOpen className="text-violet-600"/><div><h2 className="font-bold">English learning</h2><p className="text-sm text-muted">A CEFR-aligned learning vertical connected to Tasks, Projects, Library and Progress.</p></div></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{english.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="muted-surface flex items-center gap-2 rounded-xl p-3 text-sm font-semibold"><Icon size={16}/>{label}</Link>)}</div>
      </section>
    </AppShell>
  );
}
