import "fake-indexeddb/auto";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

// The test DOM is a separate `window`, so assign the fake store to the global
// that Studio's IndexedDB helpers read.
Object.defineProperty(globalThis, "indexedDB", {
  value: fakeIndexedDb,
  configurable: true,
});

import { clearWorkspaceRecords } from "../lib/studio-db";
import { ensureWorkspaceForSource } from "../lib/workspaces";
import {
  studioSourceForCourse,
  studioSourceForPlaylistVideo,
} from "../lib/workspace-utils";
import { useStudioWorkspaces } from "../store/studio-store";
import { useStudioWorkspace } from "./use-studio-workspace";

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

describe("useStudioWorkspace with a lesson source", () => {
  test("restores the saved project associated with the source", async () => {
    const source = studioSourceForPlaylistVideo("playlist-1", "video-1");
    const created = await ensureWorkspaceForSource(source, {
      name: "Lesson one",
      template: "react",
    });
    if (!created.ok) throw new Error(created.error.message);

    const { result } = renderHook(() => useStudioWorkspace({ source }));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.workspace?.id).toBe(created.value.id);
    expect(result.current.workspace?.name).toBe("Lesson one");
  });

  test("asks for a template when the lesson has no project yet", async () => {
    const source = studioSourceForCourse("course-1", "video-1");
    const { result } = renderHook(() => useStudioWorkspace({ source }));

    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(result.current.workspace).toBeNull();

    let message: string | null = "unexpected";
    await act(async () => {
      message = await result.current.createProject({
        name: "Course practice",
        template: "vanilla",
      });
    });

    expect(message).toBeNull();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.workspace?.source).toEqual(source);
    expect(result.current.workspace?.name).toBe("Course practice");
  });

  test("keeps course chapters on one shared project", async () => {
    const chapterOne = studioSourceForCourse("course-7", "video-1");
    const created = await ensureWorkspaceForSource(chapterOne, {
      name: "Shared course project",
      template: "static",
    });
    if (!created.ok) throw new Error(created.error.message);

    const { result, rerender } = renderHook(
      ({ source }) => useStudioWorkspace({ source }),
      { initialProps: { source: chapterOne } }
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.workspace?.id).toBe(created.value.id);

    // The course keeps its id across chapters; the chapter's video changes.
    rerender({ source: studioSourceForCourse("course-7", "video-2") });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.workspace?.id).toBe(created.value.id);
  });

  test("restores the right project when moving between playlist lessons", async () => {
    const first = studioSourceForPlaylistVideo("playlist-2", "video-a");
    const second = studioSourceForPlaylistVideo("playlist-2", "video-b");
    const firstWorkspace = await ensureWorkspaceForSource(first, {
      name: "Lesson A",
      template: "static",
    });
    if (!firstWorkspace.ok) throw new Error(firstWorkspace.error.message);

    const { result, rerender } = renderHook(
      ({ source }) => useStudioWorkspace({ source }),
      { initialProps: { source: first } }
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.workspace?.name).toBe("Lesson A");

    // A different lesson starts empty instead of borrowing the previous files.
    rerender({ source: second });
    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(result.current.workspace).toBeNull();

    // Returning to the first lesson restores its own project.
    rerender({ source: first });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.workspace?.id).toBe(firstWorkspace.value.id);
  });

  test("flushes the previous lesson's edits before switching away", async () => {
    const first = studioSourceForPlaylistVideo("playlist-3", "video-a");
    const second = studioSourceForPlaylistVideo("playlist-3", "video-b");
    const created = await ensureWorkspaceForSource(first, {
      name: "Lesson A",
      template: "static",
    });
    if (!created.ok) throw new Error(created.error.message);

    const { result, rerender } = renderHook(
      ({ source }) => useStudioWorkspace({ source }),
      { initialProps: { source: first } }
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.updateWorkspace((current) => ({
        ...current,
        files: current.files.map((file) =>
          file.path === current.activeFile
            ? { ...file, content: "edited before switching" }
            : file
        ),
      }));
    });

    // Moving away flushes the debounced write; the other lesson is empty.
    rerender({ source: second });
    await waitFor(() => expect(result.current.status).toBe("empty"));

    rerender({ source: first });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const active = result.current.workspace?.files.find(
      (file) => file.path === result.current.workspace?.activeFile
    );
    expect(active?.content).toBe("edited before switching");
  });
});

describe("studio project management", () => {
  test("renames, changes template and deletes the open project", async () => {
    const { result } = renderHook(() => useStudioWorkspace());
    await waitFor(() => expect(result.current.status).toBe("empty"));

    await act(async () => {
      expect(
        await result.current.createProject({ name: "Before", template: "react" })
      ).toBeNull();
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      expect(await result.current.renameProject("After")).toBeNull();
    });
    expect(result.current.workspace?.name).toBe("After");

    await act(async () => {
      expect(await result.current.changeTemplate("static")).toBeNull();
    });
    expect(result.current.workspace?.template).toBe("static");
    expect(result.current.workspace?.activeFile).toBe("/index.html");

    await act(async () => {
      expect(await result.current.deleteProject()).toBeNull();
    });
    expect(result.current.workspace).toBeNull();
    expect(result.current.status).toBe("empty");
  });

  test("opens another saved project after deleting the current one", async () => {
    const { result } = renderHook(() => useStudioWorkspace());
    await waitFor(() => expect(result.current.status).toBe("empty"));

    await act(async () => {
      expect(
        await result.current.createProject({ name: "First", template: "static" })
      ).toBeNull();
    });
    await act(async () => {
      expect(
        await result.current.createProject({ name: "Second", template: "static" })
      ).toBeNull();
    });
    expect(result.current.workspace?.name).toBe("Second");

    await act(async () => {
      expect(await result.current.deleteProject()).toBeNull();
    });
    expect(result.current.status).toBe("ready");
    expect(result.current.workspace?.name).toBe("First");
  });
});
