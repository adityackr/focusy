import { beforeEach, describe, expect, test } from "bun:test";
import type { Course, Playlist } from "@/shared/lib/types";
import {
  ANALYTICS_STORAGE_KEY,
  createEmptyAnalytics,
  flushAnalytics,
  getAnalyticsSnapshot,
  mergeAnalyticsData,
  normalizeAnalytics,
  recordActiveSeconds,
  recordCourseCompleted,
  recordEvent,
  recordLessonCompleted,
  replaceAnalytics,
} from "./analytics-store";
import {
  calendarWeeks,
  comparePeriods,
  currentStreak,
  goalProgress,
  learningInsights,
  longestStreak,
  overviewStats,
  summarizeRange,
  totalLearningSeconds,
  trendBars,
} from "./analytics-selectors";
import {
  dayKey,
  lastDayKeys,
  weekKeys,
} from "./analytics-date";
import { buildProgressItems, continueLearning } from "./progress-snapshot";
import { restoreAnalyticsBackup } from "./analytics-backup";

const NOW = new Date(2026, 10, 16, 12); // Nov 16 2026, local noon

function dayAt(offset: number): Date {
  return new Date(2026, 10, 16 + offset, 12);
}

function minutes(data: ReturnType<typeof createEmptyAnalytics>, offset: number, n: number) {
  recordActiveSeconds(data, "video", n * 60, dayAt(offset).getTime());
}

function makeCourse(id: string): Course {
  return {
    id,
    videoId: "abcdefghijk",
    title: `Course ${id}`,
    thumbnail: "",
    description: "",
    durationSeconds: null,
    chapters: [
      { id: `${id}-1`, title: "One", startSeconds: 0, endSeconds: 60 },
      { id: `${id}-2`, title: "Two", startSeconds: 60, endSeconds: null },
    ],
    createdAt: 1,
  };
}

function makePlaylist(id: string): Playlist {
  return {
    playlistId: id,
    playlistTitle: `Playlist ${id}`,
    playlistDescription: "",
    playlistThumbnail: { url: "", width: 320, height: 180 },
    channelId: "",
    channelTitle: "",
    itemCount: 2,
    videos: [0, 1].map((position) => ({
      videoId: `${id}-v${position}`,
      title: `Lesson ${position}`,
      description: "",
      thumbnail: { url: "", width: 320, height: 180 },
      position,
    })),
    addedAt: "2026-01-01",
  };
}

beforeEach(() => {
  localStorage.clear();
  replaceAnalytics(createEmptyAnalytics());
});

describe("analytics date helpers", () => {
  test("uses local day keys and trailing ranges", () => {
    expect(dayKey(new Date(2026, 10, 16, 23, 30))).toBe("2026-11-16");
    expect(lastDayKeys(7, NOW)).toHaveLength(7);
    expect(lastDayKeys(7, NOW).at(-1)).toBe("2026-11-16");
    expect(weekKeys(NOW)).toHaveLength(7);
  });
});

describe("activity aggregation", () => {
  test("adds seconds to the right day, kind and source", () => {
    const data = createEmptyAnalytics();
    recordActiveSeconds(data, "video", 120, NOW.getTime(), {
      kind: "course",
      id: "c1",
      title: "Course",
      href: "/watch/c1",
    });
    recordActiveSeconds(data, "studio", 60, NOW.getTime());
    const day = data.days["2026-11-16"];
    expect(day.videoSeconds).toBe(120);
    expect(day.studioSeconds).toBe(60);
    expect(day.sources["course:c1"]).toBe(120);
    expect(data.hourSeconds[NOW.getHours()]).toBe(180);
  });

  test("summarizes ranges and skips empty days", () => {
    const data = createEmptyAnalytics();
    minutes(data, -1, 10);
    minutes(data, 0, 5);
    const summary = summarizeRange(data, lastDayKeys(7, NOW));
    expect(summary.seconds).toBe(15 * 60);
    expect(summary.videoSeconds).toBe(15 * 60);
    expect(summary.activeDays).toBe(2);
    expect(summary.mostProductiveDay).toBe("2026-11-15");
    expect(totalLearningSeconds(data)).toBe(15 * 60);
  });

  test("compares the current period with the one before it", () => {
    const data = createEmptyAnalytics();
    minutes(data, -8, 10); // previous 7-day window
    minutes(data, -1, 20); // current window
    const comparison = comparePeriods(data, 7, NOW);
    expect(comparison.previous.seconds).toBe(10 * 60);
    expect(comparison.current.seconds).toBe(20 * 60);
    expect(comparison.secondsChangePercent).toBe(100);
  });

  test("has no percentage change when there is no earlier history", () => {
    const data = createEmptyAnalytics();
    minutes(data, -1, 10);
    expect(comparePeriods(data, 7, NOW).secondsChangePercent).toBeNull();
  });
});

