import { describe, expect, test, beforeEach, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Course } from "@/shared/lib/types";

// The card tree contains `<Link>`s — provide a minimal app-router stand-in
// since no Next router is mounted in jsdom.
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

const { CourseCard } = await import("./course-card");
const { useLibrary } = await import("@/shared/store/library");

const COURSE: Course = {
  id: "c1",
  videoId: "abcdefghijk",
  title: "My course",
  thumbnail: "",
  description: "",
  channelTitle: "Some Creator",
  durationSeconds: 600,
  chapters: [
    { id: "c1-1", title: "Intro", startSeconds: 0, endSeconds: null },
    { id: "c1-2", title: "Body", startSeconds: 60, endSeconds: null },
  ],
  createdAt: 1,
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useLibrary.setState({
    courses: {},
    courseOrder: [],
    courseFavorites: [],
    courseRecent: [],
    categories: {},
    categoryOrder: [],
  });
});

describe("CourseCard creator (mirrors the playlist card)", () => {
  test("shows the video creator under the title", () => {
    render(<CourseCard course={COURSE} />);
    expect(screen.getByText("Some Creator")).toBeTruthy();
    expect(screen.getByText("2 lessons")).toBeTruthy();
  });

  test("hides the creator line on courses saved before it existed", () => {
    render(<CourseCard course={{ ...COURSE, channelTitle: undefined }} />);
    expect(screen.queryByText("Some Creator")).toBeNull();
    // The rest of the card still renders normally.
    expect(screen.getByText("My course")).toBeTruthy();
    expect(screen.getByText("0/2 done")).toBeTruthy();
  });
});

describe("CourseCard categories", () => {
  test("shows the folder an already-categorized video belongs to", () => {
    const categoryId = useLibrary.getState().addCategory("Design")!;
    const course = { ...COURSE, categoryId };
    useLibrary.getState().addCourse(course);

    render(<CourseCard course={course} />);
    expect(screen.getByText("Design")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Change category (Design)" })
    ).toBeTruthy();
  });

  test("files an existing video into a new category from its card", () => {
    useLibrary.getState().addCourse(COURSE);
    render(<CourseCard course={COURSE} />);

    fireEvent.click(screen.getByRole("button", { name: "Set category" }));
    fireEvent.change(screen.getByLabelText("New category name"), {
      target: { value: "Design" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save category" }));

    const categoryId = useLibrary.getState().categoryOrder[0];
    expect(useLibrary.getState().categories[categoryId].name).toBe("Design");
    // The video saved earlier can now be filed without deleting it.
    expect(useLibrary.getState().courses.c1.categoryId).toBe(categoryId);
  });
});