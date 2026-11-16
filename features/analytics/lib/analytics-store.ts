import {
  ANALYTICS_SCHEMA_VERSION,
  MAX_STORED_EVENTS,
  type ActivityKind,
  type AnalyticsData,
  type AnalyticsEvent,
  type AnalyticsSource,
  type DayActivity,
  type LearningGoals,
} from "../types/analytics.types";
import { dayKey } from "./analytics-date";

export const ANALYTICS_STORAGE_KEY = "focusy-analytics:v1";

export function createEmptyDay(): DayActivity {
  return {
    videoSeconds: 0,
    studioSeconds: 0,
    noteSeconds: 0,
    reviewSeconds: 0,
    lessonsCompleted: 0,
    coursesCompleted: 0,
    sources: {},
    sessions: 0,
    studioSessions: 0,
  };
}

export function createEmptyGoals(): LearningGoals {
  return {
    dailyMinutes: null,
    weeklyMinutes: null,
    weeklyLessons: null,
    monthlyCourses: null,
    weeklyStudioMinutes: null,
  };
}

export function createEmptyAnalytics(): AnalyticsData {
  return {
    version: ANALYTICS_SCHEMA_VERSION,
    days: {},
    events: [],
    goals: createEmptyGoals(),
    hourSeconds: Array.from({ length: 24 }, () => 0),
    completedCourses: {},
    lastUpdated: 0,
  };
}

/** Frozen server snapshot so `useSyncExternalStore` gets a stable reference. */
export const EMPTY_ANALYTICS: AnalyticsData = Object.freeze(createEmptyAnalytics());

/* -------------------------------------------------------------------------- */
/* validation                                                                 */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function count(value: unknown): number {
  return Math.floor(nonNegativeNumber(value));
}

function sourceSeconds(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, seconds] of Object.entries(value)) {
    if (!key) continue;
    const n = nonNegativeNumber(seconds);
    if (n > 0) out[key] = n;
  }
  return out;
}

function normalizeDay(raw: unknown): DayActivity | null {
  if (!isRecord(raw)) return null;
  const day = createEmptyDay();
  day.videoSeconds = nonNegativeNumber(raw.videoSeconds);
  day.studioSeconds = nonNegativeNumber(raw.studioSeconds);
  day.noteSeconds = nonNegativeNumber(raw.noteSeconds);
  day.reviewSeconds = nonNegativeNumber(raw.reviewSeconds);
  day.lessonsCompleted = count(raw.lessonsCompleted);
  day.coursesCompleted = count(raw.coursesCompleted);
  day.sessions = count(raw.sessions);
  day.studioSessions = count(raw.studioSessions);
  day.sources = sourceSeconds(raw.sources);
  return day;
}

const EVENT_TYPES: ReadonlySet<string> = new Set([
  "lesson-watched",
  "lesson-completed",
  "course-completed",
  "studio-practice",
]);

function normalizeEvent(raw: unknown): AnalyticsEvent | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : "";
  const type = typeof raw.type === "string" ? raw.type : "";
  const at = typeof raw.at === "number" && Number.isFinite(raw.at) ? raw.at : 0;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!id || !title || !at || !EVENT_TYPES.has(type)) return null;
  return {
    id,
    type: type as AnalyticsEvent["type"],
    at,
    title,
    ...(typeof raw.href === "string" && raw.href ? { href: raw.href } : {}),
    ...(typeof raw.key === "string" && raw.key ? { key: raw.key } : {}),
  };
}

function normalizeGoals(raw: unknown): LearningGoals {
  const goals = createEmptyGoals();
  if (!isRecord(raw)) return goals;
  const pick = (value: unknown, max: number): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return null;
    }
    return Math.min(max, Math.round(value));
  };
  goals.dailyMinutes = pick(raw.dailyMinutes, 24 * 60);
  goals.weeklyMinutes = pick(raw.weeklyMinutes, 7 * 24 * 60);
  goals.weeklyLessons = pick(raw.weeklyLessons, 10_000);
  goals.monthlyCourses = pick(raw.monthlyCourses, 10_000);
  goals.weeklyStudioMinutes = pick(raw.weeklyStudioMinutes, 7 * 24 * 60);
  return goals;
}

function normalizeHours(raw: unknown): number[] {
  const hours = Array.from({ length: 24 }, () => 0);
  if (!Array.isArray(raw)) return hours;
  for (let i = 0; i < 24; i += 1) hours[i] = nonNegativeNumber(raw[i]);
  return hours;
}

function normalizeCompletedCourses(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const out: Record<string, number> = {};
  for (const [courseId, at] of Object.entries(raw)) {
    if (!courseId) continue;
    out[courseId] = nonNegativeNumber(at);
  }
  return out;
}

