import { normalizeBookmarks, type Bookmark } from "./bookmark";
import {
  allBookmarks,
  mergeBookmarks,
  replaceBookmarks,
} from "./bookmark-store";

/**
 * Saved moments travel as an additive, optional backup section so older Focusy
 * builds keep reading these files. The section is validated here, where the
 * bookmark storage rules live.
 */

export const BOOKMARKS_BACKUP_SECTION_VERSION = 1;

export type BookmarksRestoreMode = "replace" | "merge";

export interface BookmarksBackupData {
  version: typeof BOOKMARKS_BACKUP_SECTION_VERSION;
  bookmarks: Bookmark[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function collectBookmarksBackup(): BookmarksBackupData {
  return {
    version: BOOKMARKS_BACKUP_SECTION_VERSION,
    // Copy each entry so callers can't mutate the live store through the
    // backup section (and vice versa).
    bookmarks: allBookmarks().map((bookmark) => ({
      ...bookmark,
      ...(bookmark.source ? { source: { ...bookmark.source } } : {}),
    })),
  };
}

export type BookmarksRestoreResult =
  | { ok: true; bookmarksAdded: number; bookmarksRestored: number }
  | { ok: false; error: string };

/**
 * Replace this browser's bookmarks with the file's, or merge the file's saved
 * moments in. Merging never removes local bookmarks and keeps the newer copy
 * when both sides have the same id. An older backup without a bookmarks
 * section leaves the local bookmarks untouched.
 */
export function restoreBookmarksBackup(
  raw: unknown,
  mode: BookmarksRestoreMode = "replace",
): BookmarksRestoreResult {
  if (raw == null) {
    return { ok: true, bookmarksAdded: 0, bookmarksRestored: 0 };
  }
  if (
    !isRecord(raw) ||
    raw.version !== BOOKMARKS_BACKUP_SECTION_VERSION ||
    !Array.isArray(raw.bookmarks)
  ) {
    return {
      ok: false,
      error: "That backup's bookmarks aren't readable.",
    };
  }

  const incoming = normalizeBookmarks(raw.bookmarks);

  if (mode === "replace") {
    replaceBookmarks(incoming);
    return {
      ok: true,
      bookmarksAdded: 0,
      bookmarksRestored: incoming.length,
    };
  }

  const added = mergeBookmarks(incoming);
  return { ok: true, bookmarksAdded: added, bookmarksRestored: added };
}
