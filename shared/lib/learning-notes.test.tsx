import { beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  addNote,
  allNotes,
  invalidateNotesCache,
  LEGACY_MIGRATION_INDEX_KEY,
  LEGACY_NOTE_STORAGE_PREFIX,
  MAX_NOTE_MARKDOWN_LENGTH,
  migrateLegacyNotes,
  noteCount,
  notesForVideo,
  NOTES_STORAGE_PREFIX,
  removeNote,
  updateNote,
  useVideoNotes,
} from "./learning-notes";

beforeEach(() => {
  cleanup();
  localStorage.clear();
  invalidateNotesCache();
});

function readBucket(videoId: string) {
  const raw = localStorage.getItem(NOTES_STORAGE_PREFIX + videoId);
  return raw ? JSON.parse(raw) : null;
}

const source = {
  kind: "playlist" as const,
  playlistId: "PL1",
  videoId: "vid-1",
  title: "Lesson one",
};

describe("learning notes storage", () => {
  test("adds notes with timestamps and reads them in playback order", () => {
    const later = addNote({
      videoId: "vid-1",
      markdown: "later",
      timeSeconds: 95.7,
      source,
    });
    const earlier = addNote({
      videoId: "vid-1",
      markdown: "earlier",
      timeSeconds: 12,
      source,
    });
    const untimed = addNote({ videoId: "vid-1", markdown: "whole lesson" });

    expect(later.ok && later.value.timeSeconds).toBe(95);
    expect(earlier.ok && earlier.value.timeSeconds).toBe(12);

    const notes = notesForVideo("vid-1");
    expect(notes.map((n) => n.markdown)).toEqual([
      "earlier",
      "later",
      "whole lesson",
    ]);
    expect(notes[0].source).toEqual(source);
    expect(notes[2].timeSeconds).toBeNull();
    expect(untimed.ok && untimed.value.id).toBeTruthy();
    expect(readBucket("vid-1").version).toBe(2);
  });

  test("scopes notes to their video and tolerates corrupt buckets", () => {
    addNote({ videoId: "vid-1", markdown: "one" });
    addNote({ videoId: "vid-2", markdown: "two" });
    expect(notesForVideo("vid-1").map((n) => n.markdown)).toEqual(["one"]);
    expect(notesForVideo("vid-2").map((n) => n.markdown)).toEqual(["two"]);

    localStorage.setItem(NOTES_STORAGE_PREFIX + "vid-3", "not json");
    expect(notesForVideo("vid-3")).toEqual([]);

    localStorage.setItem(
      NOTES_STORAGE_PREFIX + "vid-4",
      JSON.stringify({ version: 2, notes: [{ id: "", markdown: "no id" }] }),
    );
    expect(notesForVideo("vid-4")).toEqual([]);
  });

  test("rejects empty and oversized notes", () => {
    expect(addNote({ videoId: "vid-1", markdown: "   " })).toEqual({
      ok: false,
      error: "empty",
    });
    expect(addNote({ videoId: "  ", markdown: "text" })).toEqual({
      ok: false,
      error: "empty",
    });
    expect(
      addNote({
        videoId: "vid-1",
        markdown: "x".repeat(MAX_NOTE_MARKDOWN_LENGTH + 1),
      }),
    ).toEqual({ ok: false, error: "too-large" });
    expect(notesForVideo("vid-1")).toEqual([]);
  });

  test("updates Markdown, timestamp and source", () => {
    const added = addNote({
      videoId: "vid-1",
      markdown: "draft",
      timeSeconds: 5,
    });
    if (!added.ok) throw new Error("add failed");

    const courseSource = {
      kind: "course" as const,
      courseId: "C1",
      videoId: "vid-1",
      chapterId: "c1",
      title: "Course one",
    };
    const updated = updateNote("vid-1", added.value.id, {
      markdown: "## Final\n\n```js\nconst x = 1;\n```",
      timeSeconds: 42,
      source: courseSource,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.value.markdown).toContain("const x = 1");
    expect(updated.value.timeSeconds).toBe(42);
    expect(updated.value.source).toEqual(courseSource);
    expect(updated.value.createdAt).toBe(added.value.createdAt);
    expect(updated.value.updatedAt).toBeGreaterThanOrEqual(
      added.value.updatedAt,
    );

    const missing = updateNote("vid-1", "nope", { markdown: "x" });
    expect(missing).toEqual({ ok: false, error: "not-found" });
    const emptyEdit = updateNote("vid-1", added.value.id, { markdown: "  " });
    expect(emptyEdit).toEqual({ ok: false, error: "empty" });
  });

  test("removes one note and stays quiet when it is already gone", () => {
    const first = addNote({ videoId: "vid-1", markdown: "one" });
    const second = addNote({ videoId: "vid-1", markdown: "two" });
    if (!first.ok || !second.ok) throw new Error("add failed");

    expect(removeNote("vid-1", first.value.id)).toEqual({
      ok: true,
      value: true,
    });
    expect(notesForVideo("vid-1").map((n) => n.markdown)).toEqual(["two"]);
    expect(removeNote("vid-1", first.value.id)).toEqual({
      ok: true,
      value: true,
    });
  });

  test("reports a storage failure instead of dropping the note", () => {
    const proto = Object.getPrototypeOf(localStorage);
    const original = proto.setItem;
    proto.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      expect(addNote({ videoId: "vid-1", markdown: "too big" })).toEqual({
        ok: false,
        error: "storage",
      });
      expect(notesForVideo("vid-1")).toEqual([]);
    } finally {
      proto.setItem = original;
    }
  });

  test("lists all notes newest-first", async () => {
    addNote({ videoId: "vid-1", markdown: "old", timeSeconds: 1 });
    // A distinct `updatedAt` so the ordering is not decided by the id tiebreak.
    await new Promise((resolve) => setTimeout(resolve, 5));
    addNote({ videoId: "vid-2", markdown: "new", timeSeconds: 2 });
    expect(allNotes().map((n) => n.markdown)).toEqual(["new", "old"]);
    expect(noteCount()).toBe(2);
  });
});

