import { describe, expect, test, beforeEach } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import VideoPlayer from "./video-player";
import type { Chapter } from "@/shared/lib/types";

beforeEach(() => cleanup());

const CHAPTERS: Chapter[] = [
  { id: "c1", title: "Intro", startSeconds: 0, endSeconds: 60 },
  { id: "c2", title: "Setup", startSeconds: 60, endSeconds: null },
];

function renderPlayer() {
  return render(
    <VideoPlayer
      videoId="abcdefghijk"
      startSeconds={0}
      endSeconds={60}
      chapterKey="c1"
      chapters={CHAPTERS}
    />
  );
}

describe("Course player chapter chip", () => {
  test("now-playing chip renders inside the bottom bar, not as a sticky overlay", () => {
    renderPlayer();
    const chip = screen.getByLabelText(/Now playing: Intro/);
    // Part of the auto-hiding chrome — absolutely-positioned overlays are gone.
    expect(chip.className).not.toContain("absolute");
    expect(chip.className).toContain("rounded-full");
    // Still restarts the chapter on click (title kept).
    expect(chip.getAttribute("title")).toContain('Restart chapter "Intro"');
  });

  test("no floating top-left chip remains on the video surface", () => {
    renderPlayer();
    const floating = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("top-3") && b.className.includes("left-3"));
    expect(floating).toHaveLength(0);
    // Player surface itself still renders (seekbar + chrome present).
    expect(screen.getByLabelText("Seek")).toBeTruthy();
    expect(screen.getByLabelText("Next chapter")).toBeTruthy();
  });
});