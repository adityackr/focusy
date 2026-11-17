import { beforeEach, describe, expect, test } from "bun:test";
import {
  filterInboxItems,
  inboxStatusCounts,
  inboxTagList,
  normalizeTags,
  type InboxItem,
} from "./inbox";
import { useInbox } from "./inbox-store";
import { collectInboxBackup, restoreInboxBackup } from "./inbox-backup";
import {
  backupPreview,
  collectBackup,
  parseBackup,
  serializeBackup,
} from "@/shared/lib/backup";

function makeItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: overrides.id ?? "item-1",
    videoId: overrides.videoId ?? "abcdefghijk",
    url: "https://www.youtube.com/watch?v=abcdefghijk",
    title: "Intro to TypeScript",
    channelTitle: "Type Academy",
    tags: ["typescript"],
    note: "",
    status: "queued",
    addedAt: 1000,
    watchedAt: null,
    ...overrides,
  };
}

function resetInbox() {
  useInbox.setState({ items: [], hydrated: true });
}

beforeEach(() => {
  localStorage.clear();
  resetInbox();
});

describe("inbox helpers", () => {
  test("normalizes tags: commas, # prefixes, case-insensitive dedupe and caps", () => {
    expect(normalizeTags("TypeScript, #web-dev, typescript,  , Web-Dev")).toEqual([
      "TypeScript",
      "web-dev",
    ]);

    const many = normalizeTags(
      Array.from({ length: 20 }, (_, index) => `tag-${index}`)
    );
    expect(many).toHaveLength(10);
    expect(normalizeTags(undefined)).toEqual([]);
  });

  test("filters by status, exact tag and every query word", () => {
    const items = [
      makeItem({ id: "a", title: "React hooks deep dive", tags: ["react"] }),
      makeItem({
        id: "b",
        videoId: "bcdefghijkl",
        title: "Advanced CSS grid",
        tags: ["css", "layout"],
        status: "watched",
        note: "for the dashboard",
      }),
      makeItem({
        id: "c",
        videoId: "cdefghijklm",
        title: "TypeScript generics",
        tags: ["typescript"],
      }),
    ];

    expect(filterInboxItems(items, { status: "queued" }).map((i) => i.id)).toEqual([
      "a",
      "c",
    ]);
    expect(filterInboxItems(items, { tag: "CSS" }).map((i) => i.id)).toEqual(["b"]);
    expect(
      filterInboxItems(items, { query: "css dashboard" }).map((i) => i.id)
    ).toEqual(["b"]);
    expect(filterInboxItems(items, { query: "missing" })).toEqual([]);
    expect(filterInboxItems(items, { status: "all", tag: null })).toHaveLength(3);
  });

  test("counts statuses and lists tags by use", () => {
    const items = [
      makeItem({ id: "a", tags: ["react", "web"] }),
      makeItem({ id: "b", status: "watched", tags: ["react"] }),
      makeItem({ id: "c", tags: ["css"] }),
    ];

    expect(inboxStatusCounts(items)).toEqual({ queued: 2, watched: 1, all: 3 });
    expect(inboxTagList(items)).toEqual([
      { tag: "react", count: 2 },
      { tag: "css", count: 1 },
      { tag: "web", count: 1 },
    ]);
  });
});

