import { readCertificateName, saveCertificateName } from "./certificate";

export interface CertificateBackupSection {
  name: string;
}

export type CertificateRestoreMode = "replace" | "merge";

export function collectCertificateBackup(): CertificateBackupSection | null {
  const name = readCertificateName().trim();
  return name ? { name } : null;
}

/** Validate a section from any backup shape; malformed data is ignored. */
export function normalizeCertificateBackup(
  raw: unknown
): CertificateBackupSection | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const name = (raw as { name?: unknown }).name;
  if (typeof name !== "string") return null;
  const trimmed = name.trim().slice(0, 80);
  return trimmed ? { name: trimmed } : null;
}

/**
 * Replace overwrites the local name; merge only adopts the incoming name when
 * this browser does not already have one. Missing sections leave it unchanged.
 */
export function restoreCertificateBackup(
  raw: unknown,
  mode: CertificateRestoreMode
): boolean {
  const incoming = normalizeCertificateBackup(raw);
  if (!incoming) return false;
  if (mode === "merge" && readCertificateName().trim()) return false;
  saveCertificateName(incoming.name);
  return true;
}
