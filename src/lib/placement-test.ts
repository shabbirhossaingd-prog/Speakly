import type { CefrLevel } from "@/lib/english-curriculum";

export type PlacementSkill = "Grammar" | "Vocabulary" | "Reading" | "Pragmatics";

export type PlacementQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  weight: number;
  skill: PlacementSkill;
  level: CefrLevel;
};

export const placementQuestions: PlacementQuestion[] = [
  { id: "q1", prompt: "Choose the clearest routine message.", options: ["I can't come today because I am sick.", "I no come today because sick.", "Today not coming me sick."], answer: 0, weight: 1, skill: "Grammar", level: "A2" },
  { id: "q2", prompt: "Choose the best phrase to ask for clarification in class.", options: ["What you mean?", "Could you explain that part again, please?", "Say again this."], answer: 1, weight: 1, skill: "Pragmatics", level: "A2" },
  { id: "q3", prompt: "Complete: I ___ the report yesterday.", options: ["finish", "finished", "have finish", "finishing"], answer: 1, weight: 1, skill: "Grammar", level: "A2" },
  { id: "q4", prompt: "Choose the most natural project sentence.", options: ["We made good progress this week.", "We did a progress good this week.", "We progress made well this week."], answer: 0, weight: 2, skill: "Vocabulary", level: "B1" },
  { id: "q5", prompt: "Complete: By the time the meeting started, we ___ the proposal twice.", options: ["reviewed", "had reviewed", "have reviewed", "were review"], answer: 1, weight: 2, skill: "Grammar", level: "B1" },
  { id: "q6", prompt: "A teammate says: “The deadline may slip because testing is incomplete.” What is the main point?", options: ["Testing is finished.", "The schedule may be delayed.", "The deadline was cancelled.", "The team has no testing."], answer: 1, weight: 2, skill: "Reading", level: "B1" },
  { id: "q7", prompt: "Which phrase is best for polite disagreement in a professional meeting?", options: ["You are wrong.", "I don't accept it.", "I see the reasoning, but I would interpret the data differently.", "No, this is not good."], answer: 2, weight: 2, skill: "Pragmatics", level: "B2" },
  { id: "q8", prompt: "Choose the strongest academic transition.", options: ["And another thing", "Furthermore, the evidence indicates that", "Also you can see", "Then there is"], answer: 1, weight: 2, skill: "Vocabulary", level: "B2" },
  { id: "q9", prompt: "Choose the sentence with the clearest technical style.", options: ["The API checks the token before it allows the request to access protected resources.", "API token checking then it give protected resource access.", "The API is checking token for allowing resource because security.", "Token is checked and request access resource."], answer: 0, weight: 2, skill: "Grammar", level: "B2" },
  { id: "q10", prompt: "Which sentence uses hedging appropriately?", options: ["This definitely proves all users prefer the feature.", "The findings may suggest a preference for the feature among this sample.", "This proves maybe everyone likes it.", "Everyone perhaps definitely prefers it."], answer: 1, weight: 3, skill: "Pragmatics", level: "C1" },
  { id: "q11", prompt: "Choose the most precise summary of: “Both studies report gains, although the second warns that the effect depends on prior knowledge.”", options: ["Both studies completely agree.", "Both show improvement, but one adds an important condition.", "The second study rejects improvement.", "Prior knowledge never matters."], answer: 1, weight: 3, skill: "Reading", level: "C1" },
  { id: "q12", prompt: "Choose the most controlled academic phrasing.", options: ["The result is obviously true for everybody.", "The result may be interpreted as evidence of a broader pattern, though further data are needed.", "This result proves the pattern and maybe needs data.", "Everybody can see the pattern from this."], answer: 1, weight: 3, skill: "Vocabulary", level: "C1" },
];

function cefrFromRatio(ratio: number): CefrLevel {
  if (ratio >= 0.9) return "C1";
  if (ratio >= 0.74) return "B2";
  if (ratio >= 0.52) return "B1";
  if (ratio >= 0.28) return "A2";
  return "A1";
}

function legacyName(level: CefrLevel) {
  return ({ A1: "foundation", A2: "foundation-plus", B1: "standard", B2: "intermediate", C1: "advanced", C2: "mastery" } as const)[level];
}

export function scorePlacement(answers: Record<string, number>) {
  const total = placementQuestions.reduce((sum, q) => sum + q.weight, 0);
  const earned = placementQuestions.reduce((sum, q) => sum + (answers[q.id] === q.answer ? q.weight : 0), 0);
  const ratio = total ? earned / total : 0;
  const cefr = cefrFromRatio(ratio);
  const skillProfile = (Array.from(new Set(placementQuestions.map((question) => question.skill))) as PlacementSkill[]).reduce<Record<string, number>>((result, skill) => {
    const items = placementQuestions.filter((question) => question.skill === skill);
    const skillTotal = items.reduce((sum, item) => sum + item.weight, 0);
    const skillEarned = items.reduce((sum, item) => sum + (answers[item.id] === item.answer ? item.weight : 0), 0);
    result[skill] = skillTotal ? Math.round((skillEarned / skillTotal) * 100) : 0;
    return result;
  }, {});
  const answered = Object.keys(answers).length;
  const confidence = answered === placementQuestions.length ? (ratio > 0.15 && ratio < 0.95 ? "medium" : "low-medium") : "low";
  const recommendedModule = cefr === "A1" ? "a1-essential" : cefr === "A2" ? "a2-study-life" : cefr === "B1" ? "b1-project-communication" : cefr === "B2" ? "b2-academic-professional" : "c1-advanced-production";
  return {
    earned,
    total,
    percent: Math.round(ratio * 100),
    level: legacyName(cefr),
    cefr,
    confidence,
    skillProfile,
    recommendedModule,
    limitations: "Approximate learning estimate from receptive diagnostic items. Speaking and writing need separate productive evidence.",
  };
}
