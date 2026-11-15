import "fake-indexeddb/auto";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { beforeEach, describe, expect, test } from "bun:test";

Object.defineProperty(globalThis, "indexedDB", {
  value: fakeIndexedDb,
  configurable: true,
});

import { clearWorkspaceRecords } from "./studio-db";
import {
  collectStudioBackup,
  restoreStudioBackup,
} from "./studio-backup";
import {
  createWorkspace,
  loadWorkspace,
  saveWorkspace,
} from "./workspaces";
import {
  studioSourceForCourse,
  studioSourceForPlaylistVideo,
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

describe("collectStudioBackup", () => {
  test("captures files, dependencies, active file and associations", async () => {
    const created = await createWorkspace({
      name: "Course practice",
      template: "react",
      source: studioSourceForCourse("course-1", "video-1"),
    });
    if (!created.ok) throw new Error(created.error.message);

    const edited = {
      ...created.value,
      activeFile: "/styles.css",
      dependencies: { dayjs: "^1.11.13" },
      files: created.value.files.map((file) =>
        file.path === "/App.js"
          ? { ...file, content: "export default function App() { return null }" }
          : file
      ),
    };
    const saved = await saveWorkspace(edited);
    if (!saved.ok) throw new Error(saved.error.message);

    const backup = await collectStudioBackup();
    expect(backup.ok).toBe(true);
    if (!backup.ok) return;

    expect(backup.value.version).toBe(1);
    expect(backup.value.activeWorkspaceId).toBe(created.value.id);
    expect(backup.value.order).toEqual([created.value.id]);
    expect(backup.value.workspaces).toHaveLength(1);
    expect(backup.value.workspaces[0]).toMatchObject({
      id: created.value.id,
      name: "Course practice",
      template: "react",
      sourceKey: "course:course-1",
      activeFile: "/styles.css",
      dependencies: { dayjs: "^1.11.13" },
    });
    expect(
      backup.value.workspaces[0].files.find((file) => file.path === "/App.js")
        ?.content
    ).toContain("return null");
  });

  test("keeps the most recent metadata index values", async () => {
    const created = await createWorkspace({ template: "static" });
    if (!created.ok) throw new Error(created.error.message);
    useStudioWorkspaces.getState().setActiveFile(
      created.value.id,
      "/styles.css"
    );

    const backup = await collectStudioBackup();
    expect(backup.ok).toBe(true);
    if (!backup.ok) return;
    expect(backup.value.workspaces[0].activeFile).toBe("/styles.css");
  });
});

describe("restoreStudioBackup", () => {
  test("replaces every saved project with the file's projects", async () => {
    const imported = await createWorkspace({
      name: "Imported",
      template: "vanilla-ts",
      source: studioSourceForPlaylistVideo("playlist-1", "video-1"),
    });
    if (!imported.ok) throw new Error(imported.error.message);
    const backup = await collectStudioBackup();
    if (!backup.ok) throw new Error(backup.error.message);

    await clearWorkspaceRecords();
    resetStore();
    const local = await createWorkspace({ name: "Local only" });
    if (!local.ok) throw new Error(local.error.message);

    const restored = await restoreStudioBackup(backup.value, "replace");
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.projectsAdded).toBe(1);

    const state = useStudioWorkspaces.getState();
    expect(state.workspaces[local.value.id]).toBeUndefined();
    expect(state.activeWorkspaceId).toBe(imported.value.id);
    expect(state.workspaces[imported.value.id]?.name).toBe("Imported");

    const missing = await loadWorkspace(local.value.id);
    expect(missing.ok).toBe(false);

    const loaded = await loadWorkspace(imported.value.id);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.name).toBe("Imported");
    expect(loaded.value.sourceKey).toBe("playlist:playlist-1:video-1");
  });

  test("merges new projects even when they share a local lesson", async () => {
    const local = await createWorkspace({
      name: "Local course",
      source: studioSourceForCourse("course-1", "video-1"),
    });
    if (!local.ok) throw new Error(local.error.message);

    const incomingSameSource = {
      ...local.value,
      id: "incoming-same-source",
      name: "Incoming duplicate source",
    };
    const incomingNew = {
      ...local.value,
      id: "incoming-new",
      name: "Incoming new",
      source: studioSourceForPlaylistVideo("playlist-2", "video-2"),
    };

    const restored = await restoreStudioBackup(
      {
        version: 1,
        activeWorkspaceId: incomingNew.id,
        order: [incomingSameSource.id, incomingNew.id],
        workspaces: [incomingSameSource, incomingNew],
      },
      "merge"
    );

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.projectsAdded).toBe(2);

    const state = useStudioWorkspaces.getState();
    expect(state.workspaces[local.value.id]?.name).toBe("Local course");
    expect(state.workspaces[incomingSameSource.id]?.name).toBe(
      "Incoming duplicate source"
    );
    expect(state.workspaces[incomingNew.id]?.name).toBe("Incoming new");
    expect(state.activeWorkspaceId).toBe(local.value.id);
  });

  test("keeps every project when several share a source", async () => {
    const original = await createWorkspace({
      name: "Original",
      source: studioSourceForCourse("course-1", "video-1"),
    });
    if (!original.ok) throw new Error(original.error.message);

    const restored = await restoreStudioBackup(
      {
        version: 1,
        activeWorkspaceId: original.value.id,
        order: [original.value.id, "duplicate-source"],
        workspaces: [
          original.value,
          { ...original.value, id: "duplicate-source", name: "Duplicate" },
        ],
      },
      "replace"
    );

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.projectsAdded).toBe(2);
    expect(restored.value.projectsSkipped).toBe(0);
    expect(
      Object.keys(useStudioWorkspaces.getState().workspaces).sort()
    ).toEqual([original.value.id, "duplicate-source"].sort());
  });

  test("skips unreadable project entries when the rest are valid", async () => {
    const good = await createWorkspace({ name: "Good" });
    if (!good.ok) throw new Error(good.error.message);

    const restored = await restoreStudioBackup(
      {
        version: 1,
        activeWorkspaceId: good.value.id,
        order: [good.value.id],
        workspaces: [good.value, { id: "broken", files: [] }],
      },
      "replace"
    );

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.projectsAdded).toBe(1);
    expect(restored.value.projectsSkipped).toBe(1);
    expect(useStudioWorkspaces.getState().workspaces[good.value.id]).toBeDefined();
  });

  test("refuses to wipe local projects when no incoming project is readable", async () => {
    const local = await createWorkspace({ name: "Keep me" });
    if (!local.ok) throw new Error(local.error.message);

    const restored = await restoreStudioBackup(
      {
        version: 1,
        activeWorkspaceId: null,
        order: [],
        workspaces: [{ id: "broken" }],
      },
      "replace"
    );

    expect(restored.ok).toBe(false);
    expect(useStudioWorkspaces.getState().workspaces[local.value.id]).toBeDefined();
    const loaded = await loadWorkspace(local.value.id);
    expect(loaded.ok).toBe(true);
  });

  test("an empty Studio section clears projects on replace", async () => {
    const local = await createWorkspace({ name: "Remove me" });
    if (!local.ok) throw new Error(local.error.message);

    const restored = await restoreStudioBackup(
      {
        version: 1,
        activeWorkspaceId: null,
        order: [],
        workspaces: [],
      },
      "replace"
    );

    expect(restored.ok).toBe(true);
    const state = useStudioWorkspaces.getState();
    expect(state.workspaces).toEqual({});
    expect(state.activeWorkspaceId).toBeNull();
    expect((await loadWorkspace(local.value.id)).ok).toBe(false);
  });

  test("rejects an unreadable section without touching projects", async () => {
    const local = await createWorkspace({ name: "Safe" });
    if (!local.ok) throw new Error(local.error.message);

    const restored = await restoreStudioBackup(
      { version: 99, workspaces: [] },
      "replace"
    );

    expect(restored.ok).toBe(false);
    expect(useStudioWorkspaces.getState().workspaces[local.value.id]).toBeDefined();
  });
});
