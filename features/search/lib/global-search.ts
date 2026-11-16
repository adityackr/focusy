import type { Course, Playlist } from "@/shared/lib/types";
import { formatTimestamp } from "@/shared/lib/chapters";
import { notePreview } from "@/shared/lib/note-preview";

/**
 * Pure global-search matching, grouping and ranking. The dialog supplies local
 * library data; this module only turns it into navigable result rows so it can
 * be tested without React or storage.
 */

export type GlobalSearchGroupId =
  | "videos"
  | "playlists"
  | "lessons"
  | "notes"
  | "bookmarks"
  | "projects";

export const GLOBAL_SEARCH_GROUP_ORDER: GlobalSearchGroupId[] = [
  "videos",
  "playlists",
  "lessons",
  "notes",
  "bookmarks",
  "projects",
];

export const GLOBAL_SEARCH_GROUP_LABELS: Record<GlobalSearchGroupId, string> = {
  videos: "Videos",
  playlists: "Playlists",
  lessons: "Lessons",
  notes: "Notes",
  bookmarks: "Bookmarks",
  projects: "Projects",
};

/** How many matches each group shows before the "and N more" hint. */
export const GLOBAL_SEARCH_GROUP_LIMIT = 6;

export interface GlobalSearchItem {
  /** Unique within its group. */
  id: string;
  group: GlobalSearchGroupId;
  title: string;
  subtitle: string | null;
  /** Extra one-line preview (notes). */
  snippet: string | null;
  /** In-app destination; null for results that cannot be opened. */
  href: string | null;
  thumbnail: string | null;
}

export interface GlobalSearchGroup {
  id: GlobalSearchGroupId;
  label: string;
  /** Ranked matches, capped at the group limit. */
  items: GlobalSearchItem[];
  /** Every match in this group, before the limit. */
  total: number;
}

export interface GlobalSearchResults {
  groups: GlobalSearchGroup[];
  total: number;
}

/** A note resolved to its current lesson context by the notes feature. */
export interface GlobalSearchNoteInput {
  id: string;
  markdown: string;
  lessonTitle: string;
  collectionTitle: string | null;
  href: string | null;
  timeSeconds: number | null;
}

/** A Studio project, already linked to its lesson by the dialog. */
export interface GlobalSearchProjectInput {
  id: string;
  name: string;
  subtitle: string | null;
  href: string | null;
}

export interface GlobalSearchInput {
  query: string;
  courses: Course[];
  playlists: Playlist[];
  notes: GlobalSearchNoteInput[];
  projects: GlobalSearchProjectInput[];
  courseFavorites: string[];
  playlistFavorites: string[];
  limit?: number;
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

function courseHref(courseId: string): string {
  return `/course/${encode(courseId)}`;
}

function playlistHref(playlistId: string): string {
  return `/watch/${encode(playlistId)}`;
}

function lessonHref(playlistId: string, videoId: string): string {
  return `/watch/${encode(playlistId)}/${encode(videoId)}`;
}

function playlistTitle(playlist: Playlist): string {
  return playlist.playlistTitle || "Playlist";
}

function courseSubtitle(course: Course): string {
  const lessons = `${course.chapters.length} lesson${course.chapters.length === 1 ? "" : "s"}`;
  return course.channelTitle ? `${lessons} · ${course.channelTitle}` : lessons;
}

/* -------------------------------------------------------------------------- */
/* matching + ranking                                                         */
/* -------------------------------------------------------------------------- */

interface Candidate {
  item: GlobalSearchItem;
  /** Fields the query may match beyond the title. */
  supporting: string;
  /** Position in the source list, used as a stable tiebreaker. */
  index: number;
}

function queryTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Score a candidate against the query, or -1 when any query word is missing.
 * Title matches outrank supporting-field matches, and exact/prefix title hits
 * outrank a mid-title hit.
 */
function scoreCandidate(
  title: string,
  supporting: string,
  tokens: string[],
  phrase: string,
): number {
  const lowerTitle = title.toLowerCase();
  const lowerSupporting = supporting.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (lowerTitle.includes(token)) score += 8;
    else if (lowerSupporting.includes(token)) score += 3;
    else return -1;
  }

