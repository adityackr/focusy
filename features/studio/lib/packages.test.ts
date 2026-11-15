import { describe, expect, test } from "bun:test";
import {
  addStudioDependency,
  isValidPackageName,
  isValidVersionRange,
  normalizeDependencyVersion,
  removeStudioDependency,
  updateStudioDependency,
  validateDependency,
} from "./packages";

describe("isValidPackageName", () => {
  test("accepts public and scoped package names", () => {
    for (const name of ["lodash", "canvas-confetti", "@tanstack/react-query", "a"]) {
      expect(isValidPackageName(name)).toBe(true);
    }
  });

  test("rejects empty, unsafe and malformed names", () => {
    for (const name of [
      "",
      "   ",
      "../escape",
      "some package",
      "UPPERCASE",
      "@scope",
      "@scope/",
      "x".repeat(215),
    ]) {
      expect(isValidPackageName(name)).toBe(false);
    }
  });
});

describe("isValidVersionRange", () => {
  test("accepts common npm version specs", () => {
    for (const version of [
      "latest",
      "*",
      "1",
      "1.2",
      "1.2.3",
      "^1.2.3",
      "~1.2.3",
      ">=1.0.0",
      "1.x",
      "1.2.x",
      "1.2.*",
      ">= 1.0.0 < 2.0.0",
      "1.0.0 - 2.0.0",
      "^1.0.0 || ^2.0.0",
      "1.2.3-beta.1",
    ]) {
      expect(isValidVersionRange(version)).toBe(true);
    }
  });

  test("rejects empty and non-version values", () => {
    for (const version of [
      "",
      "   ",
      "banana",
      "^",
      "1..2",
      "1.2.3.4",
      "1.x.2",
      "^1.0.0 ||",
      "latest && broken",
      `^${"1".repeat(257)}`,
    ]) {
      expect(isValidVersionRange(version)).toBe(false);
    }
  });
});

describe("validateDependency", () => {
  test("allows a blank version because it means latest", () => {
    expect(validateDependency("lodash", "")).toBeNull();
    expect(validateDependency("lodash", "   ")).toBeNull();
  });

  test("reports invalid names and versions", () => {
    expect(validateDependency("../bad", "1.0.0")).toContain("package name");
    expect(validateDependency("lodash", "not a version")).toContain("version range");
  });
});

describe("dependency operations", () => {
  test("adds a dependency and defaults a blank version to latest", () => {
    const result = addStudioDependency({}, " dayjs ", "  ");
    expect(result).toEqual({ ok: true, value: { dayjs: "latest" } });
    expect(normalizeDependencyVersion(" ^1.2.3 ")).toBe("^1.2.3");
  });

  test("adds scoped packages without overwriting other entries", () => {
    const result = addStudioDependency(
      { lodash: "^4.17.21" },
      "@tanstack/react-query",
      "^5"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      lodash: "^4.17.21",
      "@tanstack/react-query": "^5",
    });
  });

  test("rejects duplicate and invalid dependencies", () => {
    const duplicate = addStudioDependency({ lodash: "^4.0.0" }, "lodash", "^5");
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.message).toContain("already");

    expect(addStudioDependency({}, "not valid", "1.0.0").ok).toBe(false);
    expect(addStudioDependency({}, "lodash", "wat").ok).toBe(false);
  });

  test("updates an existing version and leaves identical values untouched", () => {
    const dependencies = { lodash: "^4.17.21", dayjs: "^1.11.0" };
    const updated = updateStudioDependency(dependencies, " lodash ", " ~4.17.21 ");
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value).toEqual({
      lodash: "~4.17.21",
      dayjs: "^1.11.0",
    });

    const unchanged = updateStudioDependency(dependencies, "lodash", "^4.17.21");
    expect(unchanged.ok).toBe(true);
    if (unchanged.ok) expect(unchanged.value).toBe(dependencies);
  });

  test("refuses to update a package that is not in the project", () => {
    const result = updateStudioDependency({}, "dayjs", "^1.11.0");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("not in this project");
  });

  test("removes only the requested dependency", () => {
    const result = removeStudioDependency(
      { lodash: "^4.17.21", dayjs: "^1.11.0" },
      "dayjs"
    );
    expect(result).toEqual({ ok: true, value: { lodash: "^4.17.21" } });
  });

  test("refuses to remove a missing dependency", () => {
    const result = removeStudioDependency({}, "dayjs");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("not in this project");
  });
});
