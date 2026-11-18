import * as React from "react";
import {
  bookmarksForVideo as selectForVideo,
  normalizeBookmarks,
  normalizeTime,
  MAX_BOOKMARK_DESCRIPTION_LENGTH,
  type Bookmark,
  type BookmarkInput,
  type BookmarkPatch,
  type BookmarkResult,
} from "./bookmark";

/**
 * Timestamped bookmarks, stored only in this browser's localStorage.
 *
 * One list under a single versioned key keeps the store simple: bookmarks are
 * small, and grouping by lesson happens when reading. Each bookmark carries the
 * lesson source it was saved from, so the bookmarks page can jump back into the
 * player even when the same video appears in several playlists.
 */

export const BOOKMARKS_STORAGE_KEY = "focusy-bookmarks:v1";

const STORAGE_VERSION = 1;

interface StoredBookmarksFile {
  version: typeof STORAGE_VERSION;
  bookmarks: Bookmark[];
}

/* -------------------------------------------------------------------------- */
/* raw storage                                                                */
/* -------------------------------------------------------------------------- */

function readRaw(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const file = parsed as Partial<StoredBookmarksFile>;
    if (file.version !== STORAGE_VERSION) return [];
    return normalizeBookmarks(file.bookmarks);
  } catch {
    return [];
  }
}

