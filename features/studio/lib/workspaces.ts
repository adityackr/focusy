import {
  STUDIO_STORAGE_READ_MESSAGE,
  STUDIO_STORAGE_UNAVAILABLE_MESSAGE,
  STUDIO_STORAGE_WRITE_MESSAGE,
  StudioDatabaseError,
  deleteWorkspaceRecord,
  readAllWorkspaceRecords,
  readWorkspaceRecord,
  writeWorkspaceRecord,
} from "./studio-db";
import { STUDIO_TEMPLATES, createTemplateFiles } from "./templates";
import {
  normalizeStudioWorkspace,
  sourceKeyForSource,
  workspaceMetaFromWorkspace,
} from "./workspace-utils";
import {
  selectWorkspaceMetaBySourceKey,
  selectWorkspaceMetaList,
  selectWorkspaceMetasBySourceKey,
  useStudioWorkspaces,
} from "../store/studio-store";
import type {
  StudioError,
  StudioResult,
  StudioSource,
  StudioTemplate,
  StudioWorkspace,
} from "../types/studio.types";

export const DEFAULT_STUDIO_TEMPLATE: StudioTemplate = "static";

const NOT_FOUND_MESSAGE = "This project could not be found in this browser.";
const CORRUPTED_MESSAGE =
  "This project's saved data is damaged, so it can't be opened.";

export interface CreateWorkspaceInput {
  name?: string;
  template?: StudioTemplate;
  source?: StudioSource | null;
  /**
   * Explicitly create another project for the same lesson. Normal creation is
   * still idempotent so opening a lesson never creates duplicates.
   */
  allowDuplicateSource?: boolean;
}

function failure(code: StudioError["code"], message: string): StudioResult<never> {
  return { ok: false, error: { code, message } };
}

