import {
  normalizeStudioBackupSection,
  STUDIO_BACKUP_SECTION_VERSION,
  type StudioBackupSection,
} from "@/shared/lib/backup";
import {
  replaceAllWorkspaceRecords,
  readAllWorkspaceRecords,
  StudioDatabaseError,
  STUDIO_STORAGE_READ_MESSAGE,
  writeWorkspaceRecords,
} from "./studio-db";
import {
  normalizeStudioWorkspace,
  workspaceMetaFromWorkspace,
} from "./workspace-utils";
import { useStudioWorkspaces } from "../store/studio-store";
import type {
  StudioResult,
  StudioWorkspace,
} from "../types/studio.types";

export type StudioRestoreMode = "replace" | "merge";

/** The Studio section of a Focusy backup file. */
export interface StudioBackupData {
  version: typeof STUDIO_BACKUP_SECTION_VERSION;
  activeWorkspaceId: string | null;
  order: string[];
  workspaces: StudioWorkspace[];
}

export interface StudioRestoreReport {
  projectsAdded: number;
  projectsSkipped: number;
}

function failure(
  code: "unavailable" | "corrupted" | "write-failed",
  message: string
): StudioResult<never> {
  return { ok: false, error: { code, message } };
}

function databaseFailure<T>(error: unknown): StudioResult<T> {
  if (error instanceof StudioDatabaseError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  return failure("unavailable", STUDIO_STORAGE_READ_MESSAGE);
}

/**
 * Read every workspace from IndexedDB, using the metadata index for the most
 * recent name/active-file values. Damaged records are skipped rather than
 * failing the whole backup.
 */
export async function collectStudioBackup(): Promise<
  StudioResult<StudioBackupData>
> {
  let records: unknown[];
  try {
    records = await readAllWorkspaceRecords();
  } catch (error) {
    return databaseFailure(error);
  }

  const state = useStudioWorkspaces.getState();
  const byId = new Map<string, StudioWorkspace>();
  for (const raw of records) {
    const normalized = normalizeStudioWorkspace(raw);
    if (!normalized || byId.has(normalized.id)) continue;

    const meta = state.workspaces[normalized.id];
    const workspace = meta
      ? normalizeStudioWorkspace({
          ...normalized,
          name: meta.name,
          template: meta.template,
          source: meta.source,
          activeFile: meta.activeFile,
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
        })
      : normalized;
    if (workspace) byId.set(workspace.id, workspace);
  }

  const order: string[] = [];
  for (const id of state.order) {
    if (!byId.has(id) || order.includes(id)) continue;
    order.push(id);
  }
  const remaining = [...byId.values()]
    .filter((workspace) => !order.includes(workspace.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  for (const workspace of remaining) order.push(workspace.id);

  return {
    ok: true,
    value: {
      version: STUDIO_BACKUP_SECTION_VERSION,
      activeWorkspaceId:
        state.activeWorkspaceId && byId.has(state.activeWorkspaceId)
          ? state.activeWorkspaceId
          : order[0] ?? null,
      order,
      workspaces: order.map((id) => byId.get(id)!),
    },
  };
}

function normalizeIncoming(
  section: StudioBackupSection
): { workspaces: StudioWorkspace[]; skipped: number } {
  const workspaces: StudioWorkspace[] = [];
  const seenIds = new Set<string>();
  for (const raw of section.workspaces) {
    const workspace = normalizeStudioWorkspace(raw);
    if (!workspace || seenIds.has(workspace.id)) continue;
    seenIds.add(workspace.id);
    workspaces.push(workspace);
  }
  return {
    workspaces,
    skipped: section.workspaces.length - workspaces.length,
  };
}

function orderedWorkspaces(
  section: StudioBackupSection,
  workspaces: StudioWorkspace[]
): StudioWorkspace[] {
  const byId = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const ordered: StudioWorkspace[] = [];
  for (const id of section.order) {
    const workspace = byId.get(id);
    if (!workspace) continue;
    ordered.push(workspace);
    byId.delete(id);
  }
  return [...ordered, ...byId.values()];
}

/**
 * Restore Studio projects from a backup section. Replace is atomic in
 * IndexedDB; merge only adds projects whose id is not already used here,
 * leaving local projects untouched. Several projects may share one lesson.
 */
export async function restoreStudioBackup(
  rawSection: unknown,
  mode: StudioRestoreMode
): Promise<StudioResult<StudioRestoreReport>> {
  const section = normalizeStudioBackupSection(rawSection);
  if (!section) {
    return failure(
      "corrupted",
      "This backup's Studio project data isn't readable."
    );
  }

  const { workspaces, skipped } = normalizeIncoming(section);
  if (section.workspaces.length > 0 && workspaces.length === 0) {
    return failure(
      "corrupted",
      "None of the Studio projects in this backup could be read. Nothing was changed."
    );
  }

  if (mode === "replace") {
    const ordered = orderedWorkspaces(section, workspaces);
    try {
      await replaceAllWorkspaceRecords(ordered);
    } catch (error) {
      return databaseFailure(error);
    }

    const activeId =
      section.activeWorkspaceId &&
      ordered.some((workspace) => workspace.id === section.activeWorkspaceId)
        ? section.activeWorkspaceId
        : ordered[0]?.id ?? null;
    useStudioWorkspaces
      .getState()
      .replaceWorkspaceIndex(
        ordered.map(workspaceMetaFromWorkspace),
        activeId
      );
    return {
      ok: true,
      value: { projectsAdded: ordered.length, projectsSkipped: skipped },
    };
  }

  const state = useStudioWorkspaces.getState();
  const existingIds = new Set(Object.keys(state.workspaces));
  const added: StudioWorkspace[] = [];

  for (const workspace of orderedWorkspaces(section, workspaces)) {
    if (existingIds.has(workspace.id)) continue;
    added.push(workspace);
    existingIds.add(workspace.id);
  }

  try {
    await writeWorkspaceRecords(added);
  } catch (error) {
    return databaseFailure(error);
  }

  for (const workspace of added) {
    state.upsertWorkspace(workspaceMetaFromWorkspace(workspace));
  }

  if (state.activeWorkspaceId === null) {
    const incomingActive = section.activeWorkspaceId;
    if (
      incomingActive &&
      (existingIds.has(incomingActive) ||
        added.some((workspace) => workspace.id === incomingActive))
    ) {
      state.setActiveWorkspace(incomingActive);
    }
  }

  return {
    ok: true,
    value: {
      projectsAdded: added.length,
      projectsSkipped: section.workspaces.length - added.length,
    },
  };
}
