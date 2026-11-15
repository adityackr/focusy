import {
  isValidPackageName,
  isValidVersionRange,
} from "./packages";
import { normalizeFilePath } from "./file-utils";
import {
  STUDIO_TEMPLATES,
  STUDIO_TEMPLATE_ORDER,
  upgradeLegacyExpressTs,
  upgradeLegacyStarterStyles,
} from "./templates";
import type {
  StudioFile,
  StudioSource,
  StudioTemplate,
  StudioWorkspace,
} from "../types/studio.types";

/* -------------------------------------------------------------------------- */
/* source associations                                                        */
/* -------------------------------------------------------------------------- */

/** Workspace source for a video turned into a course (all chapters share it). */
export function studioSourceForCourse(
  courseId: string,
  videoId: string
): StudioSource {
  return { kind: "course", courseId, videoId };
}

/** Workspace source for a standalone YouTube video. */
export function studioSourceForVideo(videoId: string): StudioSource {
  return { kind: "video", videoId };
}

/** Workspace source for one lesson inside a playlist. */
export function studioSourceForPlaylistVideo(
  playlistId: string,
  videoId: string
): StudioSource {
  return { kind: "playlist-video", playlistId, videoId };
}

/**
 * Stable association key. Courses key on the course id so chapter navigation
 * finds the same workspace; playlist lessons key on both playlist and video so
 * two playlists containing the same video do not share files.
 */
export function sourceKeyForSource(source: StudioSource | null): string | null {
  if (!source) return null;
  switch (source.kind) {
    case "course":
      return `course:${source.courseId}`;
    case "video":
      return `video:${source.videoId}`;
    case "playlist-video":
      return `playlist:${source.playlistId}:${source.videoId}`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

/** Validate a persisted source, returning null when it is malformed. */
export function normalizeStudioSource(raw: unknown): StudioSource | null {
  if (!isRecord(raw)) return null;
  switch (raw.kind) {
    case "course": {
      const courseId = trimmedString(raw.courseId);
      const videoId = trimmedString(raw.videoId);
      return courseId && videoId
        ? { kind: "course", courseId, videoId }
        : null;
    }
    case "video": {
      const videoId = trimmedString(raw.videoId);
      return videoId ? { kind: "video", videoId } : null;
    }
    case "playlist-video": {
      const playlistId = trimmedString(raw.playlistId);
      const videoId = trimmedString(raw.videoId);
      return playlistId && videoId
        ? { kind: "playlist-video", playlistId, videoId }
        : null;
    }
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* workspace validation                                                       */
/* -------------------------------------------------------------------------- */

export function isStudioTemplate(value: unknown): value is StudioTemplate {
  return (
    typeof value === "string" &&
    (STUDIO_TEMPLATE_ORDER as string[]).includes(value)
  );
}

function normalizeFiles(raw: unknown): StudioFile[] {
  if (!Array.isArray(raw)) return [];
  const files: StudioFile[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.path !== "string") continue;
    if (typeof entry.content !== "string") continue;
    const path = normalizeFilePath(entry.path);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    files.push({ path, content: entry.content });
  }
  return files;
}

function normalizeDependencies(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const dependencies: Record<string, string> = {};
  for (const [name, version] of Object.entries(raw)) {
    if (!isValidPackageName(name) || typeof version !== "string") continue;
    const range = version.trim();
    if (!isValidVersionRange(range)) continue;
    dependencies[name.trim()] = range;
  }
  return dependencies;
}

/**
 * Validate and normalize a workspace loaded from storage. Returns null when the
 * record is too damaged to open safely (the caller reports a user-facing
 * "damaged project" error instead of crashing).
 */
export function normalizeStudioWorkspace(raw: unknown): StudioWorkspace | null {
  if (!isRecord(raw)) return null;

  const id = trimmedString(raw.id);
  if (!id) return null;

  const template = isStudioTemplate(raw.template) ? raw.template : null;
  if (!template) return null;

  let source: StudioSource | null = null;
  if (raw.source != null) {
    source = normalizeStudioSource(raw.source);
    if (!source) return null;
  }

  const rawFiles = normalizeFiles(raw.files);
  if (rawFiles.length === 0) return null;
  const styledFiles = upgradeLegacyStarterStyles(rawFiles);
  const normalizedDependencies = normalizeDependencies(raw.dependencies);
  const expressTsUpgrade =
    template === "express-ts"
      ? upgradeLegacyExpressTs(styledFiles, normalizedDependencies)
      : null;
  const files = expressTsUpgrade?.files ?? styledFiles;
  const dependencies =
    expressTsUpgrade?.dependencies ?? normalizedDependencies;

  const definition = STUDIO_TEMPLATES[template];
  const candidates = new Set(files.map((file) => file.path));
  const requestedActive =
    typeof raw.activeFile === "string" ? normalizeFilePath(raw.activeFile) : null;
  const activeFile =
    requestedActive && candidates.has(requestedActive)
      ? requestedActive
      : candidates.has(definition.entryFile)
        ? definition.entryFile
        : files[0].path;

  const createdAt =
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : Date.now();
  const updatedAt =
    typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
      ? raw.updatedAt
      : createdAt;

  return {
    id,
    name: trimmedString(raw.name) ?? "Untitled project",
    template,
    source,
    sourceKey: sourceKeyForSource(source),
    activeFile,
    createdAt,
    updatedAt,
    files,
    dependencies,
  };
}

/** Strip a workspace down to the metadata persisted in localStorage. */
export function workspaceMetaFromWorkspace(
  workspace: StudioWorkspace
): Omit<StudioWorkspace, "files" | "dependencies"> {
  return {
    id: workspace.id,
    name: workspace.name,
    template: workspace.template,
    source: workspace.source,
    sourceKey: workspace.sourceKey,
    activeFile: workspace.activeFile,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}
