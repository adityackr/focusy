import { beforeEach, describe, expect, test } from "bun:test";
import {
  bookmarkHref,
  bookmarksForVideo,
  filterBookmarks,
  groupBookmarksByLesson,
  MAX_BOOKMARK_DESCRIPTION_LENGTH,
  normalizeBookmarks,
  type Bookmark,
  type BookmarkSource,
} from "./bookmark";
import {
  addBookmark,
  allBookmarks,
  bookmarkCount,
  invalidateBookmarksCache,
  mergeBookmarks,
  removeBookmark,
  replaceBookmarks,
  updateBookmark,
  BOOKMARKS_STORAGE_KEY,
} from "./bookmark-store";
import {
  collectBookmarksBackup,
  restoreBookmarksBackup,
} from "./bookmark-backup";
import {
  backupPreview,
  collectBackup,
  parseBackup,
  serializeBackup,
} from "@/shared/lib/backup";

const PLAYLIST_SOURCE: BookmarkSource = {
  kind: "playlist",
  playlistId: "PL1",
  videoId: "vid-1",
  title: "Closures explained",
  collectionTitle: "Modern JavaScript",
};

const COURSE_SOURCE: BookmarkSource = {
  kind: "course",
  courseId: "course-1",
  videoId: "vid-2",
  title: "React hooks",
  collectionTitle: "React from scratch",
};

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: overrides.id ?? "bookmark-1",
    videoId: overrides.videoId ?? "vid-1",
    source: overrides.source !== undefined ? overrides.source : PLAYLIST_SOURCE,
    timeSeconds: overrides.timeSeconds ?? 42,
    description: overrides.description ?? "Clearest explanation of closures",
    createdAt: overrides.createdAt ?? 1000,
    updatedAt: overrides.updatedAt ?? 1000,
  };
}

beforeEach(() => {
  localStorage.clear();
  invalidateBookmarksCache();
});

describe("bookmark helpers", () => {
  test("builds deep links for playlist and course moments", () => {
    expect(bookmarkHref(makeBookmark())).toBe("/watch/PL1/vid-1?t=42");
    expect(
      bookmarkHref(
        makeBookmark({ videoId: "vid-2", source: COURSE_SOURCE, timeSeconds: 90 }),
      ),
    ).toBe("/watch/course-1?t=90");
    expect(bookmarkHref(makeBookmark({ source: null }))).toBeNull();
  });

  test("groups bookmarks by lesson and sorts moments by playback time", () => {
    const lessons = groupBookmarksByLesson([
      makeBookmark({ id: "b-late", timeSeconds: 300, createdAt: 1 }),
      makeBookmark({ id: "b-early", timeSeconds: 10, createdAt: 2 }),
      makeBookmark({
        id: "b-course",
        videoId: "vid-2",
        source: COURSE_SOURCE,
        createdAt: 3,
      }),
    ]);

    expect(lessons).toHaveLength(2);
    // Newest lesson activity first.
    expect(lessons[0].title).toBe("React hooks");
    const playlistLesson = lessons.find((lesson) => lesson.kind === "playlist");
    expect(playlistLesson?.collectionTitle).toBe("Modern JavaScript");
    expect(playlistLesson?.lessonHref).toBe("/watch/PL1/vid-1");
    expect(playlistLesson?.bookmarks.map((b) => b.id)).toEqual([
      "b-early",
      "b-late",
    ]);
  });

  test("filters by description, lesson title and timestamp", () => {
    const lessons = groupBookmarksByLesson([
      makeBookmark(),
      makeBookmark({
        id: "b-course",
        videoId: "vid-2",
        source: COURSE_SOURCE,
        timeSeconds: 300,
        description: "useEffect cleanup order",
      }),
    ]);

    expect(filterBookmarks(lessons, "closures")).toHaveLength(1);
    expect(filterBookmarks(lessons, "react hooks")[0].kind).toBe("course");
    expect(filterBookmarks(lessons, "5:00")[0].kind).toBe("course");
    expect(filterBookmarks(lessons, "missing")).toHaveLength(0);
    expect(filterBookmarks(lessons, "  ")).toHaveLength(2);
  });

  test("drops unreadable entries and duplicate ids", () => {
    expect(
      normalizeBookmarks([
        makeBookmark(),
        makeBookmark(),
        { id: "bad", videoId: "vid-1", timeSeconds: -1, description: "nope" },
        { id: "bad-2", videoId: "vid-1", timeSeconds: 1, description: "  " },
      ]),
    ).toHaveLength(1);
  });
});

