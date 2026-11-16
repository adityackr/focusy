/**
 * Local-first learning analytics.
 *
 * Everything here is derived from activity this browser actually observed or
 * from the progress data Focusy already keeps. There is no backend, no remote
 * analytics and no account.
 */

export const ANALYTICS_SCHEMA_VERSION = 1;

/** Time categories shown in the activity breakdown. */
export type ActivityKind = "video" | "studio" | "notes" | "reviewing";

/** A learning resource an activity belongs to. */
export interface AnalyticsSource {
  kind: "course" | "playlist" | "video";
  /** Course id, playlist id, or video id for standalone videos. */
  id: string;
  title: string;
  /** Where "continue"/timeline links should point. */
  href: string;
  videoId?: string;
  lessonTitle?: string;
}

/** How much learning happened on one local calendar day. */
export interface DayActivity {
  videoSeconds: number;
  studioSeconds: number;
  noteSeconds: number;
  reviewSeconds: number;
  /** Lessons completed (course chapters) or watched at least a minute (playlists). */
  lessonsCompleted: number;
  coursesCompleted: number;
  /** Seconds attributed to each staying resource (`course:<id>` / `playlist:<id>`). */
  sources: Record<string, number>;
  /** Playback sessions that lasted at least a minute. */
  sessions: number;
  /** Studio practice sessions that lasted at least a minute. */
  studioSessions: number;
}

export type AnalyticsEventType =
  | "lesson-watched"
  | "lesson-completed"
  | "course-completed"
  | "studio-practice";

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  /** Epoch milliseconds. */
  at: number;
  title: string;
  href?: string;
  /** For duplicate prevention (`lesson-watched:<day>:<videoId>`). */
  key?: string;
}

export interface LearningGoals {
  /** Active-learning minutes per day. Null = not set. */
  dailyMinutes: number | null;
  weeklyMinutes: number | null;
  weeklyLessons: number | null;
  monthlyCourses: number | null;
  weeklyStudioMinutes: number | null;
}

export interface AnalyticsData {
  version: typeof ANALYTICS_SCHEMA_VERSION;
  /** Local `YYYY-MM-DD` → that day's activity. */
  days: Record<string, DayActivity>;
  /** Newest first, capped. */
  events: AnalyticsEvent[];
  goals: LearningGoals;
  /** Seconds per hour of day (0–23), all time. */
  hourSeconds: number[];
  /** Courses whose completion was already recorded (dedupe + achievement dates). */
  completedCourses: Record<string, number>;
  lastUpdated: number;
}

/** A day counts toward a streak at this much active learning (5 minutes). */
export const STUDY_DAY_THRESHOLD_SECONDS = 5 * 60;

/** Minimum length before a playback/practice session is counted as a session. */
export const SESSION_THRESHOLD_SECONDS = 60;

/** Idle presence (sheet open but untouched) stops counting after this long. */
export const PRESENCE_IDLE_TIMEOUT_MS = 2 * 60 * 1000;

/** Kept small so localStorage stays light; the daily aggregate is the source of truth. */
export const MAX_STORED_EVENTS = 400;

export type TrendPeriodDays = 7 | 30 | 90 | 180 | 365;

export interface PeriodSummary {
  seconds: number;
  videoSeconds: number;
  studioSeconds: number;
  noteSeconds: number;
  reviewSeconds: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  activeDays: number;
  sessions: number;
  /** Local day key with the most activity, or null when the range is empty. */
  mostProductiveDay: string | null;
  mostProductiveSeconds: number;
}

export interface PeriodComparison {
  current: PeriodSummary;
  previous: PeriodSummary;
  /** Percent change in total learning time; null when the previous period had none. */
  secondsChangePercent: number | null;
  lessonsDelta: number;
}

export interface CourseProgressItem {
  kind: "course" | "playlist";
  id: string;
  title: string;
  thumbnail: string;
  channelTitle?: string;
  total: number;
  completed: number;
  percent: number;
  status: "not-started" | "in-progress" | "completed";
  href: string;
  /** Seconds of tracked learning attributed to this resource. */
  learningSeconds: number;
  /** Position in the library's recent list (0 = most recent), or null. */
  recentIndex: number | null;
}

export interface GoalProgress {
  key: keyof LearningGoals;
  label: string;
  unit: "minutes" | "lessons" | "courses";
  target: number;
  current: number;
  percent: number;
  remaining: number;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon:
    | "lesson"
    | "course"
    | "hours"
    | "lessons"
    | "streak"
    | "studio";
  unlocked: boolean;
}

export interface LearningInsight {
  id: string;
  tone: "positive" | "neutral" | "nudge";
  title: string;
  text: string;
}

export interface AnalyticsBackupData {
  version: typeof ANALYTICS_SCHEMA_VERSION;
  days: Record<string, DayActivity>;
  events: AnalyticsEvent[];
  goals: LearningGoals;
  hourSeconds: number[];
  completedCourses: Record<string, number>;
}
