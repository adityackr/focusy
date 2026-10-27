import { describe, expect, test, beforeEach } from "bun:test";
import {
  useLibrary,
  selectPlaylistList,
  selectCourseList,
  migrateLegacyLibraryStorage,
  migrateChapterlyCourses,
  LIBRARY_STORAGE_KEY,
} from "./library";
import type { Course, Playlist } from "../lib/types";
import { setApiKey } from "../lib/storage";

function makePlaylist(id: string, addedAt: string): Playlist {
  return {
    playlistId: id,
    playlistTitle: `Playlist ${id}`,
    playlistDescription: "",
    playlistThumbnail: { url: "", width: 320, height: 180 },
    channelId: "",
    channelTitle: "",
    itemCount: 0,
    videos: [],
    addedAt,
  };
}

function makeCourse(id: string, createdAt: number): Course {
  return {
    id,
    videoId: "abcdefghijk",
    title: `Course ${id}`,
    thumbnail: "",
    description: "",
    durationSeconds: null,
    chapters: [
      { id: `${id}-c1`, title: "Intro", startSeconds: 0, endSeconds: 60 },
      { id: `${id}-c2`, title: "Body", startSeconds: 60, endSeconds: null },
    ],
    createdAt,
  };
}

function ids() {
  return selectPlaylistList(useLibrary.getState()).map((p) => p.playlistId);
}

function courseIds() {
  return selectCourseList(useLibrary.getState()).map((c) => c.id);
}

beforeEach(() => {
  localStorage.clear();
  useLibrary.setState({
    playlists: {},
    order: [],
    favorites: [],
    recent: [],
    courses: {},
    courseOrder: [],
    courseFavorites: [],
    courseRecent: [],
    loadingIds: [],
    error: null,
  });
});

describe("playlist ordering", () => {
  test("new playlists go first", () => {
    const { addPlaylist } = useLibrary.getState();
    addPlaylist(makePlaylist("A", "2024-01-01"));
    addPlaylist(makePlaylist("B", "2024-02-01"));
    expect(ids()).toEqual(["B", "A"]);
    expect(useLibrary.getState().order).toEqual(["B", "A"]);
  });

  test("re-adding moves to front without duplicates", () => {
    const { addPlaylist } = useLibrary.getState();
    addPlaylist(makePlaylist("A", "2024-01-01"));
    addPlaylist(makePlaylist("B", "2024-02-01"));
    addPlaylist(makePlaylist("A", "2024-01-01"));
    expect(useLibrary.getState().order).toEqual(["A", "B"]);
  });

  test("setOrder persists a manual arrangement", () => {
    const api = useLibrary.getState();
    api.addPlaylist(makePlaylist("A", "2024-01-01"));
    api.addPlaylist(makePlaylist("B", "2024-02-01"));
    api.addPlaylist(makePlaylist("C", "2024-03-01"));
    useLibrary.getState().setOrder(["A", "C", "B"]);
    expect(ids()).toEqual(["A", "C", "B"]);
    // survives a re-read from storage (what a refresh does)
    const raw = JSON.parse(localStorage.getItem("focustube-library")!);
    expect(raw.state.order).toEqual(["A", "C", "B"]);
  });

  test("setOrder drops unknown ids and keeps unlisted playlists", () => {
    const api = useLibrary.getState();
    api.addPlaylist(makePlaylist("A", "2024-01-01"));
    api.addPlaylist(makePlaylist("B", "2024-02-01"));
    useLibrary.getState().setOrder(["B", "NOPE"]);
    expect(useLibrary.getState().order).toEqual(["B", "A"]);
  });

  test("removePlaylist cleans up the order", () => {
    const api = useLibrary.getState();
    api.addPlaylist(makePlaylist("A", "2024-01-01"));
    api.addPlaylist(makePlaylist("B", "2024-02-01"));
    useLibrary.getState().removePlaylist("B");
    expect(useLibrary.getState().order).toEqual(["A"]);
    expect(ids()).toEqual(["A"]);
  });

  test("migrates a library saved under the legacy Clean YouTube key", () => {
    // beforeEach's setState already persisted a fresh (empty) library —
    // remove it to simulate a genuine upgrade with no new-key data yet.
    localStorage.removeItem(LIBRARY_STORAGE_KEY);
    localStorage.setItem(
      "clean-youtube-library",
      JSON.stringify({
        state: {
          playlists: { A: makePlaylist("A", "2024-01-01") },
          order: ["A"],
          favorites: ["A"],
          recent: ["A"],
        },
        version: 0,
      })
    );
    migrateLegacyLibraryStorage();
    expect(localStorage.getItem("clean-youtube-library")).toBeNull();
    const migrated = JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY)!);
    expect(migrated.state.order).toEqual(["A"]);
    expect(migrated.state.favorites).toEqual(["A"]);
  });

  test("migration never overwrites an existing focustube library", () => {
    localStorage.setItem(
      LIBRARY_STORAGE_KEY,
      JSON.stringify({ state: { playlists: {}, order: [], favorites: [], recent: [] }, version: 0 })
    );
    localStorage.setItem(
      "clean-youtube-library",
      JSON.stringify({
        state: { playlists: { A: makePlaylist("A", "2024-01-01") }, order: ["A"], favorites: [], recent: [] },
        version: 0,
      })
    );
    migrateLegacyLibraryStorage();
    expect(localStorage.getItem("clean-youtube-library")).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY)!).state.order).toEqual([]);
  });

  test("legacy playlists without an order fall back to newest-first", () => {
    useLibrary.setState({
      playlists: {
        A: makePlaylist("A", "2024-01-01"),
        B: makePlaylist("B", "2024-03-01"),
      },
      order: [],
    });
    expect(ids()).toEqual(["B", "A"]);
  });
});

