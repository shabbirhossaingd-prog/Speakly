import Link from "next/link";
import { ArrowRight, CheckCircle2, Construction, Map, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { courseModules, englishTracks } from "@/lib/english-curriculum";
import { lessonCatalog } from "@/lib/lesson-catalog";

export default function CourseMapPage() {
  return (
    <AppShell subtitle="Track → Level → Module → Lesson → Task → Review" title="English Course Map">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-600"><Map size={14}/>CEFR learning spine</div>
            <h2 className="mt-4 text-2xl font-black">Learn communication outcomes, not disconnected grammar chapters.</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Every module is built around what you should be able to do in real study, project, exam or professional situations. Grammar and vocabulary support the task instead of becoming the whole lesson.</p>
          </div>
          <Link href="/placement" className="button-secondary">Find my starting level</Link>
        </div>
      </section>

      <div className="mt-6 space-y-6">
        {englishTracks.map((track) => {
          const modules = courseModules.filter((module) => module.level === track.cefr);
          return (
            <section key={track.cefr} className="card overflow-hidden">
              <div className="border-b p-5 sm:p-6" style={{ borderColor: "rgb(var(--border))" }}>
                <div className="flex flex-wrap items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 font-black text-white">{track.cefr}</span><div><p className="text-xs font-semibold text-violet-600">{track.name}</p><h2 className="text-xl font-black">{track.position}</h2></div></div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{track.focus}</p>
              </div>

              <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-2">
                {modules.map((module) => {
                  const lessons = module.lessonIds.map((id) => lessonCatalog.find((lesson) => lesson.id === id)).filter(Boolean);
                  return (
                    <div key={module.id} className="muted-surface rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">{module.status === "available" ? <CheckCircle2 size={18}/> : <Construction size={18}/>}</span>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{module.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${module.status === "available" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{module.status === "available" ? "AVAILABLE" : "BUILDING"}</span></div><p className="mt-1 text-xs text-muted">{module.domain}</p></div>
                      </div>
                      <p className="mt-4 text-sm leading-6">{module.outcome}</p>

                      <div className="mt-4 space-y-2">
                        {module.lessonIds.map((lessonId, index) => {
                          const lesson = lessonCatalog.find((item) => item.id === lessonId);
                          return lesson ? (
                            <Link key={lessonId} href={`/learn?lesson=${lesson.id}`} className="surface flex items-center gap-3 rounded-xl p-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-bold text-violet-600">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{lesson.title}</span><span className="mt-0.5 block text-[11px] text-muted">{lesson.primarySkill} • {lesson.minutes} min</span></span><ArrowRight size={15} className="text-muted"/></Link>
                          ) : (
                            <div key={lessonId} className="surface flex items-center gap-3 rounded-xl p-3 text-sm opacity-60"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-bold text-violet-600">{index + 1}</span><span className="font-medium">Planned lesson</span></div>
                          );
                        })}
                      </div>
                      {module.status === "available" && lessons.length > 0 && <Link href={`/learn?lesson=${lessons[0]?.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-600">Start module <ArrowRight size={15}/></Link>}
                    </div>
                  );
                })}
                {!modules.length && <div className="muted-surface rounded-2xl p-6 text-sm text-muted"><Sparkles className="mb-3 text-violet-600"/>This level is part of the curriculum roadmap and will use the same task → feedback → retry → review architecture.</div>}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
