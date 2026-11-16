import { beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Course, Playlist } from "@/shared/lib/types";
import {
  addNote,
  invalidateNotesCache,
} from "@/shared/lib/learning-notes";
import { useLibrary } from "@/shared/store/library";
import { NotesView } from "./notes-view";

const PLAYLIST: Playlist = {
  playlistId: "PL1",
  playlistTitle: "React course",
  playlistDescription: "",
  playlistThumbnail: { url: "", width: 320, height: 180 },
  channelId: "ch1",
  channelTitle: "Channel",
  itemCount: 1,
  videos: [
    {
      videoId: "vid-1",
      title: "Effects lesson",
      description: "",
      thumbnail: { url: "", width: 320, height: 180 },
      position: 0,
    },
  ],
  addedAt: "2024-01-01",
};

const COURSE: Course = {
  id: "course-1",
  videoId: "vid-2",
  title: "TypeScript deep dive",
  thumbnail: "",
  description: "",
  durationSeconds: 600,
  createdAt: 1,
  chapters: [{ id: "c1", title: "Generics", startSeconds: 0, endSeconds: null }],
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
  invalidateNotesCache();
  useLibrary.setState({
    playlists: { PL1: PLAYLIST },
    courses: { "course-1": COURSE },
    hydrated: true,
  });
});

function seed() {
  addNote({
    videoId: "vid-1",
    markdown: "Use **memoization** for derived state.",
    timeSeconds: 42,
    source: {
      kind: "playlist",
      playlistId: "PL1",
      videoId: "vid-1",
      title: "Effects lesson",
    },
  });
  addNote({
    videoId: "vid-2",
    markdown: "Generics keep types honest.",
    timeSeconds: 300,
    source: {
      kind: "course",
      courseId: "course-1",
      videoId: "vid-2",
      title: "TypeScript deep dive",
    },
  });
}

describe("NotesView", () => {
  test("lists every note with source context and jump links", () => {
    seed();
    render(<NotesView />);

    expect(screen.getByText(/2 notes across your library/)).toBeTruthy();
    const preview = screen.getByText(/Use memoization for derived state/);
    expect(preview.className).toContain("line-clamp-1");
    expect(screen.getByText("Generics keep types honest.")).toBeTruthy();
    expect(screen.getByText(/React course/)).toBeTruthy();

    const playlistJump = screen.getByRole("link", { name: /Open at 0:42/ });
    expect(playlistJump.getAttribute("href")).toBe("/watch/PL1/vid-1?t=42");

    const courseJump = screen.getByRole("link", { name: /Open at 5:00/ });
    expect(courseJump.getAttribute("href")).toBe("/course/course-1?t=300");
  });

  test("searches note text and metadata, then clears back to everything", () => {
    seed();
    render(<NotesView />);

    const search = screen.getByLabelText("Search notes");
    fireEvent.change(search, { target: { value: "generics" } });

    expect(screen.getByText(/1 of 2 notes/)).toBeTruthy();
    expect(screen.getByText("Generics keep types honest.")).toBeTruthy();
    expect(screen.queryByText(/memoization/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText(/memoization/)).toBeTruthy();
    expect(screen.getByText("Generics keep types honest.")).toBeTruthy();
  });

  test("filters by lesson type and shows a no-match state", () => {
    seed();
    render(<NotesView />);

    fireEvent.click(screen.getByRole("tab", { name: "Courses" }));
    expect(screen.getByText("Generics keep types honest.")).toBeTruthy();
    expect(screen.queryByText(/memoization/)).toBeNull();

    fireEvent.change(screen.getByLabelText("Search notes"), {
      target: { value: "memoization" },
    });
    expect(screen.getByText("No matching notes")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show all notes" }));
    expect(screen.getByRole("tab", { name: "All" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByText(/memoization/)).toBeTruthy();
  });

  test("links a legacy note when its video is still in the library", () => {
    addNote({
      videoId: "vid-1",
      markdown: "Legacy thought",
      timeSeconds: 10,
    });
    render(<NotesView />);

    expect(screen.getByText("Legacy thought")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open at 0:10/ }).getAttribute("href")).toBe(
      "/watch/PL1/vid-1?t=10",
    );
  });

  test("shows an empty state when there are no notes", () => {
    render(<NotesView />);
    expect(screen.getByText("No notes yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Browse library" })).toBeTruthy();
  });
});
