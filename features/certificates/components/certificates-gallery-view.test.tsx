import { beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { Course } from "@/shared/lib/types";
import { setProgress } from "@/shared/lib/storage";
import { useLibrary } from "@/shared/store/library";

const { CertificatesGalleryView } = await import("./certificates-gallery-view");

function makeCourse(id: string, title: string): Course {
  return {
    id,
    videoId: "abcdefghijk",
    title,
    thumbnail: "",
    description: "",
    channelTitle: "Focusy Academy",
    durationSeconds: 600,
    chapters: [
      { id: `${id}-1`, title: "Intro", startSeconds: 0, endSeconds: 300 },
      { id: `${id}-2`, title: "Practice", startSeconds: 300, endSeconds: null },
    ],
    createdAt: 1,
  };
}

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
    hydrated: true,
  });
});

describe("certificates gallery", () => {
  test("lists only completed courses and links to their certificates", async () => {
    const done = makeCourse("done", "Finished Course");
    const partial = makeCourse("partial", "Unfinished Course");
    useLibrary.setState({
      courses: { done, partial },
      courseOrder: ["done", "partial"],
    });
    setProgress("done", {
      completedIds: ["done-1", "done-2"],
      lastChapterId: null,
      updatedAt: 100,
      positions: {},
    });
    setProgress("partial", {
      completedIds: ["partial-1"],
      lastChapterId: null,
      updatedAt: 200,
      positions: {},
    });

    render(<CertificatesGalleryView />);

    expect(await screen.findByText("Finished Course")).toBeTruthy();
    expect(screen.queryByText("Unfinished Course")).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Open certificate for Finished Course" })
        .getAttribute("href")
    ).toBe("/course/done/certificate");
    expect(screen.getByText("1 completed course — open or download any certificate.")).toBeTruthy();
  });

  test("shows an empty state before any course is completed", async () => {
    render(<CertificatesGalleryView />);
    expect(await screen.findByText("No completed courses yet")).toBeTruthy();
  });
});
