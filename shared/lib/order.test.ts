import { describe, expect, test } from "bun:test";
import { reorderWithin } from "./order";

describe("reorderWithin", () => {
  test("moves visible items while every other item keeps its slot", () => {
    // Only A and C belong to the category; B and D are other categories.
    expect(reorderWithin(["A", "B", "C", "D"], ["C", "A"])).toEqual([
      "C",
      "B",
      "A",
      "D",
    ]);
  });

  test("a full list reorder behaves like a plain reorder", () => {
    expect(reorderWithin(["A", "B", "C"], ["C", "A", "B"])).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  test("an empty visible set leaves the order untouched", () => {
    expect(reorderWithin(["A", "B"], [])).toEqual(["A", "B"]);
  });
});
