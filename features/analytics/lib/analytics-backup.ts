import {
  ANALYTICS_SCHEMA_VERSION,
  type AnalyticsBackupData,
} from "../types/analytics.types";
import {
  getAnalyticsSnapshot,
  mergeAnalyticsData,
  normalizeAnalytics,
  replaceAnalytics,
} from "./analytics-store";

export type AnalyticsRestoreMode = "replace" | "merge";

export type AnalyticsRestoreResult =
  | { ok: true; daysImported: number }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Snapshot analytics for a backup file (collected synchronously). */
export function collectAnalyticsBackup(): AnalyticsBackupData {
  const data = getAnalyticsSnapshot();
  return {
    version: ANALYTICS_SCHEMA_VERSION,
    days: data.days,
    events: data.events,
    goals: data.goals,
    hourSeconds: data.hourSeconds,
    completedCourses: data.completedCourses,
  };
}

/** Whether a backup actually carries learning history worth restoring. */
export function analyticsBackupHasData(raw: unknown): boolean {
  if (!isRecord(raw) || !isRecord(raw.days)) return false;
  return Object.keys(raw.days).length > 0;
}

/**
 * Restore the analytics section of a Focusy backup. Replace swaps the whole
 * history; merge adds the file's counts to this browser's and keeps the local
 * personal goals. Unreadable sections leave the current data untouched.
 */
export function restoreAnalyticsBackup(
  raw: unknown,
  mode: AnalyticsRestoreMode
): AnalyticsRestoreResult {
  if (!isRecord(raw)) {
    return { ok: false, error: "This backup's learning history isn't readable." };
  }

  const incoming = normalizeAnalytics(raw);
  const daysImported = Object.keys(incoming.days).length;
  const empty =
    daysImported === 0 &&
    incoming.events.length === 0 &&
    Object.keys(incoming.completedCourses).length === 0;
  if (empty && mode === "replace") {
    return { ok: false, error: "This backup has no learning history to restore." };
  }

  if (mode === "merge") {
    replaceAnalytics(mergeAnalyticsData(getAnalyticsSnapshot(), incoming));
  } else {
    replaceAnalytics(incoming);
  }
  return { ok: true, daysImported };
}
