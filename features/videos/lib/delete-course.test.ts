import { beforeEach, describe, expect, test } from "bun:test";
import type { Course } from "@/shared/lib/types";
import { useLibrary } from "@/shared/store/library";
import { getProgress, setProgress } from "@/shared/lib/storage";
import {
  LEGACY_NOTE_STORAGE_PREFIX,
  NOTES_STORAGE_PREFIX,
} from "@/shared/lib/learning-notes";
import {
  addBookmark,
  allBookmarks,
} from "@/features/bookmarks/lib/bookmark-store";
import {
  addTextResource,
  allResources,
} from "@/features/resources";
import { getArchivedCertificate } from "@/features/certificates";
import { deleteCourseData } from "./delete-course";

function makeCourse(id: string, complete = false): Course {
  return {
    id,
    videoId: "abcdefghijk",
    title: "Deep Dive",
    thumbnail: "https://example.com/thumb.jpg",
    description: "",
    channelTitle: "Focusy Labs",
    durationSeconds: 600,
    chapters: [
      { id: `${id}-1`, title: "Intro", startSeconds: 0, endSeconds: 300 },
      { id: `${id}-2`, title: "Practice", startSeconds: 300, endSeconds: null },
    ],
    createdAt: 1,
  };
}

beforeEach(() => {
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

describe("course cascade deletion", () => {
  test("removes notes, bookmarks, attachments, progress and Studio data", async () => {
    const course = makeCourse("C1");
    useLibrary.getState().addCourse(course);
    useLibrary.getState().toggleCourseFavorite("C1");

    const noteKey = NOTES_STORAGE_PREFIX + course.videoId;
    const legacyKey = LEGACY_NOTE_STORAGE_PREFIX + course.videoId;
    localStorage.setItem(noteKey, JSON.stringify({ version: 2, notes: [] }));
    localStorage.setItem(legacyKey, JSON.stringify({ text: "old", updatedAt: 1 }));

    addBookmark({
      videoId: course.videoId,
      timeSeconds: 30,
      description: "Remember this",
    });
    addTextResource({
      courseId: course.id,
      kind: "link",
      title: "Docs",
      url: "https://example.com/docs",
    });
    setProgress(course.id, {
      completedIds: ["C1-1"],
      lastChapterId: "C1-1",
      updatedAt: 1,
      positions: {},
    });

    await deleteCourseData(course.id);

    expect(useLibrary.getState().courses.C1).toBeUndefined();
    expect(useLibrary.getState().courseOrder).toEqual([]);
    expect(useLibrary.getState().courseFavorites).toEqual([]);
    expect(localStorage.getItem(noteKey)).toBeNull();
    expect(localStorage.getItem(legacyKey)).toBeNull();
    expect(allBookmarks()).toEqual([]);
    expect(allResources()).toEqual([]);
    expect(getProgress(course.id).updatedAt).toBe(0);
    expect(localStorage.getItem(`yt-course:progress:${course.id}`)).toBeNull();
  });

  test("keeps a finished course certificate after deleting the course", async () => {
    const course = makeCourse("C2");
    useLibrary.getState().addCourse(course);
    localStorage.setItem(
      `yt-course:progress:${course.id}`,
      JSON.stringify({
        completedIds: ["C2-1", "C2-2"],
        lastChapterId: "C2-2",
        updatedAt: 1234,
        positions: {},
      }),
    );

    await deleteCourseData(course.id);

    const archived = getArchivedCertificate("course", course.id);
    expect(archived).toMatchObject({
      kind: "course",
      sourceId: course.id,
      title: course.title,
      completed: 2,
      total: 2,
    });
    expect(archived?.completedAt).toBeGreaterThan(0);
  });

  test("does not create a certificate for an unfinished course", async () => {
    const course = makeCourse("C3");
    useLibrary.getState().addCourse(course);
    setProgress(course.id, {
      completedIds: ["C3-1"],
      lastChapterId: null,
      updatedAt: 1,
      positions: {},
    });

    await deleteCourseData(course.id);

    expect(getArchivedCertificate("course", course.id)).toBeNull();
  });
});
