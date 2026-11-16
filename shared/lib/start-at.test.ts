import { describe, expect, test } from "bun:test";
import { parseStartAt } from "./start-at";

describe("parseStartAt", () => {
  test("accepts positive second values and floors fractions", () => {
    expect(parseStartAt("42")).toBe(42);
    expect(parseStartAt("42.9")).toBe(42);
    expect(parseStartAt(["90", "120"])).toBe(90);
  });

  test("rejects missing, zero, negative and non-numeric values", () => {
    expect(parseStartAt(undefined)).toBeUndefined();
    expect(parseStartAt("")).toBeUndefined();
    expect(parseStartAt("0")).toBeUndefined();
    expect(parseStartAt("-5")).toBeUndefined();
    expect(parseStartAt("abc")).toBeUndefined();
    expect(parseStartAt("Infinity")).toBeUndefined();
  });
});
