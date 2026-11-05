import { describe, expect, test, beforeEach } from "bun:test";
import { useLibrary, LIBRARY_STORAGE_KEY } from "../store/library";
import { getApiKey, setApiKey } from "./storage";
import {
  applyBackup,
  backupFileName,
  collectBackup,
  parseBackup,
  serializeBackup,
} from "./backup";
import type { Course, Playlist } from "./types";

function makePlaylist(id: string, addedAt: string): Playlist {
  return {
    playlistId: id,
    playlistTitle: `Playlist ${id}`,
    playlistDescription: "desc",
    playlistThumbnail: { url: "", width: 320, height: 180 },
    channelId: "chan",
    channelTitle: "Channel",
    itemCount: 1,
    videos: [
      {
        videoId: `${id}-v1`,
        title: "Lesson",
        description: "",
        thumbnail: { url: "", width: 320, height: 180 },
        position: 0,
        durationSeconds: 120,
      },
    ],
    addedAt,
  };
}

function makeCourse(id: string): Course {
  return {
    id,
    videoId: "abcdefghijk",
    title: `Course ${id}`,
    thumbnail: "",
    description: "",
    durationSeconds: null,
    chapters: [{ id: `${id}-c1`, title: "Intro", startSeconds: 0, endSeconds: 30 }],
    createdAt: 10,
  };
}

function resetLibrary() {
  useLibrary.setState({
    playlists: {},
    order: [],
    favorites: [],
    recent: [],
    courses: {},
    courseOrder: [],
    courseFavorites: [],
    courseRecent: [],
    categories: {},
    categoryOrder: [],
    loadingIds: [],
    error: null,
  });
}

function seed() {
  const api = useLibrary.getState();
  api.addPlaylist(makePlaylist("PL1", "2024-01-01"));
  api.toggleFavorite("PL1");
  api.addCourse(makeCourse("C1"));
  const folder = api.addCategory("Design")!;
  useLibrary.getState().setPlaylistCategory("PL1", folder);

  localStorage.setItem(
    "focustube:progress:PL1",
    JSON.stringify({
      watched: ["PL1-v1"],
      lastWatched: "PL1-v1",
      completedChapters: ["PL1-v1:0"],
      positions: { "PL1-v1": 42 },
    })
  );
  localStorage.setItem(
    "yt-course:progress:C1",
    JSON.stringify({
      completedIds: ["C1-c1"],
      lastChapterId: "C1-c1",
      updatedAt: 123,
      positions: { "C1-c1": 12 },
    })
  );
  localStorage.setItem(
    "focustube:note:PL1-v1",
    JSON.stringify({ text: "# Idea", updatedAt: 456 })
  );
}

beforeEach(() => {
  localStorage.clear();
  resetLibrary();
});

describe("backup export", () => {
  test("round-trips library, progress and notes through a file", () => {
    seed();
    const json = serializeBackup(collectBackup());

    // Start from a clean browser, as if this were another device.
    localStorage.clear();
    resetLibrary();
    expect(useLibrary.getState().playlists).toEqual({});

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    applyBackup(parsed.backup);

    const state = useLibrary.getState();
    expect(Object.keys(state.playlists)).toEqual(["PL1"]);
    expect(state.playlists.PL1.videos[0].durationSeconds).toBe(120);
    expect(state.favorites).toEqual(["PL1"]);
    expect(Object.keys(state.courses)).toEqual(["C1"]);
    const folderId = state.categoryOrder[0];
    expect(state.categories[folderId].name).toBe("Design");
    expect(state.playlists.PL1.categoryId).toBe(folderId);

    expect(
      JSON.parse(localStorage.getItem("focustube:progress:PL1")!)
    ).toEqual({
      watched: ["PL1-v1"],
      lastWatched: "PL1-v1",
      completedChapters: ["PL1-v1:0"],
      positions: { "PL1-v1": 42 },
    });
    expect(
      JSON.parse(localStorage.getItem("yt-course:progress:C1")!).positions
    ).toEqual({ "C1-c1": 12 });
    expect(JSON.parse(localStorage.getItem("focustube:note:PL1-v1")!)).toEqual({
      text: "# Idea",
      updatedAt: 456,
    });
  });

  test("never includes the API key or player settings", () => {
    seed();
    setApiKey("AIzaSecretValue");
    localStorage.setItem("focusy:player-settings", '{"rate":2}');

    const json = serializeBackup(collectBackup());

    expect(json).not.toContain("AIzaSecretValue");
    expect(json).not.toContain("api-key");
    expect(json).not.toContain("player-settings");
    expect(json).not.toContain("focustube:note:");

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // A restore on this device leaves the key in place…
    applyBackup(parsed.backup);
    expect(getApiKey()).toBe("AIzaSecretValue");
  });

  test("names the file after the export date", () => {
    expect(backupFileName(new Date("2026-11-05T10:00:00Z"))).toBe(
      "focusy-backup-2026-11-05.json"
    );
  });
});

describe("backup import", () => {
  test("rejects files that are not Focusy backups", () => {
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup("[]").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "other", version: 1 })).ok).toBe(false);
  });

  test("rejects an unknown version with a readable message", () => {
    seed();
    const backup = collectBackup();
    const result = parseBackup(JSON.stringify({ ...backup, version: 99 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("version");
  });

  test("rejects a backup without library data", () => {
    const result = parseBackup(JSON.stringify({ app: "focusy", version: 1 }));
    expect(result.ok).toBe(false);
  });

  test("restoring replaces existing data instead of merging", () => {
    seed();
    const parsed = parseBackup(serializeBackup(collectBackup()));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // A new playlist and note saved after the export must not survive.
    useLibrary.getState().addPlaylist(makePlaylist("PL2", "2024-05-01"));
    localStorage.setItem("focustube:progress:PL2", "{}");
    localStorage.setItem(
      "focustube:note:PL2-v1",
      JSON.stringify({ text: "later note", updatedAt: 1 })
    );

    applyBackup(parsed.backup);

    expect(Object.keys(useLibrary.getState().playlists)).toEqual(["PL1"]);
    expect(localStorage.getItem("focustube:progress:PL2")).toBeNull();
    expect(localStorage.getItem("focustube:note:PL2-v1")).toBeNull();
  });

  test("tolerates junk entries without losing the good ones", () => {
    seed();
    const raw = JSON.parse(serializeBackup(collectBackup()));
    raw.playlistProgress["broken"] = "nope";
    raw.notes["broken"] = { text: "   " };

    const parsed = parseBackup(JSON.stringify(raw));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.playlistProgress.broken).toBeUndefined();
    expect(parsed.backup.notes.broken).toBeUndefined();
    expect(parsed.backup.playlistProgress.PL1.watched).toEqual(["PL1-v1"]);
    expect(parsed.backup.notes["PL1-v1"].text).toBe("# Idea");
  });
});
