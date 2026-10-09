import { useSyncExternalStore } from "react";
import { unzipSync, zipSync, type Zippable } from "fflate";
import { packagingExclusion, ZIP_LIMITS, type ProjectArchiveExclusion } from "@/lib/eng/zip";

/**
 * The installed app's project folder: Fydell writes the starter into a folder
 * the candidate picks, and packages that folder for submission, through the
 * browser's File System Access API (Edge and Chrome). Nothing is executed and
 * the browser only ever sees the one folder the candidate chose.
 */

interface WritableFile {
  write(data: Blob | BufferSource | string): Promise<void>;
  close(): Promise<void>;
}

interface FileEntry {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableFile>;
}

type PermissionMode = { mode: "read" | "readwrite" };

export interface ProjectDirectory {
  kind: "directory";
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<ProjectDirectory>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileEntry>;
  values(): AsyncIterable<ProjectDirectory | FileEntry>;
  queryPermission?(descriptor: PermissionMode): Promise<PermissionState>;
  requestPermission?(descriptor: PermissionMode): Promise<PermissionState>;
}

type DirectoryPicker = (options?: { id?: string; mode?: "read" | "readwrite"; startIn?: "documents" | "desktop" }) => Promise<ProjectDirectory>;

export class FolderError extends Error {}

function picker(): DirectoryPicker | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
  return typeof candidate === "function" ? (candidate.bind(window) as DirectoryPicker) : null;
}

export function folderAccessSupported(): boolean {
  return picker() !== null;
}

const noSubscription = () => () => undefined;

export function useFolderAccess(): boolean {
  return useSyncExternalStore(noSubscription, folderAccessSupported, () => false);
}

/* ------------------------------------------------------------------ */
/* Remembered folders                                                  */
/* ------------------------------------------------------------------ */

const DB_NAME = "fydell-project-folders";
const STORE = "folders";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function recallFolder(attemptId: string): Promise<ProjectDirectory | null> {
  try {
    const value = await withStore<unknown>("readonly", (s) => s.get(attemptId));
    return value && typeof value === "object" && (value as { kind?: unknown }).kind === "directory" ? (value as ProjectDirectory) : null;
  } catch {
    return null;
  }
}

async function rememberFolder(attemptId: string, folder: ProjectDirectory): Promise<void> {
  await withStore("readwrite", (s) => s.put(folder, attemptId)).catch(() => undefined);
}

export async function forgetFolder(attemptId: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(attemptId)).catch(() => undefined);
}

/** Must run inside a click handler: the browser only shows its permission prompt for a user gesture. */
export async function ensureAccess(folder: ProjectDirectory, mode: "read" | "readwrite"): Promise<boolean> {
  if (!folder.queryPermission || !folder.requestPermission) return true;
  if ((await folder.queryPermission({ mode })) === "granted") return true;
  return (await folder.requestPermission({ mode })) === "granted";
}

/* ------------------------------------------------------------------ */
/* Set up                                                              */
/* ------------------------------------------------------------------ */

