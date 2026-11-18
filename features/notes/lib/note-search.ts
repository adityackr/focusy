import { formatTimestamp } from "@/shared/lib/chapters";
import type { LearningNote } from "@/shared/lib/learning-notes";
import type { Course, Playlist } from "@/shared/lib/types";

export type NoteFilter = "all" | "playlist" | "course";

export interface NoteContext {
  /** In-app lesson URL, including `?t=` when the note has a timestamp. */
  href: string | null;
  lessonTitle: string;
  collectionTitle: string | null;
  kind: "playlist" | "course" | null;
}

export interface NoteEntry {
  note: LearningNote;
  context: NoteContext;
}

function timeSuffix(note: LearningNote): string {
  return note.timeSeconds === null ? "" : `?t=${note.timeSeconds}`;
}

function watchHref(
  playlistId: string,
  videoId: string,
  note: LearningNote,
): string {
  return `/watch/${encodeURIComponent(playlistId)}/${encodeURIComponent(
    videoId,
  )}${timeSuffix(note)}`;
}

function courseHref(courseId: string, note: LearningNote): string {
  return `/watch/${encodeURIComponent(courseId)}${timeSuffix(note)}`;
}

/**
 * Where a saved note lives now: its recorded source, or the first matching
 * course/playlist for notes saved before sources existed.
 */
export function resolveNoteContext(
  note: LearningNote,
  playlists: Record<string, Playlist>,
  courses: Record<string, Course>,
): NoteContext {
  const source = note.source;

  if (source?.kind === "playlist") {
    const playlist = playlists[source.playlistId];
    const video = playlist?.videos.find((v) => v.videoId === source.videoId);
    return {
      href: watchHref(source.playlistId, source.videoId, note),
      lessonTitle: source.title || video?.title || "Lesson",
      collectionTitle: playlist?.playlistTitle ?? null,
      kind: "playlist",
    };
  }

  if (source?.kind === "course") {
    const course = courses[source.courseId];
    return {
      href: courseHref(source.courseId, note),
      lessonTitle: source.title || course?.title || "Lesson",
      collectionTitle: course?.title ?? null,
      kind: "course",
    };
  }

  // Untagged/legacy notes (and old "video" sources) can still jump when the
  // video is in this browser's library.
  const course = Object.values(courses).find((c) => c.videoId === note.videoId);
  if (course) {
    return {
      href: courseHref(course.id, note),
      lessonTitle: course.title,
      collectionTitle: course.title,
      kind: "course",
    };
  }

  for (const playlist of Object.values(playlists)) {
    const video = playlist.videos.find((v) => v.videoId === note.videoId);
    if (video) {
      return {
        href: watchHref(playlist.playlistId, video.videoId, note),
        lessonTitle: video.title,
        collectionTitle: playlist.playlistTitle,
        kind: "playlist",
      };
    }
  }

  return {
    href: null,
    lessonTitle: source?.title || "This lesson",
    collectionTitle: null,
    kind: null,
  };
}

/**
 * Filter notes by lesson/source type and a free-text query. Query words must
 * all appear somewhere in the note, lesson title, collection title, kind or
 * timestamp.
 */
export function filterNoteEntries(
  entries: NoteEntry[],
  query: string,
  filter: NoteFilter,
): NoteEntry[] {
  const scoped =
    filter === "all"
      ? entries
      : entries.filter((entry) => entry.context.kind === filter);

  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return scoped;

  return scoped.filter(({ note, context }) => {
    const haystack = [
      note.markdown,
      context.lessonTitle,
      context.collectionTitle ?? "",
      context.kind ?? "",
      note.timeSeconds === null ? "" : formatTimestamp(note.timeSeconds),
      note.timeSeconds === null ? "" : String(note.timeSeconds),
    ]
      .join("\n")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}
