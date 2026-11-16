import type { Course, CourseProgress } from "@/shared/lib/types";

/** Locally saved name shown on generated certificates. */
export const CERTIFICATE_NAME_KEY = "focusy-certificate:name:v1";

export interface CertificateProgress {
  total: number;
  completed: number;
  percent: number;
  complete: boolean;
}

/**
 * Count only chapters that still belong to the course, so stale completed ids
 * from edited lessons can never produce a certificate for an incomplete course.
 */
export function certificateProgress(
  course: Pick<Course, "chapters">,
  progress: Pick<CourseProgress, "completedIds"> | null | undefined
): CertificateProgress {
  const total = course.chapters.length;
  const completedIds = new Set(progress?.completedIds ?? []);
  const completed = course.chapters.reduce(
    (count, chapter) => count + (completedIds.has(chapter.id) ? 1 : 0),
    0
  );
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    complete: total > 0 && completed >= total,
  };
}

/**
 * A stable, human-friendly local reference. It identifies this record inside
 * this browser only — it is not a publicly verifiable credential.
 */
export function certificateReference(
  courseId: string,
  completedAt: number | null = null
): string {
  const input = `${courseId}:${completedAt ?? ""}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const code = (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
  return `FY-${code.slice(0, 7)}`;
}

export function readCertificateName(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(CERTIFICATE_NAME_KEY) ?? "").slice(0, 80);
  } catch {
    return "";
  }
}

export function saveCertificateName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim().slice(0, 80);
  try {
    if (trimmed) localStorage.setItem(CERTIFICATE_NAME_KEY, trimmed);
    else localStorage.removeItem(CERTIFICATE_NAME_KEY);
  } catch {
    /* private mode or quota — the name simply isn't remembered */
  }
}