describe("inbox store", () => {
  test("saves newest first and refuses a duplicate video", () => {
    const first = useInbox.getState().addItem({
      videoId: "abcdefghijk",
      title: "First",
      tags: ["ts"],
    });
    expect(first.ok).toBe(true);

    const second = useInbox.getState().addItem({
      videoId: "bcdefghijkl",
      title: "Second",
    });
    expect(second.ok).toBe(true);
    expect(useInbox.getState().items.map((item) => item.title)).toEqual([
      "Second",
      "First",
    ]);

    const duplicate = useInbox.getState().addItem({
      videoId: "abcdefghijk",
      title: "Again",
    });
    expect(duplicate).toEqual({ ok: false, error: "duplicate" });
    expect(useInbox.getState().items).toHaveLength(2);
  });

  test("toggles watched, edits and removes a saved link", () => {
    const added = useInbox.getState().addItem({
      videoId: "abcdefghijk",
      title: "Watch me",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const id = added.item.id;

    useInbox.getState().toggleWatched(id);
    const watched = useInbox.getState().items[0];
    expect(watched.status).toBe("watched");
    expect(watched.watchedAt).not.toBeNull();

    useInbox.getState().toggleWatched(id);
    expect(useInbox.getState().items[0].status).toBe("queued");
    expect(useInbox.getState().items[0].watchedAt).toBeNull();

    useInbox.getState().updateItem(id, {
      title: "Renamed",
      tags: ["#new", "new", "other"],
      note: "  remember this  ",
    });
    expect(useInbox.getState().items[0]).toMatchObject({
      title: "Renamed",
      tags: ["new", "other"],
      note: "remember this",
    });

    useInbox.getState().removeItem(id);
    expect(useInbox.getState().items).toEqual([]);
  });

  test("ignores unreadable saved links instead of failing", () => {
    localStorage.setItem(
      "focusy-inbox:v1",
      JSON.stringify({
        state: {
          items: [
            null,
            { id: "", videoId: "abcdefghijk" },
            { id: "good", videoId: "bcdefghijkl", title: "Kept" },
          ],
        },
        version: 0,
      })
    );

    useInbox.persist.rehydrate();

    expect(useInbox.getState().items).toHaveLength(1);
    expect(useInbox.getState().items[0]).toMatchObject({
      id: "good",
      title: "Kept",
      status: "queued",
    });
  });
});

describe("inbox backup", () => {
  test("round-trips saved links through a backup section", () => {
    useInbox.getState().addItem({
      videoId: "abcdefghijk",
      title: "Saved for later",
      tags: ["css"],
      note: "Loved the layout",
    });
    const section = collectInboxBackup();
    expect(section.items).toHaveLength(1);

    resetInbox();
    const restored = restoreInboxBackup(section, "replace");

    expect(restored).toEqual({ ok: true, itemsAdded: 0, itemsRestored: 1 });
    expect(useInbox.getState().items[0]).toMatchObject({
      videoId: "abcdefghijk",
      title: "Saved for later",
      tags: ["css"],
      note: "Loved the layout",
    });
  });

  test("merges without removing local links or duplicating videos", () => {
    useInbox.getState().addItem({
      videoId: "abcdefghijk",
      title: "Local",
    });
    const section = collectInboxBackup();
    section.items.push(
      makeItem({ id: "other", videoId: "bcdefghijkl", title: "From file" }),
      makeItem({ id: "dupe", videoId: "abcdefghijk", title: "Duplicate" })
    );

    const result = restoreInboxBackup(section, "merge");

    expect(result).toEqual({ ok: true, itemsAdded: 1, itemsRestored: 1 });
    expect(useInbox.getState().items.map((item) => item.title).sort()).toEqual([
      "From file",
      "Local",
    ]);
  });

  test("leaves the inbox alone when a backup has no inbox section", () => {
    useInbox.getState().addItem({ videoId: "abcdefghijk", title: "Kept" });

    expect(restoreInboxBackup(undefined, "replace")).toEqual({
      ok: true,
      itemsAdded: 0,
      itemsRestored: 0,
    });
    expect(useInbox.getState().items).toHaveLength(1);
  });

  test("rejects an unreadable section", () => {
    const result = restoreInboxBackup({ version: 99, items: [] }, "replace");
    expect(result.ok).toBe(false);
  });

  test("travels through a downloadable backup file and its preview", () => {
    useInbox.getState().addItem({
      videoId: "abcdefghijk",
      title: "Read later",
      tags: ["css"],
    });
    const json = serializeBackup(
      collectBackup(null, null, null, collectInboxBackup())
    );

    resetInbox();
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(backupPreview(parsed.backup).inboxLinks).toBe(1);
    expect(
      restoreInboxBackup(parsed.backup.inbox, "replace")
    ).toEqual({ ok: true, itemsAdded: 0, itemsRestored: 1 });
    expect(useInbox.getState().items[0]).toMatchObject({
      videoId: "abcdefghijk",
      title: "Read later",
      tags: ["css"],
    });
  });

  test("older backups without inbox data preview as null", () => {
    expect(backupPreview(collectBackup()).inboxLinks).toBeNull();
  });
});
