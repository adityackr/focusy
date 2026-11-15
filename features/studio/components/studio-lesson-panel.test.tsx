import "fake-indexeddb/auto";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

Object.defineProperty(globalThis, "indexedDB", {
  value: fakeIndexedDb,
  configurable: true,
});

// The real view mounts Monaco and Sandpack; these tests only assert which
// workspace the lesson panel hands it.
mock.module("./studio-workspace-view", () => ({
  StudioWorkspaceView: ({
    workspace,
  }: {
    workspace: { name: string };
  }) => <p>Workspace view: {workspace.name}</p>,
}));

import { clearWorkspaceRecords } from "../lib/studio-db";
import { ensureWorkspaceForSource } from "../lib/workspaces";
import {
  studioSourceForCourse,
  studioSourceForPlaylistVideo,
} from "../lib/workspace-utils";
import { useStudioWorkspaces } from "../store/studio-store";

// Import after the module mock so the panel picks up the stub.
const { StudioLessonPanel } = await import("./studio-lesson-panel");

function resetStore() {
  useStudioWorkspaces.setState({
    workspaces: {},
    order: [],
    activeWorkspaceId: null,
    hydrated: true,
  });
}

beforeEach(async () => {
  cleanup();
  await clearWorkspaceRecords();
  resetStore();
});

describe("StudioLessonPanel", () => {
  test("stays closed until the learner asks for it", () => {
    render(
      <StudioLessonPanel
        source={studioSourceForPlaylistVideo("playlist-1", "video-1")}
        lessonTitle="Build a todo app"
      />
    );

    expect(screen.getByText("Practice in Studio")).toBeTruthy();
    expect(screen.getByRole("button", { name: /open studio/i })).toBeTruthy();
    expect(screen.queryByText("Start a project for this lesson")).toBeNull();
  });

  test("offers a template on the first visit for a lesson", async () => {
    render(
      <StudioLessonPanel
        source={studioSourceForPlaylistVideo("playlist-1", "video-1")}
        lessonTitle="Build a todo app"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /open studio/i }));

    expect(screen.getByRole("dialog").className).toContain("w-full");
    expect(await screen.findByText("Start a project for this lesson")).toBeTruthy();
    expect(
      (screen.getByLabelText("Project name") as HTMLInputElement).value
    ).toBe("Build a todo app");
    expect(screen.getByLabelText("Template")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /create practice project/i })
    ).toBeTruthy();
  });

  test("describes a course as one workspace shared by its chapters", async () => {
    render(
      <StudioLessonPanel
        source={studioSourceForCourse("course-1", "video-1")}
        lessonTitle="JavaScript course"
      />
    );

    expect(
      screen.getByText(/every chapter shares one saved workspace/i)
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /open studio/i }));

    expect(await screen.findByText("Start a project for this course")).toBeTruthy();
  });

  test("can be closed without leaving the lesson", () => {
    render(
      <StudioLessonPanel
        source={studioSourceForPlaylistVideo("playlist-1", "video-1")}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /open studio/i }));
    fireEvent.click(screen.getByRole("button", { name: /close studio/i }));

    expect(screen.queryByText("Start a project for this lesson")).toBeNull();
  });

  test("restores the saved project when moving back to a playlist lesson", async () => {
    const first = studioSourceForPlaylistVideo("playlist-2", "video-a");
    const second = studioSourceForPlaylistVideo("playlist-2", "video-b");
    const created = await ensureWorkspaceForSource(first, {
      name: "Lesson A project",
      template: "static",
    });
    if (!created.ok) throw new Error(created.error.message);

    const { rerender } = render(
      <StudioLessonPanel source={first} lessonTitle="Lesson A" />
    );
    fireEvent.click(screen.getByRole("button", { name: /open studio/i }));
    expect(
      await screen.findByText("Workspace view: Lesson A project")
    ).toBeTruthy();

    // Another lesson must not borrow Lesson A's files.
    rerender(<StudioLessonPanel source={second} lessonTitle="Lesson B" />);
    expect(await screen.findByText("Start a project for this lesson")).toBeTruthy();
    expect(
      (screen.getByLabelText("Project name") as HTMLInputElement).value
    ).toBe("Lesson B");

    // Returning restores the first lesson's saved project.
    rerender(<StudioLessonPanel source={first} lessonTitle="Lesson A" />);
    expect(
      await screen.findByText("Workspace view: Lesson A project")
    ).toBeTruthy();
  });
});
