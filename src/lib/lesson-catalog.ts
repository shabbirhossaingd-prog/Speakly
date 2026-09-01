import type { CefrLevel } from "@/lib/english-curriculum";

export type LessonStage =
  | "context"
  | "input"
  | "comprehension"
  | "noticing"
  | "vocabulary"
  | "retrieval"
  | "pronunciation"
  | "speaking"
  | "writing"
  | "quiz"
  | "feedback"
  | "retry"
  | "transfer";

export type Lesson = {
  id: string;
  title: string;
  track: "standard" | "ielts" | "corporate" | "presentation" | "academic" | "field";
  level: "standard" | "intermediate" | "upper-intermediate" | "advanced";
  cefrLevel: CefrLevel;
  moduleId: string;
  minutes: number;
  summary: string;
  canDo: string;
  primarySkill: "Speaking" | "Listening" | "Reading" | "Writing";
  secondarySkills: string[];
  domain: string;
  functions: string[];
  grammarFocus: string[];
  targetVocabulary: string[];
  collocations: string[];
  pronunciationFocus?: string;
  authenticTask: string;
  transferAction?: string;
  stages: LessonStage[];
  tags: string[];
};

const fullFlow: LessonStage[] = ["context", "input", "comprehension", "noticing", "vocabulary", "retrieval", "pronunciation", "speaking", "writing", "quiz", "feedback", "retry", "transfer"];

