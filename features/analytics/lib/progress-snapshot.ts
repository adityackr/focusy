import { getProgress } from "@/shared/lib/storage";
import type { Course, Playlist } from "@/shared/lib/types";
import type {
  AnalyticsData,
  CourseProgressItem,
} from "../types/analytics.types";

const PLAYLIST_PROGRESS_PREFIX = "focustube:progress:";
const LEGACY_PLAYLIST_PROGRESS_PREFIX = "clean-youtube:progress:";

export interface PlaylistProgressSnapshot {
  watched: string[];
  lastWatched: string | null;
  completedChapters: string[];
  positions: Record<string, number>;
}

function parsePositions(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      out[id] = value;
    }
  }
  return out;
}

/**
 * Read one playlist's watch progress without running its migration or writing
 * anything. Analytics is a read-only observer of existing progress data.
 */
export function readPlaylistProgress(
  playlistId: string
): PlaylistProgressSnapshot {
  const empty: PlaylistProgressSnapshot = {
    watched: [],
    lastWatched: null,
    completedChapters: [],
    positions: {},
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw =
      localStorage.getItem(PLAYLIST_PROGRESS_PREFIX + playlistId) ??
      localStorage.getItem(LEGACY_PLAYLIST_PROGRESS_PREFIX + playlistId);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PlaylistProgressSnapshot>;
    return {
      watched: Array.isArray(parsed.watched)
        ? parsed.watched.filter((id): id is string => typeof id === "string")
        : [],
      lastWatched:
        typeof parsed.lastWatched === "string" ? parsed.lastWatched : null,
      completedChapters: Array.isArray(parsed.completedChapters)
        ? parsed.completedChapters.filter(
            (id): id is string => typeof id === "string"
          )
        : [],
      positions: parsePositions(parsed.positions),
    };
  } catch {
    return empty;
  }
}

function learningSecondsFor(
  data: AnalyticsData,
  kind: "course" | "playlist",
  id: string
): number {
  const key = `${kind}:${id}`;
  return Object.values(data.days).reduce(
    (total, day) => total + (day.sources[key] ?? 0),
    0
  );
}

function statusOf(
  completed: number,
  total: number
): CourseProgressItem["status"] {
  if (total > 0 && completed >= total) return "completed";
  if (completed > 0) return "in-progress";
  return "not-started";
}

export interface ProgressItemsInput {
  playlists: Playlist[];
  courses: Course[];
  /** Library recent arrays, newest first. */
  recent: string[];
  courseRecent: string[];
  data: AnalyticsData;
}

/** Every saved video course and playlist with its current completion state. */
export function buildProgressItems({
  playlists,
  courses,
  recent,
  courseRecent,
  data,
}: ProgressItemsInput): CourseProgressItem[] {
  const items: CourseProgressItem[] = [];

  for (const course of courses) {
    const progress = getProgress(course.id);
    const completed = progress.completedIds.filter((id) =>
      course.chapters.some((chapter) => chapter.id === id)
    ).length;
    const total = course.chapters.length;
    const recentIndex = courseRecent.indexOf(course.id);
    items.push({
      kind: "course",
      id: course.id,
      title: course.title,
      thumbnail: course.thumbnail,
      channelTitle: course.channelTitle,
      total,
      completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      status: statusOf(completed, total),
      href: `/watch/${course.id}`,
      learningSeconds: learningSecondsFor(data, "course", course.id),
      recentIndex: recentIndex >= 0 ? recentIndex : null,
    });
  }

  for (const playlist of playlists) {
    const progress = readPlaylistProgress(playlist.playlistId);
    const ids = new Set(playlist.videos.map((video) => video.videoId));
    const completed = progress.watched.filter((id) => ids.has(id)).length;
    const total = playlist.videos.length;
    const recentIndex = recent.indexOf(playlist.playlistId);
    items.push({
      kind: "playlist",
      id: playlist.playlistId,
      title: playlist.playlistTitle,
      thumbnail: playlist.playlistThumbnail.url,
      channelTitle: playlist.channelTitle,
      total,
      completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      status: statusOf(completed, total),
      href: `/watch/${playlist.playlistId}`,
      learningSeconds: learningSecondsFor(data, "playlist", playlist.playlistId),
      recentIndex: recentIndex >= 0 ? recentIndex : null,
    });
  }

  return items;
}

