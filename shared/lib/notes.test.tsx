import { describe, expect, test, beforeEach } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  deleteNote,
  getNoteText,
  hasNote,
  saveNote,
  useNote,
} from "./notes";

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

function readRaw(videoId: string) {
  const raw = localStorage.getItem(`focustube:note:${videoId}`);
  return raw ? JSON.parse(raw) : null;
}

describe("notes storage", () => {
  test("saves and reads back a note", () => {
    saveNote("vid-1", "# Key idea\n\n**bold**");
    expect(getNoteText("vid-1")).toBe("# Key idea\n\n**bold**");
    expect(readRaw("vid-1").updatedAt).toBeGreaterThan(0);
    expect(hasNote("vid-1")).toBe(true);
    expect(getNoteText("vid-2")).toBeNull();
    expect(hasNote("vid-2")).toBe(false);
  });

  test("saving empty text deletes the note", () => {
    saveNote("vid-1", "keep me");
    saveNote("vid-1", "   ");
    expect(getNoteText("vid-1")).toBeNull();
    expect(localStorage.getItem("focustube:note:vid-1")).toBeNull();
  });

  test("delete removes only that video's note", () => {
    saveNote("vid-1", "one");
    saveNote("vid-2", "two");
    deleteNote("vid-1");
    expect(getNoteText("vid-1")).toBeNull();
    expect(getNoteText("vid-2")).toBe("two");
  });

  test("tolerates corrupt stored JSON", () => {
    localStorage.setItem("focustube:note:vid-1", "not json");
    expect(getNoteText("vid-1")).toBeNull();
  });
});

/** Mirrors how components read a note: reactive `useNote` + save/delete. */
function Harness({ videoId }: { videoId: string }) {
  const { text, has, save, remove } = useNote(videoId);
  return (
    <div>
      <span data-testid="text">{text ?? "none"}</span>
      <span data-testid="has">{has ? "yes" : "no"}</span>
      <button data-testid="save" onClick={() => save(`note for ${videoId}`)}>
        save
      </button>
      <button data-testid="clear" onClick={() => remove()}>
        clear
      </button>
    </div>
  );
}

describe("useNote", () => {
  test("re-renders when the note is saved and deleted", () => {
    render(<Harness videoId="vid-9" />);
    expect(screen.getByTestId("text").textContent).toBe("none");
    expect(screen.getByTestId("has").textContent).toBe("no");

    fireEvent.click(screen.getByTestId("save"));
    expect(screen.getByTestId("text").textContent).toBe("note for vid-9");
    expect(screen.getByTestId("has").textContent).toBe("yes");

    fireEvent.click(screen.getByTestId("clear"));
    expect(screen.getByTestId("text").textContent).toBe("none");
  });
});
