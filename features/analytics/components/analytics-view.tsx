"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Clock3 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useLibrary, selectPlaylistList, selectCourseList } from "@/shared/store/library";
import { useAllNotes } from "@/shared/lib/learning-notes";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  achievements,
  goalProgress,
  learningInsights,
  overviewStats,
  summarizeRange,
} from "../lib/analytics-selectors";
import { lastDayKeys } from "../lib/analytics-date";
import {
  buildProgressItems,
  continueLearning,
} from "../lib/progress-snapshot";
import { buildTimeline } from "../lib/activity-timeline";
import { saveLearningGoals } from "../lib/activity-tracker";
import {
  useAnalyticsData,
  useStudioAnalytics,
} from "../hooks/use-analytics";
import { AnalyticsSkeleton } from "./analytics-skeleton";
import { SummaryCards } from "./summary-cards";
import { ContinueLearningCard } from "./continue-learning";
import { ActivityTrends } from "./activity-trends";
import { ActivityCalendar } from "./activity-calendar";
import { CourseProgressOverview } from "./course-progress-overview";
import { ActivityBreakdown } from "./activity-breakdown";
import { StudioAnalyticsCard } from "./studio-analytics";
import { InsightsCard } from "./insights-card";
import { ActivityTimeline } from "./activity-timeline";
import {
  AchievementsCard,
  LearningGoalsCard,
} from "./goals-achievements";

/**
 * The learning analytics dashboard. Every number comes from data this browser
 * already keeps (watch progress, notes, Studio projects) plus the local
 * activity tracker. Nothing is sent anywhere.
 */
export function AnalyticsView() {
  const hydrated = useLibrary((s) => s.hydrated);
  const playlists = useLibrary(useShallow(selectPlaylistList));
  const courses = useLibrary(useShallow(selectCourseList));
  const recent = useLibrary((s) => s.recent);
  const courseRecent = useLibrary((s) => s.courseRecent);
  const data = useAnalyticsData();
  const studio = useStudioAnalytics(courses, playlists);
  const notes = useAllNotes();

  // Dates are rendered client-side only so the prerender stays stable.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const items = useMemo(
    () =>
      buildProgressItems({
        playlists,
        courses,
        recent,
        courseRecent,
        data,
      }),
    [playlists, courses, recent, courseRecent, data]
  );

  const stats = useMemo(
    () => (now ? overviewStats(data, items, now) : null),
    [data, items, now]
  );
  const continueItems = useMemo(
    () => continueLearning(playlists, courses, recent, courseRecent),
    [playlists, courses, recent, courseRecent]
  );
  const last30 = useMemo(
    () => summarizeRange(data, lastDayKeys(30, now ?? Date.now())),
    [data, now]
  );
  const goals = useMemo(
    () => (now ? goalProgress(data.goals, data, now) : []),
    [data, now]
  );
  const insights = useMemo(
    () => (now ? learningInsights(data, items, data.goals, now) : []),
    [data, items, now]
  );
  const earned = useMemo(
    () =>
      stats
        ? achievements({
            totalSeconds: stats.totalSeconds,
            completedLessons: stats.lessonsCompleted,
            completedCourses: stats.coursesCompleted,
            longestStreak: stats.longestStreak,
            studioProjects: studio.summary?.projects ?? 0,
          })
        : [],
    [stats, studio.summary]
  );
  const timeline = useMemo(
    () => buildTimeline(data, notes, studio.summary?.recentProjects ?? []),
    [data, notes, studio.summary]
  );
  const lastStudioProject = studio.summary?.recentProjects[0] ?? null;

  if (!hydrated || !now || !stats) return <AnalyticsSkeleton />;

  const hasAnything =
    items.length > 0 || stats.totalSeconds > 0 || earned.some((entry) => entry.unlocked);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 pb-16 sm:p-8">
      <PageHeader
        title="Analytics"
        subtitle="How you learn, tracked only in this browser — playback, notes, Studio practice and finished lessons."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <Clock3 className="size-3" /> Local only
          </span>
        }
      />

      {!hasAnything ? (
        <EmptyState
          icon={BarChart3}
          title="No learning activity yet"
          text="Watch a lesson, take a note or practice in Studio. Focusy starts measuring from your first minute and keeps the history on this device."
          action={
            <Link href="/library" className={cn(buttonVariants({ variant: "outline" }))}>
              Browse library
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <SummaryCards stats={stats} />
          <ContinueLearningCard
            playlist={continueItems.playlist}
            course={continueItems.course}
            studioProject={lastStudioProject}
          />
          <ActivityTrends data={data} now={now} />
          <ActivityCalendar data={data} items={items} now={now} />
          <CourseProgressOverview items={items} />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <StudioAnalyticsCard data={data} studio={studio} />
              <InsightsCard insights={insights} />
              <ActivityTimeline entries={timeline} />
            </div>
            <div className="space-y-4">
              <ActivityBreakdown summary={last30} />
              <LearningGoalsCard
                goals={data.goals}
                progress={goals}
                onSave={saveLearningGoals}
              />
              <AchievementsCard achievements={earned} />
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            A study day counts at least 5 minutes of active learning. Break time, paused
            video and hidden tabs are not counted.
          </p>
        </div>
      )}
    </div>
  );
}
