export type StudyProjectStatus = "planning" | "active" | "blocked" | "review" | "completed" | "archived";

export type StudyProjectLink = {
  id: string;
  label: string;
  url: string;
};

export type StudyProject = {
  id: string;
  name: string;
  description: string;
  client: string;
  role: string;
  category: string;
  status: StudyProjectStatus;
  startAt: string | null;
  dueAt: string | null;
  progress: number;
  portfolioVisible: boolean;
  links: StudyProjectLink[];
  createdAt: string;
  updatedAt: string;
};

export type StudyNote = {
  id: string;
  title: string;
  subject: string;
  body: string;
  tags: string[];
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudyAsset = {
  id: string;
  noteId: string;
  name: string;
  type: string;
  blob: Blob;
  createdAt: string;
};

export type StudyLibraryResourceType =
  | "book"
  | "lecture_sheet"
  | "class_note"
  | "slide"
  | "lab_sheet"
  | "assignment"
  | "question_paper"
  | "research_paper"
  | "other";

export type StudyBook = {
  id: string;
  name: string;
  size: number;
  type: string;
  blob: Blob;
  semesterId?: string | null;
  subject?: string;
  resourceType?: StudyLibraryResourceType;
  academicYear?: string;
  examType?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type StudySemester = {
  id: string;
  name: string;
  order: number;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudySubject = {
  id: string;
  name: string;
  code: string;
  category: string;
  goal: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyTaskKind =
  | "class"
  | "study"
  | "assignment"
  | "revision"
  | "exam"
  | "lab"
  | "coding"
  | "viva"
  | "presentation"
  | "project"
  | "reading"
  | "routine"
  | "personal";

export type StudyChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type StudyTaskResource = {
  id: string;
  type: "note" | "drive" | "github" | "youtube" | "website" | "other";
  label: string;
  url: string;
};

export type StudyTask = {
  id: string;
  title: string;
  description?: string;
  subjectId: string | null;
  projectId?: string | null;
  kind: StudyTaskKind;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  startAt?: string | null;
  dueAt: string | null;
  reminderAt?: string | null;
  estimateMinutes?: number;
  spentMinutes?: number;
  progress?: number;
  recurrence?: "none" | "daily" | "weekdays" | "weekly" | "monthly";
  checklist?: StudyChecklistItem[];
  noteId?: string | null;
  noteTitle?: string;
  resources?: StudyTaskResource[];
  teacher?: string;
  room?: string;
  tags?: string[];
  parentTaskId?: string | null;
  blockedByIds?: string[];
  createdAt: string;
  updatedAt: string;
};

export type StudyWorkLogLink = {
  id: string;
  label: string;
  url: string;
};

export type StudyWorkLogStatus = "working" | "blocked" | "review" | "done";

export type StudyWorkLog = {
  id: string;
  occurredAt: string;
  projectId?: string | null;
  projectName: string;
  title: string;
  taskId: string | null;
  taskTitle: string;
  status: StudyWorkLogStatus;
  workDone: string;
  problem: string;
  solution: string;
  nextStep: string;
  timeMinutes: number;
  commitRef: string;
  tags: string[];
  links: StudyWorkLogLink[];
  createdAt: string;
  updatedAt: string;
};

export type StudyWorkLogAsset = {
  id: string;
  logId: string;
  name: string;
  type: string;
  blob: Blob;
  createdAt: string;
};

export type StudyFlashcard = {
  id: string;
  subjectId: string | null;
  front: string;
  back: string;
  tags: string[];
  mastery: number;
  nextReviewAt: string;
  createdAt: string;
  updatedAt: string;
};

const DB_NAME = "speakly-study";
const DB_VERSION = 6;
const NOTE_STORE = "notes";
const ASSET_STORE = "assets";
const BOOK_STORE = "books";
const SEMESTER_STORE = "semesters";
const SUBJECT_STORE = "subjects";
const TASK_STORE = "tasks";
const FLASHCARD_STORE = "flashcards";
const WORK_LOG_STORE = "workLogs";
const WORK_LOG_ASSET_STORE = "workLogAssets";
const PROJECT_STORE = "projects";

const ALL_STORES = [
  NOTE_STORE,
  ASSET_STORE,
  BOOK_STORE,
  SEMESTER_STORE,
  SUBJECT_STORE,
  TASK_STORE,
  FLASHCARD_STORE,
  WORK_LOG_STORE,
  WORK_LOG_ASSET_STORE,
  PROJECT_STORE,
] as const;

function ensureIndex(store: IDBObjectStore, name: string, keyPath: string) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, { unique: false });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      if (!tx) return;

      if (!db.objectStoreNames.contains(NOTE_STORE)) db.createObjectStore(NOTE_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(ASSET_STORE)) db.createObjectStore(ASSET_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(BOOK_STORE)) db.createObjectStore(BOOK_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SEMESTER_STORE)) db.createObjectStore(SEMESTER_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SUBJECT_STORE)) db.createObjectStore(SUBJECT_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(TASK_STORE)) db.createObjectStore(TASK_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(FLASHCARD_STORE)) db.createObjectStore(FLASHCARD_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(WORK_LOG_STORE)) db.createObjectStore(WORK_LOG_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(WORK_LOG_ASSET_STORE)) db.createObjectStore(WORK_LOG_ASSET_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE, { keyPath: "id" });

      ensureIndex(tx.objectStore(ASSET_STORE), "noteId", "noteId");
      ensureIndex(tx.objectStore(NOTE_STORE), "projectId", "projectId");
      ensureIndex(tx.objectStore(TASK_STORE), "subjectId", "subjectId");
      ensureIndex(tx.objectStore(TASK_STORE), "projectId", "projectId");
      ensureIndex(tx.objectStore(TASK_STORE), "status", "status");
      ensureIndex(tx.objectStore(FLASHCARD_STORE), "subjectId", "subjectId");
      ensureIndex(tx.objectStore(FLASHCARD_STORE), "nextReviewAt", "nextReviewAt");
      ensureIndex(tx.objectStore(WORK_LOG_STORE), "taskId", "taskId");
      ensureIndex(tx.objectStore(WORK_LOG_STORE), "projectId", "projectId");
      ensureIndex(tx.objectStore(WORK_LOG_STORE), "projectName", "projectName");
      ensureIndex(tx.objectStore(WORK_LOG_STORE), "occurredAt", "occurredAt");
      ensureIndex(tx.objectStore(WORK_LOG_ASSET_STORE), "logId", "logId");
      ensureIndex(tx.objectStore(PROJECT_STORE), "status", "status");
      ensureIndex(tx.objectStore(PROJECT_STORE), "portfolioVisible", "portfolioVisible");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local study database."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local database request failed."));
  });
}