describe("course (video) slice", () => {
  test("new courses go first and push a recent", () => {
    const { addCourse } = useLibrary.getState();
    addCourse(makeCourse("A", 1));
    addCourse(makeCourse("B", 2));
    expect(courseIds()).toEqual(["B", "A"]);
    expect(useLibrary.getState().courseRecent).toEqual(["B", "A"]);
  });

  test("setCourseOrder persists a manual arrangement", () => {
    const api = useLibrary.getState();
    api.addCourse(makeCourse("A", 1));
    api.addCourse(makeCourse("B", 2));
    api.addCourse(makeCourse("C", 3));
    useLibrary.getState().setCourseOrder(["A", "C", "B"]);
    expect(courseIds()).toEqual(["A", "C", "B"]);
    const raw = JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY)!);
    expect(raw.state.courseOrder).toEqual(["A", "C", "B"]);
  });

  test("toggleCourseFavorite adds then removes", () => {
    const api = useLibrary.getState();
    api.addCourse(makeCourse("A", 1));
    api.toggleCourseFavorite("A");
    expect(useLibrary.getState().courseFavorites).toEqual(["A"]);
    api.toggleCourseFavorite("A");
    expect(useLibrary.getState().courseFavorites).toEqual([]);
  });

  test("removeCourse cleans order, favorites and recents", () => {
    const api = useLibrary.getState();
    api.addCourse(makeCourse("A", 1));
    api.addCourse(makeCourse("B", 2));
    api.toggleCourseFavorite("B");
    useLibrary.getState().removeCourse("B");
    expect(courseIds()).toEqual(["A"]);
    expect(useLibrary.getState().courseFavorites).toEqual([]);
    expect(useLibrary.getState().courseRecent).toEqual(["A"]);
  });

  test("updateCourse replaces chapters in place", () => {
    const api = useLibrary.getState();
    api.addCourse(makeCourse("A", 1));
    const updated = {
      ...useLibrary.getState().courses.A,
      chapters: [{ id: "x", title: "Only", startSeconds: 0, endSeconds: null }],
    };
    useLibrary.getState().updateCourse(updated);
    expect(useLibrary.getState().courses.A.chapters).toHaveLength(1);
    expect(courseIds()).toEqual(["A"]);
  });

  test("updateCourse ignores unknown ids", () => {
    useLibrary.getState().updateCourse(makeCourse("NOPE", 1));
    expect(useLibrary.getState().courses.NOPE).toBeUndefined();
  });
});

