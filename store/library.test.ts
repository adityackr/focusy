import { describe, expect, test, beforeEach } from "bun:test";
import {
  useLibrary,
  selectPlaylistList,
  migrateLegacyLibraryStorage,
  LIBRARY_STORAGE_KEY,
} from "./library";
import type { Playlist } from "../lib/types";

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

function ids() {
  return selectPlaylistList(useLibrary.getState()).map((p) => p.playlistId);
}

beforeEach(() => {
  localStorage.clear();
  useLibrary.setState({
    playlists: {},
    order: [],
    favorites: [],
    recent: [],
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