describe("streaks", () => {
  test("counts consecutive qualifying days ending today", () => {
    const data = createEmptyAnalytics();
    minutes(data, -2, 5);
    minutes(data, -1, 5);
    minutes(data, 0, 5);
    expect(currentStreak(data, NOW)).toBe(3);
    expect(longestStreak(data)).toBe(3);
  });

  test("keeps yesterday's streak alive until today is over", () => {
    const data = createEmptyAnalytics();
    minutes(data, -2, 5);
    minutes(data, -1, 5);
    expect(currentStreak(data, NOW)).toBe(2);
  });

  test("days under five minutes do not qualify", () => {
    const data = createEmptyAnalytics();
    minutes(data, -1, 4);
    minutes(data, 0, 4);
    expect(currentStreak(data, NOW)).toBe(0);
  });

  test("a gap breaks the longest streak", () => {
    const data = createEmptyAnalytics();
    minutes(data, -5, 5);
    minutes(data, -4, 5);
    minutes(data, -1, 5);
    minutes(data, 0, 5);
    expect(longestStreak(data)).toBe(2);
  });
});

describe("event tracking and duplicate prevention", () => {
  test("records a lesson completion once per lesson per day", () => {
    const data = createEmptyAnalytics();
    const input = {
      courseId: "c1",
      courseTitle: "Course",
      lessonId: "c1-1",
      lessonTitle: "One",
      href: "/watch/c1",
    };
    recordLessonCompleted(data, input, NOW.getTime());
    recordLessonCompleted(data, input, NOW.getTime());
    expect(data.days["2026-11-16"].lessonsCompleted).toBe(1);
    expect(data.events).toHaveLength(1);
  });

  test("dedupes keyed events and caps stored history", () => {
    const data = createEmptyAnalytics();
    const event = {
      id: "e1",
      type: "lesson-watched" as const,
      at: NOW.getTime(),
      title: "One",
      key: "lesson-watched:2026-11-16:v1",
    };
    expect(recordEvent(data, event)).toBe(true);
    expect(recordEvent(data, { ...event, id: "e2" })).toBe(false);
    expect(data.events).toHaveLength(1);
  });

  test("records a course completion only once across sessions", () => {
    const data = createEmptyAnalytics();
    expect(
      recordCourseCompleted(
        data,
        { courseId: "c1", courseTitle: "Course", href: "/watch/c1" },
        NOW.getTime()
      )
    ).toBe(true);
    expect(
      recordCourseCompleted(
        data,
        { courseId: "c1", courseTitle: "Course", href: "/watch/c1" },
        NOW.getTime() + 10_000
      )
    ).toBe(false);
    expect(data.completedCourses.c1).toBe(NOW.getTime());
    expect(data.days["2026-11-16"].coursesCompleted).toBe(1);
  });
});

describe("persistence", () => {
  test("round-trips through localStorage", () => {
    const data = getAnalyticsSnapshot();
    recordActiveSeconds(data, "notes", 90, NOW.getTime());
    flushAnalytics();
    const raw = JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY)!);
    expect(raw.days["2026-11-16"].noteSeconds).toBe(90);
    replaceAnalytics(raw);
    expect(getAnalyticsSnapshot().days["2026-11-16"].noteSeconds).toBe(90);
  });

  test("corrupted or outdated data falls back safely", () => {
    const normalized = normalizeAnalytics({ version: 99, days: "nope" });
    expect(normalized.days).toEqual({});
    expect(normalized.hourSeconds).toHaveLength(24);
    expect(normalizeAnalytics(null).events).toEqual([]);
    localStorage.setItem(ANALYTICS_STORAGE_KEY, "{");
    expect(() => replaceAnalytics(null)).not.toThrow();
  });

  test("merges analytics without dropping local history", () => {
    const local = createEmptyAnalytics();
    recordActiveSeconds(local, "video", 300, NOW.getTime());
    local.goals.dailyMinutes = 30;
    const incoming = createEmptyAnalytics();
    recordActiveSeconds(incoming, "studio", 120, NOW.getTime());
    incoming.goals.dailyMinutes = 5;

    const merged = mergeAnalyticsData(local, incoming);
    expect(merged.days["2026-11-16"].videoSeconds).toBe(300);
    expect(merged.days["2026-11-16"].studioSeconds).toBe(120);
    expect(merged.goals.dailyMinutes).toBe(30);
  });
});

describe("backup restore", () => {
  test("replaces and merges learning history", () => {
    const incoming = createEmptyAnalytics();
    minutes(incoming, -3, 7);

    expect(restoreAnalyticsBackup(incoming, "replace").ok).toBe(true);
    expect(getAnalyticsSnapshot().days["2026-11-13"].videoSeconds).toBe(420);

    const extra = createEmptyAnalytics();
    minutes(extra, -3, 3);
    expect(restoreAnalyticsBackup(extra, "merge").ok).toBe(true);
    expect(getAnalyticsSnapshot().days["2026-11-13"].videoSeconds).toBe(600);
  });

  test("rejects unreadable sections without touching data", () => {
    const before = getAnalyticsSnapshot();
    const result = restoreAnalyticsBackup("not a section", "replace");
    expect(result.ok).toBe(false);
    expect(getAnalyticsSnapshot()).toBe(before);
  });
});

