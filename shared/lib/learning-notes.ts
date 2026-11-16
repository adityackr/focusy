import * as React from "react";

/**
 * Timestamped learning notes, stored only in this browser's localStorage.
 *
 * One bucket per video (`focustube:notes:v2:<videoId>`) so the same video keeps
 * its notes whichever playlist or course it appears in. Each entry carries the
 * source it was written from (used to jump back) and the absolute video time it
 * belongs to.
 *
 * Notes written by the previous, one-note-per-video implementation
 * (`focustube:note:<videoId>`) are adopted as untimed entries once. The legacy
 * key is deliberately left in place: older builds and backups keep reading it
 * while new notes live under the v2 prefix.
 */

export const NOTES_STORAGE_PREFIX = "focustube:notes:v2:";
export const LEGACY_NOTE_STORAGE_PREFIX = "focustube:note:";
export const LEGACY_MIGRATION_INDEX_KEY = "focustube:notes-legacy-index:v2";

/** Maximum Markdown size of a single note (100 KB). */
export const MAX_NOTE_MARKDOWN_LENGTH = 100_000;

const NOTES_VERSION = 2;

/**
 * Where a note was written. Used to build a jump-back link; notes still work
 * without one when the video has since left the library.
 */
export type NoteSource =
  | { kind: "playlist"; playlistId: string; videoId: string; title: string }
  | {
      kind: "course";
      courseId: string;
      videoId: string;
      chapterId?: string;
      title: string;
    }
  | { kind: "video"; videoId: string; title: string };

export interface LearningNote {
  id: string;
  videoId: string;
  source: NoteSource | null;
  /** Absolute playback time in the video; null = a note for the whole lesson. */
  timeSeconds: number | null;
  markdown: string;
  createdAt: number;
  updatedAt: number;
}

interface StoredNotesFile {
  version: typeof NOTES_VERSION;
  notes: LearningNote[];
}

export type LearningNotesError =
  | "empty"
  | "too-large"
  | "not-found"
  | "storage";

export type NotesResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: LearningNotesError };

export interface AddNoteInput {
  videoId: string;
  markdown: string;
  timeSeconds?: number | null;
  source?: NoteSource | null;
}

export interface UpdateNotePatch {
  markdown?: string;
  timeSeconds?: number | null;
  source?: NoteSource | null;
}

/* -------------------------------------------------------------------------- */
/* validation helpers                                                         */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Valid timestamps only: finite, non-negative, whole seconds. */
function normalizeTime(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
}

function normalizeSource(raw: unknown): NoteSource | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  const videoId = str(raw.videoId);

  if (kind === "playlist") {
    const playlistId = str(raw.playlistId);
    if (!playlistId || !videoId) return null;
    return { kind, playlistId, videoId, title: str(raw.title) };
  }
  if (kind === "course") {
    const courseId = str(raw.courseId);
    if (!courseId || !videoId) return null;
    const chapterId = str(raw.chapterId);
    return {
      kind,
      courseId,
      videoId,
      ...(chapterId ? { chapterId } : {}),
      title: str(raw.title),
    };
  }
  if (kind === "video") {
    if (!videoId) return null;
    return { kind, videoId, title: str(raw.title) };
  }
  return null;
}

/** Drop unreadable entries instead of failing the whole bucket. */
function normalizeNote(raw: unknown, bucketVideoId: string): LearningNote | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const markdown = str(raw.markdown);
  if (!id || !markdown.trim()) return null;

  const createdAt =
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : 0;
  const updatedAt =
    typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
      ? raw.updatedAt
      : createdAt;

  return {
    id,
    // The bucket key is authoritative; a malformed entry can't claim another
    // video's notes.
    videoId: bucketVideoId,
    source: normalizeSource(raw.source),
    timeSeconds: normalizeTime(raw.timeSeconds),
    markdown,
    createdAt,
    updatedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* raw storage (no caches, no notifications)                                  */
/* -------------------------------------------------------------------------- */

function keyFor(videoId: string): string {
  return NOTES_STORAGE_PREFIX + videoId;
}

function readBucketRaw(videoId: string): LearningNote[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(videoId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== NOTES_VERSION) return null;
    if (!Array.isArray(parsed.notes)) return null;
    return parsed.notes
      .map((note) => normalizeNote(note, videoId))
      .filter((note): note is LearningNote => note !== null);
  } catch {
    return null;
  }
}

