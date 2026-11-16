"use client";

import {
  PRESENCE_IDLE_TIMEOUT_MS,
  SESSION_THRESHOLD_SECONDS,
  type ActivityKind,
  type AnalyticsSource,
  type LearningGoals,
} from "../types/analytics.types";
import { dayKey } from "./analytics-date";
import {
  createEmptyDay,
  flushAnalytics,
  notifyAnalytics,
  recordActiveSeconds,
  recordCourseCompleted,
  recordEvent,
  recordLessonCompleted,
  recordSession,
  setLearningGoals,
  updateAnalytics,
} from "./analytics-store";

/**
 * Active-learning timer.
 *
 * Surfaces register a session while the learner is actually doing something:
 * video sessions only exist while playback is running, Studio/notes sessions
 * only while their sheet is open and recently interacted with. One shared
 * one-second ticker attributes each second to exactly one activity (Studio →
 * notes → video playback → reviewing), so overlapping activities can never be
 * double counted. Hidden tabs never accumulate time.
 */

type PresenceKind = Extract<ActivityKind, "studio" | "notes" | "reviewing">;

interface Session {
  id: number;
  kind: ActivityKind;
  source: AnalyticsSource | null;
  videoId?: string;
  activeSeconds: number;
  counted: boolean;
  lastInteraction: number;
}

const PRIORITY: Record<ActivityKind, number> = {
  studio: 3,
  notes: 2,
  video: 1,
  reviewing: 0,
};

const sessions = new Set<Session>();
const stopHandlers = new Map<number, () => void>();
let nextSessionId = 1;
let ticker: ReturnType<typeof setInterval> | null = null;
let ticksSinceNotify = 0;

export const REVIEW_IDLE_TIMEOUT_MS = PRESENCE_IDLE_TIMEOUT_MS;

function interactionHandler() {
  const now = Date.now();
  for (const session of sessions) {
    if (session.kind !== "video") session.lastInteraction = now;
  }
}

function bindInteractionListeners() {
  if (typeof document === "undefined") return;
  document.addEventListener("pointerdown", interactionHandler, { capture: true });
  document.addEventListener("keydown", interactionHandler, { capture: true });
  document.addEventListener("touchstart", interactionHandler, { capture: true });
  document.addEventListener("scroll", interactionHandler, { capture: true, passive: true });
}

let interactionBound = false;

function ensureInteractionListeners() {
  if (interactionBound || typeof document === "undefined") return;
  interactionBound = true;
  bindInteractionListeners();
}

function register(session: Session): () => void {
  sessions.add(session);
  ensureInteractionListeners();
  ensureTicker();
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    sessions.delete(session);
    if (sessions.size === 0) stopTicker();
    flushAnalytics();
  };
  stopHandlers.set(session.id, stop);
  return stop;
}

/** Register live video playback. Call it while `isPlaying` is true only. */
export function startVideoActivity(input: {
  videoId: string;
  source: AnalyticsSource | null;
}): () => void {
  return register({
    id: nextSessionId++,
    kind: "video",
    source: input.source,
    videoId: input.videoId,
    activeSeconds: 0,
    counted: false,
    lastInteraction: Number.POSITIVE_INFINITY,
  });
}

/** Register an open, recently used Studio/notes/reviewing surface. */
export function startPresenceActivity(
  kind: PresenceKind,
  options: { source?: AnalyticsSource | null; idleTimeoutMs?: number } = {}
): () => void {
  const session: Session = {
    id: nextSessionId++,
    kind,
    source: options.source ?? null,
    activeSeconds: 0,
    counted: false,
    lastInteraction: Date.now(),
  };
  return register(session);
}

function ensureTicker() {
  if (ticker !== null || typeof window === "undefined") return;
  ticker = setInterval(tick, 1000);
}

function stopTicker() {
  if (ticker === null) return;
  clearInterval(ticker);
  ticker = null;
  ticksSinceNotify = 0;
}

function hasActivePresence(session: Session, now: number): boolean {
  if (session.kind === "video") return true;
  return now - session.lastInteraction <= PRESENCE_IDLE_TIMEOUT_MS;
}

function pickSession(now: number): Session | null {
  let winner: Session | null = null;
  for (const session of sessions) {
    if (!hasActivePresence(session, now)) continue;
    if (!winner || PRIORITY[session.kind] > PRIORITY[winner.kind]) {
      winner = session;
    }
  }
  return winner;
}

/** One active second, attributed to the highest-priority live session. */
function tick() {
  if (typeof document === "undefined") return;
  if (document.visibilityState === "hidden") return;

  const now = Date.now();
  const session = pickSession(now);
  if (!session) return;

  session.activeSeconds += 1;
  const crossesThreshold =
    !session.counted && session.activeSeconds >= SESSION_THRESHOLD_SECONDS;
  if (crossesThreshold) session.counted = true;

  updateAnalytics(
    (draft) => {
      recordActiveSeconds(draft, session.kind, 1, now, session.source);
      if (!crossesThreshold) return;
      if (session.kind === "video") {
        recordSession(draft, "video", now);
        recordWatchedEvent(draft, session, now);
      } else if (session.kind === "studio") {
        recordSession(draft, "studio", now);
        recordEvent(draft, {
          id: `studio-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          type: "studio-practice",
          at: now,
          title: "Practiced in Focusy Studio",
          href: "/analytics",
          key: `studio-practice:${dayKey(now)}:${session.id}`,
        });
      }
    },
    { silent: true }
  );

  ticksSinceNotify += 1;
  if (ticksSinceNotify >= 5) {
    ticksSinceNotify = 0;
    notifyAnalytics();
  }
}

function recordWatchedEvent(
  draft: Parameters<typeof recordEvent>[0],
  session: Session,
  now: number
) {
  const source = session.source;
  const date = dayKey(now);
  // A playlist/video lesson is "watched" after a real minute of playback.
  if (!source || (source.kind !== "playlist" && source.kind !== "video")) return;
  const key = `lesson-watched:${date}:${session.videoId ?? source.videoId ?? source.id}`;
  if (recordEvent(draft, {
    id: `watch-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type: "lesson-watched",
    at: now,
    title: source.lessonTitle?.trim() || source.title,
    href: source.href,
    key,
  })) {
    const day = draft.days[date] ?? createEmptyDay();
    day.lessonsCompleted += 1;
    draft.days[date] = day;
  }
}

/* -------------------------------------------------------------------------- */
/* event entry points used by the course player                               */
/* -------------------------------------------------------------------------- */

export function trackLessonCompleted(input: {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle?: string;
  href: string;
}): void {
  if (typeof window === "undefined") return;
  updateAnalytics(
    (draft) => recordLessonCompleted(draft, input, Date.now()),
    { persist: true }
  );
}

export function trackCourseCompleted(input: {
  courseId: string;
  courseTitle: string;
  href: string;
}): void {
  if (typeof window === "undefined") return;
  updateAnalytics(
    (draft) => recordCourseCompleted(draft, input, Date.now()),
    { persist: true }
  );
}

/** Save the learner's personal targets (null clears one). */
export function saveLearningGoals(goals: LearningGoals): void {
  if (typeof window === "undefined") return;
  setLearningGoals(goals);
}

/** Flush pending analytics to localStorage (used on pagehide via the store). */
export function flushActivity(): void {
  flushAnalytics();
}

/** Test helper: stop all registered sessions without touching stored data. */
export function stopAllActivity(): void {
  for (const stop of [...stopHandlers.values()]) stop();
  stopHandlers.clear();
}
