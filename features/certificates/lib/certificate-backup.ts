import { readCertificateName, saveCertificateName } from "./certificate";
import {
  allArchivedCertificates,
  mergeArchivedCertificates,
  normalizeArchivedCertificate,
  replaceArchivedCertificates,
  type ArchivedCertificate,
} from "./certificate-archive";

/**
 * Certificate data travels as an additive, optional backup section. Besides the
 * chosen name it carries archived certificates, which are the only remaining
 * copy of certificates whose course or playlist was deleted.
 */
export const CERTIFICATE_BACKUP_SECTION_VERSION = 1;

export interface CertificateBackupSection {
  version: typeof CERTIFICATE_BACKUP_SECTION_VERSION;
  name: string;
  /** Null for older backups that only carried the certificate name. */
  certificates: ArchivedCertificate[] | null;
}

export type CertificateRestoreMode = "replace" | "merge";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function collectCertificateBackup(): CertificateBackupSection | null {
  const name = readCertificateName().trim();
  const certificates = allArchivedCertificates().map((certificate) => ({
    ...certificate,
  }));
  if (!name && certificates.length === 0) return null;
  return {
    version: CERTIFICATE_BACKUP_SECTION_VERSION,
    name,
    certificates,
  };
}

/** Validate a section from any backup shape; malformed data is ignored. */
export function normalizeCertificateBackup(
  raw: unknown
): CertificateBackupSection | null {
  if (!isRecord(raw)) return null;
  if (
    raw.version != null &&
    raw.version !== CERTIFICATE_BACKUP_SECTION_VERSION
  ) {
    return null;
  }

  const name =
    typeof raw.name === "string" ? raw.name.trim().slice(0, 80) : "";

  let certificates: ArchivedCertificate[] | null = null;
  if (raw.certificates != null) {
    if (!Array.isArray(raw.certificates)) return null;
    const seen = new Set<string>();
    certificates = [];
    for (const entry of raw.certificates) {
      const certificate = normalizeArchivedCertificate(entry);
      if (!certificate) continue;
      const key = `${certificate.kind}:${certificate.sourceId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      certificates.push(certificate);
    }
  }

  if (!name && certificates === null) return null;
  return {
    version: CERTIFICATE_BACKUP_SECTION_VERSION,
    name,
    certificates,
  };
}

/**
 * Replace overwrites the local name and archived certificates; merge only
 * adopts the incoming name when this browser does not already have one and
 * adds certificates it is missing. Missing sections leave local data unchanged.
 */
export function restoreCertificateBackup(
  raw: unknown,
  mode: CertificateRestoreMode
): boolean {
  const incoming = normalizeCertificateBackup(raw);
  if (!incoming) return false;

  let restored = false;

  if (incoming.certificates !== null) {
    const result =
      mode === "replace"
        ? replaceArchivedCertificates(incoming.certificates)
        : mergeArchivedCertificates(incoming.certificates);
    if (!result.ok) return false;
    restored = mode === "replace" || result.count > 0;
  }

  if (incoming.name) {
    if (mode === "replace" || !readCertificateName().trim()) {
      saveCertificateName(incoming.name);
      restored = true;
    }
  }

  return restored;
}
