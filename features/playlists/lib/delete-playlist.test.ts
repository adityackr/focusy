import { beforeEach, describe, expect, test } from "bun:test";
import type { Playlist } from "@/shared/lib/types";
import { useLibrary } from "@/shared/store/library";
import {
  getPlaylistCompletedAt,
  setPlaylistCompletedAt,
} from "@/shared/lib/storage";
import {
  LEGACY_NOTE_STORAGE_PREFIX,
  NOTES_STORAGE_PREFIX,
} from "@/shared/lib/learning-notes";
import {
  addBookmark,
  allBookmarks,
} from "@/features/bookmarks/lib/bookmark-store";
import { getArchivedCertificate } from "@/features/certificates";
import { deletePlaylistData } from "./delete-playlist";

function makePlaylist(id: string): Playlist {
  return {
    playlistId: id,
    playlistTitle: "Frontend Course",
    playlistDescription: "",
    playlistThumbnail: { url: "https://example.com/pl.jpg", width: 320, height: 180 },
    channelId: "ch1",
    channelTitle: "Focusy Labs",
    itemCount: 2,
    videos: [
      {
        videoId: "vid-1",
        title: "One",
        description: "",
        thumbnail: { url: "", width: 320, height: 180 },
        position: 0,
      },
      {
        videoId: "vid-2",
        title: "Two",
        description: "",
        thumbnail: { url: "", width: 320, height: 180 },
        position: 1,
      },
    ],
    addedAt: "2024-01-01",
  };
}

function setPlaylistProgress(
  playlistId: string,
  watched: string[],
): void {
  localStorage.setItem(
    `focustube:progress:${playlistId}`,
    JSON.stringify({
      watched,
      lastWatched: watched[watched.length - 1] ?? null,
      completedChapters: [],
      positions: {},
    }),
  );
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
    categories: {},
    categoryOrder: [],
    hydrated: true,
  });
});

describe("playlist cascade deletion", () => {
  test("removes lesson notes, bookmarks, progress and the playlist", async () => {
    const playlist = makePlaylist("PL1");
    useLibrary.getState().addPlaylist(playlist);
    useLibrary.getState().toggleFavorite("PL1");
    setPlaylistProgress("PL1", ["vid-1"]);
    setPlaylistCompletedAt("PL1");

    for (const videoId of ["vid-1", "vid-2"]) {
      localStorage.setItem(
        NOTES_STORAGE_PREFIX + videoId,
        JSON.stringify({ version: 2, notes: [] }),
      );
      localStorage.setItem(
        LEGACY_NOTE_STORAGE_PREFIX + videoId,
        JSON.stringify({ text: "legacy", updatedAt: 1 }),
      );
      addBookmark({
        videoId,
        timeSeconds: 5,
        description: `Moment ${videoId}`,
      });
    }

    await deletePlaylistData("PL1");

    expect(useLibrary.getState().playlists.PL1).toBeUndefined();
    expect(useLibrary.getState().order).toEqual([]);
    expect(useLibrary.getState().favorites).toEqual([]);
    expect(allBookmarks()).toEqual([]);
    expect(getPlaylistCompletedAt("PL1")).toBeNull();
    expect(localStorage.getItem("focustube:progress:PL1")).toBeNull();
    for (const videoId of ["vid-1", "vid-2"]) {
      expect(localStorage.getItem(NOTES_STORAGE_PREFIX + videoId)).toBeNull();
      expect(localStorage.getItem(LEGACY_NOTE_STORAGE_PREFIX + videoId)).toBeNull();
    }
  });

  test("keeps a certificate for a fully watched playlist", async () => {
    const playlist = makePlaylist("PL2");
    useLibrary.getState().addPlaylist(playlist);
    setPlaylistProgress("PL2", ["vid-1", "vid-2"]);
    setPlaylistCompletedAt("PL2");

    await deletePlaylistData("PL2");

    expect(getArchivedCertificate("playlist", "PL2")).toMatchObject({
      kind: "playlist",
      sourceId: "PL2",
      title: playlist.playlistTitle,
      completed: 2,
      total: 2,
    });
  });
});
