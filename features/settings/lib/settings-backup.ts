import { getApiKey, setApiKey } from "@/shared/lib/storage";

/**
 * Device settings travel as an additive, optional backup section, and only the
 * YouTube API key is ever included — and only when the user ticks the option on
 * download. Player preferences and reminder settings stay out of backup files.
 */

export const SETTINGS_BACKUP_SECTION_VERSION = 1;

export interface SettingsBackupSection {
  version: typeof SETTINGS_BACKUP_SECTION_VERSION;
  /** Null when the key was not included (the default). */
  apiKey: string | null;
}

export type SettingsRestoreMode = "replace" | "merge";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Snapshot the settings worth carrying to another device. Returns null unless
 * the caller opts in and a key is actually saved, so ordinary backups stay
 * exactly as they were.
 */
export function collectSettingsBackup(
  includeApiKey = false,
): SettingsBackupSection | null {
  const apiKey = includeApiKey ? getApiKey().trim() : "";
  if (!apiKey) return null;
  return { version: SETTINGS_BACKUP_SECTION_VERSION, apiKey };
}

/** Validate a settings section from any backup shape; junk is ignored. */
export function normalizeSettingsBackup(
  raw: unknown,
): SettingsBackupSection | null {
  if (!isRecord(raw) || raw.version !== SETTINGS_BACKUP_SECTION_VERSION) {
    return null;
  }
  const apiKey = typeof raw.apiKey === "string" ? raw.apiKey.trim() : "";
  if (!apiKey) return null;
  return { version: SETTINGS_BACKUP_SECTION_VERSION, apiKey };
}

/**
 * Replace adopts the file's key; merge only adopts it when this browser has no
 * key yet. A backup without a settings section leaves the local key alone, so
 * restoring an ordinary backup never wipes it. Returns whether a key was
 * written.
 */
export function restoreSettingsBackup(
  raw: unknown,
  mode: SettingsRestoreMode = "replace",
): boolean {
  const incoming = normalizeSettingsBackup(raw);
  if (!incoming?.apiKey) return false;
  if (mode === "replace" || !getApiKey()) {
    setApiKey(incoming.apiKey);
    return true;
  }
  return false;
}
