import { describe, expect, test } from "bun:test";
import { normalizeFilePath } from "./file-utils";
import {
  normalizeStudioSource,
  normalizeStudioWorkspace,
  sourceKeyForSource,
  studioSourceForCourse,
  studioSourceForPlaylistVideo,
  studioSourceForVideo,
  workspaceMetaFromWorkspace,
} from "./workspace-utils";
import type { StudioWorkspace } from "../types/studio.types";

const workspace: StudioWorkspace = {
  id: "ws-1",
  name: "Lesson notes",
  template: "react",
  source: studioSourceForCourse("course-1", "video-1"),
  sourceKey: "course:course-1",
  activeFile: "/App.js",
  createdAt: 100,
  updatedAt: 200,
  files: [
    { path: "/App.js", content: "export default function App() {}" },
    { path: "/styles.css", content: "body {}" },
  ],
  dependencies: { react: "^19.0.0" },
};

describe("normalizeFilePath", () => {
  test("adds a leading slash and strips redundant segments", () => {
    expect(normalizeFilePath("src/App.tsx")).toBe("/src/App.tsx");
    expect(normalizeFilePath(" /src//App.tsx ")).toBe("/src/App.tsx");
    expect(normalizeFilePath("src\\App.tsx")).toBe("/src/App.tsx");
  });

  test("rejects paths that could escape the project root", () => {
    expect(normalizeFilePath("")).toBeNull();
    expect(normalizeFilePath("..")).toBeNull();
    expect(normalizeFilePath("/src/../../etc/passwd")).toBeNull();
    expect(normalizeFilePath("./src/App.tsx")).toBeNull();
    expect(normalizeFilePath("bad\0name.ts")).toBeNull();
  });
});

describe("source associations", () => {
  test("gives every course chapter the same key", () => {
    expect(sourceKeyForSource(studioSourceForCourse("course-1", "video-1"))).toBe(
      "course:course-1"
    );
    expect(
      sourceKeyForSource(studioSourceForCourse("course-1", "video-2"))
    ).toBe("course:course-1");
  });

  test("separates standalone videos and playlist lessons", () => {
    expect(sourceKeyForSource(studioSourceForVideo("abc"))).toBe("video:abc");
    expect(
      sourceKeyForSource(studioSourceForPlaylistVideo("playlist-1", "abc"))
    ).toBe("playlist:playlist-1:abc");
    expect(
      sourceKeyForSource(studioSourceForPlaylistVideo("playlist-2", "abc"))
    ).not.toBe(
      sourceKeyForSource(studioSourceForPlaylistVideo("playlist-1", "abc"))
    );
  });

  test("uses null for standalone projects", () => {
    expect(sourceKeyForSource(null)).toBeNull();
  });

  test("rejects malformed persisted sources", () => {
    expect(normalizeStudioSource({ kind: "video", videoId: "abc" })).toEqual({
      kind: "video",
      videoId: "abc",
    });
    expect(normalizeStudioSource({ kind: "video", videoId: "  " })).toBeNull();
    expect(normalizeStudioSource({ kind: "course", courseId: "c1" })).toBeNull();
    expect(normalizeStudioSource(null)).toBeNull();
    expect(normalizeStudioSource("video")).toBeNull();
  });
});

describe("normalizeStudioWorkspace", () => {
  test("accepts a complete workspace and derives the source key", () => {
    const normalized = normalizeStudioWorkspace({
      ...workspace,
      sourceKey: "stale-key",
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.sourceKey).toBe("course:course-1");
    expect(normalized?.files).toHaveLength(2);
  });

  test("supports standalone projects without a source", () => {
    const normalized = normalizeStudioWorkspace({
      ...workspace,
      source: null,
      sourceKey: "video:fake",
    });
    expect(normalized?.source).toBeNull();
    expect(normalized?.sourceKey).toBeNull();
  });

  test("rejects unusable records instead of throwing", () => {
    expect(normalizeStudioWorkspace(null)).toBeNull();
    expect(normalizeStudioWorkspace({ ...workspace, id: "" })).toBeNull();
    expect(
      normalizeStudioWorkspace({ ...workspace, template: "python" })
    ).toBeNull();
    expect(normalizeStudioWorkspace({ ...workspace, files: [] })).toBeNull();
    expect(
      normalizeStudioWorkspace({
        ...workspace,
        source: { kind: "playlist-video", playlistId: "p1" },
      })
    ).toBeNull();
  });

  test("drops invalid files, duplicate paths and unsafe active files", () => {
    const normalized = normalizeStudioWorkspace({
      ...workspace,
      activeFile: "/missing.js",
      files: [
        { path: "/App.js", content: "first" },
        { path: "/App.js", content: "second" },
        { path: "../escape.js", content: "nope" },
        { path: "/no-content.js" },
        "not a file",
      ],
    });
    expect(normalized?.files).toEqual([{ path: "/App.js", content: "first" }]);
    expect(normalized?.activeFile).toBe("/App.js");
  });

  test("falls back to the template entry file, then the first file", () => {
    const withoutEntry = normalizeStudioWorkspace({
      ...workspace,
      activeFile: "/styles.css",
      files: [{ path: "/main.js", content: "" }],
    });
    expect(withoutEntry?.activeFile).toBe("/main.js");

    const withEntry = normalizeStudioWorkspace({
      ...workspace,
      activeFile: "/missing.js",
    });
    expect(withEntry?.activeFile).toBe("/App.js");
  });

  test("keeps only valid dependency names and versions", () => {
    const normalized = normalizeStudioWorkspace({
      ...workspace,
      dependencies: {
        react: "^19.0.0",
        "bad name": "1.0.0",
        dayjs: "not a version !!",
        zod: "latest",
        empty: "",
      },
    });
    expect(normalized?.dependencies).toEqual({
      react: "^19.0.0",
      zod: "latest",
    });
  });
});

describe("workspaceMetaFromWorkspace", () => {
  test("strips file contents and dependencies from metadata", () => {
    const meta = workspaceMetaFromWorkspace(workspace);
    expect(meta.id).toBe("ws-1");
    expect(meta).not.toHaveProperty("files");
    expect(meta).not.toHaveProperty("dependencies");
  });
});
