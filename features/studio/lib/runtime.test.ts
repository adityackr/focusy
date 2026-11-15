import { describe, expect, test } from "bun:test";
import {
  describeRuntimeError,
  isRuntimeUnavailable,
  runtimeStatusLabel,
} from "./runtime";

describe("runtimeStatusLabel", () => {
  test("describes every Sandpack status", () => {
    expect(runtimeStatusLabel("initial")).toBe("Starting runtime…");
    expect(runtimeStatusLabel("idle")).toBe("Runtime idle");
    expect(runtimeStatusLabel("running")).toBe("Runtime active");
    expect(runtimeStatusLabel("timeout")).toBe("Runtime timed out");
    expect(runtimeStatusLabel("done")).toBe("Runtime stopped");
  });

  test("only treats timeouts as unavailable", () => {
    expect(isRuntimeUnavailable("timeout")).toBe(true);
    expect(isRuntimeUnavailable("running")).toBe(false);
    expect(isRuntimeUnavailable("initial")).toBe(false);
  });
});

describe("describeRuntimeError", () => {
  test("returns null without an error", () => {
    expect(describeRuntimeError(null)).toBeNull();
  });

  test("keeps the bundler title and location", () => {
    expect(
      describeRuntimeError({
        title: "SyntaxError",
        message: "Unexpected token",
        path: "/App.js",
        line: 3,
        column: 9,
      })
    ).toEqual({
      title: "SyntaxError",
      message: "Unexpected token",
      location: "/App.js:3:9",
    });
  });

  test("falls back to a readable title and message", () => {
    expect(
      describeRuntimeError({ title: "  ", message: "   " })
    ).toEqual({
      title: "Compilation error",
      message: "The preview could not compile this project.",
      location: null,
    });
  });

  test("describes line-only locations", () => {
    expect(
      describeRuntimeError({ message: "Oops", line: 12, column: 4 })?.location
    ).toBe("Line 12, column 4");
  });
});
