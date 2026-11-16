import { describe, expect, test } from "bun:test";
import { notePreview } from "./note-preview";

describe("notePreview", () => {
  test("flattens headings, emphasis, links, lists and code into one line", () => {
    const preview = notePreview(
      [
        "# Key idea",
        "",
        "Use **memoization** for [derived state](https://example.com).",
        "",
        "- first point",
        "- second point",
        "",
        "```js",
        "const total = memo(sum);",
        "```",
      ].join("\n"),
    );

    expect(preview).toBe(
      "Key idea Use memoization for derived state. first point second point const total = memo(sum);",
    );
  });

  test("drops images' URLs, task markers and HTML", () => {
    expect(
      notePreview(
        "- [x] **Done** with ![diagram](https://example.com/a.png) <kbd>Cmd</kbd>",
      ),
    ).toBe("Done with diagram Cmd");
  });

  test("caps long previews with an ellipsis", () => {
    const preview = notePreview("a".repeat(300), 40);
    expect(preview).toHaveLength(40);
    expect(preview.endsWith("…")).toBe(true);
  });

  test("returns an empty string for blank Markdown", () => {
    expect(notePreview("  \n\n  ")).toBe("");
  });
});
