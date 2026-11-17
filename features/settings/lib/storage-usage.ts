import {
  libraryItemCount,
  readLastBackup,
  type LastBackup,
} from "@/shared/lib/backup";

/**
 * Read-only measurements for the Data Storage Manager in Settings.
 *
 * Everything Focusy saves lives in this browser: most features use
 * localStorage, Studio project contents use IndexedDB, and backup freshness is
 * tracked in a small localStorage entry. Nothing here leaves the browser, and
 * no data is deleted — the card only reports sizes and status.
 */

/* -------------------------------------------------------------------------- */
/* byte formatting                                                            */
/* -------------------------------------------------------------------------- */

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** Human-readable byte size, e.g. `1.5 MB`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 ? 0 : value >= 10 ? 0 : 1;
  const formatted = value.toFixed(digits).replace(/\.0$/, "");
  return `${formatted} ${UNITS[unit]}`;
}

/** Approximate UTF-8 byte size of text, for storage accounting. */
export function textBytes(text: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  return text.length * 2;
}

/* -------------------------------------------------------------------------- */
/* localStorage                                                               */
/* -------------------------------------------------------------------------- */

export type StorageGroupId =
  | "library"
  | "progress"
  | "notes"
  | "bookmarks"
  | "inbox"
  | "analytics"
  | "studio"
  | "preferences"
  | "backup"
  | "other";

export interface StorageGroupDefinition {
  id: StorageGroupId;
  label: string;
  detail: string;
}

/** Display order for the localStorage breakdown. */
export const STORAGE_GROUPS: StorageGroupDefinition[] = [
  { id: "library", label: "Library", detail: "playlists, videos and folders" },
  {
    id: "progress",
    label: "Watch progress",
    detail: "resume points and completed chapters",
  },
  { id: "notes", label: "Notes", detail: "timestamped Markdown notes" },
  { id: "bookmarks", label: "Bookmarks", detail: "saved lesson moments" },
  { id: "inbox", label: "Learning inbox", detail: "saved links to study next" },
  {
    id: "analytics",
    label: "Learning analytics",
    detail: "daily activity, events and goals",
  },
  {
    id: "studio",
    label: "Studio metadata",
    detail: "project index — files live in IndexedDB",
  },
  {
    id: "preferences",
    label: "Preferences & key",
    detail: "API key, player, certificate and reminders",
  },
  {
    id: "backup",
    label: "Backup metadata",
    detail: "last backup date and reminder dismissals",
  },
  { id: "other", label: "Other", detail: "keys Focusy doesn't recognize" },
];

const NOTES_PREFIXES = ["focustube:notes:v2:", "focustube:note:"];
const NOTE_INDEX_KEY = "focustube:notes-legacy-index:v2";

const PREFERENCE_KEYS = new Set([
  "yt-course:api-key",
  "yt-course:player-settings",
  "focusy:player-settings",
  "yt-course:sidebar",
  "focusy-reminders:v1",
  "focusy-certificate:name:v1",
]);

const BACKUP_KEYS = new Set([
  "focustube:last-backup",
  "focustube:backup-reminder-dismissed",
]);

const LIBRARY_KEYS = new Set([
  "focustube-library",
  "clean-youtube-library",
  "yt-course:courses",
]);

/** Which feature a localStorage key belongs to. */
export function storageGroupFor(key: string): StorageGroupId {
  if (LIBRARY_KEYS.has(key)) return "library";
  if (
    key.startsWith("focustube:progress:") ||
    key.startsWith("yt-course:progress:")
  ) {
    return "progress";
  }
  if (
    key === NOTE_INDEX_KEY ||
    NOTES_PREFIXES.some((prefix) => key.startsWith(prefix))
  ) {
    return "notes";
  }
  if (key === "focusy-bookmarks:v1") return "bookmarks";
  if (key === "focusy-inbox:v1") return "inbox";
  if (key === "focusy-analytics:v1") return "analytics";
  if (key.startsWith("focusy-studio:")) return "studio";
  if (PREFERENCE_KEYS.has(key)) return "preferences";
  if (BACKUP_KEYS.has(key)) return "backup";
  return "other";
}

export interface StorageGroupUsage extends StorageGroupDefinition {
  bytes: number;
  entries: number;
}

export interface LocalStorageUsage {
  available: boolean;
  bytes: number;
  entries: number;
  groups: StorageGroupUsage[];
}

function emptyGroups(): StorageGroupUsage[] {
  return STORAGE_GROUPS.map((group) => ({
    ...group,
    bytes: 0,
    entries: 0,
  }));
}

