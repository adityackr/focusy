import { describe, expect, test } from "bun:test";
import {
  STUDIO_TEMPLATES,
  STUDIO_TEMPLATE_ORDER,
  createTemplateFiles,
  upgradeLegacyStarterStyles,
} from "./templates";
import {
  isValidPackageName,
  isValidVersionRange,
  validateDependency,
} from "./packages";

describe("studio templates", () => {
  test("ships every supported template", () => {
    expect(STUDIO_TEMPLATE_ORDER).toEqual([
      "static",
      "vanilla",
      "vanilla-ts",
      "react",
      "react-ts",
      "express",
    ]);
    for (const id of STUDIO_TEMPLATE_ORDER) {
      expect(STUDIO_TEMPLATES[id].id).toBe(id);
    }
  });

  test("every template's entry file exists and paths are unique", () => {
    for (const id of STUDIO_TEMPLATE_ORDER) {
      const definition = STUDIO_TEMPLATES[id];
      const paths = definition.files.map((file) => file.path);
      expect(paths).toContain(definition.entryFile);
      expect(new Set(paths).size).toBe(paths.length);
      for (const path of paths) expect(path.startsWith("/")).toBe(true);
    }
  });

  test("createTemplateFiles returns an isolated copy", () => {
    const files = createTemplateFiles("react");
    files[0].content = "changed";
    expect(STUDIO_TEMPLATES.react.files[0].content).not.toBe("changed");
  });

  test("starter styles keep web previews from overflowing their viewport", () => {
    for (const id of STUDIO_TEMPLATE_ORDER) {
      const styles = STUDIO_TEMPLATES[id].files.find(
        (file) => file.path === "/styles.css"
      );
      if (styles) expect(styles.content).toContain("box-sizing: border-box");
    }
  });

  test("upgrades the untouched legacy starter stylesheet", () => {
    const current = STUDIO_TEMPLATES.static.files.find(
      (file) => file.path === "/styles.css"
    )!.content;
    const legacy = current.slice(current.indexOf(":root {"));

    const upgraded = upgradeLegacyStarterStyles([
      { path: "/styles.css", content: legacy },
    ]);
    expect(upgraded[0].content).toContain("box-sizing: border-box");

    const customized = [{ path: "/styles.css", content: `${legacy}\n/* mine */` }];
    expect(upgradeLegacyStarterStyles(customized)).toBe(customized);
  });
});

describe("dependency validation", () => {
  test("accepts public package names", () => {
    expect(isValidPackageName("lodash")).toBe(true);
    expect(isValidPackageName("@tanstack/react-query")).toBe(true);
    expect(isValidPackageName(" canvas-confetti ")).toBe(true);
  });

  test("rejects invalid package names", () => {
    expect(isValidPackageName("")).toBe(false);
    expect(isValidPackageName("Bad Name")).toBe(false);
    expect(isValidPackageName("https://example.com/pkg")).toBe(false);
    expect(isValidPackageName("../../etc/passwd")).toBe(false);
  });

  test("accepts semver ranges", () => {
    for (const version of ["1.2.3", "^1.2.3", "~0.14.0", "latest", "*", ">=18.2.0"]) {
      expect(isValidVersionRange(version)).toBe(true);
    }
    expect(isValidVersionRange("not-a-version")).toBe(false);
  });

  test("reports a message only for invalid input", () => {
    expect(validateDependency("dayjs", "^1.11.13")).toBeNull();
    expect(validateDependency("", "")).toContain("package name");
    expect(validateDependency("dayjs", "wat")).toContain("version range");
  });
});