/* -------------------------------------------------------------------------- */
/* continue learning                                                          */
/* -------------------------------------------------------------------------- */

export interface ContinuePlaylist {
  playlist: Playlist;
  videoTitle: string | null;
  videoId: string | null;
  positionSeconds: number | null;
  completed: number;
  total: number;
  percent: number;
  href: string;
}

export interface ContinueCourse {
  course: Course;
  chapterTitle: string | null;
  positionSeconds: number | null;
  completed: number;
  total: number;
  percent: number;
  href: string;
}

export interface ContinueLearning {
  playlist: ContinuePlaylist | null;
  course: ContinueCourse | null;
}

function playlistHref(id: string, videoId: string | null, position: number | null) {
  if (!videoId) return `/watch/${id}`;
  return position != null && position >= 5
    ? `/watch/${id}/${videoId}?t=${Math.floor(position)}`
    : `/watch/${id}/${videoId}`;
}

/** The most recent unfinished (or most recent) place in each content type. */
export function continueLearning(
  playlists: Playlist[],
  courses: Course[],
  recent: string[],
  courseRecent: string[]
): ContinueLearning {
  const byPlaylistId = new Map(playlists.map((p) => [p.playlistId, p]));
  const playlistOrder = [
    ...recent.map((id) => byPlaylistId.get(id)).filter((p): p is Playlist => Boolean(p)),
    ...playlists,
  ];

  let playlist: ContinuePlaylist | null = null;
  for (const candidate of playlistOrder) {
    const progress = readPlaylistProgress(candidate.playlistId);
    const ids = new Set(candidate.videos.map((video) => video.videoId));
    const completed = progress.watched.filter((id) => ids.has(id)).length;
    if (candidate.videos.length === 0) continue;
    if (completed >= candidate.videos.length) continue;
    const video =
      candidate.videos.find((v) => v.videoId === progress.lastWatched) ??
      candidate.videos.find((v) => !progress.watched.includes(v.videoId)) ??
      candidate.videos[0];
    const position = video ? progress.positions[video.videoId] ?? null : null;
    playlist = {
      playlist: candidate,
      videoTitle: video?.title ?? null,
      videoId: video?.videoId ?? null,
      positionSeconds: position,
      completed,
      total: candidate.videos.length,
      percent: Math.round((completed / candidate.videos.length) * 100),
      href: playlistHref(
        candidate.playlistId,
        video?.videoId ?? null,
        position
      ),
    };
    break;
  }

  const byCourseId = new Map(courses.map((c) => [c.id, c]));
  const courseOrder = [
    ...courseRecent.map((id) => byCourseId.get(id)).filter((c): c is Course => Boolean(c)),
    ...courses,
  ];

  let course: ContinueCourse | null = null;
  for (const candidate of courseOrder) {
    if (candidate.chapters.length === 0) continue;
    const progress = getProgress(candidate.id);
    const completed = progress.completedIds.filter((id) =>
      candidate.chapters.some((chapter) => chapter.id === id)
    ).length;
    if (completed >= candidate.chapters.length) continue;
    const chapter =
      candidate.chapters.find((c) => c.id === progress.lastChapterId) ??
      candidate.chapters.find((c) => !progress.completedIds.includes(c.id)) ??
      candidate.chapters[0];
    const position = chapter ? progress.positions?.[chapter.id] ?? null : null;
    course = {
      course: candidate,
      chapterTitle: chapter?.title ?? null,
      positionSeconds: position,
      completed,
      total: candidate.chapters.length,
      percent: Math.round((completed / candidate.chapters.length) * 100),
      href:
        position != null && position >= chapter.startSeconds + 1
          ? `/watch/${candidate.id}?t=${Math.floor(position)}`
          : `/watch/${candidate.id}`,
    };
    break;
  }

  return { playlist, course };
}
