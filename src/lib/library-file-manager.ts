export type LibraryFolder = {
  id: string;
  semesterId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type LibraryFileLocation = {
  bookId: string;
  folderId: string | null;
};

const FOLDERS_KEY = "speakly-library-folders-v1";
const LOCATIONS_KEY = "speakly-library-file-locations-v1";

function canStore() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJson<T>(key: string, fallback: T): T {
  if (!canStore()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canStore()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function listLibraryFolders() {
  return readJson<LibraryFolder[]>(FOLDERS_KEY, []).sort((a, b) => a.name.localeCompare(b.name));
}

export function saveLibraryFolder(folder: LibraryFolder) {
  const folders = listLibraryFolders();
  const next = folders.some((item) => item.id === folder.id)
    ? folders.map((item) => item.id === folder.id ? folder : item)
    : [...folders, folder];
  writeJson(FOLDERS_KEY, next);
  return folder;
}

export function getFolderDescendantIds(folderId: string) {
  const folders = listLibraryFolders();
  const result = new Set<string>([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (folder.parentId && result.has(folder.parentId) && !result.has(folder.id)) {
        result.add(folder.id);
        changed = true;
      }
    }
  }
  return Array.from(result);
}

export function deleteLibraryFolderTree(folderId: string) {
  const deletedIds = getFolderDescendantIds(folderId);
  const deleted = new Set(deletedIds);
  writeJson(FOLDERS_KEY, listLibraryFolders().filter((folder) => !deleted.has(folder.id)));
  return deletedIds;
}

export function listLibraryFileLocations() {
  return readJson<LibraryFileLocation[]>(LOCATIONS_KEY, []);
}

export function getLibraryFileFolder(bookId: string) {
  return listLibraryFileLocations().find((item) => item.bookId === bookId)?.folderId ?? null;
}

export function setLibraryFileFolder(bookId: string, folderId: string | null) {
  const locations = listLibraryFileLocations();
  const entry: LibraryFileLocation = { bookId, folderId };
  const next = locations.some((item) => item.bookId === bookId)
    ? locations.map((item) => item.bookId === bookId ? entry : item)
    : [...locations, entry];
  writeJson(LOCATIONS_KEY, next);
  return entry;
}

export function removeLibraryFileLocation(bookId: string) {
  writeJson(LOCATIONS_KEY, listLibraryFileLocations().filter((item) => item.bookId !== bookId));
}
