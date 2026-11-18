import { describe, expect, test } from "bun:test";
import type { LearningNote } from "@/shared/lib/learning-notes";
import type { Course, Playlist } from "@/shared/lib/types";
import { filterNoteEntries, resolveNoteContext } from "./note-search";

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

const PLAYLISTS = { PL1: PLAYLIST };
const COURSES = { "course-1": COURSE };

function note(overrides: Partial<LearningNote> = {}): LearningNote {
  return {
    id: "n1",
    videoId: "vid-1",
    source: null,
    timeSeconds: 42,
    markdown: "Use **memo** for derived state",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("resolveNoteContext", () => {
  test("builds playlist and course jump links with timestamps", () => {
    const playlist = resolveNoteContext(
      note({
        source: {
          kind: "playlist",
          playlistId: "PL1",
          videoId: "vid-1",
          title: "Effects lesson",
        },
      }),
      PLAYLISTS,
      COURSES,
    );
    expect(playlist).toEqual({
      href: "/watch/PL1/vid-1?t=42",
      lessonTitle: "Effects lesson",
      collectionTitle: "React course",
      kind: "playlist",
    });

    const course = resolveNoteContext(
      note({
        videoId: "vid-2",
        timeSeconds: null,
        source: {
          kind: "course",
          courseId: "course-1",
          videoId: "vid-2",
          title: "TypeScript deep dive",
        },
      }),
      PLAYLISTS,
      COURSES,
    );
    expect(course.href).toBe("/watch/course-1");
    expect(course.kind).toBe("course");
    expect(course.collectionTitle).toBe("TypeScript deep dive");
  });

  test("infers a link for a legacy note from the library", () => {
    const context = resolveNoteContext(note(), PLAYLISTS, COURSES);
    expect(context.href).toBe("/watch/PL1/vid-1?t=42");
    expect(context.kind).toBe("playlist");
    expect(context.collectionTitle).toBe("React course");
  });

  test("leaves notes without a matching lesson unlinked", () => {
    const context = resolveNoteContext(
      note({ videoId: "gone", timeSeconds: null }),
      PLAYLISTS,
      COURSES,
    );
    expect(context.href).toBeNull();
    expect(context.kind).toBeNull();
  });
});

describe("filterNoteEntries", () => {
  const entries = [
    {
      note: note({ id: "a", markdown: "Use **memo** for derived state" }),
      context: resolveNoteContext(note(), PLAYLISTS, COURSES),
    },
    {
      note: note({
        id: "b",
        videoId: "vid-2",
        timeSeconds: 300,
        markdown: "Generics keep types honest",
        source: {
          kind: "course",
          courseId: "course-1",
          videoId: "vid-2",
          title: "TypeScript deep dive",
        },
      }),
      context: resolveNoteContext(
        note({
          videoId: "vid-2",
          source: {
            kind: "course",
            courseId: "course-1",
            videoId: "vid-2",
            title: "TypeScript deep dive",
          },
        }),
        PLAYLISTS,
        COURSES,
      ),
    },
  ];

  test("returns everything when the query and filter are empty", () => {
    expect(filterNoteEntries(entries, "", "all")).toHaveLength(2);
  });

  test("matches every search word across note and lesson metadata", () => {
    expect(filterNoteEntries(entries, "memo react", "all").map((e) => e.note.id)).toEqual([
      "a",
    ]);
    expect(filterNoteEntries(entries, "typescript honest", "all").map((e) => e.note.id)).toEqual([
      "b",
    ]);
    expect(filterNoteEntries(entries, "5:00", "all").map((e) => e.note.id)).toEqual([
      "b",
    ]);
    expect(filterNoteEntries(entries, "missing", "all")).toEqual([]);
  });

  test("scopes results to playlists or courses", () => {
    expect(filterNoteEntries(entries, "", "playlist").map((e) => e.note.id)).toEqual([
      "a",
    ]);
    expect(filterNoteEntries(entries, "", "course").map((e) => e.note.id)).toEqual([
      "b",
    ]);
  });
});
