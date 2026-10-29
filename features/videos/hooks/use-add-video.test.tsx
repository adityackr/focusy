import { describe, expect, test, beforeEach, mock } from "bun:test";
import { act, cleanup, renderHook } from "@testing-library/react";

const push = mock((_: string) => {});

// The hook calls useRouter() — provide a minimal app-router stand-in since
// no Next router is mounted in jsdom (same approach as the card tests).
mock.module("next/navigation", () => ({
  useRouter: () => ({ push, replace: () => {}, prefetch: () => {} }),
}));

const { useAddVideo } = await import("./use-add-video");
const { useLibrary } = await import("@/shared/store/library");

const VIDEO = "abcdefghijk"; // valid 11-char ID
const EXISTING_ID = "existing-1";

function courseCount() {
  return Object.keys(useLibrary.getState().courses).length;
}

function seedExistingCourse(id = EXISTING_ID) {
  useLibrary.setState({
    courses: {
      [id]: {
        id,
        videoId: VIDEO,
        title: "Existing course",
        thumbnail: "",
        description: "",
        durationSeconds: null,
        createdAt: 1,
        chapters: [
          { id: `${id}-1`, title: "Intro", startSeconds: 0, endSeconds: null },
        ],
      },
    },
    courseOrder: [id],
  });
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  push.mockClear();
  useLibrary.setState({
    playlists: {},
    order: [],
    favorites: [],
    recent: [],
    courses: {},
    courseOrder: [],
    courseFavorites: [],
    courseRecent: [],
    loadingIds: [],
    error: null,
  });
});

/** Paste the URL, enter manual mode (no API key needed) and parse chapters. */
function pasteAndParse(
  result: { current: ReturnType<typeof useAddVideo> }
) {
  act(() => {
    result.current.setUrl(VIDEO);
    result.current.setManualMode(true);
  });
  act(() => {
    result.current.handleFetch();
  });
  act(() => {
    result.current.handleManualTextChange("00:00 Intro\n05:00 Body");
  });
}

describe("useAddVideo duplicate guard", () => {
  test("refuses to save an already-added video and opens the existing course", () => {
    seedExistingCourse();
    const result = renderHook(() => useAddVideo()).result;
    pasteAndParse(result);
    expect(result.current.chapters).toHaveLength(2);

    act(() => {
      result.current.handleSave();
    });

    expect(push).toHaveBeenCalledWith(`/course/${EXISTING_ID}`);
    // No second card for the same video.
    expect(courseCount()).toBe(1);
  });

  test("the duplicate check wins even before chapters are added", () => {
    seedExistingCourse();
    const result = renderHook(() => useAddVideo()).result;
    act(() => {
      result.current.setUrl(VIDEO);
      result.current.setManualMode(true);
    });
    act(() => {
      result.current.handleFetch();
    });
    expect(result.current.chapters).toHaveLength(0);

    act(() => {
      result.current.handleSave();
    });

    expect(push).toHaveBeenCalledWith(`/course/${EXISTING_ID}`);
    expect(courseCount()).toBe(1);
  });

  test("saves a brand-new video and routes to its fresh course", () => {
    const result = renderHook(() => useAddVideo()).result;
    pasteAndParse(result);

    act(() => {
      result.current.handleSave();
    });

    expect(courseCount()).toBe(1);
    const courses = Object.values(useLibrary.getState().courses);
    expect(courses[0].videoId).toBe(VIDEO);
    expect(push).toHaveBeenCalledWith(`/course/${courses[0].id}`);
    // Exactly one save: the library is untouched beyond that single course.
    expect(useLibrary.getState().courseOrder).toEqual([courses[0].id]);
  });

  test("keeps saving duplicates out when several copies already exist", () => {
    seedExistingCourse("copy-a");
    useLibrary.setState((s) => ({
      courses: {
        ...s.courses,
        "copy-b": { ...s.courses["copy-a"], id: "copy-b" },
      },
      courseOrder: [...s.courseOrder, "copy-b"],
    }));

    const result = renderHook(() => useAddVideo()).result;
    pasteAndParse(result);
    act(() => {
      result.current.handleSave();
    });

    // Lands on one of the existing cards rather than creating a third.
    expect(["/course/copy-a", "/course/copy-b"]).toContain(
      (push.mock.calls[0] ?? [])[0]
    );
    expect(courseCount()).toBe(2);
  });
});
