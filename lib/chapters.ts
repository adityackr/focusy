import type { Chapter, PlaylistVideo } from "@/lib/types";

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function toSeconds(h: string | undefined, m: string, sec: string): number {
  const hours = h ? parseInt(h, 10) : 0;
  return hours * 3600 + parseInt(m, 10) * 60 + parseInt(sec, 10);
}

/** M:SS or H:MM:SS timestamp for seekbar / chapter rows (e.g. "12:34", "1:02:03"). */
export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** True if a line looks like a chapter/timestamp entry (e.g. "00:00 Intro"). */
export function isChapterLine(raw: string): boolean {
  const line = raw.trim().replace(/^[(<[]+/, "");
  if (!line) return false;
  return matchChapterLine(line) !== null;
}

const TIMESTAMP_FIRST = /^(?:(\d+):)?([0-5]?\d):([0-5]\d)\b\s*[-–—:|.)\]]?\s*(.+?)\s*$/;
const TIMESTAMP_LAST = /^(.+?)\s+[-–—:|]\s*(?:(\d+):)?([0-5]?\d):([0-5]\d)\s*$/;

/** { start, title } for "00:00 Intro" / "Intro - 00:00" style lines, else null. */
function matchChapterLine(line: string): { start: number; title: string } | null {
  const first = line.match(TIMESTAMP_FIRST);
  if (first) {
    return {
      start: toSeconds(first[1], first[2], first[3]),
      title: first[4].replace(/^[-–—:|.)\]]+\s*/, "").trim(),
    };
  }
  const last = line.match(TIMESTAMP_LAST);
  if (last) {
    const title = last[1].replace(/^[-–—:|.)\]]+\s*/, "").trim();
    if (!title) return null;
    return { start: toSeconds(last[2], last[3], last[4]), title };
  }
  return null;
}

/**
 * Stable identity for a chapter's completion state. Parse-generated chapter
 * ids are random per load, so completion keys off video + start time instead.
 */
export function chapterKey(videoId: string, startSeconds: number): string {
  return `${videoId}@${startSeconds}`;
}

/** Description with chapter/timestamp lines removed, blank runs collapsed. */
export function stripTimestampLines(description: string): string {
  const kept = description
    .split("\n")
    .filter((line) => line.trim() !== "" && !isChapterLine(line));
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Parse YouTube-style chapters from a description / pasted list.
 * Accepts lines like: "00:00 Intro", "05:12 - Setup", "(1:02:03) Deep dive".
 *
 * The last chapter's end is `videoDuration` when known, otherwise null
 * (plays to the end of the video).
 */
export function parseChapters(text: string, videoDuration: number | null = null): Chapter[] {
  const lines = text.split("\n");
  const found: { start: number; title: string }[] = [];

  for (const raw of lines) {
    const line = raw.trim().replace(/^[(<[]+/, "");
    if (!line) continue;
    const hit = matchChapterLine(line);
    if (!hit || !hit.title) continue;
    found.push({ start: hit.start, title: hit.title });
  }

  // sort, dedupe by start (keep first)
  found.sort((a, b) => a.start - b.start);
  const deduped = found.filter((c, i) => i === 0 || c.start !== found[i - 1].start);
  if (deduped.length === 0) return [];

  return deduped.map((c, i) => ({
    id: newId(),
    title: c.title,
    startSeconds: c.start,
    endSeconds:
      i < deduped.length - 1
        ? deduped[i + 1].start
        : videoDuration && videoDuration > c.start
          ? videoDuration
          : null,
  }));
}

// Videos are stable objects in the library store, so parse each description once.
const chaptersCache = new WeakMap<PlaylistVideo, Chapter[]>();

/** Chapters parsed from a video's description, memoized per video object. */
export function chaptersForVideo(video: PlaylistVideo): Chapter[] {
  const cached = chaptersCache.get(video);
  if (cached) return cached;
  const parsed = parseChapters(video.description ?? "");
  chaptersCache.set(video, parsed);
  return parsed;
}
