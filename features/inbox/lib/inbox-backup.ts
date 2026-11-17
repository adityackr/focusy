import { normalizeInboxItems, useInbox } from "./inbox-store";

/**
 * Saved learning-inbox links travel as an additive, optional backup section so
 * older Focusy builds keep reading these files. The section is validated here,
 * where the inbox's own storage rules live.
 */

export const INBOX_BACKUP_SECTION_VERSION = 1;

export type InboxRestoreMode = "replace" | "merge";

export interface InboxBackupData {
  version: typeof INBOX_BACKUP_SECTION_VERSION;
  items: ReturnType<typeof normalizeInboxItems>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function collectInboxBackup(): InboxBackupData {
  return {
    version: INBOX_BACKUP_SECTION_VERSION,
    // Copy the entries so callers can't mutate the live store through the
    // backup section (and vice versa).
    items: useInbox.getState().items.map((item) => ({
      ...item,
      tags: [...item.tags],
    })),
  };
}

export type InboxRestoreResult =
  | { ok: true; itemsAdded: number; itemsRestored: number }
  | { ok: false; error: string };

/**
 * Replace this browser's inbox with the file's, or merge the file's links in.
 * Merging never removes local links and skips videos that are already saved.
 * An older backup without an inbox section leaves the local inbox untouched.
 */
export function restoreInboxBackup(
  raw: unknown,
  mode: InboxRestoreMode = "replace"
): InboxRestoreResult {
  if (raw == null) {
    return { ok: true, itemsAdded: 0, itemsRestored: 0 };
  }
  if (
    !isRecord(raw) ||
    raw.version !== INBOX_BACKUP_SECTION_VERSION ||
    !Array.isArray(raw.items)
  ) {
    return {
      ok: false,
      error: "That backup's inbox links aren't readable.",
    };
  }

  const incoming = normalizeInboxItems(raw.items);

  if (mode === "replace") {
    useInbox.setState({ items: incoming });
    return {
      ok: true,
      itemsAdded: 0,
      itemsRestored: incoming.length,
    };
  }

  const local = useInbox.getState().items;
  const savedVideos = new Set(local.map((item) => item.videoId));
  const added = incoming.filter((item) => !savedVideos.has(item.videoId));
  if (added.length > 0) {
    useInbox.setState({
      items: [...added, ...local].sort((a, b) => b.addedAt - a.addedAt),
    });
  }

  return { ok: true, itemsAdded: added.length, itemsRestored: added.length };
}
