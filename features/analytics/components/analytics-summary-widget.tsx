"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  Flame,
  Play,
  Timer,
} from "lucide-react";
import { Card } from "@/shared/ui/card";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useAnalyticsData } from "../hooks/use-analytics";
import {
  activeDayCount,
  currentStreak,
  dayTotalSeconds,
  longestStreak,
  previousPeriodKeys,
  summarizeRange,
  totalLearningSeconds,
} from "../lib/analytics-selectors";
import {
  dateFromDayKey,
  dayKey,
  formatDuration,
  lastDayKeys,
} from "../lib/analytics-date";

/**
 * A compact summary for pages outside the dashboard. Before any learning is
 * tracked it explains what counts, so the card is never an unexplained blank.
 */
export function AnalyticsSummaryWidget() {
  const data = useAnalyticsData();
  // Local dates are computed after mount so the prerender stays stable.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const view = useMemo(() => {
    if (!now) return null;
    const total = totalLearningSeconds(data);

    const todayKey = dayKey(now);
    const todaySeconds = summarizeRange(data, [todayKey]).seconds;
    const weekKeys = lastDayKeys(7, now);
    const week = summarizeRange(data, weekKeys);
    const previous = summarizeRange(data, previousPeriodKeys(weekKeys));
    const change =
      previous.seconds > 0
        ? Math.round(((week.seconds - previous.seconds) / previous.seconds) * 100)
        : null;
    const chartDays = weekKeys.map((key) => {
      const date = dateFromDayKey(key);
      return {
        key,
        seconds: dayTotalSeconds(data.days[key]),
        weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
        full: date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
      };
    });

    return {
      todaySeconds,
      weekSeconds: week.seconds,
      change,
      streak: currentStreak(data, now),
      bestStreak: longestStreak(data),
      total,
      activeDays: activeDayCount(data),
      dailyGoalSeconds: data.goals.dailyMinutes
        ? data.goals.dailyMinutes * 60
        : null,
      chartDays,
      todayKey,
      chartMax: Math.max(1, ...chartDays.map((day) => day.seconds)),
    };
  }, [data, now]);

  if (!view) return null;

  const todayHint = view.dailyGoalSeconds
    ? view.todaySeconds >= view.dailyGoalSeconds
      ? "Daily goal reached"
      : `${Math.min(99, Math.round((view.todaySeconds / view.dailyGoalSeconds) * 100))}% of ${formatDuration(view.dailyGoalSeconds)} goal`
    : "Active learning today";

  const weekHint =
    view.change === null
      ? "Building your baseline"
      : view.change === 0
        ? "Same as the prior week"
        : `${view.change > 0 ? "+" : ""}${view.change}% vs prior week`;

  const stats = [
    {
      label: "Today",
      value: formatDuration(view.todaySeconds),
      hint: todayHint,
      icon: Clock3,
    },
    {
      label: "Past 7 days",
      value: formatDuration(view.weekSeconds),
      hint: weekHint,
      icon: CalendarDays,
    },
    {
      label: "Streak",
      value: `${view.streak} day${view.streak === 1 ? "" : "s"}`,
      hint:
        view.streak === 0
          ? "5+ minutes today starts one"
          : `${view.bestStreak} day best all time`,
      icon: Flame,
    },
    {
      label: "All time",
      value: formatDuration(view.total),
      hint: `${view.activeDays} active day${view.activeDays === 1 ? "" : "s"}`,
      icon: Timer,
    },
  ];

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-3 border-b bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-4 sm:items-center sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <BarChart3 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold tracking-tight">Learning snapshot</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Time you&apos;ve actually spent learning, private to this browser.
          </p>
        </div>
        <Link
          href="/analytics"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "ml-auto h-8 shrink-0 gap-1.5 bg-card/70"
          )}
        >
          Open analytics
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {view.total <= 0 ? (
        <div className="flex flex-col items-start gap-3 px-4 py-6 sm:flex-row sm:items-center sm:px-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Play className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">No learning tracked yet</h3>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Start any lesson, open Studio, or review a note. Focusy counts only
              active time — paused video, idle tabs and breaks are left out, and a
              day becomes a study day after 5 minutes.
            </p>
          </div>
          <span className="shrink-0 rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Local only
          </span>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2.5 p-3.5 sm:grid-cols-4 sm:p-4">
            {stats.map(({ label, value, hint, icon: Icon }) => (
              <div
                key={label}
                className="min-w-0 rounded-xl border bg-muted/20 p-3"
              >
                <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Icon className="size-3.5 text-primary" />
                  {label}
                </dt>
                <dd className="mt-1.5 truncate text-2xl font-extrabold leading-none tracking-tight tabular-nums">
                  {value}
                </dd>
                <dd className="mt-1 truncate text-[11px] text-muted-foreground">
                  {hint}
                </dd>
              </div>
            ))}
          </dl>

          <div className="border-t px-4 py-3.5 sm:px-5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold">Last 7 days</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {formatDuration(view.weekSeconds)} total
              </p>
            </div>
            <div
              role="img"
              aria-label={`Daily learning over the last 7 days: ${view.chartDays
                .map((day) => `${day.weekday} ${formatDuration(day.seconds)}`)
                .join(", ")}`}
              className="mt-2.5 flex items-end gap-1.5 sm:gap-2"
            >
              {view.chartDays.map((day) => (
                <div
                  key={day.key}
                  title={`${day.full}: ${
                    day.seconds > 0 ? formatDuration(day.seconds) : "No learning"
                  }`}
                  className="group flex min-w-0 flex-1 flex-col items-center gap-1"
                >
                  <div className="flex h-10 w-full items-end overflow-hidden rounded-md bg-muted/50 sm:h-12">
                    {day.seconds > 0 && (
                      <div
                        className={cn(
                          "w-full rounded-md transition-colors",
                          day.key === view.todayKey
                            ? "bg-primary"
                            : "bg-primary/40 group-hover:bg-primary/60"
                        )}
                        style={{
                          height: `${Math.max(
                            8,
                            Math.round((day.seconds / view.chartMax) * 100)
                          )}%`,
                        }}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wide",
                      day.key === view.todayKey
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {day.weekday}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
