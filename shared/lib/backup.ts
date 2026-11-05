import {
  restoreLibrarySnapshot,
  selectLibrarySnapshot,
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
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function positionsOf(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [id, seconds] of Object.entries(value)) {
    if (typeof seconds === "number" && Number.isFinite(seconds))
      out[id] = seconds;
  }
  return out;
}

function mapRecord<T>(
  value: unknown,
  normalize: (raw: unknown, id: string) => T | null,
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
  const videos = (Array.isArray(raw.videos) ? raw.videos : []).filter(
    (v): v is PlaylistVideo => isRecord(v) && typeof v.videoId === "string",
  );
  return {
    playlistId: str(raw.playlistId) || id,
    playlistTitle: str(raw.playlistTitle) || "Untitled playlist",
    playlistDescription: str(raw.playlistDescription),
    playlistThumbnail: thumbnailOf(raw.playlistThumbnail),
    channelId: str(raw.channelId),
    channelTitle: str(raw.channelTitle),
    itemCount:
      typeof raw.itemCount === "number" ? raw.itemCount : videos.length,
    videos,
    addedAt: str(raw.addedAt) || new Date().toISOString(),
    ...(typeof raw.categoryId === "string"
      ? { categoryId: raw.categoryId }
      : {}),
  };
}

function normalizeCourse(raw: unknown, id: string): Course | null {
  if (!isRecord(raw) || typeof raw.videoId !== "string") return null;
  const chapters = (Array.isArray(raw.chapters) ? raw.chapters : []).filter(
    (c): c is Chapter => isRecord(c) && typeof c.id === "string",
  );
  return {
    id: str(raw.id) || id,
    videoId: raw.videoId,
    title: str(raw.title) || "Untitled video",
    thumbnail: str(raw.thumbnail),
    description: str(raw.description),
    ...(typeof raw.channelTitle === "string"
      ? { channelTitle: raw.channelTitle }
      : {}),
    ...(typeof raw.categoryId === "string"
      ? { categoryId: raw.categoryId }
      : {}),
    durationSeconds:
      typeof raw.durationSeconds === "number" ? raw.durationSeconds : null,
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
    lastChapterId:
      typeof raw.lastChapterId === "string" ? raw.lastChapterId : null,
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
/* merging helpers                                                            */
/* -------------------------------------------------------------------------- */

function union<T>(local: T[], incoming: T[]): T[] {
  const out = [...local];
  const seen = new Set(local);
  for (const item of incoming) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Point an incoming item at the folder id this browser uses for that name. */
function remapCategory<T extends { categoryId?: string }>(
  item: T,
  idMap: Record<string, string>,
): T {
  const mapped = item.categoryId ? idMap[item.categoryId] : undefined;
  return mapped && mapped !== item.categoryId
    ? { ...item, categoryId: mapped }
    : item;
}

function readStored<T>(
  key: string,
  normalize: (raw: unknown) => T | null,
): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* export                                                                     */
/* -------------------------------------------------------------------------- */

function storedValues<T>(
  prefix: string,
  normalize: (raw: unknown) => T | null,
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
    playlistProgress: storedValues(
      PLAYLIST_PROGRESS_PREFIX,
      normalizeWatchProgress,
    ),
    courseProgress: storedValues(
      COURSE_PROGRESS_PREFIX,
      normalizeCourseProgress,
    ),
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

/* -------------------------------------------------------------------------- */
/* backup reminders                                                           */
/* -------------------------------------------------------------------------- */

/** How stale a backup gets before the library page nudges for a new one. */
export const BACKUP_REMINDER_AFTER_DAYS = 7;

const LAST_BACKUP_KEY = "focustube:last-backup";
const REMINDER_DISMISSED_KEY = "focustube:backup-reminder-dismissed";
const DAY_MS = 24 * 60 * 60 * 1000;

export interface LastBackup {
  /** ISO timestamp of the export. */
  at: string;
  /** How much content the library held at that moment. */
  items: number;
}

/** What the library is worth backing up for: playlists and videos. */
export function libraryItemCount(): number {
  const snapshot = selectLibrarySnapshot(useLibrary.getState());
  return (
    Object.keys(snapshot.playlists).length +
    Object.keys(snapshot.courses).length
  );
}

/** Remember that a backup was just taken. */
export function recordLastBackup(
  items = libraryItemCount(),
  at = Date.now(),
): void {
  try {
    localStorage.setItem(
      LAST_BACKUP_KEY,
      JSON.stringify({ at: new Date(at).toISOString(), items }),
    );
  } catch {
    /* storage unavailable — the reminder just won't know about this one */
  }
}

export function readLastBackup(): LastBackup | null {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.at !== "string") return null;
    if (typeof parsed.items !== "number" || !Number.isFinite(parsed.items))
      return null;
    if (!Number.isFinite(Date.parse(parsed.at))) return null;
    return { at: parsed.at, items: parsed.items };
  } catch {
    return null;
  }
}

export interface BackupReminder {
  /** Content items in the library right now. */
  items: number;
  /** Items added since the last backup (0 when there has never been one). */
  itemsSince: number;
  /** Whole days since the last backup, or null when there has never been one. */
  daysSince: number | null;
  neverBackedUp: boolean;
}

/**
 * Whether the library page should nudge for a backup: there is content saved,
 * and it was either never backed up or grew since a backup that is now over a
 * week old. A dismissed nudge stays quiet until the content changes again.
 */
export function backupReminder(now = Date.now()): BackupReminder | null {
  if (typeof window === "undefined") return null;
  const items = libraryItemCount();
  if (items === 0) return null;

  const last = readLastBackup();
  if (last) {
    const daysSince = Math.floor((now - Date.parse(last.at)) / DAY_MS);
    if (daysSince < BACKUP_REMINDER_AFTER_DAYS) return null;
    if (items <= last.items) return null;
    if (isReminderDismissed(items, last.at)) return null;
    return {
      items,
      itemsSince: items - last.items,
      daysSince,
      neverBackedUp: false,
    };
  }

  if (isReminderDismissed(items, null)) return null;
  return { items, itemsSince: 0, daysSince: null, neverBackedUp: true };
}

/** Hide the nudge until the library changes again (or a new backup is taken). */
export function dismissBackupReminder(): void {
  try {
    localStorage.setItem(
      REMINDER_DISMISSED_KEY,
      JSON.stringify({
        items: libraryItemCount(),
        lastBackupAt: readLastBackup()?.at ?? null,
      }),
    );
  } catch {
    /* storage unavailable — it'll simply show again next time */
  }
}

function isReminderDismissed(
  items: number,
  lastBackupAt: string | null,
): boolean {
  try {
    const raw = localStorage.getItem(REMINDER_DISMISSED_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    return (
      isRecord(parsed) &&
      parsed.items === items &&
      parsed.lastBackupAt === lastBackupAt
    );
  } catch {
    return false;
  }
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
  recordLastBackup();
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
        normalizeWatchProgress(r),
      ),
      courseProgress: mapRecord(raw.courseProgress, (r) =>
        normalizeCourseProgress(r),
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
 * Replace this browser"s data with the backup"s. This is a replace, not a
 * merge: any playlists, progress or notes saved here that aren't in the file
 * are removed. The API key and player preferences are left alone.
 */
export function applyBackup(backup: Backup): void {
  restoreLibrarySnapshot(backup.library);

  clearPrefix(PLAYLIST_PROGRESS_PREFIX);
  clearPrefix(COURSE_PROGRESS_PREFIX);
  clearPrefix(NOTE_PREFIX);

  for (const [playlistId, progress] of Object.entries(
    backup.playlistProgress,
  )) {
    localStorage.setItem(
      PLAYLIST_PROGRESS_PREFIX + playlistId,
      JSON.stringify(progress),
    );
  }
  for (const [courseId, progress] of Object.entries(backup.courseProgress)) {
    localStorage.setItem(
      COURSE_PROGRESS_PREFIX + courseId,
      JSON.stringify(progress),
    );
  }
  for (const [videoId, note] of Object.entries(backup.notes)) {
    localStorage.setItem(NOTE_PREFIX + videoId, JSON.stringify(note));
  }
}

/** What a merge added or refreshed, for the message shown in Settings. */
export interface MergeReport {
  playlistsAdded: number;
  coursesAdded: number;
  notesUpdated: number;
}

/**
 * Merge a backup into this browser instead of replacing it. Saved playlists,
 * videos, folders and favorites are unioned: local items are never removed, and
 * the local copy wins when both sides have the same id (it's the copy this
 * browser has been keeping current). Folders match by name, so the same folder
 * on two devices stays one folder. Progress and notes keep the newest version.
 */
export function mergeBackup(backup: Backup): MergeReport {
  const current = selectLibrarySnapshot(useLibrary.getState());

  const categories: Record<string, Category> = { ...current.categories };
  const categoryOrder = [...current.categoryOrder];
  const categoryIdMap: Record<string, string> = {};

  for (const incoming of Object.values(backup.library.categories)) {
    const match = categoryOrder.find(
      (id) => categories[id] && sameName(categories[id].name, incoming.name),
    );
    if (match) {
      categoryIdMap[incoming.id] = match;
      continue;
    }
    // Prefer the file's id, but never collide with an unrelated local folder.
    let id = incoming.id;
    for (let n = 2; categories[id]; n++) id = `${incoming.id}-${n}`;
    categories[id] = { ...incoming, id };
    categoryOrder.push(id);
    categoryIdMap[incoming.id] = id;
  }

  const playlists = { ...current.playlists };
  const order = [...current.order];
  let playlistsAdded = 0;
  for (const [id, incoming] of Object.entries(backup.library.playlists)) {
    if (playlists[id]) continue;
    playlists[id] = remapCategory(incoming, categoryIdMap);
    order.push(id);
    playlistsAdded++;
  }

  const courses = { ...current.courses };
  const courseOrder = [...current.courseOrder];
  let coursesAdded = 0;
  for (const [id, incoming] of Object.entries(backup.library.courses)) {
    if (courses[id]) continue;
    courses[id] = remapCategory(incoming, categoryIdMap);
    courseOrder.push(id);
    coursesAdded++;
  }

  restoreLibrarySnapshot({
    playlists,
    order,
    favorites: union(current.favorites, backup.library.favorites),
    recent: union(current.recent, backup.library.recent),
    courses,
    courseOrder,
    courseFavorites: union(
      current.courseFavorites,
      backup.library.courseFavorites,
    ),
    courseRecent: union(current.courseRecent, backup.library.courseRecent),
    categories,
    categoryOrder,
  });

  // Playlist progress has no timestamp, so union what was watched and keep this
  // browser"s resume points, filling in only what"s missing here.
  for (const [playlistId, incoming] of Object.entries(
    backup.playlistProgress,
  )) {
    const key = PLAYLIST_PROGRESS_PREFIX + playlistId;
    const local = readStored(key, normalizeWatchProgress);
    if (!local) {
      localStorage.setItem(key, JSON.stringify(incoming));
      continue;
    }
    localStorage.setItem(
      key,
      JSON.stringify({
        watched: union(local.watched, incoming.watched),
        lastWatched: local.lastWatched ?? incoming.lastWatched,
        completedChapters: union(
          local.completedChapters,
          incoming.completedChapters,
        ),
        positions: { ...incoming.positions, ...local.positions },
      }),
    );
  }

  // Course progress is timestamped: the newer side wins, but completed chapters
  // are unioned so a chapter never un-completes.
  for (const [courseId, incoming] of Object.entries(backup.courseProgress)) {
    const key = COURSE_PROGRESS_PREFIX + courseId;
    const local = readStored(key, normalizeCourseProgress);
    if (!local) {
      localStorage.setItem(key, JSON.stringify(incoming));
      continue;
    }
    const newer = incoming.updatedAt > local.updatedAt ? incoming : local;
    localStorage.setItem(
      key,
      JSON.stringify({
        completedIds: union(local.completedIds, incoming.completedIds),
        lastChapterId: newer.lastChapterId,
        updatedAt: Math.max(local.updatedAt, incoming.updatedAt),
        positions: newer.positions,
      }),
    );
  }

  // Notes are timestamped too: whichever was edited last wins.
  let notesUpdated = 0;
  for (const [videoId, incoming] of Object.entries(backup.notes)) {
    const key = NOTE_PREFIX + videoId;
    const local = readStored(key, normalizeNote);
    const localUsable = local && local.text.trim() ? local : null;
    if (localUsable && localUsable.updatedAt > incoming.updatedAt) continue;
    localStorage.setItem(key, JSON.stringify(incoming));
    notesUpdated++;
  }

  return { playlistsAdded, coursesAdded, notesUpdated };
}

/** What a backup file holds, for previewing it in Settings before restoring. */
export interface BackupPreview {
  exportedAt: string;
  playlists: string[];
  videos: string[];
  folders: string[];
  playlistProgress: number;
  courseProgress: number;
  notes: number;
}

/**
 * Readable contents of a backup: item titles in their saved order, plus how
 * much progress and how many notes come with it.
 */
export function backupPreview(backup: Backup): BackupPreview {
  return {
    exportedAt: backup.exportedAt,
    playlists: orderedLabels(
      backup.library.order,
      backup.library.playlists,
      (p) => p.playlistTitle,
    ),
    videos: orderedLabels(
      backup.library.courseOrder,
      backup.library.courses,
      (c) => c.title,
    ),
    folders: orderedLabels(
      backup.library.categoryOrder,
      backup.library.categories,
      (c) => c.name,
    ),
    playlistProgress: Object.keys(backup.playlistProgress).length,
    courseProgress: Object.keys(backup.courseProgress).length,
    notes: Object.keys(backup.notes).length,
  };
}

function orderedLabels<T>(
  order: string[],
  items: Record<string, T>,
  label: (item: T) => string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (id: string) => {
    const item = items[id];
    if (!item || seen.has(id)) return;
    seen.add(id);
    out.push(label(item));
  };
  order.forEach(add);
  Object.keys(items).forEach(add);
  return out;
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
