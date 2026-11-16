import type { LearningNote } from "@/shared/lib/learning-notes";
import type { AnalyticsData, AnalyticsEvent } from "../types/analytics.types";
import type { StudioProjectSummary } from "./studio-analytics";

export type TimelineKind =
  | "lesson-watched"
  | "lesson-completed"
  | "course-completed"
  | "studio-practice"
  | "note"
  | "project";

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  title: string;
  detail: string;
  href: string | null;
  at: number;
}

function eventDetail(type: AnalyticsEvent["type"]): string {
  switch (type) {
    case "lesson-watched":
      return "Watched a lesson";
    case "lesson-completed":
      return "Completed a lesson";
    case "course-completed":
      return "Completed a course";
    case "studio-practice":
      return "Practiced in Focusy Studio";
  }
}

function noteHref(note: LearningNote): string | null {
  const source = note.source;
  if (!source) return null;
  const time =
    note.timeSeconds != null && note.timeSeconds > 0
      ? `?t=${Math.floor(note.timeSeconds)}`
      : "";
  if (source.kind === "playlist") {
    return `/watch/${source.playlistId}/${source.videoId}${time}`;
  }
  if (source.kind === "course") {
    return `/course/${source.courseId}${time}`;
  }
  return null;
}

/**
 * Chronological learning history: tracked events plus note and Studio project
 * changes from the data Focusy already stores.
 */
export function buildTimeline(
  data: AnalyticsData,
  notes: LearningNote[],
  projects: StudioProjectSummary[],
  limit = 12
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const event of data.events) {
    entries.push({
      id: event.id,
      kind: event.type,
      title: event.title,
      detail: eventDetail(event.type),
      href: event.href ?? null,
      at: event.at,
    });
  }

  for (const note of notes) {
    const sourceTitle = note.source?.title?.trim();
    entries.push({
      id: `note-${note.id}`,
      kind: "note",
      title: sourceTitle || "Lesson note",
      detail: "Saved or updated a note",
      href: noteHref(note),
      at: note.updatedAt || note.createdAt,
    });
  }

  for (const project of projects) {
    entries.push({
      id: `project-${project.id}`,
      kind: "project",
      title: project.name,
      detail:
        project.updatedAt > 0 ? "Studio project updated" : "Studio project created",
      href: project.href,
      at: project.updatedAt,
    });
  }

  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      if (entry.at <= 0) return false;
      const key = `${entry.kind}:${entry.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}
