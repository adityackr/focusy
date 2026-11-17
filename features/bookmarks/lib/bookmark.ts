import { formatTimestamp } from "@/shared/lib/chapters";

/**
 * Bookmarks point at one moment of a lesson: a short description plus the
 * absolute playback time it belongs to. Saved with the lesson source so the
 * bookmarks page can link straight back into the player.
 */

/** A bookmark description is a short reminder, not a note. */
export const MAX_BOOKMARK_DESCRIPTION_LENGTH = 280;

export type BookmarkSource =
  | {
      kind: "playlist";
      playlistId: string;
      videoId: string;
      /** Lesson title at the time it was bookmarked. */
      title: string;
      collectionTitle: string;
    }
  | {
      kind: "course";
      courseId: string;
      videoId: string;
      title: string;
      collectionTitle: string;
    };

export interface Bookmark {
  id: string;
  videoId: string;
  /** Null for bookmarks whose lesson has since left the library. */
  source: BookmarkSource | null;
  /** Absolute playback time in the video, in whole seconds. */
  timeSeconds: number;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkInput {
  videoId: string;
  source?: BookmarkSource | null;
  timeSeconds: number;
  description: string;
}

export interface BookmarkPatch {
  description?: string;
  timeSeconds?: number;
}

export type BookmarksError = "empty" | "too-long" | "not-found" | "storage";

export type BookmarkResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: BookmarksError };

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
export function normalizeTime(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
}

export function normalizeSource(raw: unknown): BookmarkSource | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  const videoId = str(raw.videoId);
  if (!videoId) return null;

  if (kind === "playlist") {
    const playlistId = str(raw.playlistId);
    if (!playlistId) return null;
    return {
      kind,
      playlistId,
      videoId,
      title: str(raw.title),
      collectionTitle: str(raw.collectionTitle) || str(raw.title),
    };
  }
  if (kind === "course") {
    const courseId = str(raw.courseId);
    if (!courseId) return null;
    return {
      kind,
      courseId,
      videoId,
      title: str(raw.title),
      collectionTitle: str(raw.collectionTitle) || str(raw.title),
    };
  }
  return null;
}

/** Drop unreadable entries instead of failing a whole stored list. */
export function normalizeBookmark(raw: unknown): Bookmark | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const videoId = str(raw.videoId);
  const description = str(raw.description).trim();
  const timeSeconds = normalizeTime(raw.timeSeconds);
  if (!id || !videoId || !description || timeSeconds === null) return null;

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
    videoId,
    source: normalizeSource(raw.source),
    timeSeconds,
    description,
    createdAt,
    updatedAt,
  };
}

/** Validate a list from storage or a backup, dropping duplicates by id. */
export function normalizeBookmarks(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Bookmark[] = [];
  for (const entry of raw) {
    const bookmark = normalizeBookmark(entry);
    if (!bookmark || seen.has(bookmark.id)) continue;
    seen.add(bookmark.id);
    out.push(bookmark);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* links and grouping                                                         */
/* -------------------------------------------------------------------------- */

function collectionHref(source: BookmarkSource | null): string | null {
  if (!source) return null;
  return source.kind === "playlist"
    ? `/watch/${encodeURIComponent(source.playlistId)}/${encodeURIComponent(
        source.videoId,
      )}`
    : `/course/${encodeURIComponent(source.courseId)}`;
}

/** Deep link to the bookmarked moment, or null when the lesson is unknown. */
export function bookmarkHref(bookmark: Bookmark): string | null {
  const base = collectionHref(bookmark.source);
  return base ? `${base}?t=${bookmark.timeSeconds}` : null;
}

/** A lesson groups the bookmarks saved in one video from one collection. */
export interface BookmarkLesson {
  /** Stable group key: collection + video. */
  key: string;
  videoId: string;
  title: string;
  collectionTitle: string | null;
  kind: "playlist" | "course" | null;
  /** Lesson link without a timestamp, e.g. to play from the start. */
  lessonHref: string | null;
  /** Playback order. */
  bookmarks: Bookmark[];
}

function lessonKey(bookmark: Bookmark): string {
  const source = bookmark.source;
  if (!source) return `video:${bookmark.videoId}`;
  return source.kind === "playlist"
    ? `playlist:${source.playlistId}:${source.videoId}`
    : `course:${source.courseId}:${source.videoId}`;
}

/**
 * Organize bookmarks by lesson. Lessons are newest activity first; bookmarks
 * inside a lesson stay in playback order.
 */
export function groupBookmarksByLesson(
  bookmarks: Bookmark[],
): BookmarkLesson[] {
  const groups = new Map<string, BookmarkLesson>();
  for (const bookmark of bookmarks) {
    const key = lessonKey(bookmark);
    const source = bookmark.source;
    const existing = groups.get(key);
    if (existing) {
      existing.bookmarks.push(bookmark);
      continue;
    }
    groups.set(key, {
      key,
      videoId: bookmark.videoId,
      title: source?.title || "This lesson",
      collectionTitle: source?.collectionTitle ?? null,
      kind: source?.kind ?? null,
      lessonHref: collectionHref(source),
      bookmarks: [bookmark],
    });
  }

  const out = [...groups.values()];
  for (const lesson of out) {
    lesson.bookmarks.sort(
      (a, b) =>
        a.timeSeconds - b.timeSeconds ||
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id),
    );
  }
  out.sort((a, b) => {
    const at = Math.max(...a.bookmarks.map(latestTouch));
    const bt = Math.max(...b.bookmarks.map(latestTouch));
    return bt - at || a.key.localeCompare(b.key);
  });
  return out;
}

function latestTouch(bookmark: Bookmark): number {
  return Math.max(bookmark.createdAt, bookmark.updatedAt);
}

/** Bookmarks for one video in playback order (used by the lesson panel). */
export function bookmarksForVideo(
  bookmarks: Bookmark[],
  videoId: string,
): Bookmark[] {
  return bookmarks
    .filter((bookmark) => bookmark.videoId === videoId)
    .sort(
      (a, b) =>
        a.timeSeconds - b.timeSeconds ||
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id),
    );
}

/** Filter by description, lesson title, collection or timestamp. */
export function filterBookmarks(
  lessons: BookmarkLesson[],
  query: string,
): BookmarkLesson[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return lessons;

  return lessons
    .map((lesson) => {
      const lessonHaystack = [
        lesson.title,
        lesson.collectionTitle ?? "",
        lesson.kind ?? "",
      ]
        .join("\n")
        .toLowerCase();
      const bookmarks = lesson.bookmarks.filter((bookmark) => {
        const haystack = [
          lessonHaystack,
          bookmark.description,
          formatTimestamp(bookmark.timeSeconds),
          String(bookmark.timeSeconds),
        ]
          .join("\n")
          .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      });
      return { ...lesson, bookmarks };
    })
    .filter((lesson) => lesson.bookmarks.length > 0);
}