  if (lowerTitle === phrase) score += 60;
  else if (lowerTitle.startsWith(phrase)) score += 35;
  else if (lowerTitle.includes(phrase)) score += 20;

  return score;
}

function rankCandidates(
  candidates: Candidate[],
  tokens: string[],
  phrase: string,
  limit: number,
): { items: GlobalSearchItem[]; total: number } {
  const matches: { candidate: Candidate; score: number }[] = [];
  for (const candidate of candidates) {
    const score = scoreCandidate(
      candidate.item.title,
      candidate.supporting,
      tokens,
      phrase,
    );
    if (score >= 0) matches.push({ candidate, score });
  }

  matches.sort(
    (a, b) =>
      b.score - a.score ||
      a.candidate.index - b.candidate.index ||
      a.candidate.item.title.localeCompare(b.candidate.item.title),
  );

  return {
    total: matches.length,
    items: matches.slice(0, limit).map((match) => match.candidate.item),
  };
}

/* -------------------------------------------------------------------------- */
/* candidate builders                                                         */
/* -------------------------------------------------------------------------- */

function courseCandidate(course: Course, index: number): Candidate {
  return {
    index,
    supporting: [course.channelTitle ?? "", course.title].join("\n"),
    item: {
      id: course.id,
      group: "videos",
      title: course.title,
      subtitle: courseSubtitle(course),
      snippet: null,
      href: courseHref(course.id),
      thumbnail: `https://i.ytimg.com/vi/${course.videoId}/mqdefault.jpg`,
    },
  };
}

function playlistCandidate(playlist: Playlist, index: number): Candidate {
  return {
    index,
    supporting: [playlist.channelTitle, playlist.playlistDescription].join("\n"),
    item: {
      id: playlist.playlistId,
      group: "playlists",
      title: playlistTitle(playlist),
      subtitle: `${playlist.videos.length} video${
        playlist.videos.length === 1 ? "" : "s"
      }${playlist.channelTitle ? ` · ${playlist.channelTitle}` : ""}`,
      snippet: null,
      href: playlistHref(playlist.playlistId),
      thumbnail: playlist.playlistThumbnail?.url ?? null,
    },
  };
}

function lessonCandidates(courses: Course[], playlists: Playlist[]): Candidate[] {
  const candidates: Candidate[] = [];
  let index = 0;

  for (const course of courses) {
    for (const chapter of course.chapters) {
      candidates.push({
        index: index++,
        supporting: [course.title, course.channelTitle ?? ""].join("\n"),
        item: {
          id: `${course.id}:${chapter.id}`,
          group: "lessons",
          title: chapter.title,
          subtitle: course.title,
          snippet: null,
          href: `${courseHref(course.id)}?t=${Math.max(0, Math.floor(chapter.startSeconds))}`,
          thumbnail: `https://i.ytimg.com/vi/${course.videoId}/default.jpg`,
        },
      });
    }
  }

  for (const playlist of playlists) {
    for (const video of playlist.videos) {
      candidates.push({
        index: index++,
        supporting: [playlistTitle(playlist), playlist.channelTitle].join("\n"),
        item: {
          id: `${playlist.playlistId}:${video.videoId}`,
          group: "lessons",
          title: video.title,
          subtitle: playlistTitle(playlist),
          snippet: null,
          href: lessonHref(playlist.playlistId, video.videoId),
          thumbnail: video.thumbnail?.url ?? null,
        },
      });
    }
  }

  return candidates;
}

