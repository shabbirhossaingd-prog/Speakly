"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CloudUpload,
  Download,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, type ApiError } from "@/lib/client-api";
import {
  deleteStudyBook,
  deleteStudySemester,
  listStudyBooks,
  listStudySemesters,
  saveStudyBook,
  saveStudySemester,
  type StudyBook,
  type StudyLibraryResourceType,
  type StudySemester,
} from "@/lib/local-study-db";
import {
  deleteLibraryFolderTree,
  getFolderDescendantIds,
  listLibraryFileLocations,
  listLibraryFolders,
  removeLibraryFileLocation,
  saveLibraryFolder,
  setLibraryFileFolder,
  type LibraryFolder,
} from "@/lib/library-file-manager";
import { extractPdfText, type ExtractedPdf } from "@/lib/pdf-client";

type StudyResult = {
  mode: "gemini";
  action: string;
  title: string;
  content?: string;
  answer?: string;
  summary?: string;
  vocabulary?: { word: string; meaning: string; example: string }[];
  speakingTasks?: string[];
  writingTasks?: string[];
  quiz?: { question: string; options: string[]; answer: string; explanation: string }[];
};

type ProcessResponse = {
  status: "complete";
  provider: string;
  sourceTruncated: boolean;
  result: StudyResult;
};

type LibraryBook = StudyBook & {
  backendId?: string;
  url: string;
  backendStatus?: "device" | "stored";
  extraction?: ExtractedPdf;
  busyMode?: string;
  results: Record<string, StudyResult>;
};

type UploadDraft = {
  files: File[];
  semesterId: string | null;
  folderId: string | null;
  subject: string;
  resourceType: StudyLibraryResourceType;
  academicYear: string;
  examType: string;
};

type EditDraft = {
  id: string;
  name: string;
  semesterId: string | null;
  folderId: string | null;
  subject: string;
  resourceType: StudyLibraryResourceType;
  academicYear: string;
  examType: string;
};

type ContextMenuState = {
  x: number;
  y: number;
  folderId: string | null;
} | null;

type DroppedFile = {
  file: File;
  folderParts: string[];
};

type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (callback: (file: File) => void, error?: (error: DOMException) => void) => void;
  createReader?: () => {
    readEntries: (callback: (entries: FileSystemEntryLike[]) => void, error?: (error: DOMException) => void) => void;
  };
};

const actions = [
  { title: "Easy English", desc: "Clear English without making it childish", icon: WandSparkles },
  { title: "Academic English", desc: "Polished university-ready version", icon: Sparkles },
  { title: "Ask My Book", desc: "Questions grounded in this PDF", icon: MessageSquareText },
  { title: "Practice", desc: "Vocabulary, writing, quiz & speaking", icon: BookOpen },
];

const resourceLabels: Record<StudyLibraryResourceType, string> = {
  book: "Book",
  lecture_sheet: "Lecture Sheet",
  class_note: "Class Note",
  slide: "Slides",
  lab_sheet: "Lab Sheet",
  assignment: "Assignment",
  question_paper: "Question Paper",
  research_paper: "Research Paper",
  other: "Other",
};

const resourceTypes = Object.entries(resourceLabels) as [StudyLibraryResourceType, string][];
const directoryInputProps = { webkitdirectory: "", directory: "" } as InputHTMLAttributes<HTMLInputElement>;

function nowIso() {
  return new Date().toISOString();
}

function formatSize(bytes: number) {
  if (!bytes) return "0 KB";
  return bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

function semesterDefaults(): StudySemester[] {
  const now = nowIso();
  return Array.from({ length: 8 }, (_, index) => ({
    id: crypto.randomUUID(),
    name: `Semester ${index + 1}`,
    order: index + 1,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }));
}

function normalizeBook(book: StudyBook): StudyBook {
  return {
    ...book,
    semesterId: book.semesterId ?? null,
    subject: book.subject || "General",
    resourceType: book.resourceType || "book",
    academicYear: book.academicYear || "",
    examType: book.examType || "",
    tags: book.tags || [],
  };
}

function isPdf(book: Pick<StudyBook, "type" | "name">) {
  return book.type === "application/pdf" || book.name.toLowerCase().endsWith(".pdf");
}

function fileKind(book: Pick<StudyBook, "type" | "name">) {
  const ext = book.name.includes(".") ? book.name.split(".").pop()?.toUpperCase() : "FILE";
  return ext || (book.type ? book.type.split("/").pop()?.toUpperCase() : "FILE") || "FILE";
}

function inferResourceType(file: File): StudyLibraryResourceType {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ppt") || name.endsWith(".pptx")) return "slide";
  if (name.endsWith(".pdf")) return "book";
  if (name.includes("assignment")) return "assignment";
  if (name.includes("question") || name.includes("midterm") || name.includes("final")) return "question_paper";
  return "other";
}

function studyResultToText(result: StudyResult) {
  const parts: string[] = [result.title];
  if (result.content) parts.push(result.content);
  if (result.answer) parts.push(`Answer\n${result.answer}`);
  if (result.summary) parts.push(`Summary\n${result.summary}`);
  if (result.vocabulary?.length) parts.push(`Vocabulary\n${result.vocabulary.map((item, index) => `${index + 1}. ${item.word} — ${item.meaning}\nExample: ${item.example}`).join("\n\n")}`);
  if (result.speakingTasks?.length) parts.push(`Speaking Tasks\n${result.speakingTasks.map((item, index) => `${index + 1}. ${item}`).join("\n")}`);
  if (result.writingTasks?.length) parts.push(`Writing Tasks\n${result.writingTasks.map((item, index) => `${index + 1}. ${item}`).join("\n")}`);
  if (result.quiz?.length) parts.push(`Quiz\n${result.quiz.map((item, index) => `${index + 1}. ${item.question}\n${item.options.map((option) => `• ${option}`).join("\n")}\nAnswer: ${item.answer}\nWhy: ${item.explanation}`).join("\n\n")}`);
  return parts.join("\n\n");
}

async function downloadStudyPdf(bookName: string, label: string, result: StudyResult) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = 210 - margin * 2;
  const pageHeight = 285;
  let y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  const titleLines = doc.splitTextToSize(result.title || label, pageWidth) as string[];
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  for (const paragraph of studyResultToText(result).split("\n")) {
    if (!paragraph.trim()) { y += 3; continue; }
    const lines = doc.splitTextToSize(paragraph, pageWidth) as string[];
    for (const line of lines) {
      if (y > pageHeight) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5.2;
    }
  }
  const base = bookName.replace(/\.pdf$/i, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "speakly-resource";
  const suffix = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`${base}-${suffix}.pdf`);
}