describe("bookmark store", () => {
  test("saves a moment with its description and source", () => {
    const result = addBookmark({
      videoId: "vid-1",
      source: PLAYLIST_SOURCE,
      timeSeconds: 61.7,
      description: "  Watch this bit again  ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.timeSeconds).toBe(61);
    expect(result.value.description).toBe("Watch this bit again");
    expect(allBookmarks()).toHaveLength(1);
    expect(bookmarkCount()).toBe(1);
    expect(JSON.parse(localStorage.getItem(BOOKMARKS_STORAGE_KEY) ?? "{}")).toMatchObject(
      { version: 1 },
    );
  });

  test("rejects an empty or too-long description", () => {
    expect(
      addBookmark({ videoId: "vid-1", timeSeconds: 5, description: "   " }),
    ).toEqual({ ok: false, error: "empty" });
    expect(
      addBookmark({
        videoId: "vid-1",
        timeSeconds: 5,
        description: "x".repeat(MAX_BOOKMARK_DESCRIPTION_LENGTH + 1),
      }),
    ).toEqual({ ok: false, error: "too-long" });
  });

  test("edits and removes a saved moment", () => {
    const added = addBookmark({
      videoId: "vid-1",
      source: PLAYLIST_SOURCE,
      timeSeconds: 10,
      description: "First pass",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const updated = updateBookmark(added.value.id, {
      description: "Second pass",
    });
    expect(updated.ok).toBe(true);
    expect(allBookmarks()[0].description).toBe("Second pass");

    expect(removeBookmark(added.value.id)).toEqual({ ok: true, value: true });
    expect(allBookmarks()).toHaveLength(0);
  });

  test("returns playback-ordered moments for one video", () => {
    addBookmark({ videoId: "vid-1", timeSeconds: 30, description: "later" });
    addBookmark({ videoId: "vid-1", timeSeconds: 5, description: "earlier" });
    addBookmark({ videoId: "vid-2", timeSeconds: 1, description: "other" });

    expect(bookmarksForVideo(allBookmarks(), "vid-1").map((b) => b.timeSeconds)).toEqual([
      5, 30,
    ]);
  });

  test("ignores unreadable saved data instead of failing", () => {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, "{not json");
    expect(allBookmarks()).toEqual([]);

    localStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify({ version: 99, bookmarks: [makeBookmark()] }),
    );
    expect(allBookmarks()).toEqual([]);
  });
});

describe("bookmark backup", () => {
  test("round-trips saved moments through a backup section", () => {
    addBookmark({
      videoId: "vid-1",
      source: PLAYLIST_SOURCE,
      timeSeconds: 42,
      description: "Key idea",
    });
    const section = collectBookmarksBackup();
    replaceBookmarks([]);
    expect(allBookmarks()).toHaveLength(0);

    expect(restoreBookmarksBackup(section, "replace")).toEqual({
      ok: true,
      bookmarksAdded: 0,
      bookmarksRestored: 1,
    });
    expect(allBookmarks()[0]).toMatchObject({
      timeSeconds: 42,
      description: "Key idea",
      source: { kind: "playlist", playlistId: "PL1" },
    });
  });

  test("merges without removing local moments or duplicating ids", () => {
    addBookmark({ videoId: "vid-1", timeSeconds: 5, description: "local" });
    const incoming = makeBookmark({
      id: "remote-1",
      videoId: "vid-2",
      source: COURSE_SOURCE,
      description: "remote",
    });

    expect(
      restoreBookmarksBackup(
        {
          version: 1,
          bookmarks: [incoming, incoming],
        },
        "merge",
      ),
    ).toEqual({ ok: true, bookmarksAdded: 1, bookmarksRestored: 1 });
    expect(allBookmarks()).toHaveLength(2);

    // The same section merged a second time adds nothing.
    expect(
      restoreBookmarksBackup({ version: 1, bookmarks: [incoming] }, "merge"),
    ).toEqual({ ok: true, bookmarksAdded: 0, bookmarksRestored: 0 });
  });

  test("leaves bookmarks alone when a backup has no section", () => {
    addBookmark({ videoId: "vid-1", timeSeconds: 5, description: "keep me" });
    expect(restoreBookmarksBackup(undefined, "replace")).toEqual({
      ok: true,
      bookmarksAdded: 0,
      bookmarksRestored: 0,
    });
    expect(allBookmarks()).toHaveLength(1);
  });

  test("rejects an unreadable section", () => {
    expect(restoreBookmarksBackup({ version: 99, bookmarks: [] }, "replace")).toEqual({
      ok: false,
      error: "That backup's bookmarks aren't readable.",
    });
  });

  test("travels through a downloadable backup file and its preview", () => {
    addBookmark({
      videoId: "vid-1",
      source: PLAYLIST_SOURCE,
      timeSeconds: 42,
      description: "Saved moment",
    });
    const json = serializeBackup(
      collectBackup(null, null, null, null, collectBookmarksBackup()),
    );

    invalidateBookmarksCache();
    replaceBookmarks([]);
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(backupPreview(parsed.backup).bookmarks).toBe(1);
    expect(
      restoreBookmarksBackup(parsed.backup.bookmarks, "replace"),
    ).toEqual({ ok: true, bookmarksAdded: 0, bookmarksRestored: 1 });
    expect(allBookmarks()[0].description).toBe("Saved moment");
  });

  test("older backups without bookmark data preview as null", () => {
    expect(backupPreview(collectBackup()).bookmarks).toBeNull();
  });

  test("merge keeps the newer copy of an edited moment", () => {
    const older = makeBookmark({
      id: "same",
      description: "original",
      updatedAt: 100,
    });
    mergeBookmarks([older]);
    const edited = makeBookmark({
      id: "same",
      description: "edited elsewhere",
      updatedAt: 200,
    });

    expect(mergeBookmarks([edited])).toBe(1);
    expect(allBookmarks()[0].description).toBe("edited elsewhere");

    // An older incoming copy doesn't overwrite a newer local one.
    expect(mergeBookmarks([older])).toBe(0);
  });
});