/** Map a storage exception to a user-facing result without leaking stack traces. */
function databaseFailure<T>(error: unknown): StudioResult<T> {
  if (error instanceof StudioDatabaseError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  return failure("unavailable", STUDIO_STORAGE_UNAVAILABLE_MESSAGE);
}

function newWorkspaceId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `ws_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/* -------------------------------------------------------------------------- */
/* read                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Load a workspace and refresh its metadata index entry. Missing records and
 * damaged data come back as failed results with messages safe to show in UI.
 */
export async function loadWorkspace(
  id: string
): Promise<StudioResult<StudioWorkspace>> {
  if (!id.trim()) return failure("not-found", NOT_FOUND_MESSAGE);

  let raw: unknown;
  try {
    raw = await readWorkspaceRecord(id);
  } catch (error) {
    return databaseFailure(error);
  }

  if (raw === null) {
    // Drop the stale index entry so a deleted project doesn't linger in lists.
    useStudioWorkspaces.getState().removeWorkspace(id);
    return failure("not-found", NOT_FOUND_MESSAGE);
  }

  const workspace = normalizeStudioWorkspace(raw);
  if (!workspace || workspace.id !== id) {
    return failure("corrupted", CORRUPTED_MESSAGE);
  }

  // Recovering an entry whose metadata was lost keeps the project reachable.
  useStudioWorkspaces.getState().upsertWorkspace(
    workspaceMetaFromWorkspace(workspace)
  );
  return { ok: true, value: workspace };
}

/** Load the workspace associated with a video, course or playlist lesson. */
export async function loadWorkspaceForSource(
  source: StudioSource
): Promise<StudioResult<StudioWorkspace>> {
  const sourceKey = sourceKeyForSource(source);
  const state = useStudioWorkspaces.getState();
  const projects = selectWorkspaceMetasBySourceKey(state, sourceKey);
  if (projects.length === 0) return failure("not-found", NOT_FOUND_MESSAGE);

  // Prefer the project the learner last opened for this lesson, then the most
  // recently updated linked project.
  const active = projects.find((project) => project.id === state.activeWorkspaceId);
  return loadWorkspace((active ?? projects[0]).id);
}

/* -------------------------------------------------------------------------- */
/* create / ensure                                                            */
/* -------------------------------------------------------------------------- */

/** Workspace creations already in flight, so double calls can't duplicate one. */
const pendingEnsures = new Map<string, Promise<StudioResult<StudioWorkspace>>>();

/**
 * Create a project. When a source is supplied, an existing workspace for that
 * source is returned instead of creating a second one.
 */
export async function createWorkspace(
  input: CreateWorkspaceInput = {}
): Promise<StudioResult<StudioWorkspace>> {
  const source = input.source ?? null;
  const sourceKey = sourceKeyForSource(source);

  if (sourceKey && !input.allowDuplicateSource) {
    const existing = selectWorkspaceMetaBySourceKey(
      useStudioWorkspaces.getState(),
      sourceKey
    );
    if (existing) {
      const loaded = await loadWorkspace(existing.id);
      if (loaded.ok || loaded.error.code === "corrupted") return loaded;
      // Record vanished under the index — clear it and create a replacement.
      useStudioWorkspaces.getState().removeWorkspace(existing.id);
    }
  }

  const template = input.template ?? DEFAULT_STUDIO_TEMPLATE;
  const definition = STUDIO_TEMPLATES[template];
  const now = Date.now();
  const workspace: StudioWorkspace = {
    id: newWorkspaceId(),
    name: input.name?.trim() || "Untitled project",
    template,
    source,
    sourceKey,
    activeFile: definition.entryFile,
    createdAt: now,
    updatedAt: now,
    files: createTemplateFiles(template),
    dependencies: { ...definition.dependencies },
  };

  try {
    await writeWorkspaceRecord(workspace);
  } catch (error) {
    return databaseFailure(error);
  }

  useStudioWorkspaces.getState().upsertWorkspace(
    workspaceMetaFromWorkspace(workspace)
  );
  useStudioWorkspaces.getState().setActiveWorkspace(workspace.id);
  return { ok: true, value: workspace };
}

/**
 * Return the workspace for a learning resource, creating one on first open.
 * Idempotent: course chapters and repeated lesson visits reuse the same project.
 */
export function ensureWorkspaceForSource(
  source: StudioSource,
  options: { name?: string; template?: StudioTemplate } = {}
): Promise<StudioResult<StudioWorkspace>> {
  const sourceKey = sourceKeyForSource(source);
  if (!sourceKey) {
    return Promise.resolve(
      failure("not-found", "A workspace needs a video or course association.")
    );
  }

  const pending = pendingEnsures.get(sourceKey);
  if (pending) return pending;

  const task = (async (): Promise<StudioResult<StudioWorkspace>> => {
    const existing = selectWorkspaceMetaBySourceKey(
      useStudioWorkspaces.getState(),
      sourceKey
    );
    if (existing) {
      const loaded = await loadWorkspace(existing.id);
      if (loaded.ok || loaded.error.code === "corrupted") return loaded;
      useStudioWorkspaces.getState().removeWorkspace(existing.id);
    }
    return createWorkspace({
      source,
      name: options.name,
      template: options.template,
    });
  })();

  pendingEnsures.set(sourceKey, task);
  return task.finally(() => pendingEnsures.delete(sourceKey));
}

/**
 * Open the most recently used workspace, if this browser has any. When the
 * metadata index was lost but projects remain in IndexedDB, recover the most
 * recently saved one instead of showing an empty Studio.
 */
export async function loadLastWorkspace(): Promise<
  StudioResult<StudioWorkspace> | null
> {
  const state = useStudioWorkspaces.getState();
  const id =
    state.activeWorkspaceId ?? selectWorkspaceMetaList(state)[0]?.id ?? null;
  if (id) return loadWorkspace(id);

  let records: unknown[];
  try {
    records = await readAllWorkspaceRecords();
  } catch (error) {
    return databaseFailure(error);
  }
  if (records.length === 0) return null;

  let recovered: StudioWorkspace | null = null;
  for (const raw of records) {
    const workspace = normalizeStudioWorkspace(raw);
    if (workspace && (!recovered || workspace.updatedAt > recovered.updatedAt)) {
      recovered = workspace;
    }
  }
  if (!recovered) return failure("corrupted", CORRUPTED_MESSAGE);

  useStudioWorkspaces.getState().upsertWorkspace(
    workspaceMetaFromWorkspace(recovered)
  );
  useStudioWorkspaces.getState().setActiveWorkspace(recovered.id);
  return { ok: true, value: recovered };
}

/* -------------------------------------------------------------------------- */
/* update / delete                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Persist a workspace's files, dependencies and metadata. The caller decides
 * when to call this — the editor debounces writes instead of saving keystrokes.
 */
export async function saveWorkspace(
  workspace: StudioWorkspace
): Promise<StudioResult<StudioWorkspace>> {
  const normalized = normalizeStudioWorkspace({
    ...workspace,
    updatedAt: Date.now(),
  });
  if (!normalized) {
    return failure(
      "corrupted",
      "This project's data is invalid, so it can't be saved."
    );
  }

  try {
    await writeWorkspaceRecord(normalized);
  } catch (error) {
    return databaseFailure(error);
  }

  useStudioWorkspaces.getState().upsertWorkspace(
    workspaceMetaFromWorkspace(normalized)
  );
  return { ok: true, value: normalized };
}

export async function deleteWorkspace(
  id: string
): Promise<StudioResult<void>> {
  try {
    await deleteWorkspaceRecord(id);
  } catch (error) {
    // Keep the index entry when deletion fails, so the project isn't orphaned.
    return databaseFailure(error);
  }
  useStudioWorkspaces.getState().removeWorkspace(id);
  return { ok: true, value: undefined };
}

/**
 * Delete every Studio project linked to one source key. Deletion is
 * best-effort per project so one damaged record can't strand the rest.
 * Returns how many projects were removed.
 */
export async function deleteWorkspacesForSourceKey(
  sourceKey: string
): Promise<number> {
  if (!sourceKey) return 0;
  const projects = selectWorkspaceMetasBySourceKey(
    useStudioWorkspaces.getState(),
    sourceKey
  );
  let deleted = 0;
  for (const project of projects) {
    const result = await deleteWorkspace(project.id);
    if (result.ok) deleted += 1;
  }
  return deleted;
}

async function deleteWorkspacesMatching(
  matches: (sourceKey: string) => boolean
): Promise<number> {
  const projects = selectWorkspaceMetaList(useStudioWorkspaces.getState()).filter(
    (project) => Boolean(project.sourceKey) && matches(project.sourceKey!)
  );
  let deleted = 0;
  for (const project of projects) {
    const result = await deleteWorkspace(project.id);
    if (result.ok) deleted += 1;
  }
  return deleted;
}

/** Delete every Studio project attached to a course (all chapters share one). */
export function deleteWorkspacesForCourse(courseId: string): Promise<number> {
  return deleteWorkspacesForSourceKey(`course:${courseId}`);
}

/** Delete every Studio project attached to a playlist's lessons. */
export function deleteWorkspacesForPlaylist(
  playlistId: string
): Promise<number> {
  return deleteWorkspacesMatching((sourceKey) =>
    sourceKey.startsWith(`playlist:${playlistId}:`)
  );
}

export async function renameWorkspace(
  id: string,
  name: string
): Promise<StudioResult<StudioWorkspace>> {
  const trimmed = name.trim();
  if (!trimmed) {
    return failure("corrupted", "Give the project a non-empty name.");
  }
  const loaded = await loadWorkspace(id);
  if (!loaded.ok) return loaded;
  return saveWorkspace({ ...loaded.value, name: trimmed });
}

/**
 * Replace a project with another template's starter files. This is destructive
 * by design, so callers must confirm before invoking it.
 */
export async function changeWorkspaceTemplate(
  id: string,
  template: StudioTemplate
): Promise<StudioResult<StudioWorkspace>> {
  const loaded = await loadWorkspace(id);
  if (!loaded.ok) return loaded;

  const definition = STUDIO_TEMPLATES[template];
  return saveWorkspace({
    ...loaded.value,
    template,
    activeFile: definition.entryFile,
    files: createTemplateFiles(template),
    dependencies: { ...definition.dependencies },
  });
}

/* -------------------------------------------------------------------------- */
/* browser support                                                            */
/* -------------------------------------------------------------------------- */

/** Whether this browser exposes IndexedDB at all (private modes may not). */
export function isStudioStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export { STUDIO_STORAGE_READ_MESSAGE, STUDIO_STORAGE_WRITE_MESSAGE };
