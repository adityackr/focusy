import {
  allResources,
  mergeResources,
  replaceResources,
} from "./resource-store";
import {
  readAllResourceFiles,
  replaceAllResourceFiles,
  ResourceDatabaseError,
  writeResourceFiles,
  type ResourceFileRecord,
} from "./resource-db";
import { normalizeResources, type Resource } from "./resource";

/**
 * Course attachments travel inside the normal Focusy JSON backup. Metadata is
 * copied as-is; uploaded files are embedded as base64 so a single backup file
 * can be restored on another device with the attachments intact.
 */

export const RESOURCES_BACKUP_SECTION_VERSION = 1;

export type ResourcesRestoreMode = "replace" | "merge";

export interface ResourceBackupFile {
  resourceId: string;
  name: string;
  mimeType: string;
  size: number;
  /** Base64-encoded file bytes. */
  data: string;
}

export interface ResourcesBackupData {
  version: typeof RESOURCES_BACKUP_SECTION_VERSION;
  resources: Resource[];
  files: ResourceBackupFile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* base64 helpers                                                             */
/* -------------------------------------------------------------------------- */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Chunked conversion keeps the argument list to String.fromCharCode small.
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(
      ...Array.from(bytes.subarray(index, index + CHUNK)),
    );
  }
  return btoa(binary);
}

function base64ToArrayBuffer(data: string): ArrayBuffer | null {
  try {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* export                                                                     */
/* -------------------------------------------------------------------------- */

export async function collectResourcesBackup(): Promise<ResourcesBackupData> {
  let records: ResourceFileRecord[] = [];
  try {
    records = await readAllResourceFiles();
  } catch {
    // Attachments that can't be read are skipped; metadata still travels.
  }

  return {
    version: RESOURCES_BACKUP_SECTION_VERSION,
    resources: allResources().map((resource) => ({ ...resource })),
    files: records.map((record) => ({
      resourceId: record.id,
      name: record.name,
      mimeType: record.mimeType,
      size: record.size,
      data: arrayBufferToBase64(record.data),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* restore                                                                    */
/* -------------------------------------------------------------------------- */

export interface ResourcesRestoreReport {
  resourcesAdded: number;
  resourcesRestored: number;
  filesRestored: number;
  filesSkipped: number;
}

export type ResourcesRestoreResult =
  | { ok: true; value: ResourcesRestoreReport }
  | { ok: false; error: string };

function normalizeBackupFile(
  raw: unknown,
  allowed: Set<string>,
): { record: ResourceFileRecord; skipped: boolean } | null {
  if (!isRecord(raw)) return null;
  const resourceId =
    typeof raw.resourceId === "string" ? raw.resourceId : "";
  if (!resourceId || !allowed.has(resourceId)) return null;
  if (typeof raw.data !== "string" || !raw.data) return null;

  const data = base64ToArrayBuffer(raw.data);
  if (!data) return null;

  return {
    record: {
      id: resourceId,
      name:
        typeof raw.name === "string" && raw.name ? raw.name : "attachment",
      mimeType:
        typeof raw.mimeType === "string" && raw.mimeType
          ? raw.mimeType
          : "application/octet-stream",
      size:
        typeof raw.size === "number" &&
        Number.isFinite(raw.size) &&
        raw.size >= 0
          ? raw.size
          : data.byteLength,
      data,
    },
    skipped: false,
  };
}

/**
 * Restore attachments from a backup section. Replace rewrites metadata and
 * file bytes; merge only adds resources whose id is not already saved here and
 * never deletes local attachments. An absent/older section leaves attachments
 * untouched.
 */
export async function restoreResourcesBackup(
  raw: unknown,
  mode: ResourcesRestoreMode = "replace",
): Promise<ResourcesRestoreResult> {
  if (raw == null) {
    return {
      ok: true,
      value: {
        resourcesAdded: 0,
        resourcesRestored: 0,
        filesRestored: 0,
        filesSkipped: 0,
      },
    };
  }

  if (
    !isRecord(raw) ||
    raw.version !== RESOURCES_BACKUP_SECTION_VERSION ||
    !Array.isArray(raw.resources) ||
    !Array.isArray(raw.files)
  ) {
    return { ok: false, error: "That backup's attachments aren't readable." };
  }

  const incoming = normalizeResources(raw.resources);
  if (raw.resources.length > 0 && incoming.length === 0) {
    return {
      ok: false,
      error:
        "None of the attachments in this backup could be read. Nothing was changed.",
    };
  }

  const local = allResources();
  const localIds = new Set(local.map((resource) => resource.id));
  const targets =
    mode === "replace"
      ? incoming
      : incoming.filter((resource) => !localIds.has(resource.id));
  const targetIds = new Set(targets.map((resource) => resource.id));

  const records: ResourceFileRecord[] = [];
  let filesSkipped = 0;
  for (const entry of raw.files) {
    const normalized = normalizeBackupFile(entry, targetIds);
    if (normalized) records.push(normalized.record);
    else if (
      isRecord(entry) &&
      typeof entry.resourceId === "string" &&
      targetIds.has(entry.resourceId)
    ) {
      filesSkipped++;
    }
  }

  try {
    if (mode === "replace") {
      await replaceAllResourceFiles(records);
      replaceResources(incoming);
    } else {
      await writeResourceFiles(records);
      mergeResources(targets);
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ResourceDatabaseError
          ? error.message
          : "Couldn't save the attachments in this browser.",
    };
  }

  return {
    ok: true,
    value: {
      resourcesAdded: mode === "merge" ? targets.length : 0,
      resourcesRestored: mode === "replace" ? incoming.length : 0,
      filesRestored: records.length,
      filesSkipped,
    },
  };
}

/** How many attachments a saved backup section holds, for the preview. */
export function countResourcesBackup(raw: unknown): number | null {
  if (!isRecord(raw) || !Array.isArray(raw.resources)) return null;
  return raw.resources.length;
}