/** Read any saved shape into a valid analytics object, dropping junk. */
export function normalizeAnalytics(raw: unknown): AnalyticsData {
  const data = createEmptyAnalytics();
  if (!isRecord(raw)) return data;

  if (isRecord(raw.days)) {
    for (const [key, value] of Object.entries(raw.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const day = normalizeDay(value);
      if (day) data.days[key] = day;
    }
  }

  if (Array.isArray(raw.events)) {
    const seen = new Set<string>();
    const events: AnalyticsEvent[] = [];
    for (const entry of raw.events) {
      const event = normalizeEvent(entry);
      if (!event || seen.has(event.id)) continue;
      seen.add(event.id);
      events.push(event);
    }
    events.sort((a, b) => b.at - a.at);
    data.events = events.slice(0, MAX_STORED_EVENTS);
  }

  data.goals = normalizeGoals(raw.goals);
  data.hourSeconds = normalizeHours(raw.hourSeconds);
  data.completedCourses = normalizeCompletedCourses(raw.completedCourses);
  data.lastUpdated = nonNegativeNumber(raw.lastUpdated);
  return data;
}

/* -------------------------------------------------------------------------- */
/* pure aggregation writes (shared by the tracker and the tests)              */
/* -------------------------------------------------------------------------- */

export function sourceKey(source: AnalyticsSource | null | undefined): string | null {
  if (!source) return null;
  return `${source.kind}:${source.id}`;
}

type NumericDayField =
  | "videoSeconds"
  | "studioSeconds"
  | "noteSeconds"
  | "reviewSeconds";

function activityField(kind: ActivityKind): NumericDayField {
  switch (kind) {
    case "video":
      return "videoSeconds";
    case "studio":
      return "studioSeconds";
    case "notes":
      return "noteSeconds";
    case "reviewing":
      return "reviewSeconds";
  }
}

/**
 * Add active seconds to one day and one kind. Overlapping activities are
 * resolved by the tracker before this runs, so each second is counted once.
 */
export function recordActiveSeconds(
  data: AnalyticsData,
  kind: ActivityKind,
  seconds: number,
  now: number,
  source?: AnalyticsSource | null
): void {
  const amount = Math.max(0, Math.floor(seconds));
  if (amount === 0) return;

  const key = dayKey(now);
  const day = data.days[key] ?? createEmptyDay();
  const field = activityField(kind);
  day[field] += amount;

  const resource = sourceKey(source);
  if (resource && kind !== "reviewing") {
    day.sources[resource] = (day.sources[resource] ?? 0) + amount;
  }

  data.days[key] = day;
  const hour = new Date(now).getHours();
  if (hour >= 0 && hour < 24) {
    data.hourSeconds[hour] = (data.hourSeconds[hour] ?? 0) + amount;
  }
}

/** Count a study session once per playback/practice run. */
export function recordSession(
  data: AnalyticsData,
  kind: "video" | "studio",
  now: number
): void {
  const key = dayKey(now);
  const day = data.days[key] ?? createEmptyDay();
  if (kind === "video") day.sessions += 1;
  else day.studioSessions += 1;
  data.days[key] = day;
}

export function hasEventKey(data: AnalyticsData, key: string): boolean {
  return data.events.some((event) => event.key === key);
}

/** Append an event, deduping on `key`, keeping the newest entries only. */
export function recordEvent(data: AnalyticsData, event: AnalyticsEvent): boolean {
  if (event.key && hasEventKey(data, event.key)) return false;
  data.events = [event, ...data.events].sort((a, b) => b.at - a.at).slice(0, MAX_STORED_EVENTS);
  return true;
}

export function recordLessonCompleted(
  data: AnalyticsData,
  input: {
    courseId: string;
    courseTitle: string;
    lessonId: string;
    lessonTitle?: string;
    href: string;
  },
  now: number
): void {
  const date = dayKey(now);
  const key = `lesson-completed:${date}:${input.courseId}:${input.lessonId}`;
  if (hasEventKey(data, key)) return;
  const day = data.days[date] ?? createEmptyDay();
  day.lessonsCompleted += 1;
  data.days[date] = day;
  recordEvent(data, {
    id: `lesson-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type: "lesson-completed",
    at: now,
    title: input.lessonTitle?.trim() || input.courseTitle,
    href: input.href,
    key,
  });
}

/** Record a completed course exactly once, even across reloads. */
export function recordCourseCompleted(
  data: AnalyticsData,
  input: { courseId: string; courseTitle: string; href: string },
  now: number
): boolean {
  if (data.completedCourses[input.courseId]) return false;
  data.completedCourses[input.courseId] = now;
  const date = dayKey(now);
  const day = data.days[date] ?? createEmptyDay();
  day.coursesCompleted += 1;
  data.days[date] = day;
  recordEvent(data, {
    id: `course-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type: "course-completed",
    at: now,
    title: input.courseTitle,
    href: input.href,
    key: `course-completed:${input.courseId}`,
  });
  return true;
}

/* -------------------------------------------------------------------------- */
/* module cache + subscriptions                                               */
/* -------------------------------------------------------------------------- */

let snapshot: AnalyticsData | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let storageBound = false;
const listeners = new Set<() => void>();

const FLUSH_DELAY_MS = 8_000;

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeAnalytics(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notify mounted analytics views without changing the data (used by batching). */
export function notifyAnalytics(): void {
  notify();
}

function readFromStorage(): AnalyticsData {
  if (typeof window === "undefined") return EMPTY_ANALYTICS;
  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    return raw ? normalizeAnalytics(JSON.parse(raw)) : createEmptyAnalytics();
  } catch {
    return createEmptyAnalytics();
  }
}

export function loadAnalytics(): AnalyticsData {
  if (typeof window === "undefined") return EMPTY_ANALYTICS;
  return readFromStorage();
}

/** Current in-memory analytics. Loaded lazily and shared across components. */
export function getAnalyticsSnapshot(): AnalyticsData {
  if (typeof window === "undefined") return EMPTY_ANALYTICS;
  if (!snapshot) {
    snapshot = loadAnalytics();
    bindStorageEvents();
  }
  return snapshot;
}

export function flushAnalytics(): void {
  if (typeof window === "undefined" || !snapshot) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota or private mode — analytics simply stop persisting */
  }
}