describe("charts, goals and insights", () => {
  test("produces daily and rolled-up trend bars", () => {
    const data = createEmptyAnalytics();
    minutes(data, -1, 10);
    expect(trendBars(data, 7, NOW)).toHaveLength(7);
    expect(trendBars(data, 30, NOW)).toHaveLength(30);
    // A trailing year spans 13 partial calendar months, newest last.
    expect(trendBars(data, 365, NOW).length).toBeGreaterThanOrEqual(12);
    expect(trendBars(data, 365, NOW).length).toBeLessThanOrEqual(13);
    expect(trendBars(data, 7, NOW).at(-2)?.seconds).toBe(600);
  });

  test("builds a 53-week calendar with seven cells per column", () => {
    const weeks = calendarWeeks(createEmptyAnalytics(), NOW);
    expect(weeks).toHaveLength(53);
    expect(weeks.every((week) => week.cells.length === 7)).toBe(true);
    expect(weeks.at(-1)?.cells.some((cell) => cell.key === "2026-11-16")).toBe(true);
  });

  test("reports goal progress and remaining targets", () => {
    const data = createEmptyAnalytics();
    minutes(data, 0, 30);
    const progress = goalProgress(
      { ...createEmptyAnalytics().goals, dailyMinutes: 60 },
      data,
      NOW
    );
    expect(progress).toHaveLength(1);
    expect(progress[0].percent).toBe(50);
    expect(progress[0].remaining).toBe(30);
  });

  test("only generates insights when the history exists", () => {
    const empty = learningInsights(createEmptyAnalytics(), [], createEmptyAnalytics().goals, NOW);
    expect(empty.find((insight) => insight.id === "time-up")).toBeUndefined();

    const data = createEmptyAnalytics();
    minutes(data, -8, 10);
    minutes(data, -1, 20);
    const insights = learningInsights(data, [], createEmptyAnalytics().goals, NOW);
    expect(insights.some((insight) => insight.id === "time-up")).toBe(true);
  });
});

describe("course progress and continue learning", () => {
  test("reads existing progress into course/playlist items", () => {
    localStorage.setItem(
      "yt-course:progress:c1",
      JSON.stringify({
        completedIds: ["c1-1"],
        lastChapterId: "c1-1",
        positions: { "c1-1": 20 },
        updatedAt: 1,
      })
    );
    localStorage.setItem(
      "focustube:progress:p1",
      JSON.stringify({
        watched: ["p1-v0"],
        lastWatched: "p1-v0",
        completedChapters: [],
        positions: {},
      })
    );

    const data = createEmptyAnalytics();
    recordActiveSeconds(data, "video", 60, NOW.getTime(), {
      kind: "course",
      id: "c1",
      title: "Course c1",
      href: "/watch/c1",
    });

    const items = buildProgressItems({
      playlists: [makePlaylist("p1")],
      courses: [makeCourse("c1")],
      recent: ["p1"],
      courseRecent: ["c1"],
      data,
    });

    const course = items.find((item) => item.kind === "course")!;
    expect(course.completed).toBe(1);
    expect(course.percent).toBe(50);
    expect(course.status).toBe("in-progress");
    expect(course.learningSeconds).toBe(60);

    const playlist = items.find((item) => item.kind === "playlist")!;
    expect(playlist.completed).toBe(1);
    expect(playlist.percent).toBe(50);
  });

  test("marks fully completed courses and computes overview stats", () => {
    localStorage.setItem(
      "yt-course:progress:c1",
      JSON.stringify({
        completedIds: ["c1-1", "c1-2"],
        lastChapterId: "c1-2",
        positions: {},
        updatedAt: 1,
      })
    );
    const data = createEmptyAnalytics();
    minutes(data, 0, 25);
    const items = buildProgressItems({
      playlists: [],
      courses: [makeCourse("c1")],
      recent: [],
      courseRecent: [],
      data,
    });
    expect(items[0].status).toBe("completed");
    const stats = overviewStats(data, items, NOW);
    expect(stats.coursesCompleted).toBe(1);
    expect(stats.lessonsCompleted).toBe(2);
    expect(stats.completionRate).toBe(100);
    expect(stats.streak).toBe(1);
  });

  test("resumes a playlist at its saved position", () => {
    localStorage.setItem(
      "focustube:progress:p1",
      JSON.stringify({
        watched: ["p1-v0"],
        lastWatched: "p1-v1",
        completedChapters: [],
        positions: { "p1-v1": 42 },
      })
    );
    const progress = continueLearning([makePlaylist("p1")], [], ["p1"], []);
    expect(progress.playlist?.videoTitle).toBe("Lesson 1");
    expect(progress.playlist?.positionSeconds).toBe(42);
    expect(progress.playlist?.href).toBe("/watch/p1/p1-v1?t=42");
  });
});