/** Byte and key breakdown of everything in localStorage. */
export function readLocalStorageUsage(): LocalStorageUsage {
  const groups = emptyGroups();
  const byId = new Map(groups.map((group) => [group.id, group]));
  if (typeof localStorage === "undefined") {
    return { available: false, bytes: 0, entries: 0, groups };
  }

  let bytes = 0;
  let entries = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) ?? "";
      const size = textBytes(key) + textBytes(value);
      const group = byId.get(storageGroupFor(key));
      if (!group) continue;
      group.bytes += size;
      group.entries += 1;
      bytes += size;
      entries += 1;
    }
  } catch {
    return { available: false, bytes, entries, groups };
  }

  return { available: true, bytes, entries, groups };
}

/* -------------------------------------------------------------------------- */
/* IndexedDB                                                                  */
/* -------------------------------------------------------------------------- */

export interface IndexedDbStoreUsage {
  name: string;
  records: number;
  bytes: number;
  error: string | null;
}

export interface IndexedDbDatabaseUsage {
  name: string;
  version: number | null;
  records: number;
  bytes: number;
  stores: IndexedDbStoreUsage[];
}

export interface IndexedDbUsage {
  /** Whether the browser has IndexedDB at all. */
  available: boolean;
  /** Whether per-database sizes can be listed in this browser. */
  supported: boolean;
  bytes: number;
  records: number;
  databases: IndexedDbDatabaseUsage[];
  error: string | null;
}

function emptyIndexedDb(overrides: Partial<IndexedDbUsage> = {}): IndexedDbUsage {
  return {
    available: typeof indexedDB !== "undefined",
    supported: false,
    bytes: 0,
    records: 0,
    databases: [],
    error: null,
    ...overrides,
  };
}

/** Rough stored size of one IndexedDB record. */
export function estimateRecordBytes(value: unknown): number {
  if (typeof value === "string") return textBytes(value);
  if (value instanceof Blob) return value.size;
  if (value instanceof ArrayBuffer) return value.byteLength;
  try {
    return textBytes(JSON.stringify(value) ?? "");
  } catch {
    return 0;
  }
}

async function databaseNames(): Promise<string[] | null> {
  const factory = indexedDB as IDBFactory & {
    databases?: () => Promise<IDBDatabaseInfo[]>;
  };
  if (typeof factory.databases !== "function") return null;
  try {
    const list = await factory.databases();
    return list
      .map((database) => database.name)
      .filter((name): name is string => Boolean(name));
  } catch {
    return null;
  }
}

function openExistingDatabase(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(name);
    } catch {
      resolve(null);
      return;
    }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function readStoreUsage(
  database: IDBDatabase,
  storeName: string,
): Promise<IndexedDbStoreUsage> {
  return new Promise((resolve) => {
    const fail = (message: string) =>
      resolve({ name: storeName, records: 0, bytes: 0, error: message });

    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(storeName, "readonly");
    } catch {
      fail("This store couldn't be read.");
      return;
    }

    let request: IDBRequest<unknown[]>;
    try {
      request = transaction.objectStore(storeName).getAll();
    } catch {
      fail("This store couldn't be read.");
      return;
    }

    request.onsuccess = () => {
      const records: unknown[] = Array.isArray(request.result)
        ? request.result
        : [];
      let bytes = 0;
      for (const record of records) bytes += estimateRecordBytes(record);
      resolve({ name: storeName, records: records.length, bytes, error: null });
    };
    request.onerror = () => fail("This store couldn't be read.");
    transaction.onabort = () => fail("This store couldn't be read.");
  });
}

/** Per-store sizes for one IndexedDB database, or null when unreadable. */
async function readDatabaseUsage(
  name: string,
): Promise<IndexedDbDatabaseUsage | null> {
  const database = await openExistingDatabase(name);
  if (!database) return null;

  try {
    const stores: IndexedDbStoreUsage[] = [];
    for (const storeName of Array.from(database.objectStoreNames)) {
      stores.push(await readStoreUsage(database, storeName));
    }
    return {
      name,
      version: database.version || null,
      records: stores.reduce((total, store) => total + store.records, 0),
      bytes: stores.reduce((total, store) => total + store.bytes, 0),
      stores,
    };
  } finally {
    database.close();
  }
}

/**
 * IndexedDB usage, summed from each database's records. Browsers without
 * `indexedDB.databases()` can't enumerate databases, so the card reports that
 * per-database sizes are unavailable instead of guessing.
 */
