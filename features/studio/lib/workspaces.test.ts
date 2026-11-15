import "fake-indexeddb/auto";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { beforeEach, describe, expect, test } from "bun:test";

// The test DOM is a separate `window` object, so the auto setup (which assigns
// to `window`) doesn't reach the runtime global Studio checks.
Object.defineProperty(globalThis, "indexedDB", {
  value: fakeIndexedDb,
  configurable: true,
});
import { clearWorkspaceRecords } from "./studio-db";
import {
  changeWorkspaceTemplate,
  createWorkspace,
  deleteWorkspace,
  ensureWorkspaceForSource,
  loadLastWorkspace,
  loadWorkspace,
  loadWorkspaceForSource,
  renameWorkspace,
  saveWorkspace,
} from "./workspaces";
import {
  studioSourceForCourse,
  studioSourceForPlaylistVideo,
  studioSourceForVideo,
} from "./workspace-utils";
import { useStudioWorkspaces } from "../store/studio-store";

function resetStore() {
  useStudioWorkspaces.setState({
    workspaces: {},
    order: [],
    activeWorkspaceId: null,
    hydrated: true,
  });
}

beforeEach(async () => {
  await clearWorkspaceRecords();
  resetStore();
});

describe("createWorkspace", () => {
  test("creates a template-backed workspace and indexes metadata", async () => {
    const result = await createWorkspace({ name: "  Tutorial  " });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe("Tutorial");
    expect(result.value.template).toBe("static");
    expect(result.value.files.length).toBeGreaterThan(0);
    expect(result.value.source).toBeNull();
    expect(result.value.sourceKey).toBeNull();

    const state = useStudioWorkspaces.getState();
    expect(state.activeWorkspaceId).toBe(result.value.id);
    expect(state.workspaces[result.value.id]?.name).toBe("Tutorial");
    expect(state.workspaces[result.value.id]).not.toHaveProperty("files");
  });

  test("reuses the existing workspace for an associated source", async () => {
    const source = studioSourceForVideo("video-1");
    const first = await createWorkspace({ source, template: "react-ts" });
    const second = await createWorkspace({ source, template: "static" });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.id).toBe(first.value.id);
    expect(second.value.template).toBe("react-ts");
    expect(useStudioWorkspaces.getState().order).toHaveLength(1);
  });

  test("creates another linked project only when explicitly requested", async () => {
    const source = studioSourceForVideo("video-8");
    const first = await createWorkspace({ source, name: "First" });
    const second = await createWorkspace({
      source,
      name: "Second",
      template: "react",
      allowDuplicateSource: true,
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.id).not.toBe(first.value.id);
    expect(second.value.sourceKey).toBe(first.value.sourceKey);
    expect(useStudioWorkspaces.getState().order).toHaveLength(2);

    const reopened = await loadWorkspaceForSource(source);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.value.id).toBe(second.value.id);
  });
});

describe("persistence", () => {
  test("round-trips edited files through IndexedDB", async () => {
    const created = await createWorkspace({ template: "react" });
    if (!created.ok) throw new Error(created.error.message);

    const edited = {
      ...created.value,
      files: created.value.files.map((file) =>
        file.path === created.value.activeFile
          ? { ...file, content: "edited content" }
          : file
      ),
    };
    const saved = await saveWorkspace(edited);
    expect(saved.ok).toBe(true);

    resetStore();
    const loaded = await loadWorkspace(created.value.id);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(
      loaded.value.files.find((file) => file.path === loaded.value.activeFile)
        ?.content
    ).toBe("edited content");
    expect(
      useStudioWorkspaces.getState().workspaces[created.value.id]?.activeFile
    ).toBe(created.value.activeFile);
  });

  test("restores the last opened workspace after a fresh store", async () => {
    const created = await createWorkspace({ name: "Reload me" });
    if (!created.ok) throw new Error(created.error.message);

    resetStore();
    const restored = await loadLastWorkspace();
    expect(restored?.ok).toBe(true);
    if (!restored?.ok) return;
    expect(restored.value.id).toBe(created.value.id);
    expect(restored.value.name).toBe("Reload me");
  });

  test("returns no last workspace when this browser has none", async () => {
    expect(await loadLastWorkspace()).toBeNull();
  });

  test("reports a missing workspace and clears its stale metadata", async () => {
    const created = await createWorkspace({ name: "Ghost" });
    if (!created.ok) throw new Error(created.error.message);

    useStudioWorkspaces.setState({
      workspaces: {
        [created.value.id]: {
          id: created.value.id,
          name: "Ghost",
          template: created.value.template,
          source: null,
          sourceKey: null,
          activeFile: created.value.activeFile,
          createdAt: created.value.createdAt,
          updatedAt: created.value.updatedAt,
        },
      },
      order: [created.value.id],
    });

    await clearWorkspaceRecords();
    const loaded = await loadWorkspace(created.value.id);

    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.error.code).toBe("not-found");
    expect(useStudioWorkspaces.getState().workspaces[created.value.id]).toBeUndefined();
  });

  test("reports damaged records as corrupted", async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("focusy-studio", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction("workspaces", "readwrite")
        .objectStore("workspaces")
        .put({ id: "broken", template: "nope" });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();

    const loaded = await loadWorkspace("broken");
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.error.code).toBe("corrupted");
  });
});

