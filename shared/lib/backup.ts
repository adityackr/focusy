import {
  selectLibrarySnapshot,
  restoreLibrarySnapshot,
  useLibrary,
  type LibrarySnapshot,
} from "@/shared/store/library";
import type {
  Category,
  Chapter,
  Course,
  CourseProgress,
  Playlist,
  PlaylistVideo,
  Thumbnail,
} from "./types";

/**
 * Portable JSON backup of everything that lives in this browser: the saved
 * library, per-playlist watch progress, per-course chapter progress and notes.
 *
 * Deliberately excluded: the YouTube API key and player/sidebar preferences —
 * those are per-device settings, not data worth carrying around.
 */

export const BACKUP_APP = "focusy";
export const BACKUP_VERSION = 1;

const PLAYLIST_PROGRESS_PREFIX = "focustube:progress:";
const COURSE_PROGRESS_PREFIX = "yt-course:progress:";
const NOTE_PREFIX = "focustube:note:";

export interface WatchProgress {
  watched: string[];
  lastWatched: string | null;
  completedChapters: string[];
  positions: Record<string, number>;
}

export interface StoredNote {
  text: string;
  updatedAt: number;
}

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  library: LibrarySnapshot;
  /** playlistId → watch progress */
  playlistProgress: Record<string, WatchProgress>;
  /** courseId → chapter progress */
  courseProgress: Record<string, CourseProgress>;
  /** videoId → note */
  notes: Record<string, StoredNote>;
}

export type BackupParseResult =
  | { ok: true; backup: Backup }
  | { ok: false; error: string };

/* -------------------------------------------------------------------------- */
/* small validation helpers                                                   */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function positionsOf(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [id, seconds] of Object.entries(value)) {
    if (typeof seconds === "number" && Number.isFinite(seconds)) out[id] = seconds;
  }
  return out;
}

function mapRecord<T>(
  value: unknown,
  normalize: (raw: unknown, id: string) => T | null
): Record<string, T> {
  if (!isRecord(value)) return {};
  const out: Record<string, T> = {};
  for (const [id, raw] of Object.entries(value)) {
    const item = normalize(raw, id);
    if (item) out[id] = item;
  }
  return out;
}

function thumbnailOf(value: unknown): Thumbnail {
  if (!isRecord(value)) return { url: "", width: 320, height: 180 };
  return {
    url: str(value.url),
    width: typeof value.width === "number" ? value.width : 320,
    height: typeof value.height === "number" ? value.height : 180,
  };
}

function normalizePlaylist(raw: unknown, id: string): Playlist | null {
  if (!isRecord(raw)) return null;
  const videos = (
    Array.isArray(raw.videos) ? raw.videos : []
  ).filter((v): v is PlaylistVideo => isRecord(v) && typeof v.videoId === "string");
  return {
    playlistId: str(raw.playlistId) || id,
    playlistTitle: str(raw.playlistTitle) || "Untitled playlist",
    playlistDescription: str(raw.playlistDescription),
    playlistThumbnail: thumbnailOf(raw.playlistThumbnail),
    channelId: str(raw.channelId),
    channelTitle: str(raw.channelTitle),
    itemCount: typeof raw.itemCount === "number" ? raw.itemCount : videos.length,
    videos,
    addedAt: str(raw.addedAt) || new Date().toISOString(),
    ...(typeof raw.categoryId === "string" ? { categoryId: raw.categoryId } : {}),
  };
}

function normalizeCourse(raw: unknown, id: string): Course | null {
  if (!isRecord(raw) || typeof raw.videoId !== "string") return null;
  const chapters = (
    Array.isArray(raw.chapters) ? raw.chapters : []
  ).filter((c): c is Chapter => isRecord(c) && typeof c.id === "string");
  return {
    id: str(raw.id) || id,
    videoId: raw.videoId,
    title: str(raw.title) || "Untitled video",
    thumbnail: str(raw.thumbnail),
    description: str(raw.description),
    ...(typeof raw.channelTitle === "string" ? { channelTitle: raw.channelTitle } : {}),
    ...(typeof raw.categoryId === "string" ? { categoryId: raw.categoryId } : {}),
    durationSeconds: typeof raw.durationSeconds === "number" ? raw.durationSeconds : null,
    chapters,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
  };
}

function normalizeCategory(raw: unknown, id: string): Category | null {
  if (!isRecord(raw)) return null;
  return {
    id: str(raw.id) || id,
    name: str(raw.name) || "Untitled folder",
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
  };
}

function normalizeLibrary(raw: unknown): LibrarySnapshot | null {
  if (!isRecord(raw)) return null;
  return {
    playlists: mapRecord(raw.playlists, normalizePlaylist),
    order: stringArray(raw.order),
    favorites: stringArray(raw.favorites),
    recent: stringArray(raw.recent),
    courses: mapRecord(raw.courses, normalizeCourse),
    courseOrder: stringArray(raw.courseOrder),
    courseFavorites: stringArray(raw.courseFavorites),
    courseRecent: stringArray(raw.courseRecent),
    categories: mapRecord(raw.categories, normalizeCategory),
    categoryOrder: stringArray(raw.categoryOrder),
  };
}