export const lessonCatalog: Lesson[] = [
  {
    id: "project-progress-update",
    title: "Give a Clear Project Progress Update",
    track: "standard",
    level: "standard",
    cefrLevel: "B1",
    moduleId: "b1-project-communication",
    minutes: 16,
    summary: "Report completed work, current progress and the next action in a concise update.",
    canDo: "I can give a short project progress update and make the next step clear.",
    primarySkill: "Speaking",
    secondarySkills: ["Listening", "Writing", "Vocabulary"],
    domain: "University / project / workplace",
    functions: ["report progress", "sequence work", "state next steps"],
    grammarFocus: ["present perfect for recent progress", "past simple for completed events"],
    targetVocabulary: ["progress", "complete", "implement", "review", "next step"],
    collocations: ["make progress", "complete a task", "move to the next step"],
    pronunciationFocus: "Sentence stress on completed work and next actions.",
    authenticTask: "Record a 45–60 second update about a real or simulated project.",
    transferAction: "Save the polished version to Project Updates.",
    stages: fullFlow,
    tags: ["projects", "speaking", "writing", "professional", "cse"],
  },
  {
    id: "project-blocker",
    title: "Explain a Blocker and Ask for Help",
    track: "standard",
    level: "standard",
    cefrLevel: "B1",
    moduleId: "b1-project-communication",
    minutes: 15,
    summary: "Describe a problem clearly, explain its effect and ask for useful clarification or support.",
    canDo: "I can explain what is blocking my work and ask for the help I need.",
    primarySkill: "Speaking",
    secondarySkills: ["Listening", "Vocabulary"],
    domain: "University / project / workplace",
    functions: ["describe a problem", "explain impact", "ask for clarification"],
    grammarFocus: ["because / so / therefore", "question forms for clarification"],
    targetVocabulary: ["blocker", "issue", "requirement", "clarify", "resolve"],
    collocations: ["run into an issue", "clarify a requirement", "resolve a blocker"],
    pronunciationFocus: "Stress key problem words and keep clarification questions clear.",
    authenticTask: "Explain one blocker, its impact and the exact help you need.",
    transferAction: "Add useful phrases to Vocabulary & Review.",
    stages: fullFlow,
    tags: ["projects", "blockers", "speaking", "professional"],
  },
  {
    id: "project-delay",
    title: "Explain a Project Delay and Propose Next Steps",
    track: "standard",
    level: "standard",
    cefrLevel: "B1",
    moduleId: "b1-project-communication",
    minutes: 18,
    summary: "Explain why work is late without sounding defensive and give a revised plan.",
    canDo: "I can explain why work is delayed and give a clear revised plan.",
    primarySkill: "Speaking",
    secondarySkills: ["Listening", "Writing", "Vocabulary"],
    domain: "University / project / workplace",
    functions: ["explain cause", "report progress", "propose action"],
    grammarFocus: ["past simple vs present perfect", "because / so / however"],
    targetVocabulary: ["blocker", "deadline", "revise", "resolve", "submit", "progress"],
    collocations: ["meet a deadline", "miss a deadline", "make progress", "run into an issue"],
    pronunciationFocus: "Sentence stress on new and contrastive information.",
    authenticTask: "Record a 60–90 second update about a real or simulated study/project delay.",
    transferAction: "Convert the improved response into a Project Updates entry.",
    stages: fullFlow,
    tags: ["projects", "deadlines", "speaking", "writing", "professional"],
  },
  {
    id: "project-next-steps",
    title: "Present Next Steps With Clear Priorities",
    track: "standard",
    level: "standard",
    cefrLevel: "B1",
    moduleId: "b1-project-communication",
    minutes: 14,
    summary: "Prioritize actions, assign ownership and state a realistic next milestone.",
    canDo: "I can present next steps in a clear order and explain what matters first.",
    primarySkill: "Speaking",
    secondarySkills: ["Writing", "Vocabulary"],
    domain: "Project / workplace",
    functions: ["prioritize", "propose action", "state responsibility"],
    grammarFocus: ["first / then / after that", "need to / should / can"],
    targetVocabulary: ["priority", "milestone", "owner", "review", "deliver"],
    collocations: ["set a priority", "reach a milestone", "deliver an update"],
    authenticTask: "Give a one-minute next-step briefing for a current project.",
    transferAction: "Create a follow-up task in Tasks & Planner.",
    stages: fullFlow,
    tags: ["projects", "planning", "speaking", "tasks"],
  },
  {
    id: "natural-opinions",
    title: "Express Opinions Without Sounding Repetitive",
    track: "standard",
    level: "standard",
    cefrLevel: "B1",
    moduleId: "b1-independent-communication",
    minutes: 18,
    summary: "Build natural agreement, disagreement and opinion language for real conversations.",
    canDo: "I can give an opinion, support it with a reason and respond to another view.",
    primarySkill: "Speaking",
    secondarySkills: ["Listening", "Vocabulary"],
    domain: "Everyday / study",
    functions: ["give opinions", "agree", "disagree"],
    grammarFocus: ["reason clauses", "contrast linkers"],
    targetVocabulary: ["perspective", "reason", "evidence", "agree", "however"],
    collocations: ["from my perspective", "I see your point", "a strong reason"],
    authenticTask: "Respond to a study or project decision and support your view.",
    stages: fullFlow,
    tags: ["conversation", "fluency", "collocations", "speaking"],
  },
  {
    id: "storytelling-control",
    title: "Tell a Clear Story With Better Tense Control",
    track: "standard",
    level: "intermediate",
    cefrLevel: "B1",
    moduleId: "b1-independent-communication",
    minutes: 22,
    summary: "Use sequencing, tense shifts and detail to tell stories naturally.",
    canDo: "I can tell a connected story and make the sequence easy to follow.",
    primarySkill: "Speaking",
    secondarySkills: ["Writing", "Grammar"],
    domain: "Everyday / study",
    functions: ["narrate", "sequence", "add detail"],
    grammarFocus: ["past simple", "past continuous", "past perfect"],
    targetVocabulary: ["event", "suddenly", "eventually", "meanwhile"],
    collocations: ["at that point", "in the end", "what happened next"],
    authenticTask: "Tell a two-minute story about a study or project problem you solved.",
    stages: fullFlow,
    tags: ["grammar", "speaking", "writing", "storytelling"],
  },
  {
    id: "meeting-disagreement",
    title: "Disagree Professionally in a Meeting",
    track: "corporate",
    level: "upper-intermediate",
    cefrLevel: "B2",
    moduleId: "b2-academic-professional",
    minutes: 24,
    summary: "Challenge an idea, ask for evidence and propose alternatives without sounding rude.",
    canDo: "I can disagree clearly while maintaining a professional tone.",
    primarySkill: "Speaking",
    secondarySkills: ["Listening", "Vocabulary"],
    domain: "Professional / project",
    functions: ["disagree", "challenge evidence", "propose alternatives"],
    grammarFocus: ["hedging", "contrast clauses"],
    targetVocabulary: ["evidence", "interpret", "alternative", "concern"],
    collocations: ["raise a concern", "consider an alternative", "interpret the data"],
    authenticTask: "Respond to a proposal you disagree with and offer a better option.",
    stages: fullFlow,
    tags: ["corporate", "meeting", "tone", "speaking"],
  },
  {
    id: "presentation-transitions",
    title: "Make a Technical Presentation Flow Naturally",
    track: "presentation",
    level: "intermediate",
    cefrLevel: "B2",
    moduleId: "b2-academic-professional",
    minutes: 20,
    summary: "Open strongly, transition between ideas and close with a memorable summary.",
    canDo: "I can guide an audience through a technical presentation with clear transitions.",
    primarySkill: "Speaking",
    secondarySkills: ["Writing", "Pronunciation"],
    domain: "University / technical / professional",
    functions: ["signpost", "transition", "summarize"],
    grammarFocus: ["discourse markers"],
    targetVocabulary: ["overview", "highlight", "demonstrate", "conclusion"],
    collocations: ["give an overview", "highlight a point", "move on to"],
    authenticTask: "Deliver a 90-second explanation of a technical topic with clear signposting.",
    stages: fullFlow,
    tags: ["presentation", "clarity", "speaking", "technical"],
  },
  {
    id: "cse-api-explanation",
    title: "Explain API Authentication Clearly",
    track: "field",
    level: "upper-intermediate",
    cefrLevel: "B2",
    moduleId: "b2-academic-professional",
    minutes: 25,
    summary: "Practice technical vocabulary and explain authentication to a teacher, interviewer or client.",
    canDo: "I can explain a technical process accurately to a non-specialist audience.",
    primarySkill: "Speaking",
    secondarySkills: ["Reading", "Vocabulary"],
    domain: "CSE / interview / client",
    functions: ["define", "explain process", "clarify"],
    grammarFocus: ["passive voice", "cause and effect"],
    targetVocabulary: ["token", "request", "resource", "authenticate", "authorize"],
    collocations: ["verify a token", "grant access", "protected resource"],
    authenticTask: "Explain API authentication in 90 seconds to a junior teammate.",
    stages: fullFlow,
    tags: ["cse", "api", "viva", "technical", "speaking"],
  },
  {
    id: "academic-source-synthesis",
    title: "Synthesize Two Sources Into One Clear Position",
    track: "academic",
    level: "upper-intermediate",
    cefrLevel: "B2",
    moduleId: "b2-academic-professional",
    minutes: 28,
    summary: "Compare two short sources, identify agreement and contrast, then build a concise synthesis.",
    canDo: "I can combine information from two sources into a structured explanation.",
    primarySkill: "Writing",
    secondarySkills: ["Reading", "Vocabulary"],
    domain: "Academic",
    functions: ["compare", "contrast", "synthesize"],
    grammarFocus: ["reporting verbs", "contrast linkers"],
    targetVocabulary: ["argue", "suggest", "contrast", "evidence", "source"],
    collocations: ["the evidence suggests", "in contrast", "both sources indicate"],
    authenticTask: "Write a 150-word synthesis of two short academic viewpoints.",
    stages: fullFlow,
    tags: ["academic", "reading", "writing", "synthesis"],
  },
  {
    id: "ielts-position",
    title: "Build and Defend an IELTS Writing Position",
    track: "ielts",
    level: "upper-intermediate",
    cefrLevel: "B2",
    moduleId: "b2-ielts-bridge",
    minutes: 30,
    summary: "Develop a clear position, topic sentences, support and cohesion for Task 2 practice.",
    canDo: "I can develop and support a clear position in a timed academic essay task.",
    primarySkill: "Writing",
    secondarySkills: ["Reading", "Vocabulary"],
    domain: "IELTS",
    functions: ["argue", "support", "organize"],
    grammarFocus: ["complex clauses", "cohesion"],
    targetVocabulary: ["argument", "evidence", "impact", "consequence"],
    collocations: ["support an argument", "have an impact", "a significant consequence"],
    authenticTask: "Write one timed body paragraph, get feedback and rewrite it.",
    stages: fullFlow,
    tags: ["ielts", "writing", "argument", "academic"],
  },
];

