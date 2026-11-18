import { describe, expect, test } from "bun:test";
import type { Course, Playlist } from "@/shared/lib/types";
import { buildGlobalSearchResults, type GlobalSearchInput } from "./global-search";

const COURSE: Course = {
  id: "course-1",
  videoId: "vid-course",
  title: "React fundamentals",
  thumbnail: "",
  description: "",
  channelTitle: "Code Channel",
  durationSeconds: 600,
  createdAt: 1,
  chapters: [
    { id: "ch-1", title: "Hooks overview", startSeconds: 90, endSeconds: null },
    { id: "ch-2", title: "Rendering lists", startSeconds: 0, endSeconds: 90 },
  ],
};

const PLAYLIST: Playlist = {
  playlistId: "PL1",
  playlistTitle: "React deep dive",
  playlistDescription: "",
  playlistThumbnail: { url: "https://img/playlist.jpg", width: 320, height: 180 },
  channelId: "ch1",
  channelTitle: "Code Channel",
  itemCount: 1,
  videos: [
    {
      videoId: "vid-effect",
      title: "Effects lesson",
      description: "",
      thumbnail: { url: "https://img/effect.jpg", width: 320, height: 180 },
      position: 0,
    },
  ],
  addedAt: "2024-01-01",
};

function input(overrides: Partial<GlobalSearchInput> = {}): GlobalSearchInput {
  return {
    query: "react",
    courses: [COURSE],
    playlists: [PLAYLIST],
    notes: [
      {
        id: "note-1",
        markdown: "Use **memo** to keep renders cheap",
        lessonTitle: "Hooks overview",
        collectionTitle: "React fundamentals",
        href: "/watch/course-1?t=42",
        timeSeconds: 42,
      },
    ],
    projects: [
      {
        id: "project-1",
        name: "Hooks playground",
        subtitle: "React + TypeScript",
        href: "/watch/course-1",
      },
    ],
    courseFavorites: ["course-1"],
    playlistFavorites: ["PL1"],
    ...overrides,
  };
}

function groupIds(results: ReturnType<typeof buildGlobalSearchResults>) {
  return results.groups.map((group) => group.id);
}

