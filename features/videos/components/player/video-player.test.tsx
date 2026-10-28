import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
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

/** Stub ResizeObserver so the player reports the given container width. */
const originalResizeObserver: typeof ResizeObserver | undefined = globalThis.ResizeObserver;
function stubContainerWidth(width: number) {
  globalThis.ResizeObserver = class {
    private cb: (entries: { contentRect: { width: number } }[]) => void;
    constructor(cb: (entries: { contentRect: { width: number } }[]) => void) {
      this.cb = cb;
    }
    observe() {
      this.cb([{ contentRect: { width } }]);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

describe("Small-screen control bar", () => {
  beforeEach(() => stubContainerWidth(360));
  afterEach(() => {
    delete (document as { fullscreenElement?: unknown }).fullscreenElement;
    globalThis.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
  });

  test("narrow player keeps only play, time and fullscreen — nothing is clipped", () => {
    renderPlayer();
    // Essentials stay reachable (label flips between Play/Pause).
    expect(screen.getByLabelText(/\(k\)$/)).toBeTruthy();
    expect(screen.getByLabelText("Fullscreen (f)")).toBeTruthy();
    // Time readout (direct-text matcher can't see it — query the node).
    expect(document.querySelector("div.ml-1.font-mono")?.textContent).toContain("--:--");
    expect(screen.getByLabelText("Seek")).toBeTruthy();
    // Secondary controls drop out instead of overflowing the container.
    expect(screen.queryByLabelText("Next chapter")).toBeNull();
    expect(screen.queryByLabelText("Back 10 seconds (j)")).toBeNull();
    expect(screen.queryByLabelText(/subtitles/)).toBeNull();
    expect(screen.queryByLabelText("Playback speed")).toBeNull();
    expect(screen.queryByLabelText("Chapters")).toBeNull();
  });

  test("entering fullscreen on a narrow screen restores the full control set, wrapped", () => {
    renderPlayer();
    expect(screen.queryByLabelText("Next chapter")).toBeNull();

    act(() => {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        get: () => document.body,
      });
      const evt = document.createEvent("Event");
      evt.initEvent("fullscreenchange", false, false);
      document.dispatchEvent(evt);
    });

    expect(screen.getByLabelText("Next chapter")).toBeTruthy();
    expect(screen.getByLabelText("Back 10 seconds (j)")).toBeTruthy();
    expect(screen.getByLabelText(/subtitles/)).toBeTruthy();
    expect(screen.getByLabelText("Playback speed")).toBeTruthy();
    expect(screen.getByLabelText("Chapters")).toBeTruthy();
    // The row wraps rather than overflowing the overflow-hidden container.
    const row = screen.getByLabelText(/\(k\)$/).parentElement;
    expect(row?.className).toContain("flex-wrap");
  });
});