describe("ensureWorkspaceForSource", () => {
  test("is idempotent, including concurrent calls", async () => {
    const source = studioSourceForCourse("course-9", "video-9");
    const [first, second] = await Promise.all([
      ensureWorkspaceForSource(source),
      ensureWorkspaceForSource(source),
    ]);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.id).toBe(first.value.id);

    const again = await ensureWorkspaceForSource(source);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.value.id).toBe(first.value.id);
    expect(useStudioWorkspaces.getState().order).toHaveLength(1);
  });

  test("shares one workspace across course chapters", async () => {
    const chapterOne = await ensureWorkspaceForSource(
      studioSourceForCourse("course-1", "video-1"),
      { name: "Course project", template: "react" }
    );
    const chapterTwo = await ensureWorkspaceForSource(
      studioSourceForCourse("course-1", "video-2")
    );
    expect(chapterOne.ok && chapterTwo.ok).toBe(true);
    if (!chapterOne.ok || !chapterTwo.ok) return;
    expect(chapterTwo.value.id).toBe(chapterOne.value.id);
  });

  test("keeps playlist lessons in separate workspaces", async () => {
    const lessonOne = await ensureWorkspaceForSource(
      studioSourceForPlaylistVideo("playlist-1", "video-1")
    );
    const lessonTwo = await ensureWorkspaceForSource(
      studioSourceForPlaylistVideo("playlist-1", "video-2")
    );
    expect(lessonOne.ok && lessonTwo.ok).toBe(true);
    if (!lessonOne.ok || !lessonTwo.ok) return;
    expect(lessonTwo.value.id).not.toBe(lessonOne.value.id);
  });

  test("finds an existing association by source", async () => {
    const source = studioSourceForVideo("video-7");
    const created = await ensureWorkspaceForSource(source);
    if (!created.ok) throw new Error(created.error.message);

    const found = await loadWorkspaceForSource(source);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.id).toBe(created.value.id);
  });
});

describe("deleteWorkspace / renameWorkspace", () => {
  test("deletes a workspace from storage and metadata", async () => {
    const created = await createWorkspace({ name: "Temporary" });
    if (!created.ok) throw new Error(created.error.message);

    const deleted = await deleteWorkspace(created.value.id);
    expect(deleted.ok).toBe(true);
    expect(useStudioWorkspaces.getState().workspaces[created.value.id]).toBeUndefined();
    expect(useStudioWorkspaces.getState().activeWorkspaceId).toBeNull();

    const loaded = await loadWorkspace(created.value.id);
    expect(loaded.ok).toBe(false);
  });

  test("renames a workspace while keeping its files", async () => {
    const created = await createWorkspace({ name: "Old name", template: "vanilla-ts" });
    if (!created.ok) throw new Error(created.error.message);

    const renamed = await renameWorkspace(created.value.id, "  New name  ");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.value.name).toBe("New name");
    expect(renamed.value.files).toEqual(created.value.files);

    const loaded = await loadWorkspace(created.value.id);
    expect(loaded.ok && loaded.value.name).toBe("New name");
  });

  test("refuses an empty rename", async () => {
    const created = await createWorkspace();
    if (!created.ok) throw new Error(created.error.message);

    const renamed = await renameWorkspace(created.value.id, "   ");
    expect(renamed.ok).toBe(false);
  });

  test("changes template by replacing the starter files", async () => {
    const created = await createWorkspace({ template: "react-ts" });
    if (!created.ok) throw new Error(created.error.message);

    const changed = await changeWorkspaceTemplate(created.value.id, "static");
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    expect(changed.value.template).toBe("static");
    expect(changed.value.activeFile).toBe("/index.html");
    expect(changed.value.files.map((file) => file.path)).toEqual([
      "/index.html",
      "/styles.css",
      "/script.js",
    ]);
    expect(changed.value.dependencies).toEqual({});
  });
});
