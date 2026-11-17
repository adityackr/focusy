import { beforeEach, describe, expect, test } from "bun:test";
import type { ContinueLearning, LearningGoals } from "@/features/analytics";
import type { Playlist } from "@/shared/lib/types";
import {
  buildReminder,
  DEFAULT_REMINDER_SETTINGS,
  localDayKey,
  normalizeReminderSettings,
  normalizeReminderTime,
  reminderDue,
  studySecondsToday,
  type ReminderSettings,
} from "./reminders";
import {
  invalidateReminderSettingsCache,
  markReminderSent,
  readReminderSettings,
  updateReminderSettings,
} from "./reminder-store";

const NOW = new Date(2026, 10, 17, 19, 30); // 17 Nov 2026, 19:30 local

function settings(overrides: Partial<ReminderSettings> = {}): ReminderSettings {
  return {
    ...DEFAULT_REMINDER_SETTINGS,
    enabled: true,
    time: "18:00",
    ...overrides,
  };
}

function unfinished(overrides: Partial<ContinueLearning> = {}): ContinueLearning {
  return {
    playlist: {
      playlist: {
        playlistId: "PL1",
        playlistTitle: "Modern JavaScript",
      } as Playlist,
      videoTitle: "Closures",
      videoId: "vid-1",
      positionSeconds: 42,
      completed: 3,
      total: 8,
      percent: 38,
      href: "/watch/PL1/vid-1?t=42",
    },
    course: null,
    ...overrides,
  };
}

function emptyLearning(): ContinueLearning {
  return { playlist: null, course: null };
}

function goals(dailyMinutes: number | null): LearningGoals {
  return {
    dailyMinutes,
    weeklyMinutes: null,
    weeklyLessons: null,
    monthlyCourses: null,
    weeklyStudioMinutes: null,
  };
}

beforeEach(() => {
  localStorage.clear();
  invalidateReminderSettingsCache();
});

describe("reminder settings", () => {
  test("falls back to safe defaults for unreadable data", () => {
    expect(normalizeReminderSettings(null)).toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(normalizeReminderSettings({ enabled: "yes", time: "25:00" })).toMatchObject({
      enabled: false,
      time: "18:00",
      unfinishedLessons: true,
      studyGoals: true,
      lastSentOn: null,
    });
  });

  test("keeps valid choices and the last-sent day", () => {
    expect(
      normalizeReminderSettings({
        enabled: true,
        time: "07:45",
        unfinishedLessons: false,
        studyGoals: false,
        lastSentOn: "2026-11-17",
      }),
    ).toEqual({
      enabled: true,
      time: "07:45",
      unfinishedLessons: false,
      studyGoals: false,
      lastSentOn: "2026-11-17",
    });
    expect(normalizeReminderTime("9:5")).toBeNull();
  });

  test("persists changes and the delivered day", () => {
    updateReminderSettings({ enabled: true, time: "08:15" });
    expect(readReminderSettings()).toMatchObject({
      enabled: true,
      time: "08:15",
    });
    markReminderSent("2026-11-17");
    expect(readReminderSettings().lastSentOn).toBe("2026-11-17");
  });
});

describe("reminder schedule", () => {
  test("is only due after the chosen time and once a day", () => {
    expect(reminderDue(settings(), NOW)).toBe(true);
    expect(
      reminderDue(settings({ time: "20:00" }), NOW),
      "before the chosen time",
    ).toBe(false);
    expect(
      reminderDue(settings({ lastSentOn: localDayKey(NOW) }), NOW),
      "already sent today",
    ).toBe(false);
    expect(
      reminderDue(settings({ enabled: false }), NOW),
      "reminders turned off",
    ).toBe(false);
  });

  test("never fires when no reminder type is selected", () => {
    expect(
      reminderDue(settings({ unfinishedLessons: false, studyGoals: false }), NOW),
    ).toBe(false);
  });

  test("sums today's active learning seconds only", () => {
    const day = {
      videoSeconds: 120,
      studioSeconds: 60,
      noteSeconds: 0,
      reviewSeconds: 30,
    };
    const data = {
      days: {
        [localDayKey(NOW)]: day,
        "2026-11-16": {
          videoSeconds: 999,
          studioSeconds: 0,
          noteSeconds: 0,
          reviewSeconds: 0,
        },
      },
    };
    expect(studySecondsToday(data, NOW)).toBe(210);
    expect(
      studySecondsToday({ days: {} }, NOW),
      "no activity yet today",
    ).toBe(0);
  });
});

describe("reminder message", () => {
  test("combines an unfinished lesson with the remaining daily goal", () => {
    const message = buildReminder({
      settings: settings(),
      unfinished: unfinished(),
      todaySeconds: 10 * 60,
      goals: goals(30),
    });

    expect(message?.title).toBe("Keep your 30-minute goal going");
    expect(message?.body).toContain("20 min to go");
    expect(message?.body).toContain("Modern JavaScript");
    expect(message?.body).toContain("5 lessons");
    expect(message?.href).toBe("/watch/PL1/vid-1?t=42");
  });

  test("nudges about an unfinished lesson when the goal is met", () => {
    const message = buildReminder({
      settings: settings(),
      unfinished: unfinished(),
      todaySeconds: 60 * 60,
      goals: goals(30),
    });

    expect(message?.title).toBe("Continue “Modern JavaScript”");
    expect(message?.body).toContain("5 lessons left");
  });

  test("falls back to the study goal when nothing is unfinished", () => {
    const message = buildReminder({
      settings: settings(),
      unfinished: emptyLearning(),
      todaySeconds: 0,
      goals: goals(20),
    });

    expect(message?.title).toBe("Your daily study goal is waiting");
    expect(message?.body).toContain("20 min short");
    expect(message?.href).toBe("/analytics");
  });

  test("stays silent when everything is done and the goal is met", () => {
    expect(
      buildReminder({
        settings: settings(),
        unfinished: emptyLearning(),
        todaySeconds: 30 * 60,
        goals: goals(30),
      }),
    ).toBeNull();
  });

  test("respects the include toggles", () => {
    const lessonsOnly = buildReminder({
      settings: settings({ studyGoals: false }),
      unfinished: unfinished(),
      todaySeconds: 0,
      goals: goals(60),
    });
    expect(lessonsOnly?.title).toContain("Continue");

    const goalsOnly = buildReminder({
      settings: settings({ unfinishedLessons: false }),
      unfinished: unfinished(),
      todaySeconds: 0,
      goals: goals(60),
    });
    expect(goalsOnly?.title).toContain("goal");
    expect(goalsOnly?.body).not.toContain("Modern JavaScript");
  });
});