function normalizeWatchProgress(raw: unknown): WatchProgress | null {
  if (!isRecord(raw)) return null;
  return {
    watched: stringArray(raw.watched),
    lastWatched: typeof raw.lastWatched === "string" ? raw.lastWatched : null,
    completedChapters: stringArray(raw.completedChapters),
    positions: positionsOf(raw.positions),
  };
}

function normalizeCourseProgress(raw: unknown): CourseProgress | null {
  if (!isRecord(raw)) return null;
  return {
    completedIds: stringArray(raw.completedIds),
    lastChapterId: typeof raw.lastChapterId === "string" ? raw.lastChapterId : null,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
    positions: positionsOf(raw.positions),
  };
}

function normalizeNote(raw: unknown): StoredNote | null {
  if (!isRecord(raw) || typeof raw.text !== "string") return null;
  return {
    text: raw.text,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
  };
}

/* -------------------------------------------------------------------------- */
/* export                                                                     */
/* -------------------------------------------------------------------------- */

function storedValues<T>(
  prefix: string,
  normalize: (raw: unknown) => T | null
): Record<string, T> {
  const out: Record<string, T> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    try {
      const item = normalize(JSON.parse(localStorage.getItem(key) ?? "null"));
      if (item) out[key.slice(prefix.length)] = item;
    } catch {
      /* skip unreadable entries instead of failing the whole backup */
    }
  }
  return out;
}

/** Snapshot everything currently saved in this browser. */
export function collectBackup(): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    library: selectLibrarySnapshot(useLibrary.getState()),
    playlistProgress: storedValues(PLAYLIST_PROGRESS_PREFIX, normalizeWatchProgress),
    courseProgress: storedValues(COURSE_PROGRESS_PREFIX, normalizeCourseProgress),
    notes: storedValues(NOTE_PREFIX, normalizeNote),
  };
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

/** `focusy-backup-2026-11-05.json` */
export function backupFileName(date = new Date()): string {
  return `focusy-backup-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Download the current browser's data as a JSON file. Returns the file name
 * that was used (also handy in tests without touching the DOM).
 */
export function downloadBackup(): string {
  const fileName = backupFileName();
  const blob = new Blob([serializeBackup(collectBackup())], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return fileName;
}

/* -------------------------------------------------------------------------- */
/* import                                                                     */
/* -------------------------------------------------------------------------- */

/** Validate and normalize a backup file's text. */
export function parseBackup(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!isRecord(raw)) {
    return { ok: false, error: "That file isn't a Focusy backup." };
  }
  if (raw.app !== BACKUP_APP) {
    return { ok: false, error: "That file isn't a Focusy backup." };
  }
  if (raw.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `Unsupported backup version (${String(raw.version)}). This app reads version ${BACKUP_VERSION}.`,
    };
  }
  const library = normalizeLibrary(raw.library);
  if (!library) {
    return { ok: false, error: "The backup is missing its library data." };
  }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: str(raw.exportedAt) || new Date().toISOString(),
      library,
      playlistProgress: mapRecord(raw.playlistProgress, (r) =>
        normalizeWatchProgress(r)
      ),
      courseProgress: mapRecord(raw.courseProgress, (r) =>
        normalizeCourseProgress(r)
      ),
      notes: mapRecord(raw.notes, (r) => {
        const note = normalizeNote(r);
        return note && note.text.trim() ? note : null;
      }),
    },
  };
}

export async function readBackupFile(file: File): Promise<BackupParseResult> {
  try {
    return parseBackup(await file.text());
  } catch {
    return { ok: false, error: "Couldn't read that file." };
  }
}

function clearPrefix(prefix: string): void {
  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) doomed.push(key);
  }
  doomed.forEach((key) => localStorage.removeItem(key));
}

/**
 * Replace this browser's data with the backup's. This is a replace, not a
 * merge: any playlists, progress or notes saved here that aren't in the file
 * are removed. The API key and player preferences are left alone.
 */
export function applyBackup(backup: Backup): void {
  restoreLibrarySnapshot(backup.library);

  clearPrefix(PLAYLIST_PROGRESS_PREFIX);
  clearPrefix(COURSE_PROGRESS_PREFIX);
  clearPrefix(NOTE_PREFIX);

  for (const [playlistId, progress] of Object.entries(backup.playlistProgress)) {
    localStorage.setItem(
      PLAYLIST_PROGRESS_PREFIX + playlistId,
      JSON.stringify(progress)
    );
  }
  for (const [courseId, progress] of Object.entries(backup.courseProgress)) {
    localStorage.setItem(
      COURSE_PROGRESS_PREFIX + courseId,
      JSON.stringify(progress)
    );
  }
  for (const [videoId, note] of Object.entries(backup.notes)) {
    localStorage.setItem(NOTE_PREFIX + videoId, JSON.stringify(note));
  }
}

/** One-line summary for the restore confirmation, e.g. `2 playlists · 1 video · 3 notes`. */
export function backupSummary(backup: Backup): string {
  const playlists = Object.keys(backup.library.playlists).length;
  const videos = Object.keys(backup.library.courses).length;
  const notes = Object.keys(backup.notes).length;
  const parts = [
    `${playlists} playlist${playlists === 1 ? "" : "s"}`,
    `${videos} video${videos === 1 ? "" : "s"}`,
  ];
  if (notes > 0) parts.push(`${notes} note${notes === 1 ? "" : "s"}`);
  return parts.join(" · ");
}
