import * as React from "react";

/**
 * Completed-course and completed-playlist certificate snapshots, stored only
 * in this browser.
 *
 * Certificates are normally derived from the saved video/playlist plus its
 * progress. Deleting either removes that data, so a finished item is
 * snapshotted here first. That keeps the certificate readable after the course
 * or playlist itself is gone.
 */

export const CERTIFICATE_ARCHIVE_STORAGE_KEY = "focusy-certificates:v1";

const STORAGE_VERSION = 1;

export type CertificateKind = "course" | "playlist";

export interface ArchivedCertificate {
  kind: CertificateKind;
  /** Course id or playlist id, depending on `kind`. */
  sourceId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  completed: number;
  total: number;
  completedAt: number;
}

interface StoredCertificatesFile {
  version: typeof STORAGE_VERSION;
  certificates: ArchivedCertificate[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function archiveKey(kind: CertificateKind, sourceId: string): string {
  return `${kind}:${sourceId}`;
}

function normalizeCertificate(raw: unknown): ArchivedCertificate | null {
  if (!isRecord(raw)) return null;

  const kind: CertificateKind | null =
    raw.kind === "playlist"
      ? "playlist"
      : raw.kind === "course"
        ? "course"
        : // Adopt entries written before playlists were supported.
          typeof raw.courseId === "string"
          ? "course"
          : null;
  if (!kind) return null;

  const sourceId =
    typeof raw.sourceId === "string"
      ? raw.sourceId.trim()
      : typeof raw.courseId === "string"
        ? raw.courseId.trim()
        : typeof raw.playlistId === "string"
          ? raw.playlistId.trim()
          : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const total = nonNegativeInt(raw.total);
  const completed = nonNegativeInt(raw.completed);
  if (!sourceId || !title || total <= 0 || completed < total) return null;

  return {
    kind,
    sourceId,
    title,
    channelTitle:
      typeof raw.channelTitle === "string" ? raw.channelTitle.trim() : "",
    thumbnail: typeof raw.thumbnail === "string" ? raw.thumbnail : "",
    completed: total,
    total,
    completedAt: nonNegativeInt(raw.completedAt),
  };
}

/* -------------------------------------------------------------------------- */
/* raw storage                                                                */
/* -------------------------------------------------------------------------- */

function readRaw(): ArchivedCertificate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CERTIFICATE_ARCHIVE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return [];
    if (!Array.isArray(parsed.certificates)) return [];
    const seen = new Set<string>();
    return parsed.certificates
      .map(normalizeCertificate)
      .filter((certificate): certificate is ArchivedCertificate => {
        if (!certificate) return false;
        const key = archiveKey(certificate.kind, certificate.sourceId);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch {
    return [];
  }
}

function writeRaw(certificates: ArchivedCertificate[]): boolean {
  try {
    if (certificates.length === 0) {
      localStorage.removeItem(CERTIFICATE_ARCHIVE_STORAGE_KEY);
      return true;
    }
    const file: StoredCertificatesFile = {
      version: STORAGE_VERSION,
      certificates,
    };
    localStorage.setItem(CERTIFICATE_ARCHIVE_STORAGE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* cache + subscriptions                                                      */
/* -------------------------------------------------------------------------- */

const EMPTY_CERTIFICATES: ArchivedCertificate[] = Object.freeze(
  [],
) as unknown as ArchivedCertificate[];

let cache: ArchivedCertificate[] | null = null;
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

function getServerSnapshot(): ArchivedCertificate[] {
  return EMPTY_CERTIFICATES;
}

let storageBound = false;
function bindStorageEvents(): void {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === CERTIFICATE_ARCHIVE_STORAGE_KEY) {
      invalidate();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* reads                                                                      */
/* -------------------------------------------------------------------------- */

/** Every archived certificate, newest completion first. */
export function allArchivedCertificates(): ArchivedCertificate[] {
  if (typeof window === "undefined") return EMPTY_CERTIFICATES;
  return [...readRaw()].sort(
    (a, b) =>
      b.completedAt - a.completedAt ||
      a.title.localeCompare(b.title) ||
      a.sourceId.localeCompare(b.sourceId),
  );
}

/** The archived certificate for one course or playlist, if it was deleted. */
export function getArchivedCertificate(
  kind: CertificateKind,
  sourceId: string,
): ArchivedCertificate | null {
  if (!sourceId) return null;
  return (
    readRaw().find(
      (certificate) =>
        certificate.kind === kind && certificate.sourceId === sourceId,
    ) ?? null
  );
}

function snapshot(): ArchivedCertificate[] {
  if (!cache) cache = allArchivedCertificates();
  return cache;
}

/** Reactive list of archived certificates (used by the gallery). */
export function useArchivedCertificates(): ArchivedCertificate[] {
  return React.useSyncExternalStore(subscribe, snapshot, getServerSnapshot);
}

/* -------------------------------------------------------------------------- */
/* writes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Snapshot a finished course or playlist before it is deleted. Unfinished
 * items never had a certificate, so they are ignored.
 */
export function archiveCertificate(
  input: ArchivedCertificate,
): ArchivedCertificate | null {
  if (typeof window === "undefined") return null;

  const certificate = normalizeCertificate(input);
  if (!certificate) return null;

  const existing = readRaw().filter(
    (entry) =>
      archiveKey(entry.kind, entry.sourceId) !==
      archiveKey(certificate.kind, certificate.sourceId),
  );
  if (!writeRaw([...existing, certificate])) return null;
  invalidate();
  return certificate;
}

/** Drop one archived certificate, e.g. before archiving a newer completion. */
export function removeArchivedCertificate(
  kind: CertificateKind,
  sourceId: string,
): void {
  if (typeof window === "undefined" || !sourceId) return;
  const next = readRaw().filter(
    (entry) => archiveKey(entry.kind, entry.sourceId) !== archiveKey(kind, sourceId),
  );
  if (writeRaw(next)) invalidate();
}

if (typeof window !== "undefined") {
  bindStorageEvents();
}
