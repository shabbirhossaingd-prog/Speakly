"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FolderKanban, Printer, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { listStudyProjects, listStudyTasks, listStudyWorkLogs, type StudyProject, type StudyTask, type StudyWorkLog } from "@/lib/local-study-db";

function progressFor(project: StudyProject, tasks: StudyTask[]) {
  const linked = tasks.filter((task) => task.projectId === project.id);
  if (!linked.length) return project.status === "completed" ? 100 : project.progress || 0;
  return Math.round((linked.filter((task) => task.status === "done").length / linked.length) * 100);
}

export default function PortfolioPage() {
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [logs, setLogs] = useState<StudyWorkLog[]>([]);

  useEffect(() => {
    Promise.all([listStudyProjects(), listStudyTasks(), listStudyWorkLogs()])
      .then(([nextProjects, nextTasks, nextLogs]) => {
        setProjects(nextProjects.filter((project) => project.portfolioVisible));
        setTasks(nextTasks);
        setLogs(nextLogs);
      })
      .catch(() => {});
  }, []);

  return (
    <AppShell subtitle="Selected work" title="Portfolio">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-600"><Sparkles size={14}/>Portfolio preview</div><h2 className="mt-3 text-2xl font-black">Work you chose to showcase</h2><p className="mt-2 max-w-2xl text-sm text-muted">Only projects with “Show this project in Portfolio” enabled appear here. Private tasks and notes are not exposed by default.</p></div>
          <button onClick={() => window.print()} className="button-secondary"><Printer size={17}/>Print / Save PDF</button>
        </div>
      </section>

      <div className="mt-6 space-y-6">
        {projects.map((project) => {
          const projectTasks = tasks.filter((task) => task.projectId === project.id);
          const projectLogs = logs.filter((log) => log.projectId === project.id || (!log.projectId && log.projectName.toLowerCase() === project.name.toLowerCase()));
          const problems = projectLogs.map((log) => log.problem).filter(Boolean).slice(0, 3);
          const solutions = projectLogs.map((log) => log.solution).filter(Boolean).slice(0, 3);
          const work = projectLogs.map((log) => log.workDone || log.title).filter(Boolean).slice(0, 6);
          const totalMinutes = projectLogs.reduce((sum, log) => sum + (log.timeMinutes || 0), 0) + projectTasks.reduce((sum, task) => sum + (task.spentMinutes || 0), 0);
          const progress = progressFor(project, tasks);
          return (
            <article key={project.id} className="card overflow-hidden">
              <div className="brand-gradient p-6 text-white sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-xs font-bold uppercase tracking-wider text-violet-100">{project.category || "Project"}</p><h2 className="mt-2 text-3xl font-black">{project.name}</h2><p className="mt-2 text-sm text-violet-100">{[project.client, project.role].filter(Boolean).join(" • ") || "Personal / portfolio project"}</p></div>
                  <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">{project.status}</span>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="muted-surface rounded-xl p-4"><p className="text-xs text-muted">Progress</p><p className="mt-1 text-xl font-black">{progress}%</p></div>
                  <div className="muted-surface rounded-xl p-4"><p className="text-xs text-muted">Tasks</p><p className="mt-1 text-xl font-black">{projectTasks.length}</p></div>
                  <div className="muted-surface rounded-xl p-4"><p className="text-xs text-muted">Effort logged</p><p className="mt-1 text-xl font-black">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p></div>
                </div>

                {project.description && <section className="mt-7"><h3 className="font-bold">Overview</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">{project.description}</p></section>}

                {!!work.length && <section className="mt-7"><h3 className="font-bold">What I did</h3><ul className="mt-3 space-y-2">{work.map((item, index) => <li key={index} className="flex gap-3 text-sm text-muted"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600"/>{item}</li>)}</ul></section>}

                {!!problems.length && <section className="mt-7"><h3 className="font-bold">Challenges</h3><ul className="mt-3 space-y-2">{problems.map((item, index) => <li key={index} className="muted-surface rounded-xl p-3 text-sm text-muted">{item}</li>)}</ul></section>}

                {!!solutions.length && <section className="mt-7"><h3 className="font-bold">Solutions</h3><ul className="mt-3 space-y-2">{solutions.map((item, index) => <li key={index} className="muted-surface rounded-xl p-3 text-sm text-muted">{item}</li>)}</ul></section>}

                {!!project.links?.length && <section className="mt-7"><h3 className="font-bold">Links</h3><div className="mt-3 flex flex-wrap gap-2">{project.links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="button-secondary"><ExternalLink size={15}/>{link.label}</a>)}</div></section>}
              </div>
            </article>
          );
        })}

        {!projects.length && <section className="card p-8 text-center"><FolderKanban className="mx-auto text-violet-600" size={34}/><h2 className="mt-4 text-xl font-bold">No project is marked for Portfolio yet</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted">Open Projects, edit a project and enable “Show this project in Portfolio.”</p></section>}
      </div>
    </AppShell>
  );
}
