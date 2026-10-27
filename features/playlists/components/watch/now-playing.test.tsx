import { describe, expect, test, beforeEach, mock } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Playlist, PlaylistVideo } from "@/shared/lib/types";

// next/navigation needs an app-router context that doesn't exist under jsdom.
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

const { NowPlaying } = await import("./now-playing");

const ACTIVE: PlaylistVideo = {
  videoId: "vid-a",
  title: "Active lesson",
  description:
    "Welcome to the lesson! 👋\n00:00 Intro\n01:00 Setup\n03:30 Deep dive\nResources: https://example.com/resources\nThanks for watching 🎉",
  thumbnail: { url: "https://i.ytimg.com/vi/vid-a/mqdefault.jpg", width: 320, height: 180 },
  position: 0,
};

const PLAYLIST: Playlist = {
  playlistId: "PL1",
  playlistTitle: "Course",
  playlistDescription: "",
  playlistThumbnail: { url: "", width: 320, height: 180 },
  channelId: "ch1",
  channelTitle: "Some channel",
  itemCount: 1,
  videos: [ACTIVE],
  addedAt: "2024-01-01",
};

beforeEach(() => {
  cleanup();
});

describe("NowPlaying with the custom player", () => {
  test("renders the chapterly-style chrome instead of a bare iframe", () => {
    render(
      <NowPlaying playlist={PLAYLIST} activeVideo={ACTIVE} activeIndex={0} watched={[]} />
    );
    // Custom chrome: play overlay + control bar (no native YouTube controls).
    expect(screen.getByLabelText("Play")).toBeTruthy();
    expect(screen.getByLabelText("Fullscreen (f)")).toBeTruthy();
  });

  test("surfaces chapters parsed from the description in the player menu", () => {
    render(
      <NowPlaying playlist={PLAYLIST} activeVideo={ACTIVE} activeIndex={0} watched={[]} />
    );
    act(() => {
      fireEvent.click(screen.getByLabelText("Chapters"));
    });
    expect(screen.getByText("Chapters (3)")).toBeTruthy();
    expect(screen.getByText("Intro")).toBeTruthy();
    expect(screen.getByText("Setup")).toBeTruthy();
    expect(screen.getByText("Deep dive")).toBeTruthy();
    expect(screen.getByText("1:00")).toBeTruthy();
  });

  test("strips timestamp lines from the description card", () => {
    render(
      <NowPlaying playlist={PLAYLIST} activeVideo={ACTIVE} activeIndex={0} watched={[]} />
    );
    expect(screen.getByText(/Welcome to the lesson!/)).toBeTruthy();
    expect(screen.queryByText(/00:00 Intro/)).toBeNull();
  });

  test("description links are clickable and emojis survive", () => {
    render(
      <NowPlaying playlist={PLAYLIST} activeVideo={ACTIVE} activeIndex={0} watched={[]} />
    );
    const link = screen.getByRole("link", { name: "https://example.com/resources" });
    expect(link.getAttribute("href")).toBe("https://example.com/resources");
    expect(link.getAttribute("target")).toBe("_blank");
    // Plain text lines (incl. emoji) render outside the links.
    expect(screen.getByText(/👋/)).toBeTruthy();
    expect(screen.getByText(/🎉/)).toBeTruthy();
  });

  test("chapter chip sits in the control bar, not as a sticky top-left overlay", () => {
    render(
      <NowPlaying playlist={PLAYLIST} activeVideo={ACTIVE} activeIndex={0} watched={[]} />
    );
    const chip = screen.getByLabelText(/Now playing: Intro/);
    // Shares the player chrome with the course page: part of the auto-hiding
    // bottom bar, never an absolutely-positioned overlay on the video.
    expect(chip.className).not.toContain("absolute");
    expect(chip.closest("div.absolute.inset-x-0.bottom-0")).toBeTruthy();
    const floating = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("top-3") && b.className.includes("left-3"));
    expect(floating).toHaveLength(0);
  });

  test("reports the initial chapter through onChapterChange", () => {
    let reported = -99;
    render(
      <NowPlaying
        playlist={PLAYLIST}
        activeVideo={ACTIVE}
        activeIndex={0}
        watched={[]}
        onChapterChange={(i) => (reported = i)}
      />
    );
    // Playback starts at 0:00 → chapter 0 ("Intro").
    expect(reported).toBe(0);
  });
});
