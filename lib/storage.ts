import type { CourseProgress } from "./types";

// Keys intentionally keep the Chapterly prefix so existing Chapterly users
// keep their saved key and progress after the merge.
const API_KEY = "yt-course:api-key";
const PROGRESS_PREFIX = "yt-course:progress:";

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

export function setApiKey(key: string): void {
  if (key.trim()) localStorage.setItem(API_KEY, key.trim());
  else localStorage.removeItem(API_KEY);
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