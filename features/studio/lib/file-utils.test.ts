import { describe, expect, test } from "bun:test";
import {
  buildStudioFileTree,
  fileBasename,
  fileDirname,
  fileExtension,
  isValidFileName,
  joinFilePath,
} from "./file-utils";

describe("file path helpers", () => {
  test("splits basename, directory and extension", () => {
    expect(fileBasename("/src/components/Button.tsx")).toBe("Button.tsx");
    expect(fileDirname("/src/components/Button.tsx")).toBe("/src/components");
    expect(fileDirname("/index.html")).toBe("/");
    expect(fileExtension("/src/Button.TSX")).toBe("tsx");
    expect(fileExtension("/README")).toBe("");
  });

  test("joins names and full relative paths", () => {
    expect(joinFilePath("/", "script.js")).toBe("/script.js");
    expect(joinFilePath("/src", "App.jsx")).toBe("/src/App.jsx");
    expect(joinFilePath("/src/", "lib/util.ts")).toBe("/src/lib/util.ts");
    expect(joinFilePath("/", "/src/App.tsx")).toBe("/src/App.tsx");
    expect(joinFilePath("/src", "../escape.ts")).toBeNull();
    expect(joinFilePath("/src", "")).toBeNull();
  });

  test("validates single file or folder names", () => {
    expect(isValidFileName("Button.tsx")).toBe(true);
    expect(isValidFileName("  styles.css  ")).toBe(true);
    expect(isValidFileName("")).toBe(false);
    expect(isValidFileName("..")).toBe(false);
    expect(isValidFileName("src/App.tsx")).toBe(false);
    expect(isValidFileName("bad\\name.ts")).toBe(false);
  });
});

describe("buildStudioFileTree", () => {
  test("groups paths into sorted folders and files", () => {
    const tree = buildStudioFileTree([
      { path: "/index.html", content: "" },
      { path: "/src/App.tsx", content: "" },
      { path: "/src/components/Button.tsx", content: "" },
      { path: "/src/lib/util.ts", content: "" },
    ]);

    expect(tree.map((entry) => `${entry.kind}:${entry.name}`)).toEqual([
      "folder:src",
      "file:index.html",
    ]);

    const src = tree[0];
    expect(src.kind).toBe("folder");
    if (src.kind !== "folder") return;
    expect(src.path).toBe("/src");
    expect(src.children.map((entry) => entry.name)).toEqual([
      "components",
      "lib",
      "App.tsx",
    ]);

    const components = src.children[0];
    expect(components.kind).toBe("folder");
    if (components.kind !== "folder") return;
    expect(components.children[0]).toMatchObject({
      kind: "file",
      path: "/src/components/Button.tsx",
    });
  });

  test("ignores unsafe paths and handles an empty file list", () => {
    expect(buildStudioFileTree([])).toEqual([]);
    expect(
      buildStudioFileTree([{ path: "../escape.js", content: "" }])
    ).toEqual([]);
  });
});