function ResultPreview({ result }: { result: StudyResult }) {
  return <div className="muted-surface mt-4 rounded-2xl p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{result.action} ready</p><h4 className="mt-1 font-bold">{result.title}</h4></div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">Gemini Free</span></div>
    <div className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-6 text-muted">{result.answer || result.content || result.summary}</div>
  </div>;
}

function entryFile(entry: FileSystemEntryLike) {
  return new Promise<File>((resolve, reject) => {
    if (!entry.file) return reject(new Error("File entry is not readable."));
    entry.file(resolve, reject);
  });
}

function readDirectory(reader: NonNullable<ReturnType<NonNullable<FileSystemEntryLike["createReader"]>>>) {
  return new Promise<FileSystemEntryLike[]>((resolve, reject) => {
    const all: FileSystemEntryLike[] = [];
    const next = () => reader.readEntries((entries) => {
      if (!entries.length) return resolve(all);
      all.push(...entries);
      next();
    }, reject);
    next();
  });
}

async function collectEntry(entry: FileSystemEntryLike, parentParts: string[] = []): Promise<DroppedFile[]> {
  if (entry.isFile) return [{ file: await entryFile(entry), folderParts: parentParts }];
  if (!entry.isDirectory || !entry.createReader) return [];
  const children = await readDirectory(entry.createReader());
  const folderParts = [...parentParts, entry.name];
  const nested = await Promise.all(children.map((child) => collectEntry(child, folderParts)));
  return nested.flat();
}

