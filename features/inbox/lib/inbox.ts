/**
 * Learning Inbox: YouTube links saved to watch later, organized with tags and
 * a to-watch / watched status. Types and pure helpers live here so filtering
 * and tag cleanup can be tested without React or storage.
 */

export type InboxStatus = "queued" | "watched";

export interface InboxItem {
  id: string;
  videoId: string;
  /** Canonical watch URL, so every link opens the same way. */
  url: string;
  title: string;
  channelTitle: string;
  tags: string[];
  note: string;
  status: InboxStatus;
  addedAt: number;
  watchedAt: number | null;
}

export interface InboxDraft {
  videoId: string;
  title?: string;
  channelTitle?: string;
  tags?: string[];
  note?: string;
}

export type InboxFilter = "queued" | "watched" | "all";

export interface InboxFilterOptions {
  query?: string;
  tag?: string | null;
  status?: InboxFilter;
}

/** At most this many tags per link; the input never grows unbounded. */
export const MAX_INBOX_TAGS = 10;

/** Longest single tag, in characters. */
export const MAX_INBOX_TAG_LENGTH = 24;

export function inboxUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function inboxThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}

/**
 * Clean up a comma- or space-separated tag string (or an array of tags):
 * trim, drop `#` prefixes and blanks, lowercase-insensitive dedupe while
 * keeping the first spelling, cap length and count.
 */
export function normalizeTags(input: string | string[] | undefined): string[] {
  const raw = Array.isArray(input) ? input : (input ?? "").split(",");
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of raw) {
    const tag = String(value)
      .trim()
      .replace(/^#+/, "")
      .trim()
      .slice(0, MAX_INBOX_TAG_LENGTH);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= MAX_INBOX_TAGS) break;
  }

  return tags;
}

export function tagsToInput(tags: string[]): string {
  return tags.join(", ");
}

/** Tags across every saved link, most used first, then alphabetically. */
export function inboxTagList(
  items: InboxItem[]
): { tag: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const item of items) {
    for (const tag of item.tags) {
      const key = tag.toLowerCase();
      const current = counts.get(key);
      if (current) current.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag)
  );
}

export function inboxStatusCounts(items: InboxItem[]): {
  queued: number;
  watched: number;
  all: number;
} {
  let queued = 0;
  for (const item of items) if (item.status === "queued") queued += 1;
  return { queued, watched: items.length - queued, all: items.length };
}

/**
 * Filter saved links by status, an exact tag and a free-text query. Every query
 * word must appear in the title, channel, note or tags.
 */
export function filterInboxItems(
  items: InboxItem[],
  { query = "", tag = null, status = "all" }: InboxFilterOptions = {}
): InboxItem[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const wantedTag = tag?.trim().toLowerCase() || null;

  return items.filter((item) => {
    if (status !== "all" && item.status !== status) return false;
    if (
      wantedTag &&
      !item.tags.some((itemTag) => itemTag.toLowerCase() === wantedTag)
    ) {
      return false;
    }
    if (tokens.length === 0) return true;

    const haystack = [
      item.title,
      item.channelTitle,
      item.note,
      ...item.tags,
    ]
      .join("\n")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

/** `Saved Nov 12, 2026` — a stable, locale-aware label for a saved link. */
export function formatSavedAt(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "Saved";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Saved";
  return `Saved ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)}`;
}