function noteCandidates(notes: GlobalSearchNoteInput[]): Candidate[] {
  return notes.map((note, index) => ({
    index,
    supporting: [
      note.collectionTitle ?? "",
      note.markdown,
      note.timeSeconds === null ? "" : formatTimestamp(note.timeSeconds),
      note.timeSeconds === null ? "" : String(note.timeSeconds),
    ].join("\n"),
    item: {
      id: note.id,
      group: "notes",
      title: note.lessonTitle,
      subtitle:
        note.collectionTitle && note.collectionTitle !== note.lessonTitle
          ? note.collectionTitle
          : "Note",
      snippet: notePreview(note.markdown) || null,
      href: note.href,
      thumbnail: null,
    },
  }));
}

function bookmarkCandidates(
  playlists: Playlist[],
  courses: Course[],
  playlistFavorites: string[],
  courseFavorites: string[],
): Candidate[] {
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const playlistsById = new Map(
    playlists.map((playlist) => [playlist.playlistId, playlist]),
  );

  const candidates: Candidate[] = [];
  let index = 0;

  for (const playlistId of playlistFavorites) {
    const playlist = playlistsById.get(playlistId);
    if (!playlist) continue; // favorited item that has since been deleted
    candidates.push({
      index: index++,
      supporting: [playlist.channelTitle, playlist.playlistDescription].join("\n"),
      item: {
        id: `playlist:${playlistId}`,
        group: "bookmarks",
        title: playlistTitle(playlist),
        subtitle: `Favorite playlist${playlist.channelTitle ? ` · ${playlist.channelTitle}` : ""}`,
        snippet: null,
        href: playlistHref(playlist.playlistId),
        thumbnail: playlist.playlistThumbnail?.url ?? null,
      },
    });
  }

  for (const courseId of courseFavorites) {
    const course = coursesById.get(courseId);
    if (!course) continue;
    candidates.push({
      index: index++,
      supporting: [course.channelTitle ?? "", course.title].join("\n"),
      item: {
        id: `course:${courseId}`,
        group: "bookmarks",
        title: course.title,
        subtitle: `Favorite video${course.channelTitle ? ` · ${course.channelTitle}` : ""}`,
        snippet: null,
        href: courseHref(course.id),
        thumbnail: `https://i.ytimg.com/vi/${course.videoId}/mqdefault.jpg`,
      },
    });
  }

  return candidates;
}

function projectCandidates(projects: GlobalSearchProjectInput[]): Candidate[] {
  return projects.map((project, index) => ({
    index,
    supporting: project.subtitle ?? "",
    item: {
      id: project.id,
      group: "projects",
      title: project.name,
      subtitle: project.subtitle,
      snippet: null,
      href: project.href,
      thumbnail: null,
    },
  }));
}

/* -------------------------------------------------------------------------- */
/* entry point                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Search every content type at once. Every query word must appear in a result
 * (title or supporting fields); results are ranked per group and each group is
 * capped so one large category cannot bury the others.
 */
export function buildGlobalSearchResults(
  input: GlobalSearchInput,
): GlobalSearchResults {
  const tokens = queryTokens(input.query);
  if (tokens.length === 0) return { groups: [], total: 0 };

  const phrase = tokens.join(" ");
  const limit = input.limit ?? GLOBAL_SEARCH_GROUP_LIMIT;

  const candidates: Record<GlobalSearchGroupId, Candidate[]> = {
    videos: input.courses.map(courseCandidate),
    playlists: input.playlists.map(playlistCandidate),
    lessons: lessonCandidates(input.courses, input.playlists),
    notes: noteCandidates(input.notes),
    bookmarks: bookmarkCandidates(
      input.playlists,
      input.courses,
      input.playlistFavorites,
      input.courseFavorites,
    ),
    projects: projectCandidates(input.projects),
  };

  const groups: GlobalSearchGroup[] = [];
  let total = 0;

  for (const id of GLOBAL_SEARCH_GROUP_ORDER) {
    const ranked = rankCandidates(candidates[id], tokens, phrase, limit);
    if (ranked.total === 0) continue;
    total += ranked.total;
    groups.push({
      id,
      label: GLOBAL_SEARCH_GROUP_LABELS[id],
      items: ranked.items,
      total: ranked.total,
    });
  }

  return { groups, total };
}
