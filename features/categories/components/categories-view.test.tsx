import { describe, expect, test, beforeEach, beforeAll, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Course, Playlist } from "@/shared/lib/types";

// The views reach `useRouter()`/`usePathname()` through the shell and render
// `<Link>`s — provide a minimal app-router stand-in under jsdom.
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  }),
  usePathname: () => "/categories",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const { CategoriesView } = await import("./categories-view");
const { CategoryView } = await import("./category-view");
const { useLibrary } = await import("@/shared/store/library");

function makeCourse(id: string, title: string): Course {
  return {
    id,
    videoId: "abcdefghijk",
    title,
    thumbnail: "",
    description: "",
    durationSeconds: 600,
    chapters: [{ id: `${id}-c1`, title: "Intro", startSeconds: 0, endSeconds: null }],
    createdAt: 1,
  };
}

function makePlaylist(id: string, title: string): Playlist {
  return {
    playlistId: id,
    playlistTitle: title,
    playlistDescription: "",
    playlistThumbnail: { url: "", width: 320, height: 180 },
    channelId: "ch1",
    channelTitle: "Channel",
    itemCount: 1,
    videos: [],
    addedAt: "2024-01-01",
  };
}

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

let designId: string;
let codeId: string;

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useLibrary.setState({
    playlists: {},
    order: [],
    favorites: [],
    recent: [],
    courses: {},
    courseOrder: [],
    courseFavorites: [],
    courseRecent: [],
    categories: {},
    categoryOrder: [],
    loadingIds: [],
    error: null,
    hydrated: true,
  });

  designId = useLibrary.getState().addCategory("Design")!;
  codeId = useLibrary.getState().addCategory("Code")!;
  useLibrary.getState().addCourse({ ...makeCourse("C1", "Design video"), categoryId: designId });
  useLibrary.getState().addCourse({ ...makeCourse("C2", "Code video"), categoryId: codeId });
  useLibrary.getState().addPlaylist({ ...makePlaylist("PL1", "Code playlist"), categoryId: codeId });
});

describe("CategoriesView", () => {
  test("lists every category as a folder with its video and playlist counts", () => {
    render(<CategoriesView />);

    expect(screen.getByText("Design")).toBeTruthy();
    expect(screen.getByText("Code")).toBeTruthy();
    expect(screen.getByText(/1 video · 0 playlists/)).toBeTruthy();
    expect(screen.getByText(/1 video · 1 playlist/)).toBeTruthy();
  });

  test("shows an Uncategorized folder for unfiled items", () => {
    useLibrary.getState().addCourse(makeCourse("C3", "Loose video"));
    useLibrary.getState().addCourse(makeCourse("C4", "Another loose video"));
    render(<CategoriesView />);

    const link = screen.getByRole("link", { name: "Open Uncategorized" });
    expect(link.getAttribute("href")).toBe("/categories/uncategorized");
    expect(screen.getByText(/2 videos · 0 playlists/)).toBeTruthy();
  });

  test("renames a category from its folder card", () => {
    render(<CategoriesView />);
    fireEvent.click(screen.getByRole("button", { name: 'Rename "Design"' }));
    fireEvent.change(screen.getByLabelText("Category name"), {
      target: { value: "Product" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));

    expect(useLibrary.getState().categories[designId].name).toBe("Product");
  });

  test("deletes a category and moves its items to Uncategorized", () => {
    render(<CategoriesView />);
    fireEvent.click(screen.getByRole("button", { name: 'Delete "Design"' }));
    fireEvent.click(screen.getByRole("button", { name: "Delete category" }));

    expect(useLibrary.getState().categories[designId]).toBeUndefined();
    expect(useLibrary.getState().courses.C1.categoryId).toBeUndefined();
  });
});

describe("CategoryView", () => {
  test("shows only that category's videos and playlists", () => {
    render(<CategoryView categoryId={codeId} />);

    expect(screen.getByText("Code video")).toBeTruthy();
    expect(screen.queryByText("Design video")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Playlists/ }));
    expect(screen.getByText("Code playlist")).toBeTruthy();
  });

  test("bulk-moves a tab's items to another category", () => {
    render(<CategoryView categoryId={codeId} />);

    fireEvent.click(screen.getByRole("button", { name: "Move videos" }));
    fireEvent.click(screen.getByRole("button", { name: "Design" }));
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    expect(useLibrary.getState().courses.C2.categoryId).toBe(designId);
    // The playlist in the same category was not part of the videos tab move.
    expect(useLibrary.getState().playlists.PL1.categoryId).toBe(codeId);
  });

  test("shows unfiled items in the Uncategorized folder", () => {
    useLibrary.getState().addCourse(makeCourse("C3", "Loose video"));
    render(<CategoryView categoryId="uncategorized" />);

    expect(screen.getByText("Uncategorized")).toBeTruthy();
    expect(screen.getByText("Loose video")).toBeTruthy();
    expect(screen.queryByText("Code video")).toBeNull();
  });

  test("offers drag handles to reorder videos and playlists in the category", () => {
    render(<CategoryView categoryId={codeId} />);
    expect(
      screen.getByRole("button", { name: /Drag to reorder "Code video"/ })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Playlists/ }));
    expect(
      screen.getByRole("button", { name: /Drag to reorder "Code playlist"/ })
    ).toBeTruthy();
  });

  test("renders a not-found card for an unknown category", () => {
    render(<CategoryView categoryId="missing" />);
    expect(screen.getByText("Category not found")).toBeTruthy();
  });
});
