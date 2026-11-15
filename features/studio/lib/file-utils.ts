import type { StudioFile } from "../types/studio.types";

/** Normalize a Studio file path, or null when it cannot be represented safely. */
export function normalizeFilePath(raw: string): string | null {
  const trimmed = raw.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.includes("\0")) return null;

  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  const path = `/${segments.join("/")}`;
  return path.length > 260 ? null : path;
}

/** Whether two paths point at the same project file (exact, case-sensitive). */
export function sameFilePath(a: string, b: string): boolean {
  return normalizeFilePath(a) === normalizeFilePath(b);
}

/** Last path segment, e.g. `Button.tsx` for `/src/Button.tsx`. */
export function fileBasename(path: string): string {
  const normalized = normalizeFilePath(path) ?? path;
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

/** Containing folder, e.g. `/src` for `/src/Button.tsx`; `/` at the root. */
export function fileDirname(path: string): string {
  const normalized = normalizeFilePath(path);
  if (!normalized) return "/";
  const index = normalized.lastIndexOf("/");
  return index <= 0 ? "/" : normalized.slice(0, index);
}

/** Lower-case extension without the dot, or "" when there is none. */
export function fileExtension(path: string): string {
  const name = fileBasename(path);
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(index + 1).toLowerCase() : "";
}

/** A single file or folder name (no slashes, not a traversal segment). */
export function isValidFileName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 120 &&
    trimmed !== "." &&
    trimmed !== ".." &&
    !/[/\\\0]/.test(trimmed)
  );
}

/**
 * Join a directory and a name into a normalized project path. Accepts a full
 * relative path in `name` so "new file" input can create folders implicitly.
 */
export function joinFilePath(directory: string, name: string): string | null {
  const cleaned = name.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned) return null;
  const base = directory === "/" ? "" : directory.replace(/\/+$/, "");
  return normalizeFilePath(`${base}/${cleaned}`);
}

/* -------------------------------------------------------------------------- */
/* explorer tree                                                              */
/* -------------------------------------------------------------------------- */

export interface StudioTreeFile {
  kind: "file";
  name: string;
  path: string;
}

export interface StudioTreeFolder {
  kind: "folder";
  name: string;
  path: string;
  children: StudioTreeEntry[];
}

export type StudioTreeEntry = StudioTreeFile | StudioTreeFolder;

interface MutableFolder {
  name: string;
  path: string;
  folders: Map<string, MutableFolder>;
  files: StudioTreeFile[];
}

function emptyFolder(name: string, path: string): MutableFolder {
  return { name, path, folders: new Map(), files: [] };
}

function toEntries(folder: MutableFolder): StudioTreeEntry[] {
  const folders = [...folder.folders.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map<StudioTreeEntry>((child) => ({
      kind: "folder",
      name: child.name,
      path: child.path,
      children: toEntries(child),
    }));
  const files = [...folder.files].sort((a, b) => a.name.localeCompare(b.name));
  return [...folders, ...files];
}

/** Build a sorted folder/file tree from the workspace's flat file list. */
export function buildStudioFileTree(files: StudioFile[]): StudioTreeEntry[] {
  const root = emptyFolder("", "/");

  for (const file of files) {
    const path = normalizeFilePath(file.path);
    if (!path) continue;
    const segments = path.split("/").filter(Boolean);
    let folder = root;
    for (const segment of segments.slice(0, -1)) {
      const existing = folder.folders.get(segment);
      if (existing) {
        folder = existing;
        continue;
      }
      const path = folder.path === "/" ? `/${segment}` : `${folder.path}/${segment}`;
      const created = emptyFolder(segment, path);
      folder.folders.set(segment, created);
      folder = created;
    }
    folder.files.push({
      kind: "file",
      name: segments[segments.length - 1],
      path,
    });
  }

  return toEntries(root);
}
