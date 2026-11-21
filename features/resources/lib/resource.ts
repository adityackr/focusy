/**
 * Course and lesson attachments: PDFs, reference links, code snippets,
 * documentation links and downloadable files. Metadata is small enough for
 * localStorage; uploaded file contents live in IndexedDB (see resource-db.ts).
 */

export const RESOURCE_KINDS = [
  "pdf",
  "link",
  "snippet",
  "doc",
  "download",
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/** Porcelain labels used by the resources panel. */
export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  pdf: "PDF",
  link: "Reference link",
  snippet: "Code snippet",
  doc: "Documentation",
  download: "File download",
};

/** Kinds that carry an uploaded file in IndexedDB. */
export const FILE_RESOURCE_KINDS: ResourceKind[] = ["pdf", "download"];

export function isFileResourceKind(kind: ResourceKind): boolean {
  return kind === "pdf" || kind === "download";
}

export const MAX_RESOURCE_TITLE_LENGTH = 200;
export const MAX_RESOURCE_DESCRIPTION_LENGTH = 1000;
export const MAX_RESOURCE_URL_LENGTH = 2048;
export const MAX_RESOURCE_CONTENT_LENGTH = 200_000;
export const MAX_RESOURCE_FILE_BYTES = 25 * 1024 * 1024;

export interface Resource {
  id: string;
  /** Owning course id. Empty for playlist resources. */
  courseId: string;
  /** Owning playlist id. Null for course resources. */
  playlistId: string | null;
  /**
   * Attached lesson — a course chapter id or a playlist video id. Null means
   * the resource belongs to the whole course/playlist.
   */
  chapterId: string | null;
  kind: ResourceKind;
  title: string;
  description: string;
  /** Reference link / documentation / source URL. */
  url: string | null;
  /** Code snippet text, or pasted documentation content. */
  content: string | null;
  /** Snippet language hint, e.g. `tsx`. */
  language: string | null;
  /** Uploaded file name for PDF and download resources. */
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ResourceDraft {
  /** Owning course id. Leave empty when attaching to a playlist. */
  courseId?: string;
  /** Owning playlist id. Leave empty when attaching to a course. */
  playlistId?: string | null;
  chapterId?: string | null;
  kind: ResourceKind;
  title: string;
  description?: string;
  url?: string | null;
  content?: string | null;
  language?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export type ResourceError =
  | "empty"
  | "invalid-url"
  | "too-large"
  | "not-found"
  | "storage"
  | "file-store"
  | "invalid-file";

export type ResourceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ResourceError };

/* -------------------------------------------------------------------------- */
/* normalization                                                              */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, max = Number.MAX_SAFE_INTEGER): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalString(
  value: unknown,
  max = Number.MAX_SAFE_INTEGER,
): string | null {
  const text = str(value, max);
  return text ? text : null;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/** Only web links are accepted; `javascript:` and friends are dropped. */
export function normalizeResourceUrl(raw: unknown): string | null {
  const value = str(raw, MAX_RESOURCE_URL_LENGTH);
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    // A bare `react.dev` is a common paste; treat it as https.
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) {
      try {
        return new URL(`https://${value}`).toString();
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function isResourceKind(value: unknown): value is ResourceKind {
  return (
    typeof value === "string" &&
    (RESOURCE_KINDS as readonly string[]).includes(value)
  );
}

/** Validate one stored or backed-up resource, dropping unreadable entries. */
export function normalizeResource(raw: unknown): Resource | null {
  if (!isRecord(raw)) return null;

  const id = str(raw.id);
  const title = str(raw.title, MAX_RESOURCE_TITLE_LENGTH);
  // A resource belongs to exactly one course or playlist.
  const playlistId = optionalString(raw.playlistId, 200);
  const courseId = playlistId ? "" : str(raw.courseId);
  if (!id || (!courseId && !playlistId) || !title || !isResourceKind(raw.kind)) {
    return null;
  }

  const kind = raw.kind;
  const url = isFileResourceKind(kind)
    ? null
    : normalizeResourceUrl(raw.url);
  const content = isFileResourceKind(kind)
    ? null
    : optionalString(raw.content, MAX_RESOURCE_CONTENT_LENGTH);
  const fileName = isFileResourceKind(kind)
    ? optionalString(raw.fileName, 255)
    : null;

  // A link-type resource needs somewhere to go; a snippet needs its code.
  if ((kind === "link" || kind === "doc") && !url) return null;
  if (kind === "snippet" && !content) return null;
  if (isFileResourceKind(kind) && !fileName) return null;

  const createdAt =
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : 0;
  const updatedAt =
    typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
      ? raw.updatedAt
      : createdAt;

  return {
    id,
    courseId,
    playlistId,
    chapterId: optionalString(raw.chapterId, 200),
    kind,
    title,
    description: str(raw.description, MAX_RESOURCE_DESCRIPTION_LENGTH),
    url,
    content,
    language:
      kind === "snippet" ? optionalString(raw.language, 40) : null,
    fileName,
    mimeType: isFileResourceKind(kind)
      ? optionalString(raw.mimeType, 200)
      : null,
    sizeBytes: isFileResourceKind(kind) ? optionalNumber(raw.sizeBytes) : null,
    createdAt,
    updatedAt,
  };
}

/** Validate a list, dropping duplicates by id. */
export function normalizeResources(raw: unknown): Resource[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Resource[] = [];
  for (const entry of raw) {
    const resource = normalizeResource(entry);
    if (!resource || seen.has(resource.id)) continue;
    seen.add(resource.id);
    out.push(resource);
  }
  return out;
}

/** A file a user picked for a PDF or download attachment. */
export interface ResourceFileInput {
  file: File;
  kind: "pdf" | "download";
}

export function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" || /\.pdf$/i.test(file.name ?? "")
  );
}

/** Ensure a picked file is allowed for the chosen resource kind. */
export function validateResourceFile(
  { file, kind }: ResourceFileInput,
): ResourceError | null {
  if (!file || !file.size) return "invalid-file";
  if (file.size > MAX_RESOURCE_FILE_BYTES) return "too-large";
  if (kind === "pdf" && !isPdfFile(file)) return "invalid-file";
  return null;
}

/** `2.4 MB` for a file size; empty string when unknown. */
export function formatResourceSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

/** Ordering used everywhere: course-level first, then by newest save. */
export function sortResources(resources: Resource[]): Resource[] {
  return [...resources].sort((a, b) => {
    const aCourse = a.chapterId === null ? 0 : 1;
    const bCourse = b.chapterId === null ? 0 : 1;
    return aCourse - bCourse || b.createdAt - a.createdAt || a.id.localeCompare(b.id);
  });
}

export function resourcesForCourse(
  resources: Resource[],
  courseId: string,
): Resource[] {
  return sortResources(
    resources.filter(
      (resource) => !resource.playlistId && resource.courseId === courseId,
    ),
  );
}

export function resourcesForPlaylist(
  resources: Resource[],
  playlistId: string,
): Resource[] {
  return sortResources(
    resources.filter((resource) => resource.playlistId === playlistId),
  );
}

export function resourcesForChapter(
  resources: Resource[],
  courseId: string,
  chapterId: string | null,
): Resource[] {
  return sortResources(
    resources.filter(
      (resource) =>
        !resource.playlistId &&
        resource.courseId === courseId &&
        (chapterId === null || resource.chapterId === chapterId),
    ),
  );
}
