export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type EnglishTrack = {
  cefr: CefrLevel;
  name: string;
  position: string;
  focus: string;
};

export const englishTracks: EnglishTrack[] = [
  { cefr: "A1", name: "Foundation", position: "Essential communication", focus: "Familiar everyday exchanges with strong support." },
  { cefr: "A2", name: "Foundation Plus", position: "Everyday communication", focus: "Routine study, daily-life and personal communication." },
  { cefr: "B1", name: "Standard", position: "Independent communication", focus: "Study, projects, travel and workplace communication." },
  { cefr: "B2", name: "Intermediate", position: "Confident study/work communication", focus: "Discussion, presentations, technical explanation and structured writing." },
  { cefr: "C1", name: "Advanced", position: "Flexible academic/professional communication", focus: "Synthesis, nuance, stance, register and demanding communication." },
  { cefr: "C2", name: "Mastery", position: "Nuance, precision and synthesis", focus: "Precise stylistic control across complex contexts." },
];

export type CourseModule = {
  id: string;
  level: CefrLevel;
  title: string;
  domain: string;
  outcome: string;
  lessonIds: string[];
  status: "available" | "building";
};

export const courseModules: CourseModule[] = [
  {
    id: "a1-essential",
    level: "A1",
    title: "Essential Everyday English",
    domain: "Everyday",
    outcome: "Handle familiar introductions, requests and basic study situations.",
    lessonIds: ["a1-introduce-yourself", "a1-ask-for-help"],
    status: "building",
  },
  {
    id: "a2-study-life",
    level: "A2",
    title: "Study & Daily Communication",
    domain: "University / everyday",
    outcome: "Handle routine messages, class situations and short connected explanations.",
    lessonIds: ["a2-class-clarification", "a2-past-events"],
    status: "building",
  },
  {
    id: "b1-project-communication",
    level: "B1",
    title: "Project Communication",
    domain: "University / project / workplace",
    outcome: "Give updates, explain blockers and propose clear next steps.",
    lessonIds: ["project-progress-update", "project-blocker", "project-delay", "project-next-steps"],
    status: "available",
  },
  {
    id: "b1-independent-communication",
    level: "B1",
    title: "Independent Communication",
    domain: "Everyday / study / professional",
    outcome: "Express opinions, tell clear stories and recover from communication problems.",
    lessonIds: ["natural-opinions", "storytelling-control"],
    status: "available",
  },
  {
    id: "b2-academic-professional",
    level: "B2",
    title: "Academic & Professional English",
    domain: "University / CSE / workplace",
    outcome: "Explain technical ideas, discuss evidence and deliver structured presentations.",
    lessonIds: ["meeting-disagreement", "presentation-transitions", "cse-api-explanation", "academic-source-synthesis"],
    status: "available",
  },
  {
    id: "b2-ielts-bridge",
    level: "B2",
    title: "IELTS Academic Bridge",
    domain: "IELTS",
    outcome: "Build structured arguments and transfer general language skill into exam tasks.",
    lessonIds: ["ielts-position"],
    status: "available",
  },
  {
    id: "c1-advanced-production",
    level: "C1",
    title: "Advanced Production",
    domain: "Academic / professional",
    outcome: "Synthesize, hedge, persuade and adapt register for demanding communication.",
    lessonIds: ["c1-research-synthesis", "c1-stakeholder-briefing"],
    status: "building",
  },
  {
    id: "c2-mastery",
    level: "C2",
    title: "Mastery & Nuance",
    domain: "Academic / creator / leadership",
    outcome: "Reformulate complex ideas and communicate subtle meaning precisely.",
    lessonIds: ["c2-style-control"],
    status: "building",
  },
];

export const cefrRank: Record<CefrLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

export function trackFor(level: CefrLevel) {
  return englishTracks.find((item) => item.cefr === level) || englishTracks[2];
}

export function legacyLevelToCefr(level?: string): CefrLevel {
  const value = (level || "").toLowerCase();
  if (value.includes("master") || value === "c2") return "C2";
  if (value.includes("advanced") || value === "c1") return "C1";
  if (value.includes("upper") || value === "b2") return "B2";
  if (value.includes("intermediate")) return "B2";
  if (value.includes("foundation plus") || value === "a2") return "A2";
  if (value.includes("foundation") || value === "a1") return "A1";
  return "B1";
}

export function percentToCefr(value: number): { level: CefrLevel; signal: string } {
  if (value >= 92) return { level: "C1", signal: "C1 signal" };
  if (value >= 80) return { level: "B2", signal: "B2 signal" };
  if (value >= 60) return { level: "B1", signal: "B1 signal" };
  if (value >= 38) return { level: "A2", signal: "A2 signal" };
  return { level: "A1", signal: "A1 signal" };
}

export const coreSkillNodes = [
  "speaking.coherence",
  "listening.main_idea",
  "reading.inference",
  "writing.organization",
  "grammar.control",
  "vocabulary.retention",
  "project_updates.giving_reasons",
  "project_updates.deadline_collocations",
] as const;
