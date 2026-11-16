import {
  STUDY_DAY_THRESHOLD_SECONDS,
  type Achievement,
  type AnalyticsData,
  type CourseProgressItem,
  type DayActivity,
  type GoalProgress,
  type LearningGoals,
  type LearningInsight,
  type PeriodComparison,
  type PeriodSummary,
  type TrendPeriodDays,
} from "../types/analytics.types";
import {
  addDays,
  addDaysKey,
  dayKey,
  dayKeysBetween,
  formatDayLabel,
  formatDuration,
  lastDayKeys,
  monthKeys,
  startOfWeek,
  weekKeys,
} from "./analytics-date";
import { createEmptyDay } from "./analytics-store";

export function dayTotalSeconds(day: DayActivity | undefined): number {
  if (!day) return 0;
  return (
    day.videoSeconds + day.studioSeconds + day.noteSeconds + day.reviewSeconds
  );
}

export function rangeTotalSeconds(
  data: AnalyticsData,
  keys: string[]
): number {
  return keys.reduce((total, key) => total + dayTotalSeconds(data.days[key]), 0);
}

export function summarizeRange(
  data: AnalyticsData,
  keys: string[]
): PeriodSummary {
  const summary: PeriodSummary = {
    seconds: 0,
    videoSeconds: 0,
    studioSeconds: 0,
    noteSeconds: 0,
    reviewSeconds: 0,
    lessonsCompleted: 0,
    coursesCompleted: 0,
    activeDays: 0,
    sessions: 0,
    mostProductiveDay: null,
    mostProductiveSeconds: 0,
  };

  for (const key of keys) {
    const day = data.days[key];
    if (!day) continue;
    const total = dayTotalSeconds(day);
    summary.seconds += total;
    summary.videoSeconds += day.videoSeconds;
    summary.studioSeconds += day.studioSeconds;
    summary.noteSeconds += day.noteSeconds;
    summary.reviewSeconds += day.reviewSeconds;
    summary.lessonsCompleted += day.lessonsCompleted;
    summary.coursesCompleted += day.coursesCompleted;
    summary.sessions += day.sessions + day.studioSessions;
    if (total > 0) summary.activeDays += 1;
    if (total > summary.mostProductiveSeconds) {
      summary.mostProductiveSeconds = total;
      summary.mostProductiveDay = key;
    }
  }

  return summary;
}

/** The equivalent window immediately before `keys`. */
export function previousPeriodKeys(keys: string[]): string[] {
  if (keys.length === 0) return [];
  const start = addDaysKey(keys[0], -keys.length);
  const end = addDaysKey(keys[0], -1);
  return dayKeysBetween(start, end);
}

export function comparePeriods(
  data: AnalyticsData,
  days: number,
  now: Date | number = new Date()
): PeriodComparison {
  const currentKeys = lastDayKeys(days, now);
  const previousKeys = previousPeriodKeys(currentKeys);
  const current = summarizeRange(data, currentKeys);
  const previous = summarizeRange(data, previousKeys);
  return {
    current,
    previous,
    secondsChangePercent:
      previous.seconds > 0
        ? Math.round(((current.seconds - previous.seconds) / previous.seconds) * 100)
        : null,
    lessonsDelta: current.lessonsCompleted - previous.lessonsCompleted,
  };
}

export function totalLearningSeconds(data: AnalyticsData): number {
  return Object.values(data.days).reduce(
    (total, day) => total + dayTotalSeconds(day),
    0
  );
}

export function activeDayCount(data: AnalyticsData): number {
  return Object.values(data.days).filter((day) => dayTotalSeconds(day) > 0).length;
}

export function isStudyDay(day: DayActivity | undefined): boolean {
  return dayTotalSeconds(day) >= STUDY_DAY_THRESHOLD_SECONDS;
}

/** Consecutive qualifying days ending today (today may still be in progress). */
export function currentStreak(
  data: AnalyticsData,
  now: Date | number = new Date()
): number {
  let cursor = new Date(typeof now === "number" ? now : now);
  if (!isStudyDay(data.days[dayKey(cursor)])) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  // A year is plenty; the guard keeps corrupt clocks from looping.
  while (streak < 4000 && isStudyDay(data.days[dayKey(cursor)])) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(data: AnalyticsData): number {
  const keys = Object.keys(data.days)
    .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of keys) {
    if (!isStudyDay(data.days[key])) {
      run = 0;
      previous = key;
      continue;
    }
    if (previous && addDaysKey(previous, 1) === key) run += 1;
    else run = 1;
    best = Math.max(best, run);
    previous = key;
  }
  return best;
}

/** Completed lessons across every saved course and playlist. */
export function totalCompletedLessons(items: CourseProgressItem[]): number {
  return items.reduce(
    (total, item) => total + Math.min(item.completed, item.total),
    0
  );
}

