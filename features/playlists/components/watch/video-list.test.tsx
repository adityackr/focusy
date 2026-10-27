import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VideoList } from "./video-list";
import type { PlaylistVideo } from "@/shared/lib/types";

// RTL's auto-cleanup only registers in the first file that imports it, so
// unmount explicitly between tests (same reason the hook test clears body).
beforeEach(() => {
  cleanup();
});

// Unmount after the last test too: leftovers from this file stay mounted while
// the next test file runs and fire act() warnings from next/link.
afterEach(() => {
  cleanup();
});

function makeVideo(videoId: string, title: string, description = ""): PlaylistVideo {
  return {
    videoId,
    title,
    description,
    thumbnail: { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, width: 320, height: 180 },
    position: 0,
  };
}

const ACTIVE = makeVideo(
  "vid-a",
  "Active lesson",
  "00:00 Intro\n01:00 Setup\n03:30 Deep dive"
);
const OTHER: PlaylistVideo = {
  ...makeVideo("vid-b", "Other lesson", "00:00 Recap\n02:00 Next steps"),
  durationSeconds: 125, // renders as "2:05"
};
const PLAIN = makeVideo("vid-c", "Plain lesson", "no chapters here");

function renderList(
  props: Partial<Parameters<typeof VideoList>[0]> = {}
) {
  const calls: Array<{ videoId: string; time: number }> = [];
  const utils = render(
    <VideoList
      videos={[ACTIVE, OTHER, PLAIN]}
      playlistId="PL1"
      channelTitle="Some channel"
      activeVideoId="vid-a"
      watched={[]}
      onToggleWatched={() => {}}
      activeChapterIndex={1}
      onChapterSelect={(videoId, time) => calls.push({ videoId, time })}
      {...props}
    />
  );
  return { ...utils, calls };
}

describe("VideoList nested chapters", () => {
  test("shows the active video's chapters and collapses the others", () => {
    renderList();
    // Active video auto-expands: all three chapters are on screen.
    expect(screen.getByText("Intro")).toBeTruthy();
    expect(screen.getByText("Setup")).toBeTruthy();
    expect(screen.getByText("Deep dive")).toBeTruthy();
    expect(screen.getByText("3 chapters")).toBeTruthy();

    // The other chaptered video only shows its collapsed header.
    expect(screen.getByText("2 chapters")).toBeTruthy();
    expect(screen.queryByText("Recap")).toBeNull();
    expect(screen.queryByText("Next steps")).toBeNull();

    // A video without chapters gets no chapter block at all.
    expect(screen.getAllByText(/chapters$/)).toHaveLength(2);
    expect(screen.queryByLabelText(/Plain lesson/)).toBeNull();
  });

  test("expanding a collapsed video reveals its chapters", () => {
    renderList();
    const toggle = screen.getByLabelText("Show chapters of Other lesson");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    act(() => {
      fireEvent.click(toggle);
    });
    expect(screen.getByText("Recap")).toBeTruthy();
    expect(screen.getByText("Next steps")).toBeTruthy();
    expect(screen.getByLabelText("Hide chapters of Other lesson")).toBeTruthy();
  });

  test("clicking a chapter of the active video seeks in place", () => {
    const { calls } = renderList();
    const link = screen.getByText("Setup").closest("a");
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/watch/PL1/vid-a?t=60");
    act(() => {
      fireEvent.click(link!);
    });
    expect(calls).toEqual([{ videoId: "vid-a", time: 60 }]);
  });

  test("chapters of other videos link to that lesson with a ?t= deep link", () => {
    renderList();
    act(() => {
      fireEvent.click(screen.getByLabelText("Show chapters of Other lesson"));
    });
    const link = screen.getByText("Next steps").closest("a");
    expect(link!.getAttribute("href")).toBe("/watch/PL1/vid-b?t=120");
    // Not the active video, so it navigates instead of seeking in place:
    // the href carries the deep link the route resolves into startAt.
  });

  test("marks the currently playing chapter with aria-current", () => {
    renderList();
    const current = screen.getByText("Setup").closest("a");
    expect(current!.getAttribute("aria-current")).toBe("true");
    const notCurrent = screen.getByText("Intro").closest("a");
    expect(notCurrent!.getAttribute("aria-current")).toBeNull();
  });

  test("chapter-less videos render no chapter toggle", () => {
    renderList();
    expect(screen.queryByLabelText("Show chapters of Plain lesson")).toBeNull();
    expect(screen.queryByLabelText("Hide chapters of Plain lesson")).toBeNull();
  });
});

describe("VideoList chapter completion", () => {
  test("completed chapters show a check, the rest show a mark control", () => {
    renderList({ completedChapters: ["vid-a@0"] });
    expect(
      screen.getByLabelText('Mark chapter "Intro" as not completed')
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Mark chapter "Setup" as completed')
    ).toBeTruthy();
    // Chapters of a video with no completion recorded are all unchecked.
    expect(
      screen.getByLabelText('Mark chapter "Deep dive" as completed')
    ).toBeTruthy();
  });

  test("clicking a chapter's mark reports its stable key, not the link", () => {
    const toggled: string[] = [];
    const { calls } = renderList({
      completedChapters: [],
      onToggleChapter: (key) => toggled.push(key),
    });
    act(() => {
      fireEvent.click(screen.getByLabelText('Mark chapter "Setup" as completed'));
    });
    expect(toggled).toEqual(["vid-a@60"]);
    // The mark button sits outside the link, so no seek/navigation fired.
    expect(calls).toEqual([]);
  });
});

describe("Thumbnail timestamp badge", () => {
  test("renders the video duration on the thumbnail, only when known", () => {
    renderList();
    const badges = screen.getAllByTitle("Video length");
    expect(badges).toHaveLength(1); // only OTHER carries a duration
    expect(badges[0].textContent).toBe("2:05");
  });
});
