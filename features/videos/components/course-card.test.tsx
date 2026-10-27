import { describe, expect, test, beforeEach, mock } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { Course } from "@/shared/lib/types";

// The card tree contains `<Link>`s — provide a minimal app-router stand-in
// since no Next router is mounted in jsdom.
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

const { CourseCard } = await import("./course-card");

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