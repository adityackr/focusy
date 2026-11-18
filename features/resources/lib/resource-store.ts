import * as React from "react";
import {
  isFileResourceKind,
  normalizeResources,
  validateResourceFile,
  MAX_RESOURCE_CONTENT_LENGTH,
  MAX_RESOURCE_DESCRIPTION_LENGTH,
  MAX_RESOURCE_TITLE_LENGTH,
  normalizeResourceUrl,
  type Resource,
  type ResourceDraft,
  type ResourceError,
  type ResourceResult,
} from "./resource";
import {
  deleteResourceFile,
  ResourceDatabaseError,
  writeResourceFile,
} from "./resource-db";

/**
 * Resource metadata, stored only in this browser. Uploaded file contents live
 * in IndexedDB under the same resource id.
 */

export const RESOURCES_STORAGE_KEY = "focusy-resources:v1";

const STORAGE_VERSION = 1;

interface StoredResourcesFile {
  version: typeof STORAGE_VERSION;
  resources: Resource[];
}

/* -------------------------------------------------------------------------- */
/* raw storage                                                                */
/* -------------------------------------------------------------------------- */

function readRaw(): Resource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESOURCES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const file = parsed as Partial<StoredResourcesFile>;
    if (file.version !== STORAGE_VERSION) return [];
    return normalizeResources(file.resources);
  } catch {
    return [];
  }
}

