import { describe, expect, test, beforeEach, afterEach, beforeAll, mock } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useLibrary } from "@/store/library";
import type { Course, Playlist } from "@/lib/types";

// The page tree reaches `useRouter()` (Add playlist dialog) and `<Link>`s —
// provide a minimal app-router stand-in since no Next router is mounted in jsdom.
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  }),
  usePathname: () => "/library",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const { default: LibraryPage } = await import("./page");

// jsdom lacks the measuring APIs dnd-kit attaches to.
beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  }
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
      }) as MediaQueryList;
  }
});

const course: Course = {
  id: "C1",
  videoId: "abcdefghijk",
  title: "Course C1",
  thumbnail: "",
  description: "",
  durationSeconds: 600,
  chapters: [
    { id: "c1", title: "Intro", startSeconds: 0, endSeconds: 300 },
    { id: "c2", title: "Body", startSeconds: 300, endSeconds: null },
  ],
  createdAt: 1,
};

const playlist: Playlist = {
  playlistId: "PL1",
  playlistTitle: "Playlist P1",
  playlistDescription: "",
  playlistThumbnail: { url: "", width: 320, height: 180 },
  channelId: "ch1",
  channelTitle: "Channel One",
  itemCount: 1,
  videos: [],
  addedAt: "2024-01-01",
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useLibrary.setState({
    playlists: { PL1: playlist },
    order: ["PL1"],
    favorites: [],
    recent: [],
    courses: { C1: course },
    courseOrder: ["C1"],
    courseFavorites: [],
    courseRecent: [],
    loadingIds: [],
    error: null,
    hydrated: true,
  });
});

afterEach(() => cleanup());

describe("Library page tabs", () => {
  test("opens on the Videos tab showing the video card", () => {
    render(<LibraryPage />);
    expect(screen.getByText(/My library/)).toBeTruthy();
    const videosTab = screen.getByRole("tab", { name: /Videos/ });
    expect(videosTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Course C1")).toBeTruthy();
    expect(screen.queryByText("Playlist P1")).toBeNull();
  });

  test("switching to Playlists swaps the grid", () => {
    render(<LibraryPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Playlists/ }));
    expect(screen.getByText("Playlist P1")).toBeTruthy();
    expect(screen.queryByText("Course C1")).toBeNull();
    expect(
      screen.getByRole("tab", { name: /Playlists/ }).getAttribute("aria-selected")
    ).toBe("true");
  });

  test("header action follows the active tab", () => {
    render(<LibraryPage />);
    // Videos tab → "Add video" link to /add
    const addVideo = screen.getByRole("link", { name: /Add video/ });
    expect(addVideo.getAttribute("href")).toBe("/add");
    // Playlists tab → the Add playlist dialog trigger button
    fireEvent.click(screen.getByRole("tab", { name: /Playlists/ }));
    expect(screen.getByRole("button", { name: /Add playlist/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Add video/ })).toBeNull();
  });
});