async function transactionDone(tx: IDBTransaction) {
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Local database transaction failed."));
    tx.onabort = () => reject(tx.error || new Error("Local database transaction was aborted."));
  });
}

async function listStore<T>(storeName: string) {
  const db = await openDb();
  const items = await requestResult(db.transaction(storeName, "readonly").objectStore(storeName).getAll() as IDBRequest<T[]>);
  db.close();
  return items;
}

async function putStore<T>(storeName: string, value: T) {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(value);
  await transactionDone(tx);
  db.close();
  return value;
}

async function deleteStore(storeName: string, id: string) {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(id);
  await transactionDone(tx);
  db.close();
}

export async function listStudyProjects() {
  const projects = await listStore<StudyProject>(PROJECT_STORE);
  const rank: Record<StudyProjectStatus, number> = { active: 0, review: 1, blocked: 2, planning: 3, completed: 4, archived: 5 };
  return projects.sort((a, b) => rank[a.status] - rank[b.status] || b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveStudyProject(project: StudyProject) {
  return putStore(PROJECT_STORE, project);
}

export async function deleteStudyProject(id: string) {
  return deleteStore(PROJECT_STORE, id);
}

export async function listStudyNotes() {
  const notes = await listStore<StudyNote>(NOTE_STORE);
  return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveStudyNote(note: StudyNote) {
  return putStore(NOTE_STORE, note);
}

export async function deleteStudyNote(id: string) {
  const db = await openDb();
  const tx = db.transaction([NOTE_STORE, ASSET_STORE], "readwrite");
  tx.objectStore(NOTE_STORE).delete(id);
  const assets = await requestResult(tx.objectStore(ASSET_STORE).index("noteId").getAllKeys(id));
  assets.forEach((key) => tx.objectStore(ASSET_STORE).delete(key));
  await transactionDone(tx);
  db.close();
}

export async function saveStudyAsset(asset: StudyAsset) {
  return putStore(ASSET_STORE, asset);
}

export async function listStudyAssets(noteId: string) {
  const db = await openDb();
  const assets = await requestResult(
    db.transaction(ASSET_STORE, "readonly").objectStore(ASSET_STORE).index("noteId").getAll(noteId) as IDBRequest<StudyAsset[]>,
  );
  db.close();
  return assets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteStudyAsset(id: string) {
  return deleteStore(ASSET_STORE, id);
}

export async function listStudyBooks() {
  const books = await listStore<StudyBook>(BOOK_STORE);
  return books.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveStudyBook(book: StudyBook) {
  return putStore(BOOK_STORE, book);
}

export async function deleteStudyBook(id: string) {
  return deleteStore(BOOK_STORE, id);
}

export async function listStudySemesters() {
  const semesters = await listStore<StudySemester>(SEMESTER_STORE);
  return semesters.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export async function saveStudySemester(semester: StudySemester) {
  return putStore(SEMESTER_STORE, semester);
}

export async function deleteStudySemester(id: string) {
  return deleteStore(SEMESTER_STORE, id);
}

export async function listStudySubjects() {
  const subjects = await listStore<StudySubject>(SUBJECT_STORE);
  return subjects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveStudySubject(subject: StudySubject) {
  return putStore(SUBJECT_STORE, subject);
}

export async function deleteStudySubject(id: string) {
  const db = await openDb();
  const tx = db.transaction([SUBJECT_STORE, TASK_STORE, FLASHCARD_STORE], "readwrite");
  tx.objectStore(SUBJECT_STORE).delete(id);
  const taskKeys = await requestResult(tx.objectStore(TASK_STORE).index("subjectId").getAllKeys(id));
  taskKeys.forEach((key) => tx.objectStore(TASK_STORE).delete(key));
  const cardKeys = await requestResult(tx.objectStore(FLASHCARD_STORE).index("subjectId").getAllKeys(id));
  cardKeys.forEach((key) => tx.objectStore(FLASHCARD_STORE).delete(key));
  await transactionDone(tx);
  db.close();
}

export async function listStudyTasks() {
  const tasks = await listStore<StudyTask>(TASK_STORE);
  const rank: Record<StudyTask["status"], number> = { in_progress: 0, todo: 1, done: 2 };
  return tasks.sort((a, b) => {
    if (a.status !== b.status) return rank[a.status] - rank[b.status];
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function saveStudyTask(task: StudyTask) {
  return putStore(TASK_STORE, task);
}

export async function deleteStudyTask(id: string) {
  return deleteStore(TASK_STORE, id);
}

export async function listStudyWorkLogs() {
  const logs = await listStore<StudyWorkLog>(WORK_LOG_STORE);
  return logs.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function saveStudyWorkLog(log: StudyWorkLog) {
  let next = log;
  if (!next.projectId && next.projectName.trim()) {
    const projects = await listStudyProjects();
    const match = projects.find((project) => project.name.trim().toLowerCase() === next.projectName.trim().toLowerCase());
    if (match) next = { ...next, projectId: match.id, projectName: match.name };
  }
  return putStore(WORK_LOG_STORE, next);
}

export async function deleteStudyWorkLog(id: string) {
  const db = await openDb();
  const tx = db.transaction([WORK_LOG_STORE, WORK_LOG_ASSET_STORE], "readwrite");
  tx.objectStore(WORK_LOG_STORE).delete(id);
  const assetKeys = await requestResult(tx.objectStore(WORK_LOG_ASSET_STORE).index("logId").getAllKeys(id));
  assetKeys.forEach((key) => tx.objectStore(WORK_LOG_ASSET_STORE).delete(key));
  await transactionDone(tx);
  db.close();
}

export async function saveStudyWorkLogAsset(asset: StudyWorkLogAsset) {
  return putStore(WORK_LOG_ASSET_STORE, asset);
}

export async function listStudyWorkLogAssets(logId: string) {
  const db = await openDb();
  const assets = await requestResult(
    db.transaction(WORK_LOG_ASSET_STORE, "readonly").objectStore(WORK_LOG_ASSET_STORE).index("logId").getAll(logId) as IDBRequest<StudyWorkLogAsset[]>,
  );
  db.close();
  return assets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteStudyWorkLogAsset(id: string) {
  return deleteStore(WORK_LOG_ASSET_STORE, id);
}

export async function listStudyFlashcards() {
  const cards = await listStore<StudyFlashcard>(FLASHCARD_STORE);
  return cards.sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
}

export async function saveStudyFlashcard(card: StudyFlashcard) {
  return putStore(FLASHCARD_STORE, card);
}

export async function deleteStudyFlashcard(id: string) {
  return deleteStore(FLASHCARD_STORE, id);
}

export function scheduleFlashcard(card: StudyFlashcard, rating: "again" | "hard" | "good" | "easy") {
  const now = new Date();
  const masteryDelta = { again: -18, hard: 3, good: 10, easy: 18 }[rating];
  const days = { again: 0, hard: 1, good: Math.max(2, Math.round(2 + card.mastery / 20)), easy: Math.max(4, Math.round(5 + card.mastery / 12)) }[rating];
  const next = new Date(now);
  if (rating === "again") next.setMinutes(next.getMinutes() + 10);
  else next.setDate(next.getDate() + days);
  return {
    ...card,
    mastery: Math.max(0, Math.min(100, card.mastery + masteryDelta)),
    nextReviewAt: next.toISOString(),
    updatedAt: now.toISOString(),
  } satisfies StudyFlashcard;
}

type BackupBlob = {
  __speaklyBlob: true;
  type: string;
  base64: string;
};

export type StudyBackup = {
  format: "speakly-full-backup";
  version: 1;
  exportedAt: string;
  stores: {
    notes: StudyNote[];
    assets: Array<Omit<StudyAsset, "blob"> & { blob: BackupBlob }>;
    books: Array<Omit<StudyBook, "blob"> & { blob: BackupBlob }>;
    semesters: StudySemester[];
    subjects: StudySubject[];
    tasks: StudyTask[];
    flashcards: StudyFlashcard[];
    workLogs: StudyWorkLog[];
    workLogAssets: Array<Omit<StudyWorkLogAsset, "blob"> & { blob: BackupBlob }>;
    projects: StudyProject[];
  };
};

async function blobToBackup(blob: Blob): Promise<BackupBlob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)));
  }
  return { __speaklyBlob: true, type: blob.type, base64: btoa(binary) };
}

function backupToBlob(value: BackupBlob) {
  const binary = atob(value.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: value.type || "application/octet-stream" });
}

export async function exportStudyBackup(): Promise<StudyBackup> {
  const [notes, assets, books, semesters, subjects, tasks, flashcards, workLogs, workLogAssets, projects] = await Promise.all([
    listStore<StudyNote>(NOTE_STORE),
    listStore<StudyAsset>(ASSET_STORE),
    listStore<StudyBook>(BOOK_STORE),
    listStore<StudySemester>(SEMESTER_STORE),
    listStore<StudySubject>(SUBJECT_STORE),
    listStore<StudyTask>(TASK_STORE),
    listStore<StudyFlashcard>(FLASHCARD_STORE),
    listStore<StudyWorkLog>(WORK_LOG_STORE),
    listStore<StudyWorkLogAsset>(WORK_LOG_ASSET_STORE),
    listStore<StudyProject>(PROJECT_STORE),
  ]);

  return {
    format: "speakly-full-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    stores: {
      notes,
      assets: await Promise.all(assets.map(async ({ blob, ...asset }) => ({ ...asset, blob: await blobToBackup(blob) }))),
      books: await Promise.all(books.map(async ({ blob, ...book }) => ({ ...book, blob: await blobToBackup(blob) }))),
      semesters,
      subjects,
      tasks,
      flashcards,
      workLogs,
      workLogAssets: await Promise.all(workLogAssets.map(async ({ blob, ...asset }) => ({ ...asset, blob: await blobToBackup(blob) }))),
      projects,
    },
  };
}

export async function importStudyBackup(backup: StudyBackup, options: { replace?: boolean } = {}) {
  if (!backup || backup.format !== "speakly-full-backup" || backup.version !== 1 || !backup.stores) {
    throw new Error("This is not a supported Speakly full backup.");
  }

  const db = await openDb();
  if (options.replace) {
    const clearTx = db.transaction([...ALL_STORES], "readwrite");
    ALL_STORES.forEach((store) => clearTx.objectStore(store).clear());
    await transactionDone(clearTx);
  }

  const tx = db.transaction([...ALL_STORES], "readwrite");
  backup.stores.notes.forEach((item) => tx.objectStore(NOTE_STORE).put(item));
  backup.stores.assets.forEach((item) => tx.objectStore(ASSET_STORE).put({ ...item, blob: backupToBlob(item.blob) }));
  backup.stores.books.forEach((item) => tx.objectStore(BOOK_STORE).put({ ...item, blob: backupToBlob(item.blob) }));
  backup.stores.semesters.forEach((item) => tx.objectStore(SEMESTER_STORE).put(item));
  backup.stores.subjects.forEach((item) => tx.objectStore(SUBJECT_STORE).put(item));
  backup.stores.tasks.forEach((item) => tx.objectStore(TASK_STORE).put(item));
  backup.stores.flashcards.forEach((item) => tx.objectStore(FLASHCARD_STORE).put(item));
  backup.stores.workLogs.forEach((item) => tx.objectStore(WORK_LOG_STORE).put(item));
  backup.stores.workLogAssets.forEach((item) => tx.objectStore(WORK_LOG_ASSET_STORE).put({ ...item, blob: backupToBlob(item.blob) }));
  backup.stores.projects.forEach((item) => tx.objectStore(PROJECT_STORE).put(item));
  await transactionDone(tx);
  db.close();
}
