import { describe, expect, test, beforeEach, mock } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { Playlist } from "@/shared/lib/types";

const replace = mock(() => {});

// next/navigation needs an app-router context that doesn't exist under jsdom.
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace, prefetch: () => {} }),
}));

// The overview and lesson list render thumbnails through next/image, which
// needs the Next runtime (image config, optimizer URLs) that isn't here.
function TestImage({ src, alt }: { src?: unknown; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />;
}
mock.module("next/image", () => ({ default: TestImage }));

const { WatchView } = await import("./watch-view");
const { useLibrary } = await import("@/shared/store/library");

const KEY = "focustube:progress:PL1";

function video(i: number) {
  return {
    videoId: `vid-${i}`,
    title: `Lesson ${i}`,
    description: "",
    thumbnail: { url: `https://i.ytimg.com/vi/vid-${i}/mqdefault.jpg`, width: 320, height: 180 },
    position: i,
  };
}

const PLAYLIST: Playlist = {
  playlistId: "PL1",
  playlistTitle: "Course",
  playlistDescription: "",
  playlistThumbnail: { url: "https://i.ytimg.com/vi/PL1/mqdefault.jpg", width: 320, height: 180 },
  channelId: "ch1",
  channelTitle: "Some channel",
  itemCount: 3,
  videos: [video(0), video(1), video(2)],
  addedAt: "2024-01-01",
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
  replace.mockClear();
  useLibrary.setState({ playlists: { PL1: PLAYLIST }, hydrated: true, loadingIds: [] });
});

describe("WatchView resume on re-entry", () => {
  test("opens a playlist without a lesson link on the lesson that was open last", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        watched: ["vid-0", "vid-1"],
        lastWatched: "vid-1",
        completedChapters: [],
        positions: { "vid-1": 42 },
      })
    );
    render(<WatchView playlistId="PL1" />);
    // Straight to where they left off — no overview, no lesson 1.
    expect(replace).toHaveBeenCalledWith("/watch/PL1/vid-1");
    expect(screen.queryByText("Start watching")).toBeNull();
  });

  test("still shows the overview when nothing has been watched yet", () => {
    render(<WatchView playlistId="PL1" />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Start watching")).toBeTruthy();
  });

  test("falls back to the overview when the last lesson left the playlist", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        watched: ["vid-gone"],
        lastWatched: "vid-gone",
        completedChapters: [],
        positions: {},
      })
    );
    render(<WatchView playlistId="PL1" />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Start watching")).toBeTruthy();
  });

  test("an explicit lesson link is left alone", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        watched: ["vid-2"],
        lastWatched: "vid-2",
        completedChapters: [],
        positions: {},
      })
    );
    render(<WatchView playlistId="PL1" activeVideoId="vid-1" />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Lesson 2 of 3")).toBeTruthy();
  });
});