export function totalCompletedCourses(items: CourseProgressItem[]): number {
  return items.filter(
    (item) => item.status === "completed" && item.total > 0
  ).length;
}

export function courseCompletionRate(items: CourseProgressItem[]): number {
  const lessons = items.reduce((total, item) => total + item.total, 0);
  const completed = totalCompletedLessons(items);
  return lessons === 0 ? 0 : Math.round((completed / lessons) * 100);
}

export interface OverviewStats {
  totalSeconds: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  coursesStarted: number;
  averageDailySeconds: number;
  activeDays: number;
  completionRate: number;
  streak: number;
  longestStreak: number;
  videosWatched: number;
}

export function overviewStats(
  data: AnalyticsData,
  items: CourseProgressItem[],
  now: Date | number = new Date()
): OverviewStats {
  const activeDays = activeDayCount(data);
  const totalSeconds = totalLearningSeconds(data);
  return {
    totalSeconds,
    lessonsCompleted: totalCompletedLessons(items),
    coursesCompleted: totalCompletedCourses(items),
    coursesStarted: items.filter((item) => item.completed > 0).length,
    averageDailySeconds: activeDays === 0 ? 0 : totalSeconds / activeDays,
    activeDays,
    completionRate: courseCompletionRate(items),
    streak: currentStreak(data, now),
    longestStreak: longestStreak(data),
    videosWatched: items
      .filter((item) => item.kind === "playlist")
      .reduce((total, item) => total + item.completed, 0),
  };
}

/* -------------------------------------------------------------------------- */
/* charts                                                                     */
/* -------------------------------------------------------------------------- */

export type TrendPeriod = TrendPeriodDays;

export interface TrendBar {
  id: string;
  label: string;
  seconds: number;
}

/**
 * Chart-ready buckets for a period. Short ranges stay daily; long ranges roll
 * up by week/month so bars remain readable on a phone.
 */
export function trendBars(
  data: AnalyticsData,
  days: TrendPeriod,
  now: Date | number = new Date()
): TrendBar[] {
  const keys = lastDayKeys(days, now);
  const bars: TrendBar[] = [];

  if (days <= 30) {
    for (const key of keys) {
      bars.push({
        id: key,
        label: formatDayLabel(key),
        seconds: dayTotalSeconds(data.days[key]),
      });
    }
    return bars;
  }

  if (days === 90) {
    for (let i = 0; i < keys.length; i += 7) {
      const chunk = keys.slice(i, i + 7);
      if (chunk.length === 0) continue;
      bars.push({
        id: chunk[0],
        label: formatDayLabel(chunk[0]),
        seconds: chunk.reduce(
          (total, key) => total + dayTotalSeconds(data.days[key]),
          0
        ),
      });
    }
    return bars;
  }

  // 6 and 12 months: one bar per month.
  const months = new Map<string, { id: string; label: string; seconds: number }>();
  for (const key of keys) {
    const month = key.slice(0, 7);
    const existing = months.get(month);
    const seconds = dayTotalSeconds(data.days[key]);
    if (existing) {
      existing.seconds += seconds;
    } else {
      months.set(month, {
        id: key,
        label: formatDayLabel(key, { month: "short" }),
        seconds,
      });
    }
  }
  return [...months.values()];
}

/* -------------------------------------------------------------------------- */
/* goals                                                                      */
/* -------------------------------------------------------------------------- */

export function periodTotals(
  data: AnalyticsData,
  now: Date | number = new Date()
): { today: number; week: number; month: number; weekStudio: number; weekLessons: number; monthCourses: number } {
  const today = summarizeRange(data, [dayKey(now)]);
  const week = summarizeRange(data, weekKeys(now));
  const month = summarizeRange(data, monthKeys(now));
  return {
    today: today.seconds,
    week: week.seconds,
    month: month.seconds,
    weekStudio: week.studioSeconds,
    weekLessons: week.lessonsCompleted,
    monthCourses: month.coursesCompleted,
  };
}

/**
 * Local week goals run Monday through today. Canceled/zero targets are simply
 * not listed, keeping gamification optional.
 */