function writeRaw(bookmarks: Bookmark[]): boolean {
  try {
    if (bookmarks.length === 0) {
      localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
      return true;
    }
    const file: StoredBookmarksFile = { version: STORAGE_VERSION, bookmarks };
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* cache + subscriptions                                                      */
/* -------------------------------------------------------------------------- */

const EMPTY_BOOKMARKS: Bookmark[] = Object.freeze(
  [],
) as unknown as Bookmark[];

let cache: Bookmark[] | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function invalidate(): void {
  cache = null;
  emit();
}

/** Drop the memoized list, e.g. after storage was cleared outside the store. */
export function invalidateBookmarksCache(): void {
  invalidate();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): Bookmark[] {
  return EMPTY_BOOKMARKS;
}

let storageBound = false;
function bindStorageEvents(): void {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === BOOKMARKS_STORAGE_KEY) {
      invalidate();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* reads                                                                      */
/* -------------------------------------------------------------------------- */

function latestTouch(bookmark: Bookmark): number {
  return Math.max(bookmark.createdAt, bookmark.updatedAt);
}

/** Every bookmark in this browser, most recently saved or edited first. */
export function allBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return EMPTY_BOOKMARKS;
  return [...readRaw()].sort(
    (a, b) => latestTouch(b) - latestTouch(a) || a.id.localeCompare(b.id),
  );
}

/** How many bookmarks are saved in this browser. */
export function bookmarkCount(): number {
  return readRaw().length;
}

function snapshot(): Bookmark[] {
  if (!cache) cache = allBookmarks();
  return cache;
}

/* -------------------------------------------------------------------------- */
/* writes                                                                     */
/* -------------------------------------------------------------------------- */

function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof crypto.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `bookmark-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function validateDescription(
  description: string,
): "empty" | "too-long" | null {
  const trimmed = description.trim();
  if (!trimmed) return "empty";
  if (trimmed.length > MAX_BOOKMARK_DESCRIPTION_LENGTH) return "too-long";
  return null;
}

function persist(bookmarks: Bookmark[]): boolean {
  const ok = writeRaw(bookmarks);
  if (ok) invalidate();
  return ok;
}

/** Save a moment with a short description. */
export function addBookmark(input: BookmarkInput): BookmarkResult<Bookmark> {
  if (typeof window === "undefined") return { ok: false, error: "storage" };

  const videoId = input.videoId.trim();
  if (!videoId) return { ok: false, error: "empty" };

  const invalid = validateDescription(input.description);
  if (invalid) return { ok: false, error: invalid };

  const now = Date.now();
  const bookmark: Bookmark = {
    id: createId(),
    videoId,
    source: input.source ?? null,
    timeSeconds: normalizeTime(input.timeSeconds) ?? 0,
    description: input.description.trim(),
    createdAt: now,
    updatedAt: now,
  };

  if (!persist([...readRaw(), bookmark])) {
    return { ok: false, error: "storage" };
  }
  return { ok: true, value: bookmark };
}

/** Edit a bookmark's description or timestamp. */
export function updateBookmark(
  id: string,
  patch: BookmarkPatch,
): BookmarkResult<Bookmark> {
  if (typeof window === "undefined") return { ok: false, error: "storage" };

  const bookmarks = readRaw();
  const index = bookmarks.findIndex((bookmark) => bookmark.id === id);
  if (index < 0) return { ok: false, error: "not-found" };

  let description = bookmarks[index].description;
  if (patch.description !== undefined) {
    const invalid = validateDescription(patch.description);
    if (invalid) return { ok: false, error: invalid };
    description = patch.description.trim();
  }

  const updated: Bookmark = {
    ...bookmarks[index],
    description,
    ...(patch.timeSeconds !== undefined
      ? { timeSeconds: normalizeTime(patch.timeSeconds) ?? 0 }
      : {}),
    updatedAt: Date.now(),
  };

  const next = [...bookmarks];
  next[index] = updated;
  if (!persist(next)) return { ok: false, error: "storage" };
  return { ok: true, value: updated };
}

/** Delete a bookmark. Removing one that is already gone is not an error. */
export function removeBookmark(id: string): BookmarkResult<true> {
  if (typeof window === "undefined") return { ok: false, error: "storage" };

  const bookmarks = readRaw();
  const next = bookmarks.filter((bookmark) => bookmark.id !== id);
  if (next.length === bookmarks.length) return { ok: true, value: true };
  if (!persist(next)) return { ok: false, error: "storage" };
  return { ok: true, value: true };
}

/** Remove every bookmark saved for a video. Used when the video is deleted. */
export function removeBookmarksForVideo(videoId: string): boolean {
  if (typeof window === "undefined") return false;
  const bookmarks = readRaw();
  const next = bookmarks.filter((bookmark) => bookmark.videoId !== videoId);
  if (next.length === bookmarks.length) return true;
  return persist(next);
}

/* -------------------------------------------------------------------------- */
/* backup helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Replace every bookmark, e.g. when restoring a backup. */
export function replaceBookmarks(bookmarks: Bookmark[]): void {
  if (typeof window === "undefined") return;
  persist(normalizeBookmarks(bookmarks));
}

/**
 * Merge incoming bookmarks without deleting anything. Bookmarks are immutable
 * records with unique ids: an incoming edit only wins when it is newer.
 * Returns how many entries were added or refreshed.
 */
export function mergeBookmarks(bookmarks: Bookmark[]): number {
  if (typeof window === "undefined") return 0;

  const local = readRaw();
  const byId = new Map(local.map((bookmark) => [bookmark.id, bookmark]));
  let changed = 0;
  for (const incoming of normalizeBookmarks(bookmarks)) {
    const current = byId.get(incoming.id);
    if (current && current.updatedAt >= incoming.updatedAt) continue;
    byId.set(incoming.id, incoming);
    changed++;
  }

  if (changed > 0) persist([...byId.values()]);
  return changed;
}

/* -------------------------------------------------------------------------- */
/* React bindings                                                             */
/* -------------------------------------------------------------------------- */

/** Reactive list of every bookmark, newest activity first. */
export function useAllBookmarks(): Bookmark[] {
  return React.useSyncExternalStore(subscribe, snapshot, getServerSnapshot);
}

/** Reactive bookmarks for one video, in playback order. */
export function useVideoBookmarks(videoId: string): Bookmark[] {
  const bookmarks = useAllBookmarks();
  return React.useMemo(
    () => selectForVideo(bookmarks, videoId),
    [bookmarks, videoId],
  );
}

if (typeof window !== "undefined") {
  bindStorageEvents();
}