/**
 * Apply a change, keep the shared snapshot stable for React, and persist on a
 * short delay so continuous playback doesn't write on every tick.
 */
export function updateAnalytics(
  mutator: (draft: AnalyticsData) => void,
  options: { silent?: boolean; persist?: boolean } = {}
): void {
  if (typeof window === "undefined") return;
  const current = getAnalyticsSnapshot();
  const draft: AnalyticsData = {
    ...current,
    days: { ...current.days },
    events: [...current.events],
    goals: { ...current.goals },
    hourSeconds: [...current.hourSeconds],
    completedCourses: { ...current.completedCourses },
  };
  mutator(draft);
  draft.lastUpdated = Date.now();
  snapshot = draft;

  if (options.persist) flushAnalytics();
  else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushAnalytics();
    }, FLUSH_DELAY_MS);
  }

  if (!options.silent) notify();
}

export function replaceAnalytics(data: unknown): AnalyticsData {
  const normalized = normalizeAnalytics(data);
  snapshot = normalized;
  const draft = {
    ...normalized,
    lastUpdated: Math.max(normalized.lastUpdated, Date.now()),
  };
  snapshot = draft;
  flushAnalytics();
  notify();
  return draft;
}

export function setLearningGoals(goals: LearningGoals): void {
  updateAnalytics(
    (draft) => {
      draft.goals = { ...goals };
    },
    { persist: true }
  );
}

/** Merge incoming analytics into this browser without dropping local history. */
export function mergeAnalyticsData(
  current: AnalyticsData,
  incoming: AnalyticsData
): AnalyticsData {
  const merged: AnalyticsData = {
    ...current,
    days: { ...current.days },
    events: [...current.events],
    hourSeconds: current.hourSeconds.map((seconds, hour) =>
      seconds + (incoming.hourSeconds[hour] ?? 0)
    ),
    completedCourses: { ...incoming.completedCourses, ...current.completedCourses },
    lastUpdated: Date.now(),
  };

  for (const [key, incomingDay] of Object.entries(incoming.days)) {
    const local = merged.days[key];
    if (!local) {
      merged.days[key] = { ...incomingDay, sources: { ...incomingDay.sources } };
      continue;
    }
    merged.days[key] = {
      videoSeconds: local.videoSeconds + incomingDay.videoSeconds,
      studioSeconds: local.studioSeconds + incomingDay.studioSeconds,
      noteSeconds: local.noteSeconds + incomingDay.noteSeconds,
      reviewSeconds: local.reviewSeconds + incomingDay.reviewSeconds,
      lessonsCompleted: local.lessonsCompleted + incomingDay.lessonsCompleted,
      coursesCompleted: local.coursesCompleted + incomingDay.coursesCompleted,
      sessions: local.sessions + incomingDay.sessions,
      studioSessions: local.studioSessions + incomingDay.studioSessions,
      sources: addSources(local.sources, incomingDay.sources),
    };
  }

  // Goals are personal to this browser: keep them unless none are set.
  if (!hasAnyGoal(current.goals) && hasAnyGoal(incoming.goals)) {
    merged.goals = { ...incoming.goals };
  }

  const seenIds = new Set(merged.events.map((event) => event.id));
  const seenKeys = new Set(
    merged.events.map((event) => event.key).filter((key): key is string => Boolean(key))
  );
  for (const event of incoming.events) {
    if (seenIds.has(event.id)) continue;
    if (event.key && seenKeys.has(event.key)) continue;
    merged.events.push(event);
    seenIds.add(event.id);
    if (event.key) seenKeys.add(event.key);
  }
  merged.events.sort((a, b) => b.at - a.at);
  merged.events = merged.events.slice(0, MAX_STORED_EVENTS);

  return merged;
}

function addSources(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [key, seconds] of Object.entries(b)) {
    out[key] = (out[key] ?? 0) + seconds;
  }
  return out;
}

export function hasAnyGoal(goals: LearningGoals): boolean {
  return Object.values(goals).some((value) => typeof value === "number" && value > 0);
}

function bindStorageEvents(): void {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== ANALYTICS_STORAGE_KEY) return;
    snapshot = readFromStorage();
    notify();
  });
  window.addEventListener("pagehide", flushAnalytics);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAnalytics();
  });
}