describe("buildGlobalSearchResults", () => {
  test("returns nothing for an empty query", () => {
    expect(buildGlobalSearchResults(input({ query: "   " }))).toEqual({
      groups: [],
      total: 0,
    });
  });

  test("searches every content type and builds in-app links", () => {
    const results = buildGlobalSearchResults(input());
    expect(groupIds(results)).toEqual([
      "videos",
      "playlists",
      "lessons",
      "notes",
      "bookmarks",
      "projects",
    ]);

    const items = results.groups.flatMap((group) => group.items);
    const byGroup = (id: string) =>
      results.groups.find((group) => group.id === id)!;

    expect(byGroup("videos").items[0]).toMatchObject({
      title: "React fundamentals",
      href: "/watch/course-1",
      thumbnail: "https://i.ytimg.com/vi/vid-course/mqdefault.jpg",
    });
    expect(byGroup("playlists").items[0]).toMatchObject({
      title: "React deep dive",
      href: "/watch/PL1",
    });
    expect(byGroup("lessons").items.map((item) => item.href).sort()).toEqual([
      "/watch/PL1/vid-effect",
      "/watch/course-1?t=0",
      "/watch/course-1?t=90",
    ]);
    expect(byGroup("notes").items[0]).toMatchObject({
      title: "Hooks overview",
      href: "/watch/course-1?t=42",
    });
    expect(byGroup("bookmarks").items.map((item) => item.href).sort()).toEqual([
      "/watch/PL1",
      "/watch/course-1",
    ]);
    expect(byGroup("projects").items[0]).toMatchObject({
      title: "Hooks playground",
      href: "/watch/course-1",
    });
    expect(items.length).toBe(results.total);
  });

  test("requires every query word to match", () => {
    const both = buildGlobalSearchResults(input({ query: "react hooks" }));
    expect(groupIds(both)).toEqual(["lessons", "notes", "projects"]);
    expect(
      both.groups.find((group) => group.id === "lessons")!.items.map((i) => i.title),
    ).toEqual(["Hooks overview"]);

    const none = buildGlobalSearchResults(input({ query: "react svelte" }));
    expect(none.total).toBe(0);
    expect(none.groups).toEqual([]);
  });

  test("matches notes by markdown and lesson metadata", () => {
    const byMarkdown = buildGlobalSearchResults(input({ query: "memo renders" }));
    expect(byMarkdown.groups).toHaveLength(1);
    expect(byMarkdown.groups[0].id).toBe("notes");
    expect(byMarkdown.groups[0].items[0].snippet).toBe(
      "Use memo to keep renders cheap",
    );

    const byCourse = buildGlobalSearchResults(input({ query: "react 42" }));
    expect(byCourse.groups.map((group) => group.id)).toEqual(["notes"]);
  });

  test("ranks exact and prefix titles above supporting matches", () => {
    const second: Course = {
      ...COURSE,
      id: "course-2",
      videoId: "vid-other",
      title: "Advanced React patterns",
      chapters: [],
    };
    const results = buildGlobalSearchResults(
      input({ courses: [second, COURSE], playlistFavorites: [], query: "react" }),
    );
    const videos = results.groups.find((group) => group.id === "videos")!;
    expect(videos.items.map((item) => item.title)).toEqual([
      "React fundamentals",
      "Advanced React patterns",
    ]);

    const exact = buildGlobalSearchResults(
      input({ courses: [COURSE, second], query: "advanced react patterns" }),
    );
    expect(
      exact.groups.find((group) => group.id === "videos")!.items[0].title,
    ).toBe("Advanced React patterns");
  });

  test("caps each group but reports the full match count", () => {
    const many: Course[] = Array.from({ length: 9 }, (_, i) => ({
      ...COURSE,
      id: `course-${i}`,
      videoId: `vid-${i}`,
      title: `React lesson ${i}`,
      chapters: [],
    }));
    const results = buildGlobalSearchResults(
      input({
        courses: many,
        playlists: [],
        notes: [],
        projects: [],
        courseFavorites: [],
        playlistFavorites: [],
        limit: 4,
      }),
    );
    expect(results.groups).toHaveLength(1);
    expect(results.groups[0].items).toHaveLength(4);
    expect(results.groups[0].total).toBe(9);
    expect(results.total).toBe(9);
  });

  test("skips bookmarks whose library item was deleted", () => {
    const results = buildGlobalSearchResults(
      input({ courseFavorites: ["gone"], playlistFavorites: ["PL1"] }),
    );
    const bookmarks = results.groups.find((group) => group.id === "bookmarks")!;
    expect(bookmarks.items.map((item) => item.href)).toEqual(["/watch/PL1"]);
    expect(bookmarks.total).toBe(1);
  });

  test("keeps standalone projects visible without a link", () => {
    const results = buildGlobalSearchResults(
      input({
        projects: [
          { id: "p", name: "Scratch pad", subtitle: "Static", href: null },
        ],
        query: "scratch",
      }),
    );
    expect(results.groups).toHaveLength(1);
    expect(results.groups[0].items[0].href).toBeNull();
  });

  test("escapes ids in generated links", () => {
    const weird: Playlist = {
      ...PLAYLIST,
      playlistId: "PL/1",
      videos: [{ ...PLAYLIST.videos[0], videoId: "a b" }],
    };
    const encoded = buildGlobalSearchResults(
      input({
        playlists: [weird],
        courses: [],
        notes: [],
        projects: [],
        query: "effects",
      }),
    );
    expect(encoded.groups.find((group) => group.id === "lessons")!.items[0].href).toBe(
      "/watch/PL%2F1/a%20b",
    );
  });
});
