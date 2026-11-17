import "fake-indexeddb/auto";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

Object.defineProperty(globalThis, "indexedDB", {
  value: fakeIndexedDb,
  configurable: true,
});
import {
  backupAgeLabel,
  backupStatus,
  estimateRecordBytes,
  formatBytes,
  readIndexedDbUsage,
  readLocalStorageUsage,
  storageGroupFor,
  storagePercent,
  textBytes,
} from "./storage-usage";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-17T12:00:00.000Z");

beforeEach(() => {
  localStorage.clear();
});

afterAll(() => {
  indexedDB.deleteDatabase("focusy-studio");
});

describe("formatBytes", () => {
  test("uses readable units and keeps small values exact", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-10)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024)).toBe("10 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(1.25 * 1024 * 1024)).toBe("1.3 MB");
  });

  test("measures text as UTF-8 bytes", () => {
    expect(textBytes("abc")).toBe(3);
    expect(textBytes("✓")).toBe(3);
  });
});

describe("localStorage breakdown", () => {
  test("groups keys by the feature that owns them", () => {
    expect(storageGroupFor("focustube-library")).toBe("library");
    expect(storageGroupFor("focustube:progress:PL1")).toBe("progress");
    expect(storageGroupFor("yt-course:progress:c1")).toBe("progress");
    expect(storageGroupFor("focustube:notes:v2:vid-1")).toBe("notes");
    expect(storageGroupFor("focusy-bookmarks:v1")).toBe("bookmarks");
    expect(storageGroupFor("focusy-inbox:v1")).toBe("inbox");
    expect(storageGroupFor("focusy-analytics:v1")).toBe("analytics");
    expect(storageGroupFor("focusy-studio:workspaces")).toBe("studio");
    expect(storageGroupFor("yt-course:api-key")).toBe("preferences");
    expect(storageGroupFor("focustube:last-backup")).toBe("backup");
    expect(storageGroupFor("some-other-app")).toBe("other");
  });

  test("totals keys, bytes and per-feature sizes", () => {
    localStorage.setItem("focustube-library", JSON.stringify({ playlists: {} }));
    localStorage.setItem("focustube:progress:PL1", '{"watched":["a"]}');
    localStorage.setItem("focusy-bookmarks:v1", '{"bookmarks":[]}');
    localStorage.setItem("unrelated", "value");

    const usage = readLocalStorageUsage();
    expect(usage.available).toBe(true);
    expect(usage.entries).toBe(4);
    expect(usage.bytes).toBeGreaterThan(0);

    const byId = Object.fromEntries(
      usage.groups.map((group) => [group.id, group]),
    );
    expect(byId.library.entries).toBe(1);
    expect(byId.progress.entries).toBe(1);
    expect(byId.bookmarks.entries).toBe(1);
    expect(byId.other.entries).toBe(1);
    expect(byId.other.bytes).toBeGreaterThan(0);
    expect(byId.notes.entries).toBe(0);
    expect(
      usage.groups.reduce((total, group) => total + group.bytes, 0),
    ).toBe(usage.bytes);
  });
});

describe("browser estimate", () => {
  test("computes a clamped percentage only with a quota", () => {
    expect(storagePercent(50, 100)).toBe(50);
    expect(storagePercent(200, 100)).toBe(100);
    expect(storagePercent(10, 0)).toBeNull();
    expect(storagePercent(10, Number.NaN)).toBeNull();
  });
});

describe("backup status", () => {
  const last = (at: string, items: number) => ({ at, items });

  test("reports an empty library and a never-backed-up library separately", () => {
    expect(backupStatus(null, 0, NOW).state).toBe("empty");
    const never = backupStatus(null, 3, NOW);
    expect(never.state).toBe("never");
    expect(never.itemsNow).toBe(3);
    expect(never.daysSince).toBeNull();
  });

  test("is current when no items were added since the backup", () => {
    const status = backupStatus(
      last(new Date(NOW - 3 * DAY_MS).toISOString(), 4),
      4,
      NOW,
    );
    expect(status.state).toBe("current");
    expect(status.daysSince).toBe(3);
    expect(status.itemsSince).toBe(0);
  });

  test("counts items added since the backup", () => {
    const status = backupStatus(
      last(new Date(NOW - 2 * DAY_MS).toISOString(), 3),
      7,
      NOW,
    );
    expect(status.state).toBe("changed");
    expect(status.itemsSince).toBe(4);
    expect(status.itemsAtBackup).toBe(3);
    expect(status.lastBackupAt).not.toBeNull();
  });

  test("never reports a negative change after deleting items", () => {
    const status = backupStatus(
      last(new Date(NOW - DAY_MS).toISOString(), 7),
      2,
      NOW,
    );
    expect(status.state).toBe("current");
    expect(status.itemsSince).toBe(0);
  });

  test("labels backup age in plain words", () => {
    expect(backupAgeLabel(null)).toBe("never");
    expect(backupAgeLabel(0)).toBe("today");
    expect(backupAgeLabel(1)).toBe("yesterday");
    expect(backupAgeLabel(4)).toBe("4 days ago");
  });
});

describe("IndexedDB usage", () => {
  test("estimates record sizes", () => {
    expect(estimateRecordBytes("abc")).toBe(3);
    expect(estimateRecordBytes({ id: "x" })).toBe(textBytes('{"id":"x"}'));
    expect(estimateRecordBytes(undefined)).toBe(0);
  });

  test("counts records and bytes in each database", async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("focusy-studio", 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore("workspaces", {
          keyPath: "id",
        });
        store.put({ id: "w1", files: [{ path: "/App.js", content: "hello" }] });
        store.put({ id: "w2", files: [] });
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    const usage = await readIndexedDbUsage();
    expect(usage.available).toBe(true);
    expect(usage.supported).toBe(true);

    const database = usage.databases.find((db) => db.name === "focusy-studio");
    expect(database).toBeDefined();
    expect(database?.records).toBe(2);
    expect(database?.bytes).toBeGreaterThan(0);
    expect(database?.stores[0]?.name).toBe("workspaces");
    expect(usage.records).toBeGreaterThanOrEqual(2);
    expect(usage.bytes).toBeGreaterThanOrEqual(database?.bytes ?? 0);
  });
});