export function goalProgress(
  goals: LearningGoals,
  data: AnalyticsData,
  now: Date | number = new Date()
): GoalProgress[] {
  const totals = periodTotals(data, now);
  const out: GoalProgress[] = [];
  const add = (
    key: keyof LearningGoals,
    label: string,
    unit: GoalProgress["unit"],
    target: number | null,
    current: number
  ) => {
    if (!target || target <= 0) return;
    const percent = Math.min(100, Math.round((current / target) * 100));
    out.push({
      key,
      label,
      unit,
      target,
      current,
      percent,
      remaining: Math.max(0, target - current),
    });
  };

  add(
    "dailyMinutes",
    "Daily learning",
    "minutes",
    goals.dailyMinutes,
    totals.today / 60
  );
  add(
    "weeklyMinutes",
    "Weekly learning",
    "minutes",
    goals.weeklyMinutes,
    totals.week / 60
  );
  add(
    "weeklyLessons",
    "Weekly lessons",
    "lessons",
    goals.weeklyLessons,
    totals.weekLessons
  );
  add(
    "monthlyCourses",
    "Monthly courses",
    "courses",
    goals.monthlyCourses,
    totals.monthCourses
  );
  add(
    "weeklyStudioMinutes",
    "Weekly Studio practice",
    "minutes",
    goals.weeklyStudioMinutes,
    totals.weekStudio / 60
  );
  return out;
}

export function goalValueLabel(goal: GoalProgress): string {
  const current =
    goal.unit === "minutes"
      ? formatDuration(Math.round(goal.current * 60))
      : `${Math.floor(goal.current)}`;
  const target =
    goal.unit === "minutes"
      ? formatDuration(Math.round(goal.target * 60))
      : `${goal.target}`;
  return `${current} / ${target}`;
}

/* -------------------------------------------------------------------------- */
/* achievements                                                               */
/* -------------------------------------------------------------------------- */