export async function readIndexedDbUsage(): Promise<IndexedDbUsage> {
  if (typeof indexedDB === "undefined") {
    return emptyIndexedDb({ available: false });
  }

  const names = await databaseNames();
  if (!names) return emptyIndexedDb({ available: true, supported: false });

  try {
    const databases: IndexedDbDatabaseUsage[] = [];
    for (const name of names) {
      const usage = await readDatabaseUsage(name);
      if (usage) databases.push(usage);
    }
    return {
      available: true,
      supported: true,
      bytes: databases.reduce((total, database) => total + database.bytes, 0),
      records: databases.reduce(
        (total, database) => total + database.records,
        0,
      ),
      databases,
      error: null,
    };
  } catch {
    return emptyIndexedDb({
      available: true,
      supported: true,
      error: "IndexedDB usage couldn't be measured.",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* browser storage                                                            */
/* -------------------------------------------------------------------------- */

export interface BrowserStorageUsage {
  supported: boolean;
  usage: number;
  quota: number;
  /** 0–100, or null when the browser doesn't report a quota. */
  percent: number | null;
  /** Whether the browser has granted persistent storage, if it can say. */
  persisted: boolean | null;
}

export function storagePercent(
  usage: number,
  quota: number,
): number | null {
  if (!Number.isFinite(quota) || quota <= 0) return null;
  return Math.min(100, (Math.max(0, usage) / quota) * 100);
}

/** Origin-wide usage and quota, when the browser exposes them. */
export async function readBrowserStorageUsage(): Promise<BrowserStorageUsage> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== "function"
  ) {
    return {
      supported: false,
      usage: 0,
      quota: 0,
      percent: null,
      persisted: null,
    };
  }

  let usage = 0;
  let quota = 0;
  try {
    const estimate = await navigator.storage.estimate();
    usage = estimate.usage ?? 0;
    quota = estimate.quota ?? 0;
  } catch {
    return {
      supported: false,
      usage: 0,
      quota: 0,
      percent: null,
      persisted: null,
    };
  }

  let persisted: boolean | null = null;
  if (typeof navigator.storage.persisted === "function") {
    try {
      persisted = await navigator.storage.persisted();
    } catch {
      persisted = null;
    }
  }

  return {
    supported: true,
    usage,
    quota,
    percent: storagePercent(usage, quota),
    persisted,
  };
}

/* -------------------------------------------------------------------------- */
/* backup status                                                              */
/* -------------------------------------------------------------------------- */

export type BackupState = "empty" | "never" | "current" | "changed";

export interface BackupStatus {
  state: BackupState;
  lastBackupAt: string | null;
  itemsAtBackup: number | null;
  itemsNow: number;
  /** Items added since the last backup; 0 when never backed up. */
  itemsSince: number;
  daysSince: number | null;
}

/** Whether the library has changed since the last backup. */
export function backupStatus(
  last: LastBackup | null,
  itemsNow: number,
  now = Date.now(),
): BackupStatus {
  if (!last) {
    return {
      state: itemsNow > 0 ? "never" : "empty",
      lastBackupAt: null,
      itemsAtBackup: null,
      itemsNow,
      itemsSince: 0,
      daysSince: null,
    };
  }

  const itemsSince = Math.max(0, itemsNow - last.items);
  const daysSince = Math.max(
    0,
    Math.floor((now - Date.parse(last.at)) / (24 * 60 * 60 * 1000)),
  );
  return {
    state: itemsSince > 0 ? "changed" : "current",
    lastBackupAt: last.at,
    itemsAtBackup: last.items,
    itemsNow,
    itemsSince,
    daysSince,
  };
}

/* -------------------------------------------------------------------------- */
/* snapshot                                                                   */
/* -------------------------------------------------------------------------- */

export interface StorageSnapshot {
  measuredAt: string;
  browser: BrowserStorageUsage;
  localStorage: LocalStorageUsage;
  indexedDb: IndexedDbUsage;
  backup: BackupStatus;
}

/** Measure browser storage, IndexedDB and backup freshness in one pass. */
export async function collectStorageSnapshot(
  now = Date.now(),
): Promise<StorageSnapshot> {
  const [browser, indexedDb] = await Promise.all([
    readBrowserStorageUsage(),
    readIndexedDbUsage(),
  ]);

  return {
    measuredAt: new Date(now).toISOString(),
    browser,
    localStorage: readLocalStorageUsage(),
    indexedDb,
    backup: backupStatus(readLastBackup(), libraryItemCount(), now),
  };
}

/** `Today`, `Yesterday` or `N days ago` for the backup line. */
export function backupAgeLabel(daysSince: number | null): string {
  if (daysSince === null) return "never";
  if (daysSince === 0) return "today";
  if (daysSince === 1) return "yesterday";
  return `${daysSince} days ago`;
}
