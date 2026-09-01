import type { LearningProfile } from "@/lib/learning-profile";

type Progress = {
  xp: number;
  streak: number;
  completedLessons: string[];
  skills: Record<string, number>;
  weakAreas: string[];
};

export type VocabularyKind = "word" | "phrase" | "collocation" | "phrasal-verb" | "idiom";
export type ReviewRating = "again" | "hard" | "good" | "easy";
export type Word = {
  id: string;
  word: string;
  meaning: string;
  example: string;
  kind: VocabularyKind;
  cefr: string;
  register: string;
  source: string;
  mastery: number;
  nextReview: string;
  reviewCount: number;
  lastReviewed?: string;
};
type Book = { id: string; name: string; size: number; storagePath?: string; status: string; createdAt: string };

type ActorState = {
  profile?: LearningProfile;
  progress: Progress;
  vocabulary: Word[];
  books: Book[];
};

type GlobalStore = typeof globalThis & { __speaklyStore?: Map<string, ActorState> };
const globalStore = globalThis as GlobalStore;
const store = globalStore.__speaklyStore ?? new Map<string, ActorState>();
globalStore.__speaklyStore = store;

function initialState(): ActorState {
  return {
    progress: { xp: 0, streak: 0, completedLessons: [], skills: { Speaking: 50, Vocabulary: 50, Grammar: 50, Listening: 50, Reading: 50, Writing: 50 }, weakAreas: [] },
    vocabulary: [],
    books: [],
  };
}

export function stateFor(actorId: string) {
  if (!store.has(actorId)) store.set(actorId, initialState());
  return store.get(actorId)!;
}

export function saveProfile(actorId: string, profile: LearningProfile) { stateFor(actorId).profile = profile; return profile; }
export function getProfile(actorId: string) { return stateFor(actorId).profile ?? null; }
export function getProgress(actorId: string) { return stateFor(actorId).progress; }
export function completeLesson(actorId: string, lessonId: string, skill = "Speaking") {
  const progress = stateFor(actorId).progress;
  if (!progress.completedLessons.includes(lessonId)) { progress.completedLessons.push(lessonId); progress.xp += 80; }
  progress.streak = Math.max(1, progress.streak);
  progress.skills[skill] = Math.min(100, (progress.skills[skill] ?? 50) + 3);
  return progress;
}

export function wordsFor(actorId: string) {
  return stateFor(actorId).vocabulary
    .map((word) => ({
      ...word,
      kind: word.kind || "word",
      cefr: word.cefr || "",
      register: word.register || "",
      source: word.source || "",
      reviewCount: word.reviewCount || 0,
    }))
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

export function addWord(actorId: string, input: Omit<Word, "id" | "mastery" | "nextReview" | "reviewCount" | "lastReviewed">) {
  const word: Word = {
    ...input,
    id: crypto.randomUUID(),
    mastery: 0,
    nextReview: new Date().toISOString(),
    reviewCount: 0,
  };
  stateFor(actorId).vocabulary.unshift(word);
  return word;
}

export function reviewWord(actorId: string, id: string, rating: ReviewRating | boolean) {
  const word = stateFor(actorId).vocabulary.find((item) => item.id === id);
  if (!word) return null;
  const resolved: ReviewRating = typeof rating === "boolean" ? (rating ? "good" : "again") : rating;
  const delta = { again: -1, hard: 0, good: 1, easy: 2 }[resolved];
  word.mastery = Math.max(0, Math.min(5, (word.mastery || 0) + delta));
  const now = new Date();
  const next = new Date(now);
  if (resolved === "again") next.setMinutes(next.getMinutes() + 10);
  if (resolved === "hard") next.setDate(next.getDate() + 1);
  if (resolved === "good") next.setDate(next.getDate() + Math.max(2, 2 ** Math.max(1, word.mastery)));
  if (resolved === "easy") next.setDate(next.getDate() + Math.max(4, 3 + 2 ** Math.max(1, word.mastery)));
  word.nextReview = next.toISOString();
  word.lastReviewed = now.toISOString();
  word.reviewCount = (word.reviewCount || 0) + 1;
  return word;
}

export function booksFor(actorId: string) { return stateFor(actorId).books; }
export function addBook(actorId: string, book: Book) { stateFor(actorId).books.unshift(book); return book; }
