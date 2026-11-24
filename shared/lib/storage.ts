import type { CourseProgress } from "./types";

// Keys intentionally keep the Chapterly prefix so existing Chapterly users
// keep their saved key and progress after the merge.
const API_KEY = "yt-course:api-key";
const PROGRESS_PREFIX = "yt-course:progress:";
const PLAYLIST_PROGRESS_PREFIX = "focustube:progress:";
const LEGACY_PLAYLIST_PROGRESS_PREFIX = "clean-youtube:progress:";
const PLAYLIST_COMPLETED_PREFIX = "focustube:playlist-completed:";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** The user's YouTube Data API v3 key, stored only in this browser. */
export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(API_KEY) ?? "").trim();
}

/**
 * Fired on `window` after the key changes, so UI showing the key (like the
 * Settings input) picks up writes made elsewhere, such as a backup restore.
 */
export const API_KEY_CHANGED_EVENT = "focusy:api-key-changed";

export function setApiKey(key: string): void {
  if (key.trim()) localStorage.setItem(API_KEY, key.trim());
  else localStorage.removeItem(API_KEY);
  if (typeof window !== "undefined") {
    // Construct through `window` so the event matches the window's EventTarget
    // (and test environments that stub a separate global `Event`).
    window.dispatchEvent(new window.Event(API_KEY_CHANGED_EVENT));
  }
}

export function getProgress(courseId: string): CourseProgress {
  if (typeof window === "undefined")
    return { completedIds: [], lastChapterId: null, updatedAt: 0, positions: {} };
  const raw = safeParse<CourseProgress>(
    localStorage.getItem(PROGRESS_PREFIX + courseId),
    {
      completedIds: [],
      lastChapterId: null,
      updatedAt: 0,
    }
  );
  // Migrate old shapes: guarantee arrays/maps so resume lookups never crash.
  return {
    completedIds: Array.isArray(raw.completedIds) ? raw.completedIds : [],
    lastChapterId: raw.lastChapterId ?? null,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
    positions:
      raw.positions && typeof raw.positions === "object" ? raw.positions : {},
  };
}

export function setProgress(courseId: string, progress: CourseProgress): void {
  localStorage.setItem(
    PROGRESS_PREFIX + courseId,
    JSON.stringify({ ...progress, updatedAt: Date.now() })
  );
}

/** Drop a course's saved progress (called when the course is deleted). */
export function clearProgress(courseId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROGRESS_PREFIX + courseId);
}

export interface PlaylistProgress {
  watched: string[];
  lastWatched: string | null;
  completedChapters: string[];
  /** Last playback position per video (seconds). */
  positions: Record<string, number>;
}

const EMPTY_PLAYLIST_PROGRESS: PlaylistProgress = {
  watched: [],
  lastWatched: null,
  completedChapters: [],
  positions: {},
};

/** Read a playlist's watch progress without migrating or writing anything. */
export function getPlaylistProgress(playlistId: string): PlaylistProgress {
  if (typeof window === "undefined" || !playlistId) {
    return { ...EMPTY_PLAYLIST_PROGRESS };
  }

  const raw = safeParse<Record<string, unknown> | null>(
    localStorage.getItem(PLAYLIST_PROGRESS_PREFIX + playlistId) ??
      localStorage.getItem(LEGACY_PLAYLIST_PROGRESS_PREFIX + playlistId),
    null,
  );
  if (!raw) return { ...EMPTY_PLAYLIST_PROGRESS };

  const positions: Record<string, number> = {};
  if (raw.positions && typeof raw.positions === "object") {
    for (const [videoId, value] of Object.entries(
      raw.positions as Record<string, unknown>,
    )) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        positions[videoId] = Math.floor(value);
      }
    }
  }

  return {
    watched: Array.isArray(raw.watched)
      ? raw.watched.filter((id): id is string => typeof id === "string")
      : [],
    lastWatched: typeof raw.lastWatched === "string" ? raw.lastWatched : null,
    completedChapters: Array.isArray(raw.completedChapters)
      ? raw.completedChapters.filter(
          (key): key is string => typeof key === "string",
        )
      : [],
    positions,
  };
}

/** When this playlist first became fully watched, or null if never. */
export function getPlaylistCompletedAt(playlistId: string): number | null {
  if (typeof window === "undefined" || !playlistId) return null;
  const value = Number(localStorage.getItem(PLAYLIST_COMPLETED_PREFIX + playlistId));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Remember the first time a playlist became fully watched (idempotent). */
export function setPlaylistCompletedAt(
  playlistId: string,
  at = Date.now(),
): void {
  if (typeof window === "undefined" || !playlistId) return;
  if (getPlaylistCompletedAt(playlistId) !== null) return;
  localStorage.setItem(PLAYLIST_COMPLETED_PREFIX + playlistId, String(at));
}

/** Drop a playlist's saved progress (called when the playlist is deleted). */
export function clearPlaylistProgress(playlistId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLAYLIST_PROGRESS_PREFIX + playlistId);
  localStorage.removeItem(LEGACY_PLAYLIST_PROGRESS_PREFIX + playlistId);
  localStorage.removeItem(PLAYLIST_COMPLETED_PREFIX + playlistId);
}