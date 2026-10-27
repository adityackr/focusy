import { describe, expect, test, beforeEach, mock } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { Playlist } from "@/shared/lib/types";

// next/navigation needs an app-router context that doesn't exist under jsdom.
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

const { PlaylistCard } = await import("./playlist-card");

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
  itemCount: 5,
  videos: [video(0), video(1), video(2), video(3), video(4)],
  addedAt: "2024-01-01",
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe("PlaylistCard progress (mirrors the video card)", () => {
  test("shows watched count, percentage and progress bar from stored progress", () => {
    localStorage.setItem(
      "focustube:progress:PL1",
      JSON.stringify({
        watched: ["vid-0", "vid-1"],
        lastWatched: "vid-1",
        completedChapters: [],
        positions: {},
      })
    );
    render(<PlaylistCard playlist={PLAYLIST} />);
    expect(screen.getByText("2/5 done")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByText("5 lessons")).toBeTruthy();
  });

  test("starts at zero without stored progress", () => {
    render(<PlaylistCard playlist={PLAYLIST} />);
    expect(screen.getByText("0/5 done")).toBeTruthy();
    expect(screen.getByText("0%")).toBeTruthy();
  });
});