export function achievements(input: {
  totalSeconds: number;
  completedLessons: number;
  completedCourses: number;
  longestStreak: number;
  studioProjects: number;
}): Achievement[] {
  return [
    {
      id: "first-lesson",
      label: "First lesson",
      description: "Finish your first lesson.",
      icon: "lesson",
      unlocked: input.completedLessons >= 1,
    },
    {
      id: "first-course",
      label: "First course",
      description: "Complete a full course.",
      icon: "course",
      unlocked: input.completedCourses >= 1,
    },
    {
      id: "ten-hours",
      label: "10 hours",
      description: "Track 10 hours of active learning.",
      icon: "hours",
      unlocked: input.totalSeconds >= 10 * 3600,
    },
    {
      id: "fifty-lessons",
      label: "50 lessons",
      description: "Complete 50 lessons.",
      icon: "lessons",
      unlocked: input.completedLessons >= 50,
    },
    {
      id: "seven-day-streak",
      label: "7-day streak",
      description: "Learn for 7 days in a row.",
      icon: "streak",
      unlocked: input.longestStreak >= 7,
    },
    {
      id: "first-studio-project",
      label: "First project",
      description: "Create a project in Focusy Studio.",
      icon: "studio",
      unlocked: input.studioProjects >= 1,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* insights                                                                   */
/* -------------------------------------------------------------------------- */

function hourBand(hour: number): string {
  if (hour < 6) return "late night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/**
 * Rule-based observations. Every rule checks that the history it compares
 * actually exists, so a first-week learner never sees a fake trend.
 */
export function learningInsights(
  data: AnalyticsData,
  items: CourseProgressItem[],
  goals: LearningGoals,
  now: Date | number = new Date()
): LearningInsight[] {
  const insights: LearningInsight[] = [];
  const week = lastDayKeys(7, now);
  const previousWeek = previousPeriodKeys(week);
  const current = summarizeRange(data, week);
  const previous = summarizeRange(data, previousWeek);

  if (previous.seconds >= 60 && current.seconds > 0) {
    const change = Math.round(
      ((current.seconds - previous.seconds) / previous.seconds) * 100
    );
    if (change >= 10) {
      insights.push({
        id: "time-up",
        tone: "positive",
        title: "Learning time is up",
        text: `You learned ${change}% more this week than last week (${formatDuration(current.seconds)} vs ${formatDuration(previous.seconds)}).`,
      });
    } else if (change <= -10) {
      insights.push({
        id: "time-down",
        tone: "nudge",
        title: "A lighter week",
        text: `You learned ${Math.abs(change)}% less this week than last week. Even one short lesson keeps the habit going.`,
      });
    }
  }

  if (previous.lessonsCompleted > 0 && current.lessonsCompleted > previous.lessonsCompleted) {
    insights.push({
      id: "lessons-up",
      tone: "positive",
      title: "More lessons finished",
      text: `${current.lessonsCompleted} lessons completed this week, up from ${previous.lessonsCompleted} last week.`,
    });
  }

  const totalHours = data.hourSeconds.reduce((total, seconds) => total + seconds, 0);
  if (totalHours >= 3600) {
    let bestHour = 0;
    data.hourSeconds.forEach((seconds, hour) => {
      if (seconds > data.hourSeconds[bestHour]) bestHour = hour;
    });
    insights.push({
      id: "best-hour",
      tone: "neutral",
      title: "Your most active time",
      text: `Most of your learning happens in the ${hourBand(bestHour)} (around ${bestHour}:00).`,
    });
  }

  if (goals.weeklyMinutes) {
    const progress = Math.min(
      100,
      Math.round((current.seconds / 60 / goals.weeklyMinutes) * 100)
    );
    insights.push({
      id: "weekly-goal",
      tone: progress >= 100 ? "positive" : "neutral",
      title: progress >= 100 ? "Weekly goal reached" : "Weekly goal progress",
      text:
        progress >= 100
          ? `You hit your ${formatDuration(goals.weeklyMinutes * 60)} weekly target.`
          : `${progress}% of your weekly target — ${formatDuration(
              Math.max(0, goals.weeklyMinutes * 60 - current.seconds)
            )} to go.`,
    });
  }

  const nearlyDone = items
    .filter(
      (item) =>
        item.status === "in-progress" &&
        item.total > 0 &&
        item.total - item.completed > 0 &&
        item.total - item.completed <= 3
    )
    .slice(0, 2);
  for (const item of nearlyDone) {
    const left = item.total - item.completed;
    insights.push({
      id: `almost-${item.kind}-${item.id}`,
      tone: "nudge",
      title: "Almost finished",
      text: `${item.title} has ${left} lesson${left === 1 ? "" : "s"} left (${item.percent}% complete).`,
    });
  }

  if (previous.activeDays >= 2 && current.activeDays > 0) {
    if (current.activeDays > previous.activeDays) {
      insights.push({
        id: "consistency-up",
        tone: "positive",
        title: "More consistent",
        text: `${current.activeDays} active days this week, up from ${previous.activeDays} last week.`,
      });
    } else if (current.activeDays < previous.activeDays) {
      insights.push({
        id: "consistency-down",
        tone: "neutral",
        title: "Consistency dipped",
        text: `${current.activeDays} active days so far this week, compared with ${previous.activeDays} last week.`,
      });
    }
  }

  return insights.slice(0, 5);
}

/* -------------------------------------------------------------------------- */
/* calendar                                                                   */
/* -------------------------------------------------------------------------- */

export interface CalendarCell {
  key: string;
  date: Date;
  day: DayActivity | undefined;
  seconds: number;
  level: 0 | 1 | 2 | 3 | 4;
}

function intensityLevel(seconds: number): CalendarCell["level"] {
  if (seconds <= 0) return 0;
  if (seconds < 15 * 60) return 1;
  if (seconds < 45 * 60) return 2;
  if (seconds < 90 * 60) return 3;
  return 4;
}

export interface CalendarWeek {
  /** Month label shown above the column when a new month begins. */
  monthLabel: string | null;
  cells: CalendarCell[];
}

/**
 * GitHub-style columns of 7 days, Sunday-first, covering the trailing year.
 * The first and last weeks are padded so every column has seven cells.
 */
export function calendarWeeks(
  data: AnalyticsData,
  now: Date | number = new Date()
): CalendarWeek[] {
  const today = new Date(typeof now === "number" ? now : now);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = addDays(end, -364);
  // Pad back to Sunday.
  const paddedStart = addDays(start, -start.getDay());

  const weeks: CalendarWeek[] = [];
  let cursor = paddedStart;
  let previousMonth = -1;

  for (let weekIndex = 0; weekIndex < 53; weekIndex += 1) {
    const cells: CalendarCell[] = [];
    let monthLabel: string | null = null;
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      const key = dayKey(cursor);
      const day = data.days[key];
      const seconds = dayTotalSeconds(day);
      const inRange = cursor.getTime() >= start.getTime() && cursor.getTime() <= end.getTime();
      cells.push({
        key,
        date: new Date(cursor),
        day,
        seconds: inRange ? seconds : 0,
        level: inRange ? intensityLevel(seconds) : 0,
      });
      if (inRange && cursor.getMonth() !== previousMonth) {
        // Label the month on the first column that has room for it; a month
        // that begins late in a week simply gets no label rather than two.
        if (dayOfWeek < 4) {
          monthLabel = cursor.toLocaleDateString(undefined, { month: "short" });
        }
        previousMonth = cursor.getMonth();
      }
      cursor = addDays(cursor, 1);
    }
    weeks.push({ monthLabel, cells });
  }
  return weeks;
}

/* -------------------------------------------------------------------------- */
/* overview helpers used by the view                                          */
/* -------------------------------------------------------------------------- */

export function todaySummary(
  data: AnalyticsData,
  now: Date | number = new Date()
): PeriodSummary {
  return summarizeRange(data, [dayKey(now)]);
}

export function startOfCurrentWeek(now: Date | number = new Date()): Date {
  return startOfWeek(typeof now === "number" ? new Date(now) : now);
}

export function emptyDay(): DayActivity {
  return createEmptyDay();
}
