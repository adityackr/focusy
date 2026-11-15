import type { StudioWorkspace } from "../types/studio.types";

const DATABASE_NAME = "focusy-studio";
const DATABASE_VERSION = 1;
const WORKSPACE_STORE = "workspaces";

/** Bumped when the shape of a stored workspace changes incompatibly. */
export const STUDIO_WORKSPACE_SCHEMA_VERSION = 1;

export const STUDIO_STORAGE_UNAVAILABLE_MESSAGE =
  "Studio can't reach this browser's local database, so projects can't be opened or saved. Check private-browsing or storage settings, then reload.";
export const STUDIO_STORAGE_READ_MESSAGE =
  "Studio couldn't read this project from this browser.";
export const STUDIO_STORAGE_WRITE_MESSAGE =
  "Studio couldn't save this project in this browser. Your latest edits may not survive a refresh.";

export interface StudioWorkspaceRecord extends StudioWorkspace {
  schemaVersion: number;
}

export class StudioDatabaseError extends Error {
  readonly code: "unavailable" | "write-failed";

  constructor(
    code: "unavailable" | "write-failed",
    message = STUDIO_STORAGE_UNAVAILABLE_MESSAGE
  ) {
    super(message);
    this.name = "StudioDatabaseError";
    this.code = code;
  }
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openStudioDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new StudioDatabaseError("unavailable", STUDIO_STORAGE_UNAVAILABLE_MESSAGE)
    );
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch {
      databasePromise = null;
      reject(
        new StudioDatabaseError(
          "unavailable",
          STUDIO_STORAGE_UNAVAILABLE_MESSAGE
        )
      );
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(WORKSPACE_STORE)) {
        const store = database.createObjectStore(WORKSPACE_STORE, {
          keyPath: "id",
        });
        store.createIndex("sourceKey", "sourceKey", { unique: false });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };

    request.onerror = () => {
      databasePromise = null;
      reject(
        new StudioDatabaseError(
          "unavailable",
          STUDIO_STORAGE_UNAVAILABLE_MESSAGE
        )
      );
    };

    request.onblocked = () => {
      databasePromise = null;
      reject(
        new StudioDatabaseError(
          "unavailable",
          "Another Focusy tab is using an older version of Studio storage. Close it and reload this page."
        )
      );
    };
  });

  return databasePromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openStudioDatabase();

  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(WORKSPACE_STORE, mode);
    } catch {
      reject(
        new StudioDatabaseError(
          mode === "readonly" ? "unavailable" : "write-failed",
          mode === "readonly"
            ? STUDIO_STORAGE_READ_MESSAGE
            : STUDIO_STORAGE_WRITE_MESSAGE
        )
      );
      return;
    }

    const fail = (error: unknown) => {
      if (mode === "readonly") {
        reject(
          new StudioDatabaseError(
            "unavailable",
            error instanceof StudioDatabaseError
              ? error.message
              : STUDIO_STORAGE_READ_MESSAGE
          )
        );
      } else {
        reject(
          new StudioDatabaseError(
            "write-failed",
            error instanceof StudioDatabaseError
              ? error.message
              : STUDIO_STORAGE_WRITE_MESSAGE
          )
        );
      }
    };

    let request: IDBRequest<T>;
    try {
      request = run(transaction.objectStore(WORKSPACE_STORE));
    } catch (error) {
      fail(error);
      return;
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => fail(request.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

/** Raw stored record, or null when the workspace has no IndexedDB entry. */
export async function readWorkspaceRecord(id: string): Promise<unknown | null> {
  const record = await withStore("readonly", (store) => store.get(id));
  return record ?? null;
}

function workspaceRecord(workspace: StudioWorkspace): StudioWorkspaceRecord {
  return {
    ...workspace,
    schemaVersion: STUDIO_WORKSPACE_SCHEMA_VERSION,
  };
}

export async function writeWorkspaceRecord(
  workspace: StudioWorkspace
): Promise<void> {
  await withStore("readwrite", (store) => store.put(workspaceRecord(workspace)));
}

/**
 * Write several workspaces in one transaction, so a merge either lands fully
 * or leaves the existing projects untouched.
 */
export async function writeWorkspaceRecords(
  workspaces: StudioWorkspace[]
): Promise<void> {
  if (workspaces.length === 0) return;
  await writeBatch(workspaces, false);
}

/**
 * Replace every stored project atomically. Used by backup restore so a failed
 * write cannot leave the browser with half of the imported projects.
 */
export async function replaceAllWorkspaceRecords(
  workspaces: StudioWorkspace[]
): Promise<void> {
  await writeBatch(workspaces, true);
}

async function writeBatch(
  workspaces: StudioWorkspace[],
  clearFirst: boolean
): Promise<void> {
  const database = await openStudioDatabase();

  return new Promise<void>((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(WORKSPACE_STORE, "readwrite");
    } catch {
      reject(new StudioDatabaseError("write-failed"));
      return;
    }

    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new StudioDatabaseError("write-failed"));
    };

    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    transaction.onabort = fail;
    transaction.onerror = fail;

    try {
      const store = transaction.objectStore(WORKSPACE_STORE);
      if (clearFirst) store.clear();
      for (const workspace of workspaces) store.put(workspaceRecord(workspace));
    } catch {
      try {
        transaction.abort();
      } catch {
        /* already aborted */
      }
      fail();
    }
  });
}

export async function deleteWorkspaceRecord(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

/** Every stored record, used by tests and by backup export. */
export async function readAllWorkspaceRecords(): Promise<unknown[]> {
  return withStore("readonly", (store) => store.getAll());
}

/** Test helper: remove every stored project without touching metadata. */
export async function clearWorkspaceRecords(): Promise<void> {
  await withStore("readwrite", (store) => store.clear());
}
