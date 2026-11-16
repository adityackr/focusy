import { beforeEach, describe, expect, test, mock } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import {
  addNote,
  invalidateNotesCache,
  notesForVideo,
  type NoteSource,
} from "@/shared/lib/learning-notes";
import { NOTE_EDITOR_EXTENSIONS } from "./note-editor";
import { NotesPanel } from "./notes-panel";

beforeEach(() => {
  cleanup();
  localStorage.clear();
  invalidateNotesCache();
});

const SOURCE: NoteSource = {
  kind: "playlist",
  playlistId: "PL1",
  videoId: "vid-1",
  title: "Lesson one",
};

function seedNotes() {
  addNote({
    videoId: "vid-1",
    markdown: "# Key idea\n\nUse **memoization** here:\n\n```js\nconst total = memo(sum);\n```",
    timeSeconds: 42,
    source: SOURCE,
  });
  addNote({
    videoId: "vid-1",
    markdown: "Overall summary for the lesson.",
  });
}

describe("NotesPanel", () => {
  test("renders timestamped Markdown notes and jumps back on click", () => {
    seedNotes();
    const seek = mock((_seconds: number) => {});
    render(<NotesPanel videoId="vid-1" onSeek={seek} />);
    fireEvent.click(screen.getByRole("button", { name: "Open lesson notes" }));

    expect(screen.getByRole("heading", { name: /Notes/ })).toBeTruthy();
    const preview = screen.getByText(/Key idea/);
    expect(preview.className).toContain("line-clamp-1");
    expect(preview.textContent).toContain("memoization");
    expect(preview.textContent).toContain("const total = memo");
    expect(screen.getByText("Overall summary for the lesson.")).toBeTruthy();

    fireEvent.click(screen.getByTitle("Jump to 0:42"));
    expect(seek).toHaveBeenCalledWith(42);
    // The untimed note has no jump affordance.
    expect(screen.queryByTitle("Jump to Whole lesson")).toBeNull();
  });

  test("captures the current playback time for a new note", () => {
    let now = 95.8;
    render(<NotesPanel videoId="vid-1" getCurrentTime={() => now} />);
    fireEvent.click(screen.getByRole("button", { name: "Open lesson notes" }));

    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    expect(screen.getByLabelText("New note")).toBeTruthy();
    expect(screen.getByText("1:35")).toBeTruthy();

    now = 200;
    fireEvent.click(screen.getByRole("button", { name: /Now/ }));
    expect(screen.getByText("3:20")).toBeTruthy();

    fireEvent.click(screen.getByTitle("Save as a note for the whole lesson"));
    expect(screen.getByText("Whole lesson")).toBeTruthy();
  });

  test("opens an inline editor pre-filled with the note's Markdown", () => {
    seedNotes();
    render(<NotesPanel videoId="vid-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Open lesson notes" }));

    fireEvent.click(screen.getByLabelText("Edit note at 0:42"));
    const editor = screen.getByRole("textbox", { name: "Edit note" });
    expect(editor.textContent).toContain("Key idea");
    expect(editor.textContent).toContain("memoization");

    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(screen.queryByRole("textbox", { name: "Edit note" })).toBeNull();
    expect(screen.getByText(/Key idea/)).toBeTruthy();
  });

  test("asks for confirmation before deleting a note", () => {
    seedNotes();
    render(<NotesPanel videoId="vid-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Open lesson notes" }));

    fireEvent.click(screen.getByLabelText("Delete note at 0:42"));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText(/note at 0:42 will be removed/)).toBeTruthy();
    expect(notesForVideo("vid-1")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(notesForVideo("vid-1")).toHaveLength(2);

    fireEvent.click(screen.getByLabelText("Delete note at 0:42"));
    const alert = screen.getByRole("alertdialog");
    fireEvent.click(within(alert).getByRole("button", { name: "Delete note" }));
    expect(notesForVideo("vid-1").map((note) => note.timeSeconds)).toEqual([null]);
    expect(screen.queryByText(/Key idea/)).toBeNull();
  });

  test("shows an empty state with a first-note action", () => {
    render(<NotesPanel videoId="vid-empty" />);
    fireEvent.click(screen.getByRole("button", { name: "Open lesson notes" }));
    expect(screen.getByText("No notes yet")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Add your first note/ }));
    expect(screen.getByLabelText("New note")).toBeTruthy();
  });

  test("opens notes with Shift+N without stealing typing or modified presses", () => {
    render(<NotesPanel videoId="vid-1" />);
    const heading = () => screen.queryByRole("heading", { name: /Notes/ });

    fireEvent.keyDown(window, { key: "n", shiftKey: true, metaKey: true });
    expect(heading()).toBeNull();

    const input = document.createElement("input");
    document.body.append(input);
    fireEvent.keyDown(input, { key: "N", shiftKey: true });
    expect(heading()).toBeNull();
    input.remove();

    const otherDialog = document.createElement("div");
    otherDialog.setAttribute("role", "dialog");
    otherDialog.setAttribute("aria-modal", "true");
    document.body.append(otherDialog);
    fireEvent.keyDown(window, { key: "N", shiftKey: true });
    expect(heading()).toBeNull();
    otherDialog.remove();

    fireEvent.keyDown(window, { key: "N", shiftKey: true });
    expect(heading()).toBeTruthy();
  });
});

describe("note Markdown round-trip", () => {
  test("keeps headings, lists, code fences and links", () => {
    const markdown = [
      "# Heading",
      "",
      "A **bold** idea and a [link](https://example.com).",
      "",
      "- one",
      "- two",
      "",
      "```js",
      "const x = 1;",
      "```",
    ].join("\n");

    const editor = new Editor({
      extensions: NOTE_EDITOR_EXTENSIONS,
      content: markdown,
      contentType: "markdown",
    });
    try {
      const result = editor.getMarkdown();
      expect(result).toContain("# Heading");
      expect(result).toContain("**bold**");
      expect(result).toContain("[link](https://example.com)");
      expect(result).toContain("- one");
      expect(result).toContain("- two");
      expect(result).toContain("```js");
      expect(result).toContain("const x = 1;");
    } finally {
      editor.destroy();
    }
  });
});