/** Write without touching caches or listeners; false when storage refused. */
function writeBucketRaw(videoId: string, notes: LearningNote[]): boolean {
  try {
    if (notes.length === 0) {
      localStorage.removeItem(keyFor(videoId));
      return true;
    }
    const file: StoredNotesFile = { version: NOTES_VERSION, notes };
    localStorage.setItem(keyFor(videoId), JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* legacy migration                                                           */
/* -------------------------------------------------------------------------- */

function readMigrationIndex(): Set<string> {
  try {
    const raw = localStorage.getItem(LEGACY_MIGRATION_INDEX_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

function writeMigrationIndex(ids: Set<string>): boolean {
  try {
    localStorage.setItem(LEGACY_MIGRATION_INDEX_KEY, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}

/** Read the previous note shape: a JSON string or `{ text, updatedAt }`. */
function readLegacyNote(videoId: string): {
  text: string;
  updatedAt: number;
} | null {
  try {
    const raw = localStorage.getItem(LEGACY_NOTE_STORAGE_PREFIX + videoId);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") {
      return { text: parsed, updatedAt: 0 };
    }
    if (isRecord(parsed) && typeof parsed.text === "string") {
      return {
        text: parsed.text,
        updatedAt:
          typeof parsed.updatedAt === "number" &&
          Number.isFinite(parsed.updatedAt)
            ? parsed.updatedAt
            : 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Adopt every legacy one-note-per-video entry as an untimed note.
 *
 * Idempotent: a video is recorded in the migration index once handled, so a
 * migrated note that the user later deletes never comes back. Returns the
 * number of legacy keys newly adopted. Runs automatically when this module
 * loads in a browser.
 */
export function migrateLegacyNotes(): number {
  if (typeof window === "undefined") return 0;

  const legacyVideoIds: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LEGACY_NOTE_STORAGE_PREFIX)) {
      legacyVideoIds.push(key.slice(LEGACY_NOTE_STORAGE_PREFIX.length));
    }
  }
  if (legacyVideoIds.length === 0) return 0;

  const index = readMigrationIndex();
  let migrated = 0;
  let indexChanged = false;

  for (const videoId of legacyVideoIds) {
    if (index.has(videoId)) continue;

    const legacy = readLegacyNote(videoId);
    const text = legacy?.text.trim() ?? "";
    if (!text) {
      // An empty legacy note has nothing to adopt; remember it so we don't scan
      // it again on every load.
      index.add(videoId);
      indexChanged = true;
      continue;
    }

    const notes = readBucketRaw(videoId) ?? [];
    const legacyId = `legacy:${videoId}`;
    if (!notes.some((note) => note.id === legacyId)) {
      const timestamp = legacy?.updatedAt || Date.now();
      notes.push({
        id: legacyId,
        videoId,
        source: null,
        timeSeconds: null,
        markdown: text,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      // Leave the key out of the index when the write failed, so a later load
      // can retry instead of losing the note.
      if (!writeBucketRaw(videoId, notes)) continue;
    }

    index.add(videoId);
    indexChanged = true;
    migrated++;
  }

  if (indexChanged) writeMigrationIndex(index);
  if (migrated > 0) invalidateNotesCache();
  return migrated;
}

/* -------------------------------------------------------------------------- */
/* cache + subscriptions                                                      */
/* -------------------------------------------------------------------------- */

const EMPTY_NOTES: LearningNote[] = Object.freeze(
  [],
) as unknown as LearningNote[];

const videoCache = new Map<string, LearningNote[]>();
let allCache: LearningNote[] | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Drop memoized snapshots and notify every mounted notes view. */
export function invalidateNotesCache(): void {
  videoCache.clear();
  allCache = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): LearningNote[] {
  return EMPTY_NOTES;
}

let storageBound = false;
function bindStorageEvents(): void {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (event) => {
    const key = event.key;
    if (
      key === null ||
      key === LEGACY_MIGRATION_INDEX_KEY ||
      key.startsWith(NOTES_STORAGE_PREFIX) ||
      key.startsWith(LEGACY_NOTE_STORAGE_PREFIX)
    ) {
      invalidateNotesCache();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* reads                                                                      */
/* -------------------------------------------------------------------------- */

function sortByTimestamp(notes: LearningNote[]): LearningNote[] {
  return [...notes].sort((a, b) => {
    const at = a.timeSeconds ?? Number.POSITIVE_INFINITY;
    const bt = b.timeSeconds ?? Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
  });
}

/** All notes for one video, in playback order (untimed notes last). */
export function notesForVideo(videoId: string): LearningNote[] {
  const notes = readBucketRaw(videoId);
  return notes ? sortByTimestamp(notes) : EMPTY_NOTES;
}

/** Notes grouped by video id, in the shape used by backups. */
export type LearningNotesByVideo = Record<string, LearningNote[]>;

/** Every note bucket saved in this browser, grouped by video id. */
export function allNotesByVideo(): LearningNotesByVideo {
  if (typeof window === "undefined") return {};

  const out: LearningNotesByVideo = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(NOTES_STORAGE_PREFIX)) continue;
    const videoId = key.slice(NOTES_STORAGE_PREFIX.length);
    const bucket = readBucketRaw(videoId);
    if (bucket && bucket.length > 0) out[videoId] = bucket;
  }
  return out;
}

/** Validate a backup's note buckets, dropping unreadable entries. */
export function normalizeNotesByVideo(raw: unknown): LearningNotesByVideo {
  if (!isRecord(raw)) return {};

  const out: LearningNotesByVideo = {};
  for (const [videoId, value] of Object.entries(raw)) {
    if (!videoId || !Array.isArray(value)) continue;
    const seen = new Set<string>();
    const notes = value
      .map((note) => normalizeNote(note, videoId))
      .filter((note): note is LearningNote => {
        if (!note || seen.has(note.id)) return false;
        seen.add(note.id);
        return true;
      });
    if (notes.length > 0) out[videoId] = notes;
  }
  return out;
}

/** Replace every v2 note bucket, e.g. when restoring a backup. */
export function replaceNotesByVideo(buckets: LearningNotesByVideo): void {
  if (typeof window === "undefined") return;

  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(NOTES_STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));

  for (const [videoId, notes] of Object.entries(buckets)) {
    if (notes.length > 0) writeBucketRaw(videoId, notes);
  }
  invalidateNotesCache();
}

/**
 * Merge incoming note buckets into this browser without deleting anything.
 * When both sides have the same note id, the more recently edited copy wins.
 * Returns how many incoming entries were added or replaced.
 */
export function mergeNotesByVideo(buckets: LearningNotesByVideo): number {
  if (typeof window === "undefined") return 0;

  let changed = 0;
  for (const [videoId, incoming] of Object.entries(buckets)) {
    const local = readBucketRaw(videoId) ?? [];
    const byId = new Map(local.map((note) => [note.id, note]));
    let bucketChanged = 0;

    for (const note of incoming) {
      const current = byId.get(note.id);
      if (current && current.updatedAt > note.updatedAt) continue;
      byId.set(note.id, note);
      bucketChanged++;
    }

    if (bucketChanged > 0) {
      writeBucketRaw(videoId, [...byId.values()]);
      changed += bucketChanged;
    }
  }

  if (changed > 0) invalidateNotesCache();
  return changed;
}

/** Every note saved in this browser, most recently edited first. */
export function allNotes(): LearningNote[] {
  if (typeof window === "undefined") return EMPTY_NOTES;

  const notes: LearningNote[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(NOTES_STORAGE_PREFIX)) continue;
    const bucket = readBucketRaw(key.slice(NOTES_STORAGE_PREFIX.length));
    if (bucket) notes.push(...bucket);
  }
  return notes.sort(
    (a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id),
  );
}

/** How many note entries are saved in this browser. */
export function noteCount(): number {
  return allNotes().length;
}

/* -------------------------------------------------------------------------- */
/* writes                                                                     */
/* -------------------------------------------------------------------------- */

function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `note-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function validateMarkdown(markdown: string): LearningNotesError | null {
  if (!markdown.trim()) return "empty";
  if (markdown.length > MAX_NOTE_MARKDOWN_LENGTH) return "too-large";
  return null;
}

function persist(videoId: string, notes: LearningNote[]): boolean {
  const ok = writeBucketRaw(videoId, notes);
  if (ok) invalidateNotesCache();
  return ok;
}

/** Add a note and persist it. */
export function addNote(input: AddNoteInput): NotesResult<LearningNote> {
  if (typeof window === "undefined") {
    return { ok: false, error: "storage" };
  }

  const videoId = input.videoId.trim();
  if (!videoId) return { ok: false, error: "empty" };

  const markdown = input.markdown.trim();
  const invalid = validateMarkdown(markdown);
  if (invalid) return { ok: false, error: invalid };

  const now = Date.now();
  const note: LearningNote = {
    id: createId(),
    videoId,
    source: input.source ?? null,
    timeSeconds: normalizeTime(input.timeSeconds),
    markdown,
    createdAt: now,
    updatedAt: now,
  };

  const notes = readBucketRaw(videoId) ?? [];
  if (!persist(videoId, [...notes, note])) {
    return { ok: false, error: "storage" };
  }
  return { ok: true, value: note };
}

/** Edit a note's Markdown, timestamp or source. */
export function updateNote(
  videoId: string,
  noteId: string,
  patch: UpdateNotePatch,
): NotesResult<LearningNote> {
  if (typeof window === "undefined") {
    return { ok: false, error: "storage" };
  }

  const notes = readBucketRaw(videoId);
  if (!notes) return { ok: false, error: "not-found" };
  const index = notes.findIndex((note) => note.id === noteId);
  if (index < 0) return { ok: false, error: "not-found" };

  let markdown = notes[index].markdown;
  if (patch.markdown !== undefined) {
    const invalid = validateMarkdown(patch.markdown);
    if (invalid) return { ok: false, error: invalid };
    markdown = patch.markdown.trim();
  }

  const updated: LearningNote = {
    ...notes[index],
    markdown,
    ...(patch.timeSeconds !== undefined
      ? { timeSeconds: normalizeTime(patch.timeSeconds) }
      : {}),
    ...(patch.source !== undefined ? { source: patch.source } : {}),
    updatedAt: Date.now(),
  };

  const next = [...notes];
  next[index] = updated;
  if (!persist(videoId, next)) return { ok: false, error: "storage" };
  return { ok: true, value: updated };
}

/** Remove one note. Deleting a note that is already gone is not an error. */
export function removeNote(
  videoId: string,
  noteId: string,
): NotesResult<true> {
  if (typeof window === "undefined") {
    return { ok: false, error: "storage" };
  }

  const notes = readBucketRaw(videoId);
  if (!notes) return { ok: true, value: true };
  const next = notes.filter((note) => note.id !== noteId);
  if (next.length === notes.length) return { ok: true, value: true };
  if (!persist(videoId, next)) return { ok: false, error: "storage" };
  return { ok: true, value: true };
}

/* -------------------------------------------------------------------------- */
/* React bindings                                                             */
/* -------------------------------------------------------------------------- */

function videoSnapshot(videoId: string): LearningNote[] {
  const cached = videoCache.get(videoId);
  if (cached) return cached;
  const notes = notesForVideo(videoId);
  videoCache.set(videoId, notes);
  return notes;
}

function allNotesSnapshot(): LearningNote[] {
  if (!allCache) allCache = allNotes();
  return allCache;
}

/** Reactive notes for one video (re-renders on add/edit/delete and cross-tab). */
export function useVideoNotes(videoId: string): LearningNote[] {
  const getSnapshot = React.useCallback(
    () => videoSnapshot(videoId),
    [videoId],
  );
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reactive list of every note saved in this browser. */
export function useAllNotes(): LearningNote[] {
  return React.useSyncExternalStore(
    subscribe,
    allNotesSnapshot,
    getServerSnapshot,
  );
}

// Adopt notes from the previous implementation as soon as this module loads in
// a browser, so the first read already sees them.
if (typeof window !== "undefined") {
  bindStorageEvents();
  migrateLegacyNotes();
}
