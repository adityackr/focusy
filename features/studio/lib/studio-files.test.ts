import { describe, expect, test } from "bun:test";
import {
  addStudioFile,
  deleteStudioFile,
  deleteStudioFolder,
  renameStudioFile,
  renameStudioFolder,
} from "./studio-files";
import type { StudioWorkspace } from "../types/studio.types";

function workspace(files: Array<[string, string]>): StudioWorkspace {
  return {
    id: "ws-1",
    name: "Files",
    template: "react",
    source: null,
    sourceKey: null,
    activeFile: files[0][0],
    createdAt: 1,
    updatedAt: 1,
    files: files.map(([path, content]) => ({ path, content })),
    dependencies: {},
  };
}

const base = workspace([
  ["/App.js", "app"],
  ["/styles.css", "css"],
  ["/src/components/Button.jsx", "button"],
  ["/src/lib/util.js", "util"],
]);

function paths(files: Array<{ path: string }>): string[] {
  return files.map((file) => file.path);
}

function value<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("expected a successful file operation");
  return result.value;
}

describe("addStudioFile", () => {
  test("adds nested files and opens them", () => {
    const result = addStudioFile(base, "src/hooks/useThing.ts");
    expect(result.ok).toBe(true);
    const next = value(result);
    expect(paths(next.files)).toContain("/src/hooks/useThing.ts");
    expect(next.activeFile).toBe("/src/hooks/useThing.ts");
    expect(next.files.at(-1)?.content).toBe("");
  });

  test("rejects duplicate and unsafe paths", () => {
    expect(addStudioFile(base, "/App.js").ok).toBe(false);
    expect(addStudioFile(base, "../escape.js").ok).toBe(false);
    expect(addStudioFile(base, "/").ok).toBe(false);
  });

  test("rejects paths that collide with an existing file or folder", () => {
    expect(addStudioFile(base, "/src").ok).toBe(false);
    expect(addStudioFile(base, "/src/lib").ok).toBe(false);
    expect(addStudioFile(base, "/App.js/child.js").ok).toBe(false);
  });
});

describe("renameStudioFile", () => {
  test("renames in place and follows the active file", () => {
    const next = value(renameStudioFile(base, "/App.js", "/src/Main.js"));
    expect(paths(next.files)).toContain("/src/Main.js");
    expect(paths(next.files)).not.toContain("/App.js");
    expect(next.activeFile).toBe("/src/Main.js");
    expect(next.files.find((file) => file.path === "/src/Main.js")?.content).toBe(
      "app"
    );
  });

  test("rejects collisions and missing files", () => {
    expect(renameStudioFile(base, "/App.js", "/styles.css").ok).toBe(false);
    expect(renameStudioFile(base, "/missing.js", "/new.js").ok).toBe(false);
    expect(renameStudioFile(base, "/App.js", "../new.js").ok).toBe(false);
  });

  test("rejects renaming onto an existing folder or under a file", () => {
    expect(renameStudioFile(base, "/App.js", "/src").ok).toBe(false);
    expect(renameStudioFile(base, "/App.js", "/styles.css/nested.js").ok).toBe(
      false
    );
  });
});

describe("deleteStudioFile", () => {
  test("removes a file and falls back from the active file", () => {
    const active = { ...base, activeFile: "/styles.css" };
    const next = value(deleteStudioFile(active, "/styles.css"));
    expect(paths(next.files)).not.toContain("/styles.css");
    expect(next.activeFile).toBe("/src/components/Button.jsx");
  });

  test("keeps the active file when deleting another file", () => {
    const next = value(deleteStudioFile(base, "/styles.css"));
    expect(next.activeFile).toBe("/App.js");
  });

  test("refuses to delete the last file", () => {
    const single = workspace([["/index.html", ""]]);
    expect(deleteStudioFile(single, "/index.html").ok).toBe(false);
  });
});

describe("deleteStudioFolder", () => {
  test("removes every file under the folder", () => {
    const next = value(deleteStudioFolder(base, "/src"));
    expect(paths(next.files)).toEqual(["/App.js", "/styles.css"]);
    expect(next.activeFile).toBe("/App.js");
  });

  test("moves a deleted active file to a surviving neighbour", () => {
    const active = { ...base, activeFile: "/src/components/Button.jsx" };
    const next = value(deleteStudioFolder(active, "/src"));
    expect(paths(next.files)).toEqual(["/App.js", "/styles.css"]);
    expect(next.activeFile).toBe("/styles.css");
  });

  test("refuses the root, empty folders and deleting every file", () => {
    expect(deleteStudioFolder(base, "/").ok).toBe(false);
    expect(deleteStudioFolder(base, "/missing").ok).toBe(false);

    const onlyFolder = workspace([
      ["/src/App.js", ""],
      ["/src/styles.css", ""],
    ]);
    expect(deleteStudioFolder(onlyFolder, "/src").ok).toBe(false);
  });
});

describe("renameStudioFolder", () => {
  test("rewrites the prefix of all files and the active file", () => {
    const active = { ...base, activeFile: "/src/lib/util.js" };
    const next = value(renameStudioFolder(active, "/src", "/lib"));
    expect(paths(next.files)).toContain("/lib/components/Button.jsx");
    expect(paths(next.files)).toContain("/lib/lib/util.js");
    expect(paths(next.files).some((path) => path.startsWith("/src/"))).toBe(false);
    expect(next.activeFile).toBe("/lib/lib/util.js");
  });

  test("rejects collisions, self-nesting and missing folders", () => {
    const collision = workspace([
      ["/src/App.js", ""],
      ["/lib/App.js", ""],
    ]);
    expect(renameStudioFolder(collision, "/src", "/lib").ok).toBe(false);
    expect(renameStudioFolder(base, "/src", "/src/nested").ok).toBe(false);
    expect(renameStudioFolder(base, "/missing", "/new").ok).toBe(false);
    expect(renameStudioFolder(base, "/src", "/").ok).toBe(false);
    expect(renameStudioFolder(base, "/src", "/App.js/nested").ok).toBe(false);
  });
});