describe("Chapterly migration", () => {
  test("adopts Chapterly's course array into the library store", () => {
    localStorage.setItem(
      "yt-course:courses",
      JSON.stringify([makeCourse("legacy-1", 5), makeCourse("legacy-2", 6)])
    );
    migrateChapterlyCourses();
    expect(localStorage.getItem("yt-course:courses")).toBeNull();
    const raw = JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY)!);
    expect(raw.state.courseOrder).toEqual(["legacy-1", "legacy-2"]);
    expect(Object.keys(raw.state.courses)).toEqual(["legacy-1", "legacy-2"]);
  });

  test("merges into an existing playlist library without touching playlists", () => {
    localStorage.setItem(
      LIBRARY_STORAGE_KEY,
      JSON.stringify({
        state: {
          playlists: { P: makePlaylist("P", "2024-01-01") },
          order: ["P"],
          favorites: ["P"],
          recent: ["P"],
          courses: { mine: makeCourse("mine", 1) },
          courseOrder: ["mine"],
          courseFavorites: [],
          courseRecent: [],
        },
        version: 0,
      })
    );
    localStorage.setItem("yt-course:courses", JSON.stringify([makeCourse("legacy-1", 5)]));
    migrateChapterlyCourses();
    const raw = JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY)!);
    expect(raw.state.order).toEqual(["P"]);
    expect(raw.state.courseOrder).toEqual(["mine", "legacy-1"]);
  });

  test("malformed legacy data is dropped, not crashed on", () => {
    localStorage.setItem("yt-course:courses", "not json");
    expect(() => migrateChapterlyCourses()).not.toThrow();
    expect(localStorage.getItem("yt-course:courses")).toBeNull();
  });
});

describe("duration backfill", () => {
  test("fills durations missing on old imports without re-fetching complete playlists", async () => {
    const origFetch = globalThis.fetch;
    setApiKey("test-key");
    const p = makePlaylist("A", "2024-01-01");
    p.videos = [
      {
        videoId: "v1",
        title: "One",
        description: "",
        thumbnail: { url: "", width: 320, height: 180 },
        position: 0,
        durationSeconds: 12,
      },
      {
        videoId: "v2",
        title: "Two",
        description: "",
        thumbnail: { url: "", width: 320, height: 180 },
        position: 1,
      },
    ];
    useLibrary.getState().addPlaylist(p);

    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return {
        ok: true,
        json: async () => ({ items: [{ id: "v2", contentDetails: { duration: "PT2M5S" } }] }),
      };
    }) as unknown as typeof fetch;

    try {
      await useLibrary.getState().backfillDurations("A");
      expect(calls).toBe(1);
      const videos = useLibrary.getState().playlists["A"].videos;
      expect(videos[0].durationSeconds).toBe(12); // already known → untouched
      expect(videos[1].durationSeconds).toBe(125); // backfilled from PT2M5S

      await useLibrary.getState().backfillDurations("A");
      expect(calls).toBe(1); // nothing missing → no extra network traffic
    } finally {
      globalThis.fetch = origFetch;
      setApiKey("");
    }
  });

  test("stays silent without an API key", async () => {
    const origFetch = globalThis.fetch;
    setApiKey("");
    const p = makePlaylist("A", "2024-01-01");
    p.videos = [
      {
        videoId: "v1",
        title: "One",
        description: "",
        thumbnail: { url: "", width: 320, height: 180 },
        position: 0,
      },
    ];
    useLibrary.getState().addPlaylist(p);

    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, json: async () => ({ items: [] }) };
    }) as unknown as typeof fetch;

    try {
      await useLibrary.getState().backfillDurations("A");
      expect(calls).toBe(0);
      expect(useLibrary.getState().playlists["A"].videos[0].durationSeconds).toBeUndefined();
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe("course creator backfill", () => {
  test("fills channel titles missing on old saves without re-fetching complete ones", async () => {
    const origFetch = globalThis.fetch;
    setApiKey("test-key");
    useLibrary.getState().addCourse(makeCourse("CHB", 1));

    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return {
        ok: true,
        json: async () => ({
          items: [{ id: "abcdefghijk", snippet: { channelTitle: "Some Creator" } }],
        }),
      };
    }) as unknown as typeof fetch;

    try {
      await useLibrary.getState().backfillCourseChannels();
      expect(calls).toBe(1);
      expect(useLibrary.getState().courses["CHB"].channelTitle).toBe("Some Creator");

      // Complete now → a later card mount issues no extra request.
      await useLibrary.getState().backfillCourseChannels();
      expect(calls).toBe(1);
    } finally {
      globalThis.fetch = origFetch;
      setApiKey("");
    }
  });

  test("stays silent without an API key", async () => {
    const origFetch = globalThis.fetch;
    setApiKey("");
    useLibrary.getState().addCourse(makeCourse("CHK", 1));

    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, json: async () => ({ items: [] }) };
    }) as unknown as typeof fetch;

    try {
      await useLibrary.getState().backfillCourseChannels();
      expect(calls).toBe(0);
      expect(useLibrary.getState().courses["CHK"].channelTitle).toBeUndefined();
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