async function hasFile(folder: ProjectDirectory, name: string): Promise<boolean> {
  try {
    await folder.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

function safeSegments(path: string): string[] | null {
  const parts = path.split("/");
  if (parts.some((p) => p === "" || p === "." || p === ".." || /[\\:*?"<>|\u0000-\u001f]/.test(p))) return null;
  return parts;
}

export interface FolderSetup {
  folder: ProjectDirectory;
  /** Where the project is, as the candidate would find it: the picked folder's name, then the project folder. */
  location: string;
  /** False when the picked folder already held this project, which is then left untouched. */
  created: boolean;
  fileCount: number;
}

/**
 * Asks for a folder and writes the starter project into `<picked>/<root>`. If
 * the candidate picks the project folder itself, or a folder that already has
 * it, nothing is overwritten.
 */
export async function setUpProjectFolder(attemptId: string, root: string): Promise<FolderSetup> {
  const pick = picker();
  if (!pick) throw new FolderError("This browser cannot write to a folder. Use Microsoft Edge or Google Chrome, or download the ZIP instead.");
  let parent: ProjectDirectory;
  try {
    parent = await pick({ id: "fydell-projects", mode: "readwrite", startIn: "documents" });
  } catch {
    throw new FolderError("No folder was chosen.");
  }

  if (await hasFile(parent, "fydell.json")) {
    await rememberFolder(attemptId, parent);
    return { folder: parent, location: parent.name, created: false, fileCount: 0 };
  }

  const res = await fetch(`/api/eng/attempts/${attemptId}/starter`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) throw new FolderError("The starter project could not be downloaded. Check your connection and try again.");
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await res.arrayBuffer()));
  } catch {
    throw new FolderError("The starter project could not be unpacked. Try again, or download the ZIP instead.");
  }

  const target = await parent.getDirectoryHandle(root, { create: true });
  if (await hasFile(target, "fydell.json")) {
    await rememberFolder(attemptId, target);
    return { folder: target, location: `${parent.name}/${root}`, created: false, fileCount: 0 };
  }

  let fileCount = 0;
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith("/")) continue;
    const relative = name.startsWith(`${root}/`) ? name.slice(root.length + 1) : name;
    const parts = safeSegments(relative);
    if (!parts) continue;
    let dir = target;
    for (const segment of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(segment, { create: true });
    const file = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await file.createWritable();
    await writable.write(new Uint8Array(data));
    await writable.close();
    fileCount += 1;
  }
  await rememberFolder(attemptId, target);
  return { folder: target, location: `${parent.name}/${root}`, created: true, fileCount };
}

/** Lets the candidate point at an existing copy of the project, for example one extracted by hand. */
export async function chooseExistingFolder(attemptId: string): Promise<ProjectDirectory> {
  const pick = picker();
  if (!pick) throw new FolderError("This browser cannot read a folder. Use Microsoft Edge or Google Chrome, or upload a ZIP instead.");
  let folder: ProjectDirectory;
  try {
    folder = await pick({ id: "fydell-projects", mode: "read", startIn: "documents" });
  } catch {
    throw new FolderError("No folder was chosen.");
  }
  if (!(await hasFile(folder, "fydell.json"))) {
    throw new FolderError(`${folder.name} is not the project folder. Choose the folder that contains fydell.json.`);
  }
  await rememberFolder(attemptId, folder);
  return folder;
}

/* ------------------------------------------------------------------ */
/* Package                                                             */
/* ------------------------------------------------------------------ */

const MAX_WALK = 20_000;

export interface FolderPackage {
  file: File;
  included: { path: string; size: number }[];
  excluded: ProjectArchiveExclusion[];
  totalBytes: number;
}

/**
 * Reads the project folder and builds the same ZIP the candidate would make
 * by hand, leaving out caches, dependency folders, credentials and nested
 * archives by the rules the server applies to every upload.
 */
export async function packageProjectFolder(folder: ProjectDirectory, root: string): Promise<FolderPackage> {
  const included: { path: string; size: number; data: Uint8Array }[] = [];
  const excluded: ProjectArchiveExclusion[] = [];
  let walked = 0;
  let total = 0;

  async function walk(dir: ProjectDirectory, prefix: string): Promise<void> {
    for await (const entry of dir.values()) {
      walked += 1;
      if (walked > MAX_WALK) throw new FolderError(`The project folder has more than ${MAX_WALK} entries. Remove dependency or data folders and try again.`);
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === "directory") {
        if (packagingExclusion(`${path}/x`) === "ignored_folder") {
          excluded.push({ path: `${path}/`, reason: "ignored_folder" });
          continue;
        }
        await walk(entry, path);
        continue;
      }
      const reason = packagingExclusion(path);
      if (reason) {
        excluded.push({ path, reason });
        continue;
      }
      const file = await entry.getFile();
      if (file.size > ZIP_LIMITS.maxFileBytes) throw new FolderError(`${path} is larger than 1 MB. Remove large data or generated files and try again.`);
      total += file.size;
      if (total > ZIP_LIMITS.maxTotalUncompressedBytes) throw new FolderError("The project is larger than 20 MB. Leave out dependency folders, build output and data files.");
      included.push({ path, size: file.size, data: new Uint8Array(await file.arrayBuffer()) });
      if (included.length > ZIP_LIMITS.maxEvaluatedFiles) {
        throw new FolderError(`The project has more than ${ZIP_LIMITS.maxEvaluatedFiles} files after caches are left out. Remove generated files and try again.`);
      }
    }
  }

  await walk(folder, "");
  if (included.length === 0) throw new FolderError("The folder has no project files to submit.");

  const entries: Zippable = {};
  for (const f of included) entries[`${root}/${f.path}`] = f.data;
  const zipped = new Uint8Array(zipSync(entries, { level: 6 }));
  if (zipped.byteLength > ZIP_LIMITS.maxArchiveBytes) throw new FolderError("The packaged project is larger than 5 MB. Leave out data files and build output.");

  return {
    file: new File([zipped], `${root}.zip`, { type: "application/zip" }),
    included: included.map(({ path, size }) => ({ path, size })).sort((a, b) => a.path.localeCompare(b.path)),
    excluded: excluded.sort((a, b) => a.path.localeCompare(b.path)),
    totalBytes: total,
  };
}