export function recommendLessons(input: { goals?: string[]; field?: string; level?: string; weakAreas?: string[] }) {
  const goals = (input.goals ?? []).map((goal) => goal.toLowerCase());
  const field = (input.field ?? "").toLowerCase();
  const level = (input.level ?? "").toLowerCase();
  const weak = (input.weakAreas ?? []).map((item) => item.toLowerCase());

  const score = (lesson: Lesson) => {
    let value = 0;
    if (field.includes("computer") && lesson.tags.includes("cse")) value += 5;
    if (goals.some((goal) => goal.includes("ielts")) && lesson.track === "ielts") value += 5;
    if (goals.some((goal) => goal.includes("job") || goal.includes("corporate") || goal.includes("professional")) && ["corporate", "field"].includes(lesson.track)) value += 4;
    if (goals.some((goal) => goal.includes("presentation")) && lesson.tags.includes("presentation")) value += 4;
    if (goals.some((goal) => goal.includes("project")) && lesson.tags.includes("projects")) value += 5;
    if (weak.some((area) => lesson.tags.some((tag) => area.includes(tag) || tag.includes(area)))) value += 3;
    if (level.includes("upper") || level.includes("intermediate") || level.includes("b2")) value += lesson.cefrLevel === "B2" ? 2 : 0;
    if (level.includes("standard") || level.includes("b1")) value += lesson.cefrLevel === "B1" ? 2 : 0;
    if (lesson.moduleId === "b1-project-communication") value += 1;
    return value;
  };

  return [...lessonCatalog].sort((a, b) => score(b) - score(a) || a.minutes - b.minutes).slice(0, 8);
}
