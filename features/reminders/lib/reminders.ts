import type { ContinueLearning, LearningGoals } from "@/features/analytics";

/**
 * Optional learning reminders. Preferences live in this browser only; the
 * reminder itself is a local browser notification built from data Focusy
 * already has (unfinished lessons and today's study goal).
 *
 * There is no server and no push service, so reminders can only be checked
 * while a Focusy tab is open. At most one reminder is delivered per day.
 */

export const REMINDERS_STORAGE_KEY = "focusy-reminders:v1";
export const DEFAULT_REMINDER_TIME = "18:00";
export const REMINDER_TAG = "focusy-learning-reminder";

export interface ReminderSettings {
  enabled: boolean;
  /** Local time of day, `HH:MM`. */
  time: string;
  /** Nudge about lessons that aren't finished yet. */
  unfinishedLessons: boolean;
  /** Nudge while today's active-learning goal is unmet. */
  studyGoals: boolean;
  /** Local `YYYY-MM-DD` of the last delivered reminder, if any. */
  lastSentOn: string | null;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  time: DEFAULT_REMINDER_TIME,
  unfinishedLessons: true,
  studyGoals: true,
  lastSentOn: null,
};

/* -------------------------------------------------------------------------- */
/* settings validation                                                        */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `HH:MM` in 24-hour local time, or null when unreadable. */
export function normalizeReminderTime(value: unknown): string | null {
  return typeof value === "string" && TIME_PATTERN.test(value) ? value : null;
}

export function normalizeReminderSettings(raw: unknown): ReminderSettings {
  if (!isRecord(raw)) return { ...DEFAULT_REMINDER_SETTINGS };
  const day = typeof raw.lastSentOn === "string" ? raw.lastSentOn : "";
  return {
    enabled: raw.enabled === true,
    time: normalizeReminderTime(raw.time) ?? DEFAULT_REMINDER_TIME,
    unfinishedLessons: raw.unfinishedLessons !== false,
    studyGoals: raw.studyGoals !== false,
    lastSentOn: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null,
  };
}

/* -------------------------------------------------------------------------- */
/* schedule                                                                   */
/* -------------------------------------------------------------------------- */

/** Local calendar day key, `YYYY-MM-DD`. */
export function localDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Whether today's chosen reminder time has passed and nothing was sent yet.
 * Callers still need to build a message: a reminder is only delivered when
 * there is something worth saying.
 */
export function reminderDue(
  settings: ReminderSettings,
  now: Date = new Date(),
): boolean {
  if (!settings.enabled) return false;
  if (!settings.unfinishedLessons && !settings.studyGoals) return false;
  if (settings.lastSentOn === localDayKey(now)) return false;
  return now.getHours() * 60 + now.getMinutes() >= minutesOfDay(settings.time);
}

/* -------------------------------------------------------------------------- */
/* message                                                                    */
/* -------------------------------------------------------------------------- */

export interface ReminderMessage {
  title: string;
  body: string;
  /** Deep link opened when the notification is clicked. */
  href: string;
  tag: string;
}

export interface ReminderContext {
  settings: ReminderSettings;
  unfinished: ContinueLearning;
  /** Active-learning seconds recorded today. */
  todaySeconds: number;
  goals: LearningGoals;
}

interface WaitingLesson {
  title: string;
  remaining: number;
  href: string;
}

function waitingLessons(unfinished: ContinueLearning): WaitingLesson[] {
  const out: WaitingLesson[] = [];
  if (unfinished.playlist) {
    const { playlist, completed, total, href } = unfinished.playlist;
    out.push({
      title: playlist.playlistTitle,
      remaining: Math.max(0, total - completed),
      href,
    });
  }
  if (unfinished.course) {
    const { course, completed, total, href } = unfinished.course;
    out.push({
      title: course.title,
      remaining: Math.max(0, total - completed),
      href,
    });
  }
  return out.filter((lesson) => lesson.remaining > 0);
}

function pluralLessons(count: number): string {
  return `${count} lesson${count === 1 ? "" : "s"}`;
}

/**
 * Build the one-line reminder for the current state, or null when there is
 * nothing to nudge about (everything finished and the goal already met).
 */
export function buildReminder(
  context: ReminderContext,
): ReminderMessage | null {
  const { settings, unfinished, todaySeconds, goals } = context;
  const lessons = settings.unfinishedLessons
    ? waitingLessons(unfinished)
    : [];

  const dailyMinutes = goals.dailyMinutes;
  const goalRemainingSeconds =
    settings.studyGoals && dailyMinutes && dailyMinutes > 0
      ? Math.max(0, dailyMinutes * 60 - todaySeconds)
      : 0;
  const goalRemainingMinutes = Math.ceil(goalRemainingSeconds / 60);

  const first = lessons[0];

  if (!first && goalRemainingMinutes === 0) return null;

  if (first && goalRemainingMinutes > 0 && dailyMinutes) {
    return {
      title: `Keep your ${dailyMinutes}-minute goal going`,
      body: `${goalRemainingMinutes} min to go today — continue “${first.title}” and finish ${pluralLessons(first.remaining)}.`,
      href: first.href,
      tag: REMINDER_TAG,
    };
  }

  if (first) {
    if (lessons.length === 1) {
      return {
        title: `Continue “${first.title}”`,
        body: `You have ${pluralLessons(first.remaining)} left. Pick up where you left off.`,
        href: first.href,
        tag: REMINDER_TAG,
      };
    }
    return {
      title: "Two lessons are waiting",
      body: `Continue “${first.title}” (${pluralLessons(first.remaining)} left) or switch back to your course.`,
      href: first.href,
      tag: REMINDER_TAG,
    };
  }

  if (dailyMinutes) {
    return {
      title: "Your daily study goal is waiting",
      body: `${goalRemainingMinutes} min short of today's ${dailyMinutes}-minute goal. A short session still counts.`,
      href: "/analytics",
      tag: REMINDER_TAG,
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* today's progress                                                           */
/* -------------------------------------------------------------------------- */

/** Active-learning seconds recorded on the given local day. */
export function studySecondsToday(
  data: {
    days: Record<
      string,
      {
        videoSeconds: number;
        studioSeconds: number;
        noteSeconds: number;
        reviewSeconds: number;
      }
    >;
  },
  now: Date = new Date(),
): number {
  const day = data.days[localDayKey(now)];
  if (!day) return 0;
  return (
    day.videoSeconds + day.studioSeconds + day.noteSeconds + day.reviewSeconds
  );
}