export function BooksClient() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [semesters, setSemesters] = useState<StudySemester[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [fileLocations, setFileLocations] = useState<Record<string, string | null>>({});
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<StudyLibraryResourceType | "">("");
  const [message, setMessage] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [semesterDraft, setSemesterDraft] = useState("");
  const [uploadDraft, setUploadDraft] = useState<UploadDraft | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [dragActive, setDragActive] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  function refreshFolderMetadata() {
    setFolders(listLibraryFolders());
    setFileLocations(Object.fromEntries(listLibraryFileLocations().map((item) => [item.bookId, item.folderId])));
  }

  useEffect(() => {
    const urls: string[] = [];
    Promise.all([listStudyBooks(), listStudySemesters()]).then(async ([storedBooks, storedSemesters]) => {
      let semesterItems = storedSemesters;
      if (!semesterItems.length) {
        semesterItems = semesterDefaults();
        await Promise.all(semesterItems.map((semester) => saveStudySemester(semester)));
      }
      const firstSemester = semesterItems[0];
      const migrated = await Promise.all(storedBooks.map(async (stored) => {
        let book = normalizeBook(stored);
        if (!book.semesterId && firstSemester) {
          book = { ...book, semesterId: firstSemester.id, updatedAt: nowIso() };
          await saveStudyBook(book);
        }
        return book;
      }));
      setSemesters(semesterItems);
      setBooks(migrated.map((book) => {
        const url = URL.createObjectURL(book.blob);
        urls.push(url);
        return { ...book, url, backendStatus: "device" as const, results: {} };
      }));
      refreshFolderMetadata();
    }).catch(() => setMessage("Device library storage is unavailable in this browser."));
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const selectedSemester = semesters.find((semester) => semester.id === selectedSemesterId) || null;
  const currentFolder = folders.find((folder) => folder.id === currentFolderId) || null;

  const breadcrumb = useMemo(() => {
    const chain: LibraryFolder[] = [];
    let id = currentFolderId;
    while (id) {
      const folder = folders.find((item) => item.id === id);
      if (!folder) break;
      chain.unshift(folder);
      id = folder.parentId;
    }
    return chain;
  }, [currentFolderId, folders]);

  const childFolders = useMemo(() => {
    if (!selectedSemesterId) return [];
    return folders.filter((folder) => folder.semesterId === selectedSemesterId && folder.parentId === currentFolderId).sort((a, b) => a.name.localeCompare(b.name));
  }, [currentFolderId, folders, selectedSemesterId]);

  const visibleBooks = useMemo(() => {
    if (!selectedSemesterId) return [];
    const text = query.trim().toLowerCase();
    return books.filter((book) => {
      if (book.semesterId !== selectedSemesterId) return false;
      if ((fileLocations[book.id] ?? null) !== currentFolderId) return false;
      if (typeFilter && book.resourceType !== typeFilter) return false;
      if (!text) return true;
      return `${book.name} ${book.subject || ""} ${resourceLabels[book.resourceType || "book"]} ${book.academicYear || ""} ${book.examType || ""} ${fileKind(book)}`.toLowerCase().includes(text);
    });
  }, [books, currentFolderId, fileLocations, query, selectedSemesterId, typeFilter]);

  const totalSize = books.reduce((sum, book) => sum + book.size, 0);

  function patchBook(id: string, patch: Partial<LibraryBook>) {
    setBooks((current) => current.map((book) => book.id === id ? { ...book, ...patch } : book));
  }

  async function refreshSemesters() {
    setSemesters(await listStudySemesters());
  }

  async function protectStorage() {
    if (!navigator.storage?.persist) return setMessage("Persistent browser storage request is not supported here. Export important files as backup.");
    const granted = await navigator.storage.persist();
    setMessage(granted ? "Browser granted persistent storage for your semester library." : "Browser kept normal storage rules. Keep backups of important files.");
  }

  function createFolder(parentId = currentFolderId) {
    if (!selectedSemesterId) return;
    const name = window.prompt("New folder name")?.trim();
    if (!name) return;
    const duplicate = folders.some((folder) => folder.semesterId === selectedSemesterId && folder.parentId === parentId && folder.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return setMessage("A folder with this name already exists here.");
    const now = nowIso();
    saveLibraryFolder({ id: crypto.randomUUID(), semesterId: selectedSemesterId, parentId, name, createdAt: now, updatedAt: now });
    refreshFolderMetadata();
    setMessage(`${name} folder created.`);
  }

  function renameFolder(folder: LibraryFolder) {
    const name = window.prompt("Rename folder", folder.name)?.trim();
    if (!name || name === folder.name) return;
    saveLibraryFolder({ ...folder, name, updatedAt: nowIso() });
    refreshFolderMetadata();
  }

  function removeFolder(folder: LibraryFolder) {
    const deletedIds = getFolderDescendantIds(folder.id);
    const affected = Object.entries(fileLocations).filter(([, folderId]) => folderId && deletedIds.includes(folderId));
    const description = affected.length
      ? `Delete ${folder.name} and its subfolders? ${affected.length} file(s) will be moved to the parent folder, not deleted.`
      : `Delete ${folder.name}?`;
    if (!window.confirm(description)) return;
    for (const [bookId] of affected) setLibraryFileFolder(bookId, folder.parentId);
    deleteLibraryFolderTree(folder.id);
    refreshFolderMetadata();
    setMessage("Folder removed. Files were kept safely.");
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const inferred = files.length === 1 ? inferResourceType(files[0]) : "other";
    setUploadDraft({
      files,
      semesterId: selectedSemesterId,
      folderId: currentFolderId,
      subject: "",
      resourceType: inferred,
      academicYear: "",
      examType: "",
    });
  }

  async function saveFilesDirectly(items: DroppedFile[], semesterId: string, parentFolderId: string | null) {
    const created: LibraryBook[] = [];
    let knownFolders = listLibraryFolders();

    const ensurePath = (parts: string[]) => {
      let parentId = parentFolderId;
      for (const part of parts) {
        let folder = knownFolders.find((item) => item.semesterId === semesterId && item.parentId === parentId && item.name === part);
        if (!folder) {
          const now = nowIso();
          folder = { id: crypto.randomUUID(), semesterId, parentId, name: part, createdAt: now, updatedAt: now };
          saveLibraryFolder(folder);
          knownFolders = [...knownFolders, folder];
        }
        parentId = folder.id;
      }
      return parentId;
    };

    for (const item of items) {
      const folderId = ensurePath(item.folderParts);
      const file = item.file;
      const id = crypto.randomUUID();
      const now = nowIso();
      const stored: StudyBook = {
        id,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        blob: file,
        semesterId,
        subject: "General",
        resourceType: inferResourceType(file),
        academicYear: "",
        examType: "",
        tags: [],
        createdAt: now,
        updatedAt: now,
      };
      await saveStudyBook(stored);
      setLibraryFileFolder(id, folderId);
      created.push({ ...stored, url: URL.createObjectURL(file), backendStatus: "device", results: {} });
    }

    setBooks((current) => [...created, ...current]);
    refreshFolderMetadata();
    setMessage(`${created.length} file${created.length === 1 ? "" : "s"} added. Folder structure was preserved.`);
  }

  async function chooseFolderFiles(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedSemesterId) return;
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const items = files.map((file) => {
      const parts = file.webkitRelativePath ? file.webkitRelativePath.split("/").filter(Boolean) : [];
      return { file, folderParts: parts.slice(0, -1) };
    });
    await saveFilesDirectly(items, selectedSemesterId, currentFolderId);
  }

  async function handleDrop(event: DragEvent<HTMLElement>, targetFolderId: string | null = currentFolderId) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    setContextMenu(null);
    if (!selectedSemesterId) return;

    const internalFileId = event.dataTransfer.getData("application/x-speakly-file");
    if (internalFileId) {
      setLibraryFileFolder(internalFileId, targetFolderId);
      refreshFolderMetadata();
      setMessage("File moved.");
      return;
    }

    const entries: FileSystemEntryLike[] = [];
    for (const item of Array.from(event.dataTransfer.items || [])) {
      const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntryLike | null }).webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    let dropped: DroppedFile[] = [];
    if (entries.length) {
      dropped = (await Promise.all(entries.map((entry) => collectEntry(entry)))).flat();
    } else {
      dropped = Array.from(event.dataTransfer.files || []).map((file) => ({ file, folderParts: [] }));
    }
    if (dropped.length) await saveFilesDirectly(dropped, selectedSemesterId, targetFolderId);
  }

  async function saveUpload() {
    if (!uploadDraft?.semesterId) return setMessage("Choose a semester before saving files.");
    const created: LibraryBook[] = [];
    for (const file of uploadDraft.files) {
      const id = crypto.randomUUID();
      const now = nowIso();
      const stored: StudyBook = {
        id,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        blob: file,
        semesterId: uploadDraft.semesterId,
        subject: uploadDraft.subject.trim() || "General",
        resourceType: uploadDraft.resourceType,
        academicYear: uploadDraft.academicYear.trim(),
        examType: uploadDraft.examType.trim(),
        tags: [],
        createdAt: now,
        updatedAt: now,
      };
      await saveStudyBook(stored);
      setLibraryFileFolder(id, uploadDraft.folderId);
      created.push({ ...stored, url: URL.createObjectURL(file), backendStatus: "device", results: {} });
    }
    setBooks((current) => [...created, ...current]);
    setSelectedSemesterId(uploadDraft.semesterId);
    setCurrentFolderId(uploadDraft.folderId);
    setUploadDraft(null);
    refreshFolderMetadata();
    setMessage(`${created.length} file${created.length === 1 ? "" : "s"} saved. No automatic folder was created.`);
  }

  async function backup(book: LibraryBook) {
    if (!isPdf(book)) return setMessage("Cloud backup currently supports PDF resources only. This file remains stored on your device.");
    const form = new FormData();
    form.append("file", new File([book.blob], book.name, { type: "application/pdf" }));
    try {
      const result = await api<{ status: string; book?: { id: string } }>("/api/books", { method: "POST", body: form });
      patchBook(book.id, { backendStatus: "stored", backendId: result.book?.id });
      setMessage("Private cloud backup created. Device copy remains primary.");
    } catch (error) {
      const apiError = error as ApiError;
      const data = apiError.data as { message?: string } | undefined;
      setMessage(data?.message || "Cloud backup is not configured. Your device copy is still available.");
    }
  }

  async function processBook(book: LibraryBook, mode: string) {
    if (!isPdf(book)) return setMessage("Study AI currently reads PDF resources. You can still store, open and download this file.");
    let question: string | undefined;
    if (mode === "Ask My Book") {
      const answer = window.prompt("What do you want to ask this resource?");
      if (!answer?.trim()) return;
      question = answer.trim();
    }
    patchBook(book.id, { busyMode: mode });
    setMessage(book.extraction ? `${mode} is being prepared…` : "Reading text from the PDF on your device…");
    try {
      const extraction = book.extraction || (await extractPdfText(book.blob));
      if (!book.extraction) patchBook(book.id, { extraction });
      if (extraction.text.trim().length < 80) throw new Error("No readable text found. This may be a scanned/image-only PDF; OCR support can be added later.");
      const response = await api<ProcessResponse>("/api/books/process", { method: "POST", body: JSON.stringify({ bookId: book.backendId || book.id, mode, name: book.name, question, extractedText: extraction.text, pages: extraction.pages }) });
      setBooks((current) => current.map((item) => item.id === book.id ? { ...item, busyMode: undefined, extraction, results: { ...item.results, [mode]: response.result } } : item));
      setMessage(extraction.truncated || response.sourceTruncated ? `${mode} is ready. A large-document limit was applied.` : `${mode} is ready.`);
    } catch (error) {
      patchBook(book.id, { busyMode: undefined });
      const apiError = error as ApiError;
      const data = apiError.data as { message?: string; error?: string } | undefined;
      setMessage(data?.message || data?.error || (error instanceof Error ? error.message : "Could not process this PDF."));
    }
  }

  async function removeBook(book: LibraryBook) {
    if (!window.confirm(`Delete ${book.name} from this device?`)) return;
    await deleteStudyBook(book.id);
    removeLibraryFileLocation(book.id);
    URL.revokeObjectURL(book.url);
    setBooks((current) => current.filter((item) => item.id !== book.id));
    if (expandedBookId === book.id) setExpandedBookId(null);
    refreshFolderMetadata();
    setMessage("Resource removed from this device.");
  }

  function openEdit(book: LibraryBook) {
    setEditDraft({
      id: book.id,
      name: book.name,
      semesterId: book.semesterId || null,
      folderId: fileLocations[book.id] ?? null,
      subject: book.subject || "General",
      resourceType: book.resourceType || "book",
      academicYear: book.academicYear || "",
      examType: book.examType || "",
    });
  }

  async function saveEdit() {
    if (!editDraft?.semesterId) return setMessage("Every library file needs a semester.");
    const book = books.find((item) => item.id === editDraft.id);
    if (!book) return;
    const updated: StudyBook = {
      id: book.id,
      name: editDraft.name.trim() || book.name,
      size: book.size,
      type: book.type,
      blob: book.blob,
      semesterId: editDraft.semesterId,
      subject: editDraft.subject.trim() || "General",
      resourceType: editDraft.resourceType,
      academicYear: editDraft.academicYear.trim(),
      examType: editDraft.examType.trim(),
      tags: book.tags || [],
      createdAt: book.createdAt,
      updatedAt: nowIso(),
    };
    await saveStudyBook(updated);
    setLibraryFileFolder(book.id, editDraft.folderId);
    patchBook(book.id, updated);
    setEditDraft(null);
    refreshFolderMetadata();
    setMessage("Library file updated.");
  }

  async function addSemester() {
    if (!semesterDraft.trim()) return;
    const now = nowIso();
    const semester: StudySemester = {
      id: crypto.randomUUID(),
      name: semesterDraft.trim(),
      order: (Math.max(0, ...semesters.map((item) => item.order)) || 0) + 1,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    await saveStudySemester(semester);
    setSemesterDraft("");
    await refreshSemesters();
  }

  async function renameSemester(semester: StudySemester) {
    const name = window.prompt("Semester name", semester.name)?.trim();
    if (!name || name === semester.name) return;
    await saveStudySemester({ ...semester, name, updatedAt: nowIso() });
    await refreshSemesters();
  }

  async function removeSemester(semester: StudySemester) {
    const affected = books.filter((book) => book.semesterId === semester.id);
    const alternatives = semesters.filter((item) => item.id !== semester.id);
    if (affected.length && !alternatives.length) return setMessage("Move or delete the files first. The last semester cannot be removed while it contains files.");
    const target = alternatives[0];
    const messageText = affected.length ? `${semester.name} has ${affected.length} file(s). Remove this semester and move them to ${target.name}?` : `Delete ${semester.name}?`;
    if (!window.confirm(messageText)) return;
    if (affected.length && target) {
      const updatedAt = nowIso();
      await Promise.all(affected.map((book) => saveStudyBook({ ...book, semesterId: target.id, updatedAt })));
      setBooks((items) => items.map((book) => book.semesterId === semester.id ? { ...book, semesterId: target.id, updatedAt } : book));
      for (const book of affected) setLibraryFileFolder(book.id, null);
    }
    for (const folder of folders.filter((item) => item.semesterId === semester.id && !item.parentId)) deleteLibraryFolderTree(folder.id);
    await deleteStudySemester(semester.id);
    await refreshSemesters();
    refreshFolderMetadata();
    if (selectedSemesterId === semester.id) { setSelectedSemesterId(null); setCurrentFolderId(null); }
  }

  const semesterStats = (semesterId: string) => {
    const items = books.filter((book) => book.semesterId === semesterId);
    const folderCount = folders.filter((folder) => folder.semesterId === semesterId).length;
    return { count: items.length, folderCount, size: items.reduce((sum, item) => sum + item.size, 0) };
  };

  const folderDirectStats = (folderId: string) => {
    const files = books.filter((book) => (fileLocations[book.id] ?? null) === folderId);
    const subfolders = folders.filter((folder) => folder.parentId === folderId).length;
    return { files: files.length, subfolders, size: files.reduce((sum, item) => sum + item.size, 0) };
  };

  function showContextMenu(event: ReactMouseEvent, folderId: string | null) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: Math.min(event.clientX, window.innerWidth - 210), y: Math.min(event.clientY, window.innerHeight - 190), folderId });
  }

  return <AppShell subtitle="Device-first Semester Library" title="My Library">
    <section className="card p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-bold text-violet-600">SEMESTER → FOLDER → FILE</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">Your semester file library.</h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">Create folders yourself, drag files or whole folders from your computer, and keep PDFs, slides, sheets, code references and documents exactly where you want them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={protectStorage} className="button-secondary px-3 py-2"><ShieldCheck size={16}/>Protect</button>
          <button onClick={() => setSettingsOpen(true)} className="button-secondary px-3 py-2"><Settings2 size={16}/>Settings</button>
          <button onClick={() => input.current?.click()} className="button-primary px-3 py-2"><Upload size={16}/>Add file</button>
          <input ref={input} hidden type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.webp,.zip,.rar,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.sql,.json" onChange={chooseFiles}/>
          <input ref={folderInput} hidden type="file" multiple {...directoryInputProps} onChange={chooseFolderFiles}/>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-xs text-muted" style={{ borderColor: "rgb(var(--border))" }}>
        <span><strong className="text-foreground">{books.length}</strong> files</span>
        <span><strong className="text-foreground">{semesters.length}</strong> semesters</span>
        <span><strong className="text-foreground">{formatSize(totalSize)}</strong> on device</span>
        <span className="inline-flex items-center gap-1.5"><LockKeyhole size={13} className="text-violet-600"/>Device-local by default</span>
      </div>
      {message && <div className="muted-surface mt-3 flex items-center justify-between gap-3 rounded-xl p-3 text-sm"><span>{message}</span><button onClick={() => setMessage("")}><X size={14}/></button></div>}
    </section>

    {!selectedSemester ? <section className="mt-5">
      <div className="mb-3"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">SEMESTERS</p><h3 className="mt-1 text-lg font-bold">Open a folder</h3></div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {semesters.map((semester) => {
          const stats = semesterStats(semester.id);
          return <button key={semester.id} onClick={() => { setSelectedSemesterId(semester.id); setCurrentFolderId(null); setQuery(""); setTypeFilter(""); }} className="card min-h-[105px] p-3 text-left transition hover:-translate-y-0.5 hover:ring-2 hover:ring-violet-500">
            <div className="flex items-center justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Folder size={18}/></span><span className="text-[10px] font-semibold text-muted">{formatSize(stats.size)}</span></div>
            <h4 className="mt-3 truncate text-sm font-bold">{semester.name}</h4><p className="mt-1 truncate text-[11px] text-muted">{stats.folderCount} folders · {stats.count} files</p>
          </button>;
        })}
        <button onClick={() => setSettingsOpen(true)} className="min-h-[105px] rounded-2xl border border-dashed p-3 text-left text-muted transition hover:border-violet-500 hover:text-violet-600" style={{ borderColor: "rgb(var(--border))" }}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Plus size={18}/></span><p className="mt-3 text-sm font-bold">Add semester</p></button>
      </div>
    </section> : <>
      <section className="card mt-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex items-center gap-3">
            <button onClick={() => { if (currentFolder) setCurrentFolderId(currentFolder.parentId); else setSelectedSemesterId(null); setQuery(""); setExpandedBookId(null); }} className="muted-surface rounded-xl p-2.5" aria-label="Back"><ArrowLeft size={17}/></button>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white"><FolderOpen size={20}/></span>
            <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">OPEN FOLDER</p><div className="flex min-w-0 items-center gap-1 text-lg font-black"><button onClick={() => setCurrentFolderId(null)} className="truncate hover:text-violet-600">{selectedSemester.name}</button>{breadcrumb.map((folder) => <span key={folder.id} className="flex min-w-0 items-center gap-1"><ChevronRight size={14} className="shrink-0 text-muted"/><button onClick={() => setCurrentFolderId(folder.id)} className="truncate hover:text-violet-600">{folder.name}</button></span>)}</div></div>
          </div>
          <div className="flex flex-1 flex-wrap gap-2 lg:max-w-3xl lg:justify-end">
            <div className="relative min-w-[180px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="muted-surface h-10 w-full rounded-xl pl-9 pr-3 text-sm outline-none" placeholder="Search this folder..."/></div>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as StudyLibraryResourceType | "")} className="muted-surface h-10 rounded-xl px-3 text-sm outline-none"><option value="">All types</option>{resourceTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
            <button onClick={() => createFolder()} className="button-secondary px-3 py-2"><FolderPlus size={15}/>New folder</button>
            <button onClick={() => input.current?.click()} className="button-primary px-3 py-2"><FilePlus2 size={15}/>Add file</button>
          </div>
        </div>
      </section>

      <section
        className={`card relative mt-4 min-h-[390px] p-4 transition ${dragActive ? "ring-2 ring-violet-500 bg-violet-500/5" : ""}`}
        onContextMenu={(event) => showContextMenu(event, currentFolderId)}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false); }}
        onDrop={(event) => handleDrop(event)}
      >
        {dragActive && <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-violet-500 bg-violet-500/10 backdrop-blur-sm"><div className="text-center"><Upload className="mx-auto text-violet-600"/><p className="mt-2 font-bold">Drop files or folders here</p><p className="mt-1 text-xs text-muted">Folder structure will be preserved.</p></div></div>}

        {(childFolders.length > 0 || visibleBooks.length > 0) && <div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-muted">Drag files into a folder to move them. Right-click empty space for folder options.</p><button onClick={() => folderInput.current?.click()} className="text-xs font-bold text-violet-600">Upload folder</button></div>}

        {childFolders.length > 0 && <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {childFolders.map((folder) => {
            const stats = folderDirectStats(folder.id);
            return <button
              key={folder.id}
              onClick={() => { setCurrentFolderId(folder.id); setQuery(""); }}
              onContextMenu={(event) => showContextMenu(event, folder.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, folder.id)}
              className="muted-surface min-h-[100px] rounded-2xl p-3 text-left transition hover:ring-2 hover:ring-violet-500"
            >
              <div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Folder size={18}/></span><span className="text-[9px] font-semibold text-muted">{formatSize(stats.size)}</span></div>
              <p className="mt-3 truncate text-sm font-bold">{folder.name}</p><p className="mt-1 text-[10px] text-muted">{stats.subfolders} folders · {stats.files} files</p>
            </button>;
          })}
        </div>}

        {visibleBooks.length > 0 && <div className={`space-y-2 ${childFolders.length ? "mt-4 border-t pt-4" : ""}`} style={{ borderColor: "rgb(var(--border))" }}>
          {visibleBooks.map((book) => <article
            key={book.id}
            draggable
            onDragStart={(event) => { event.dataTransfer.setData("application/x-speakly-file", book.id); event.dataTransfer.effectAllowed = "move"; }}
            className="muted-surface rounded-2xl p-3"
          >
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><FileText size={17}/></span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="max-w-full truncate text-sm font-bold">{book.name}</h4><span className="surface rounded-md px-1.5 py-0.5 text-[9px] font-black text-muted">{fileKind(book)}</span></div><p className="mt-1 text-[11px] text-muted">{resourceLabels[book.resourceType || "other"]} · {formatSize(book.size)}{book.subject && book.subject !== "General" ? ` · ${book.subject}` : ""}{book.backendStatus === "stored" ? " · backed up" : " · on device"}</p></div>
              <div className="flex flex-wrap gap-1.5"><a href={book.url} target="_blank" rel="noreferrer" className="button-secondary px-2.5 py-2"><BookOpen size={13}/>Open</a><a href={book.url} download={book.name} className="button-secondary px-2.5 py-2"><Download size={13}/>Download</a>{isPdf(book) && <button onClick={() => setExpandedBookId((id) => id === book.id ? null : book.id)} className="button-secondary px-2.5 py-2">Study <ChevronDown size={13}/></button>}<button onClick={() => openEdit(book)} className="button-secondary px-2.5 py-2" aria-label="Edit file"><MoreHorizontal size={14}/></button></div>
            </div>
            {expandedBookId === book.id && isPdf(book) && <div className="surface mt-3 rounded-2xl p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{actions.map(({ title, desc, icon: Icon }) => { const busy = book.busyMode === title; return <button key={title} disabled={Boolean(book.busyMode)} onClick={() => processBook(book, title)} className="muted-surface rounded-xl p-3 text-left disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin text-violet-600"/> : <Icon size={16} className="text-violet-600"/>}<p className="mt-2 text-sm font-semibold">{busy ? "Working…" : title}</p><p className="mt-1 text-[11px] leading-4 text-muted">{desc}</p></button>; })}</div>
              {Object.values(book.results).map((result) => <ResultPreview key={result.action} result={result}/>)}
              <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => backup(book)} className="button-secondary px-3 py-2"><CloudUpload size={14}/>Back up</button>{book.results["Easy English"] && <button onClick={() => downloadStudyPdf(book.name, "Easy English", book.results["Easy English"])} className="button-secondary px-3 py-2"><Download size={14}/>Easy PDF</button>}{book.results["Academic English"] && <button onClick={() => downloadStudyPdf(book.name, "Academic English", book.results["Academic English"])} className="button-secondary px-3 py-2"><Download size={14}/>Academic PDF</button>}{book.results.Practice && <button onClick={() => downloadStudyPdf(book.name, "Practice", book.results.Practice)} className="button-secondary px-3 py-2"><Download size={14}/>Practice PDF</button>}<button onClick={() => removeBook(book)} className="button-secondary ml-auto px-3 py-2 text-red-600"><Trash2 size={14}/>Delete</button></div>
            </div>}
          </article>)}
        </div>}

        {childFolders.length === 0 && visibleBooks.length === 0 && <div className="flex min-h-[330px] items-center justify-center text-center"><div><FolderOpen className="mx-auto text-violet-600" size={32}/><h3 className="mt-3 font-bold">This folder is empty</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted">Drag files or an entire folder here, right-click to create a folder, or use the buttons below.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button onClick={() => createFolder()} className="button-secondary"><FolderPlus size={16}/>New folder</button><button onClick={() => input.current?.click()} className="button-primary"><FilePlus2 size={16}/>Add files</button><button onClick={() => folderInput.current?.click()} className="button-secondary"><Upload size={16}/>Upload folder</button></div></div></div>}
      </section>
    </>}

    {contextMenu && <div className="surface fixed z-[110] w-48 rounded-2xl border p-1.5 shadow-2xl" style={{ left: contextMenu.x, top: contextMenu.y, borderColor: "rgb(var(--border))" }} onClick={(event) => event.stopPropagation()}>
      <button onClick={() => { createFolder(contextMenu.folderId); setContextMenu(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-violet-500/10"><FolderPlus size={15}/>New folder</button>
      <button onClick={() => { setCurrentFolderId(contextMenu.folderId); input.current?.click(); setContextMenu(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-violet-500/10"><FilePlus2 size={15}/>Upload files</button>
      <button onClick={() => { setCurrentFolderId(contextMenu.folderId); folderInput.current?.click(); setContextMenu(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-violet-500/10"><Upload size={15}/>Upload folder</button>
      {contextMenu.folderId && (() => { const folder = folders.find((item) => item.id === contextMenu.folderId); return folder ? <><div className="my-1 border-t" style={{ borderColor: "rgb(var(--border))" }}/><button onClick={() => { renameFolder(folder); setContextMenu(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-violet-500/10"><Pencil size={15}/>Rename</button><button onClick={() => { removeFolder(folder); setContextMenu(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10"><Trash2 size={15}/>Delete folder</button></> : null; })()}
    </div>}

    {uploadDraft && <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/45 p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setUploadDraft(null)}><div className="surface mx-auto max-w-2xl rounded-3xl p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-violet-600">ADD FILES</p><h2 className="mt-1 text-2xl font-black">Save without auto folders</h2><p className="mt-1 text-sm text-muted">Files go directly into the current manual folder. Subject is optional metadata only.</p></div><button onClick={() => setUploadDraft(null)} className="muted-surface rounded-xl p-2"><X size={17}/></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-muted">SEMESTER<select value={uploadDraft.semesterId || ""} onChange={(event) => setUploadDraft({ ...uploadDraft, semesterId: event.target.value || null, folderId: event.target.value === selectedSemesterId ? currentFolderId : null })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"><option value="" disabled>Select semester</option>{semesters.map((semester) => <option value={semester.id} key={semester.id}>{semester.name}</option>)}</select></label>
        <label className="text-xs font-bold text-muted">SUBJECT / COURSE <span className="font-normal">(optional)</span><input value={uploadDraft.subject} onChange={(event) => setUploadDraft({ ...uploadDraft, subject: event.target.value })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none" placeholder="e.g. DBMS"/></label>
        <label className="text-xs font-bold text-muted">RESOURCE TYPE<select value={uploadDraft.resourceType} onChange={(event) => setUploadDraft({ ...uploadDraft, resourceType: event.target.value as StudyLibraryResourceType })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none">{resourceTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="text-xs font-bold text-muted">ACADEMIC YEAR <span className="font-normal">(optional)</span><input value={uploadDraft.academicYear} onChange={(event) => setUploadDraft({ ...uploadDraft, academicYear: event.target.value })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none" placeholder="e.g. 2026"/></label>
        {uploadDraft.resourceType === "question_paper" && <label className="text-xs font-bold text-muted sm:col-span-2">QUESTION TYPE<select value={uploadDraft.examType} onChange={(event) => setUploadDraft({ ...uploadDraft, examType: event.target.value })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"><option value="">Select</option><option>Quiz</option><option>Midterm</option><option>Final</option><option>Class Test</option><option>Viva</option></select></label>}
      </div>
      <div className="mt-5 max-h-28 overflow-auto rounded-2xl bg-violet-500/10 p-3 text-xs text-muted">{uploadDraft.files.map((file) => file.name).join(" · ")}</div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setUploadDraft(null)} className="button-secondary">Cancel</button><button onClick={saveUpload} className="button-primary"><Upload size={16}/>Save files</button></div>
    </div></div>}

    {editDraft && <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/45 p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setEditDraft(null)}><div className="surface mx-auto max-w-2xl rounded-3xl p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-violet-600">FILE SETTINGS</p><h2 className="mt-1 text-2xl font-black">Rename or organize this file</h2></div><button onClick={() => setEditDraft(null)} className="muted-surface rounded-xl p-2"><X size={17}/></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-muted sm:col-span-2">FILE NAME<input value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"/></label>
        <label className="text-xs font-bold text-muted">SEMESTER<select value={editDraft.semesterId || ""} onChange={(event) => setEditDraft({ ...editDraft, semesterId: event.target.value || null, folderId: null })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"><option value="" disabled>Select semester</option>{semesters.map((semester) => <option value={semester.id} key={semester.id}>{semester.name}</option>)}</select></label>
        <label className="text-xs font-bold text-muted">FOLDER<select value={editDraft.folderId || ""} onChange={(event) => setEditDraft({ ...editDraft, folderId: event.target.value || null })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"><option value="">Semester root</option>{folders.filter((folder) => folder.semesterId === editDraft.semesterId).map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label>
        <label className="text-xs font-bold text-muted">SUBJECT <span className="font-normal">(optional)</span><input value={editDraft.subject} onChange={(event) => setEditDraft({ ...editDraft, subject: event.target.value })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"/></label>
        <label className="text-xs font-bold text-muted">TYPE<select value={editDraft.resourceType} onChange={(event) => setEditDraft({ ...editDraft, resourceType: event.target.value as StudyLibraryResourceType })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none">{resourceTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="text-xs font-bold text-muted">YEAR<input value={editDraft.academicYear} onChange={(event) => setEditDraft({ ...editDraft, academicYear: event.target.value })} className="muted-surface mt-1 block w-full rounded-xl px-3 py-3 text-sm font-normal outline-none"/></label>
      </div>
      <div className="mt-5 flex justify-between gap-2"><button onClick={async () => { const book = books.find((item) => item.id === editDraft.id); if (book) await removeBook(book); setEditDraft(null); }} className="button-secondary text-red-600"><Trash2 size={15}/>Delete</button><div className="flex gap-2"><button onClick={() => setEditDraft(null)} className="button-secondary">Cancel</button><button onClick={saveEdit} className="button-primary"><Pencil size={15}/>Save changes</button></div></div>
    </div></div>}

    {settingsOpen && <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/45 p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setSettingsOpen(false)}><div className="surface mx-auto max-w-2xl rounded-3xl p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-violet-600">LIBRARY SETTINGS</p><h2 className="mt-1 text-2xl font-black">Manage semesters</h2><p className="mt-1 text-sm text-muted">Manual folders are created inside semesters. Removing a semester moves its files to another semester.</p></div><button onClick={() => setSettingsOpen(false)} className="muted-surface rounded-xl p-2"><X size={17}/></button></div>
      <div className="mt-5 flex gap-2"><input value={semesterDraft} onChange={(event) => setSemesterDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSemester()} className="muted-surface min-w-0 flex-1 rounded-xl px-3 py-3 text-sm outline-none" placeholder="Add semester / term name"/><button onClick={addSemester} className="button-primary"><Plus size={15}/>Add</button></div>
      <div className="mt-4 space-y-2">{semesters.map((semester) => { const stats = semesterStats(semester.id); return <div key={semester.id} className="muted-surface flex items-center gap-3 rounded-xl p-3"><GraduationCap size={17} className="text-violet-600"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{semester.name}</p><p className="text-[11px] text-muted">{stats.count} files · {stats.folderCount} manual folders</p></div><button onClick={() => renameSemester(semester)} className="surface rounded-lg p-2" aria-label="Rename semester"><Pencil size={14}/></button><button onClick={() => removeSemester(semester)} className="surface rounded-lg p-2 text-red-600" aria-label="Remove semester"><Trash2 size={14}/></button></div>; })}</div>
    </div></div>}
  </AppShell>;
}
