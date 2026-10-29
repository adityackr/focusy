import { describe, expect, test, beforeEach } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NoteButton } from "./note-dialog";
import { saveNote } from "@/shared/lib/notes";

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

const KEY = "focustube:note:vid-1";

function storedText() {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw).text as string) : null;
}

describe("NoteButton / NoteDialog", () => {
  test("opens an empty editor and saves Markdown to localStorage", async () => {
    render(<NoteButton videoId="vid-1" title="Lesson one" />);

    const trigger = screen.getByRole("button", { name: /add note for lesson one/i });
    expect(trigger.getAttribute("aria-label")).toMatch(/add note/i);
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeTruthy();

    const textarea = screen.getByLabelText("Note markdown") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "## Ideas\n\n- take **notes**" } });

    fireEvent.click(screen.getByRole("button", { name: /save note/i }));

    await waitFor(() => expect(storedText()).toBe("## Ideas\n\n- take **notes**"));
    // Dialog closes after a successful save.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("previews Markdown and shows the saved note on reopen", async () => {
    saveNote("vid-1", "# Title\n\n**bold** [link](https://example.com)");

    render(<NoteButton videoId="vid-1" title="Lesson one" />);
    fireEvent.click(screen.getByRole("button", { name: /edit note for lesson one/i }));

    await screen.findByRole("dialog");
    const textarea = screen.getByLabelText("Note markdown") as HTMLTextAreaElement;
    expect(textarea.value).toBe("# Title\n\n**bold** [link](https://example.com)");

    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByRole("heading", { name: "Title" })).toBeTruthy();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "link" }).getAttribute("href")).toBe(
      "https://example.com"
    );
  });

  test("deletes an existing note from the dialog", async () => {
    saveNote("vid-1", "to be removed");

    render(<NoteButton videoId="vid-1" title="Lesson one" />);
    fireEvent.click(screen.getByRole("button", { name: /edit note for lesson one/i }));

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(localStorage.getItem(KEY)).toBeNull());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // The trigger flips back to the empty-state icon label.
    expect(
      screen.getByRole("button", { name: /add note for lesson one/i })
    ).toBeTruthy();
  });

  test("the labeled variant renders a visible 'Note' button", () => {
    render(<NoteButton videoId="vid-1" title="Course video" as="labeled" />);
    const button = screen.getByRole("button", { name: /add note for course video/i });
    expect(button.textContent).toContain("Note");
    expect(button.className).not.toContain("opacity-0");
  });
});
