import type { SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";

/** Project kinds supported by the initial release. */
export type StudioTemplate =
  | "static"
  | "vanilla"
  | "vanilla-ts"
  | "react"
  | "react-ts"
  | "express";

/** One source file inside a Studio workspace. */
export interface StudioFile {
  path: string;
  content: string;
}

/**
 * A learning resource a workspace belongs to.
 *
 * - `course`: one video turned into a chapter-based course. Every chapter
 *   shares the course's workspace.
 * - `video`: a standalone YouTube video.
 * - `playlist-video`: one lesson inside an imported playlist. Each playlist
 *   video gets its own workspace.
 */
export type StudioSource =
  | { kind: "course"; courseId: string; videoId: string }
  | { kind: "video"; videoId: string }
  | { kind: "playlist-video"; playlistId: string; videoId: string };

/**
 * Lightweight workspace index entry. Persisted to localStorage; file contents
 * and dependencies live in IndexedDB under the same workspace id.
 */
export interface StudioWorkspaceMeta {
  id: string;
  name: string;
  template: StudioTemplate;
  /** Null for standalone projects. */
  source: StudioSource | null;
  /** Stable lookup key derived from `source`; null for standalone projects. */
  sourceKey: string | null;
  activeFile: string;
  createdAt: number;
  updatedAt: number;
}

/** A full project: metadata plus the files and dependencies saved in IndexedDB. */
export interface StudioWorkspace extends StudioWorkspaceMeta {
  files: StudioFile[];
  dependencies: Record<string, string>;
}

/** A template's Sandpack wiring plus the starter files it ships with. */
export interface StudioTemplateDefinition {
  id: StudioTemplate;
  label: string;
  description: string;
  sandpackTemplate: SandpackPredefinedTemplate;
  /** File opened first in the editor. */
  entryFile: string;
  files: StudioFile[];
  dependencies: Record<string, string>;
}

export type StudioErrorCode =
  | "unavailable"
  | "not-found"
  | "corrupted"
  | "invalid"
  | "write-failed";

/** An operation failure with a message that is safe to show to the user. */
export interface StudioError {
  code: StudioErrorCode;
  message: string;
}

export type StudioResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StudioError };
