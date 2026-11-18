import { beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { Course, Playlist } from "@/shared/lib/types";
import {
  setPlaylistCompletedAt,
  setProgress,
} from "@/shared/lib/storage";
import { useLibrary } from "@/shared/store/library";
import {
  archiveCertificate,
  removeArchivedCertificate,
} from "../lib/certificate-archive";

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

function makePlaylist(id: string, title: string): Playlist {
  return {
    playlistId: id,
    playlistTitle: title,
    playlistDescription: "",
    playlistThumbnail: { url: "", width: 320, height: 180 },
    channelId: "ch1",
    channelTitle: "Focusy Academy",
    itemCount: 2,
    videos: [
      {
        videoId: "vid-1",
        title: "One",
        description: "",
        thumbnail: { url: "", width: 320, height: 180 },
        position: 0,
      },
      {
        videoId: "vid-2",
        title: "Two",
        description: "",
        thumbnail: { url: "", width: 320, height: 180 },
        position: 1,
      },
    ],
    addedAt: "2024-01-01",
  };
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  removeArchivedCertificate("course", "gone");
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

  test("lists fully watched playlists and links to their certificates", async () => {
    const playlist = makePlaylist("PL1", "Finished Playlist");
    useLibrary.setState({
      playlists: { PL1: playlist },
      order: ["PL1"],
    });
    localStorage.setItem(
      "focustube:progress:PL1",
      JSON.stringify({
        watched: ["vid-1", "vid-2"],
        lastWatched: "vid-2",
        completedChapters: [],
        positions: {},
      }),
    );
    setPlaylistCompletedAt("PL1");

    render(<CertificatesGalleryView />);

    expect(await screen.findByText("Finished Playlist")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Open certificate for Finished Playlist" })
        .getAttribute("href"),
    ).toBe("/watch/PL1/certificate");
    expect(
      screen.getByText("1 completed playlist — open or download any certificate."),
    ).toBeTruthy();
  });

  test("keeps showing a certificate after its course is deleted", async () => {
    archiveCertificate({
      kind: "course",
      sourceId: "gone",
      title: "Deleted Course",
      channelTitle: "Focusy Academy",
      thumbnail: "",
      completed: 2,
      total: 2,
      completedAt: 100,
    });

    render(<CertificatesGalleryView />);

    expect(await screen.findByText("Deleted Course")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Open certificate for Deleted Course" })
        .getAttribute("href"),
    ).toBe("/course/gone/certificate");
  });

  test("shows an empty state before any course is completed", async () => {
    render(<CertificatesGalleryView />);
    expect(await screen.findByText("No completed courses yet")).toBeTruthy();
  });
});
