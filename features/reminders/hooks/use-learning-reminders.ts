"use client";

import { useEffect, useRef } from "react";
import { continueLearning, useAnalyticsData } from "@/features/analytics";
import { useLibrary } from "@/shared/store/library";
import { showReminderNotification } from "../lib/notifications";
import {
  buildReminder,
  localDayKey,
  reminderDue,
  studySecondsToday,
} from "../lib/reminders";
import { markReminderSent, useReminderSettings } from "../lib/reminder-store";

/** How often an open tab re-checks whether today's reminder is due. */
export const REMINDER_CHECK_INTERVAL_MS = 60_000;

/**
 * Delivers at most one reminder per day while a Focusy tab is open: pending
 * unfinished lessons and/or an unmet daily study goal. Mounted once in the app
 * shell; does nothing until reminders are enabled and notifications allowed.
 */
export function useLearningReminders(): void {
  const settings = useReminderSettings();
  const data = useAnalyticsData();
  const playlists = useLibrary((s) => s.playlists);
  const courses = useLibrary((s) => s.courses);
  const recent = useLibrary((s) => s.recent);
  const courseRecent = useLibrary((s) => s.courseRecent);
  const hydrated = useLibrary((s) => s.hydrated);
  // Guard against a second check firing before the settings update lands.
  const sentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!settings.enabled || !hydrated) return;

    function check() {
      const now = new Date();
      const today = localDayKey(now);
      if (sentRef.current === today) return;
      if (!reminderDue(settings, now)) return;

      const message = buildReminder({
        settings,
        unfinished: continueLearning(
          Object.values(playlists),
          Object.values(courses),
          recent,
          courseRecent,
        ),
        todaySeconds: studySecondsToday(data, now),
        goals: data.goals,
      });
      if (!message) return;
      if (!showReminderNotification(message)) return;

      sentRef.current = today;
      markReminderSent(today);
    }

    check();
    const interval = window.setInterval(check, REMINDER_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [
    settings,
    hydrated,
    data,
    playlists,
    courses,
    recent,
    courseRecent,
  ]);
}
