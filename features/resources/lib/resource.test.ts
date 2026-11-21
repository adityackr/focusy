import "fake-indexeddb/auto";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { beforeEach, describe, expect, test } from "bun:test";

Object.defineProperty(globalThis, "indexedDB", {
  value: fakeIndexedDb,
  configurable: true,
});

import { collectBackup, backupPreview, parseBackup, serializeBackup } from "@/shared/lib/backup";
import {
  addFileResource,
  addTextResource,
  allResources,
  mergeResources,
  removeResource,
  removeResourcesForPlaylist,
  replaceResources,
} from "./resource-store";
import { resourcesForCourse, resourcesForPlaylist } from "./resource";
import { clearResourceFiles, readResourceFile } from "./resource-db";
import {
  collectResourcesBackup,
  restoreResourcesBackup,
} from "./resource-backup";

async function reset() {
  localStorage.clear();
  replaceResources([]);
  await clearResourceFiles();
}

beforeEach(reset);

describe("resource validation and store", () => {
  test("saves links, normalizes bare domains and rejects missing URLs", () => {
    const invalid = addTextResource({
      courseId: "course-1",
      kind: "link",
      title: "React docs",
      url: "",
    });
    expect(invalid).toEqual({ ok: false, error: "invalid-url" });

    const added = addTextResource({
      courseId: "course-1",
      chapterId: "lesson-1",
      kind: "doc",
      title: "React docs",
      url: "react.dev/learn",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.value.url).toBe("https://react.dev/learn");
    expect(added.value.chapterId).toBe("lesson-1");
    expect(allResources()).toHaveLength(1);
  });

  test("deletes metadata and the stored file", async () => {
    const added = await addFileResource({
      courseId: "course-1",
      kind: "download",
      title: "",
      file: new File(["hello"], "notes.txt", { type: "text/plain" }),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.value.title).toBe("notes.txt");

    const removed = await removeResource(added.value.id);
    expect(removed.ok).toBe(true);
    expect(allResources()).toEqual([]);
    expect(await readResourceFile(added.value.id)).toBeNull();
  });

  test("attaches resources to a playlist lesson and removes them with the playlist", async () => {
    const added = addTextResource({
      playlistId: "playlist-1",
      chapterId: "video-1",
      kind: "link",
      title: "Playlist reference",
      url: "https://example.com/lesson",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.value.playlistId).toBe("playlist-1");
    expect(added.value.courseId).toBe("");
    expect(added.value.chapterId).toBe("video-1");
    expect(resourcesForPlaylist(allResources(), "playlist-1")).toHaveLength(1);
    // Playlist resources never leak into a course with the same id.
    expect(resourcesForCourse(allResources(), "playlist-1")).toEqual([]);

    await removeResourcesForPlaylist("playlist-1");
    expect(allResources()).toEqual([]);
  });

  test("merge keeps local resources and only adds new ids", () => {
    const local = addTextResource({
      courseId: "course-1",
      kind: "link",
      title: "Local",
      url: "https://example.com/local",
    });
    if (!local.ok) throw new Error("local save failed");

    const added = mergeResources([
      local.value,
      {
        ...local.value,
        id: "incoming",
        title: "Incoming",
      },
    ]);

    expect(added).toBe(1);
    expect(allResources().map((resource) => resource.id).sort()).toEqual(
      [local.value.id, "incoming"].sort(),
    );
  });
});

describe("resource backup", () => {
  test("round-trips metadata and file bytes through a backup file", async () => {
    const pdfBytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
    const pdf = await addFileResource({
      courseId: "course-1",
      kind: "pdf",
      title: "React cheat sheet",
      file: new File([pdfBytes], "react.pdf", { type: "application/pdf" }),
    });
    expect(pdf.ok).toBe(true);
    if (!pdf.ok) return;

    const snippet = addTextResource({
      courseId: "course-1",
      chapterId: "lesson-1",
      kind: "snippet",
      title: "useEffect",
      language: "tsx",
      content: "useEffect(() => {}, []);",
    });
    expect(snippet.ok).toBe(true);

    const section = await collectResourcesBackup();
    expect(section.resources).toHaveLength(2);
    expect(section.files).toHaveLength(1);
    expect(section.files[0].data.length).toBeGreaterThan(0);

    // A downloadable Focusy backup carries the section and previews it.
    const json = serializeBackup(collectBackup(null, null, null, null, null, section));
    const firstRead = parseBackup(json);
    expect(firstRead.ok).toBe(true);
    if (!firstRead.ok) return;
    expect(backupPreview(firstRead.backup).resources).toBe(2);

    localStorage.clear();
    replaceResources([]);
    await clearResourceFiles();

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.resources).toEqual(section);

    const restored = await restoreResourcesBackup(parsed.backup.resources, "replace");
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.resourcesRestored).toBe(2);
    expect(restored.value.filesRestored).toBe(1);

    expect(allResources()).toHaveLength(2);
    const file = await readResourceFile(pdf.value.id);
    expect(file?.name).toBe("react.pdf");
    expect(Array.from(new Uint8Array(file!.data))).toEqual(
      Array.from(pdfBytes),
    );
  });

  test("leaves local attachments alone when an older backup has no section", async () => {
    const added = addTextResource({
      courseId: "course-1",
      kind: "link",
      title: "Keep me",
      url: "https://example.com",
    });
    if (!added.ok) return;

    const result = await restoreResourcesBackup(undefined, "replace");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.resourcesRestored).toBe(0);
    expect(allResources()).toHaveLength(1);
  });

  test("rejects an unreadable section without deleting local attachments", async () => {
    const added = addTextResource({
      courseId: "course-1",
      kind: "link",
      title: "Safe",
      url: "https://example.com",
    });
    if (!added.ok) return;

    const result = await restoreResourcesBackup(
      { version: 99, resources: [], files: [] },
      "replace",
    );
    expect(result.ok).toBe(false);
    expect(allResources()).toHaveLength(1);
  });
});
