/**
 * Uploaded resource files (PDFs and downloadable attachments) live in
 * IndexedDB so the localStorage metadata stays small and PDFs of a few MB fit.
 */

const DATABASE_NAME = "focusy-resources";
const DATABASE_VERSION = 1;
const FILE_STORE = "files";

export interface ResourceFileRecord {
  /** Matches the owning Resource id. */
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: ArrayBuffer;
}

export class ResourceDatabaseError extends Error {
  readonly code: "unavailable" | "write-failed" | "read-failed";

  constructor(code: "unavailable" | "write-failed" | "read-failed") {
    super(
      code === "write-failed"
        ? "Couldn't save the attachment in this browser. Check storage settings, then try again."
        : code === "read-failed"
          ? "Couldn't read that attachment from this browser."
          : "This browser's local database isn't available, so attachments can't be opened. Check private-browsing or storage settings, then reload.",
    );
    this.name = "ResourceDatabaseError";
    this.code = code;
  }
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openResourceDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new ResourceDatabaseError("unavailable"));
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch {
      databasePromise = null;
      reject(new ResourceDatabaseError("unavailable"));
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILE_STORE)) {
        database.createObjectStore(FILE_STORE, { keyPath: "id" });
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
      reject(new ResourceDatabaseError("unavailable"));
    };

    request.onblocked = () => {
      databasePromise = null;
      reject(new ResourceDatabaseError("unavailable"));
    };
  });

  return databasePromise;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keep only records that can be turned back into a downloadable file. */
export function normalizeResourceFileRecord(
  raw: unknown,
): ResourceFileRecord | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || !raw.id) return null;
  if (!(raw.data instanceof ArrayBuffer)) return null;
  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name ? raw.name : "attachment",
    mimeType:
      typeof raw.mimeType === "string" && raw.mimeType
        ? raw.mimeType
        : "application/octet-stream",
    size:
      typeof raw.size === "number" && Number.isFinite(raw.size) && raw.size >= 0
        ? raw.size
        : raw.data.byteLength,
    data: raw.data,
  };
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openResourceDatabase();

  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(FILE_STORE, mode);
    } catch {
      reject(
        new ResourceDatabaseError(
          mode === "readonly" ? "unavailable" : "write-failed",
        ),
      );
      return;
    }

    let settled = false;
    const fail = (error: string) => {
      if (settled) return;
      settled = true;
      reject(new ResourceDatabaseError(error as "read-failed"));
    };

    let request: IDBRequest<T>;
    try {
      request = run(transaction.objectStore(FILE_STORE));
    } catch {
      fail(mode === "readonly" ? "read-failed" : "write-failed");
      return;
    }

    request.onsuccess = () => {
      if (settled) return;
      settled = true;
      resolve(request.result);
    };
    request.onerror = () =>
      fail(mode === "readonly" ? "read-failed" : "write-failed");
    transaction.onabort = () =>
      fail(mode === "readonly" ? "read-failed" : "write-failed");
  });
}

export async function readResourceFile(
  id: string,
): Promise<ResourceFileRecord | null> {
  const record = await withStore("readonly", (store) => store.get(id));
  return normalizeResourceFileRecord(record);
}

/** Every stored attachment, used by backup export. */
export async function readAllResourceFiles(): Promise<ResourceFileRecord[]> {
  const records = await withStore("readonly", (store) => store.getAll());
  if (!Array.isArray(records)) return [];
  return records
    .map(normalizeResourceFileRecord)
    .filter((record): record is ResourceFileRecord => record !== null);
}

async function writeBatch(
  records: ResourceFileRecord[],
  clearFirst: boolean,
): Promise<void> {
  const database = await openResourceDatabase();

  return new Promise<void>((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(FILE_STORE, "readwrite");
    } catch {
      reject(new ResourceDatabaseError("write-failed"));
      return;
    }

    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new ResourceDatabaseError("write-failed"));
    };

    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    transaction.onabort = fail;
    transaction.onerror = fail;

    try {
      const store = transaction.objectStore(FILE_STORE);
      if (clearFirst) store.clear();
      for (const record of records) store.put(record);
      if (records.length === 0 && !clearFirst) {
        // A write transaction with no requests completes on its own.
      }
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

export async function writeResourceFile(
  record: ResourceFileRecord,
): Promise<void> {
  await writeBatch([record], false);
}

export async function writeResourceFiles(
  records: ResourceFileRecord[],
): Promise<void> {
  if (records.length === 0) return;
  await writeBatch(records, false);
}

/** Replace every attachment atomically (used by backup restore). */
export async function replaceAllResourceFiles(
  records: ResourceFileRecord[],
): Promise<void> {
  await writeBatch(records, true);
}

export async function deleteResourceFile(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

/** Test helper: remove every stored attachment without touching metadata. */
export async function clearResourceFiles(): Promise<void> {
  await withStore("readwrite", (store) => store.clear());
}