function writeRaw(resources: Resource[]): boolean {
  try {
    if (resources.length === 0) {
      localStorage.removeItem(RESOURCES_STORAGE_KEY);
      return true;
    }
    const file: StoredResourcesFile = {
      version: STORAGE_VERSION,
      resources,
    };
    localStorage.setItem(RESOURCES_STORAGE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* cache + subscriptions                                                      */
/* -------------------------------------------------------------------------- */

const EMPTY_RESOURCES: Resource[] = Object.freeze(
  [],
) as unknown as Resource[];

let cache: Resource[] | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function invalidate(): void {
  cache = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): Resource[] {
  return EMPTY_RESOURCES;
}

let storageBound = false;
function bindStorageEvents(): void {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === RESOURCES_STORAGE_KEY) {
      invalidate();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* reads                                                                      */
/* -------------------------------------------------------------------------- */

function snapshot(): Resource[] {
  if (!cache) cache = readRaw();
  return cache;
}

/** Every attachment saved in this browser, newest last-updated first. */
export function allResources(): Resource[] {
  if (typeof window === "undefined") return EMPTY_RESOURCES;
  return [...readRaw()].sort(
    (a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id),
  );
}

export function resourceCount(): number {
  return readRaw().length;
}

/* -------------------------------------------------------------------------- */
/* writes                                                                     */
/* -------------------------------------------------------------------------- */

function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof crypto.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `resource-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function persist(resources: Resource[]): boolean {
  const ok = writeRaw(resources);
  if (ok) invalidate();
  return ok;
}

function baseFields(input: ResourceDraft) {
  return {
    id: createId(),
    courseId: input.courseId.trim(),
    chapterId: input.chapterId?.trim() || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Save a link, documentation link, or code snippet. File attachments use
 * `addFileResource`, which stores the file bytes in IndexedDB first.
 */
export function addTextResource(input: ResourceDraft): ResourceResult<Resource> {
  if (typeof window === "undefined") return { ok: false, error: "storage" };

  const title = input.title.trim().slice(0, MAX_RESOURCE_TITLE_LENGTH);
  if (!title || !input.courseId.trim()) {
    return { ok: false, error: "empty" };
  }

  if (isFileResourceKind(input.kind)) {
    return { ok: false, error: "invalid-file" };
  }

  let url: string | null = null;
  if (input.kind === "link" || input.kind === "doc") {
    url = normalizeResourceUrl(input.url ?? "");
    if (!url) return { ok: false, error: "invalid-url" };
  }

  const content = (input.content ?? "").trim();
  if (input.kind === "snippet" && !content) {
    return { ok: false, error: "empty" };
  }
  if (content.length > MAX_RESOURCE_CONTENT_LENGTH) {
    return { ok: false, error: "too-large" };
  }

  const resource: Resource = {
    ...baseFields(input),
    kind: input.kind,
    title,
    description: (input.description ?? "")
      .trim()
      .slice(0, MAX_RESOURCE_DESCRIPTION_LENGTH),
    url,
    content: content || null,
    language:
      input.kind === "snippet"
        ? (input.language ?? "").trim().slice(0, 40) || null
        : null,
    fileName: null,
    mimeType: null,
    sizeBytes: null,
  };

  const error = persistResource(resource);
  return error ? { ok: false, error } : { ok: true, value: resource };
}

function persistResource(resource: Resource): ResourceError | null {
  if (!persist([...readRaw(), resource])) return "storage";
  return null;
}

/** Store a picked PDF/download in IndexedDB and its metadata in localStorage. */
export async function addFileResource(
  input: ResourceDraft & { file: File },
): Promise<ResourceResult<Resource>> {
  if (typeof window === "undefined") return { ok: false, error: "storage" };
  if (!input.courseId.trim()) return { ok: false, error: "empty" };
  if (!isFileResourceKind(input.kind)) {
    return { ok: false, error: "invalid-file" };
  }

  const invalid = validateResourceFile({
    file: input.file,
    kind: input.kind as "pdf" | "download",
  });
  if (invalid) return { ok: false, error: invalid };

  const title =
    input.title.trim().slice(0, MAX_RESOURCE_TITLE_LENGTH) ||
    input.file.name.slice(0, MAX_RESOURCE_TITLE_LENGTH);
  if (!title) return { ok: false, error: "empty" };

  const resource: Resource = {
    ...baseFields(input),
    kind: input.kind,
    title,
    description: (input.description ?? "")
      .trim()
      .slice(0, MAX_RESOURCE_DESCRIPTION_LENGTH),
    url: null,
    content: null,
    language: null,
    fileName: input.file.name.slice(0, 255),
    mimeType: (input.file.type || "application/octet-stream").slice(0, 200),
    sizeBytes: input.file.size,
  };

  try {
    await writeResourceFile({
      id: resource.id,
      name: resource.fileName!,
      mimeType: resource.mimeType!,
      size: input.file.size,
      data: await input.file.arrayBuffer(),
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ResourceDatabaseError ? "file-store" : "file-store",
    };
  }

  const error = persistResource(resource);
  if (error) {
    await deleteResourceFile(resource.id).catch(() => {});
    return { ok: false, error };
  }
  return { ok: true, value: resource };
}

/** Delete metadata and any stored file for one resource. */
export async function removeResource(id: string): Promise<ResourceResult<true>> {
  if (typeof window === "undefined") return { ok: false, error: "storage" };

  const resources = readRaw();
  const existing = resources.find((resource) => resource.id === id);
  if (!existing) return { ok: false, error: "not-found" };

  if (!persist(resources.filter((resource) => resource.id !== id))) {
    return { ok: false, error: "storage" };
  }
  if (isFileResourceKind(existing.kind)) {
    await deleteResourceFile(id).catch(() => {});
  }
  return { ok: true, value: true };
}

/**
 * Remove a course's attachments, including any files stored in IndexedDB.
 * Metadata goes first so a failed file delete can never leave a visible
 * attachment pointing at missing bytes.
 */
export async function removeResourcesForCourse(courseId: string): Promise<void> {
  if (typeof window === "undefined" || !courseId) return;

  const resources = readRaw();
  const doomed = resources.filter((resource) => resource.courseId === courseId);
  if (doomed.length === 0) return;
  if (!persist(resources.filter((resource) => resource.courseId !== courseId))) {
    return;
  }

  await Promise.all(
    doomed
      .filter((resource) => isFileResourceKind(resource.kind))
      .map((resource) => deleteResourceFile(resource.id).catch(() => {})),
  );
}

/** Replace every resource, e.g. when restoring a backup. */
export function replaceResources(resources: Resource[]): void {
  if (typeof window === "undefined") return;
  persist(normalizeResources(resources));
}

/**
 * Add resources whose id is not used here. Local copies win on conflict, and
 * nothing is deleted. Returns how many entries were added.
 */
export function mergeResources(resources: Resource[]): number {
  if (typeof window === "undefined") return 0;

  const local = readRaw();
  const ids = new Set(local.map((resource) => resource.id));
  const added = normalizeResources(resources).filter(
    (resource) => !ids.has(resource.id),
  );
  if (added.length > 0) persist([...local, ...added]);
  return added.length;
}

/* -------------------------------------------------------------------------- */
/* React bindings                                                             */
/* -------------------------------------------------------------------------- */

/** Reactive list of every resource, newest activity first. */
export function useAllResources(): Resource[] {
  return React.useSyncExternalStore(subscribe, snapshot, getServerSnapshot);
}

/** Reactive attachments for one course. */
export function useCourseResources(courseId: string): Resource[] {
  const resources = useAllResources();
  return React.useMemo(
    () => resources.filter((resource) => resource.courseId === courseId),
    [resources, courseId],
  );
}

if (typeof window !== "undefined") {
  bindStorageEvents();
}