describe("legacy note migration", () => {
  test("adopts a legacy per-video note once, as an untimed entry", () => {
    localStorage.setItem(
      LEGACY_NOTE_STORAGE_PREFIX + "vid-1",
      JSON.stringify({ text: "# Legacy idea", updatedAt: 1234 }),
    );

    expect(migrateLegacyNotes()).toBe(1);
    const notes = notesForVideo("vid-1");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      id: "legacy:vid-1",
      videoId: "vid-1",
      timeSeconds: null,
      source: null,
      markdown: "# Legacy idea",
      createdAt: 1234,
      updatedAt: 1234,
    });

    // The legacy key is kept for older builds; the index prevents duplicates.
    expect(
      localStorage.getItem(LEGACY_NOTE_STORAGE_PREFIX + "vid-1"),
    ).toBeTruthy();
    expect(migrateLegacyNotes()).toBe(0);
    expect(notesForVideo("vid-1")).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(LEGACY_MIGRATION_INDEX_KEY)!)).toEqual(
      ["vid-1"],
    );
  });

  test("does not resurrect a migrated note the user deleted", () => {
    localStorage.setItem(
      LEGACY_NOTE_STORAGE_PREFIX + "vid-1",
      JSON.stringify({ text: "keep for a moment", updatedAt: 10 }),
    );
    migrateLegacyNotes();
    removeNote("vid-1", "legacy:vid-1");
    expect(notesForVideo("vid-1")).toEqual([]);

    expect(migrateLegacyNotes()).toBe(0);
    expect(notesForVideo("vid-1")).toEqual([]);
  });

  test("appends legacy text to an existing v2 bucket", () => {
    addNote({ videoId: "vid-1", markdown: "new note", timeSeconds: 30 });
    localStorage.setItem(
      LEGACY_NOTE_STORAGE_PREFIX + "vid-1",
      JSON.stringify("plain string note"),
    );

    expect(migrateLegacyNotes()).toBe(1);
    expect(notesForVideo("vid-1").map((n) => n.markdown)).toEqual([
      "new note",
      "plain string note",
    ]);
  });

  test("marks empty legacy notes as handled without creating entries", () => {
    localStorage.setItem(
      LEGACY_NOTE_STORAGE_PREFIX + "vid-1",
      JSON.stringify({ text: "   ", updatedAt: 5 }),
    );
    expect(migrateLegacyNotes()).toBe(0);
    expect(notesForVideo("vid-1")).toEqual([]);
    expect(JSON.parse(localStorage.getItem(LEGACY_MIGRATION_INDEX_KEY)!)).toEqual(
      ["vid-1"],
    );
  });
});

/** Mirrors how the notes panel will read and mutate one video's notes. */
function Harness({ videoId }: { videoId: string }) {
  const notes = useVideoNotes(videoId);
  return (
    <div>
      <span data-testid="count">{notes.length}</span>
      <span data-testid="text">{notes.map((n) => n.markdown).join("|")}</span>
      <button
        data-testid="add"
        onClick={() =>
          addNote({ videoId, markdown: `note ${notes.length + 1}`, timeSeconds: 7 })
        }
      >
        add
      </button>
      <button
        data-testid="edit"
        onClick={() =>
          notes[0] &&
          updateNote(videoId, notes[0].id, { markdown: "edited" })
        }
      >
        edit
      </button>
      <button
        data-testid="remove"
        onClick={() => notes[0] && removeNote(videoId, notes[0].id)}
      >
        remove
      </button>
    </div>
  );
}

describe("useVideoNotes", () => {
  test("re-renders on add, edit and delete", () => {
    render(<Harness videoId="vid-9" />);
    expect(screen.getByTestId("count").textContent).toBe("0");

    fireEvent.click(screen.getByTestId("add"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("text").textContent).toBe("note 1");

    fireEvent.click(screen.getByTestId("add"));
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("text").textContent).toBe("note 1|note 2");

    fireEvent.click(screen.getByTestId("edit"));
    expect(screen.getByTestId("text").textContent).toBe("edited|note 2");

    fireEvent.click(screen.getByTestId("remove"));
    expect(screen.getByTestId("text").textContent).toBe("note 2");
  });
});
