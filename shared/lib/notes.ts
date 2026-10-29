import * as React from "react";

/**
 * Per-video Markdown notes, stored only in this browser's localStorage.
 * One note per video ID (keyed `focustube:note:<videoId>`), so the same
 * video keeps the same note whichever playlist or course it appears in.
 *
 * Snapshots are plain strings, so `useSyncExternalStore` can compare them by
 * value — no cache invalidation needed.
 */

const NOTE_PREFIX = "focustube:note:";

export interface StoredNote {
  text: string;
  updatedAt: number;
}

function keyFor(videoId: string): string {
  return NOTE_PREFIX + videoId;
}

function safeParse(raw: string): StoredNote | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") return { text: parsed, updatedAt: 0 };
    if (parsed && typeof parsed === "object" && "text" in parsed) {
      const note = parsed as Partial<StoredNote>;
      return {
        text: typeof note.text === "string" ? note.text : "",
        updatedAt: typeof note.updatedAt === "number" ? note.updatedAt : 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** The stored note text for a video, or `null` when there is none. */
export function getNoteText(videoId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(videoId));
    if (!raw) return null;
    return safeParse(raw)?.text ?? null;
  } catch {
    return null;
  }
}

/** True when the video has a non-empty note. */
export function hasNote(videoId: string): boolean {
  return (getNoteText(videoId) ?? "").trim().length > 0;
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Save (or clear, when the text is empty) a video's note. */
export function saveNote(videoId: string, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) {
    deleteNote(videoId);
    return;
  }
  localStorage.setItem(
    keyFor(videoId),
    JSON.stringify({ text: trimmed, updatedAt: Date.now() } satisfies StoredNote)
  );
  emit();
}

/** Remove a video's note. */
export function deleteNote(videoId: string): void {
  localStorage.removeItem(keyFor(videoId));
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface NoteApi {
  /** Current note text (trimmed), or `null` when there is none. */
  text: string | null;
  /** Whether a non-empty note exists. */
  has: boolean;
  save: (text: string) => void;
  remove: () => void;
}

/** Reactive view of one video's note (re-renders on save/delete). */
export function useNote(videoId: string): NoteApi {
  const text = React.useSyncExternalStore(
    subscribe,
    () => getNoteText(videoId),
    () => null
  );
  return React.useMemo<NoteApi>(
    () => ({
      text,
      has: (text ?? "").trim().length > 0,
      save: (next: string) => saveNote(videoId, next),
      remove: () => deleteNote(videoId),
    }),
    [videoId, text]
  );
}
