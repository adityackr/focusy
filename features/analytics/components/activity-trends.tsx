"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  comparePeriods,
  trendBars,
  type TrendPeriod,
} from "../lib/analytics-selectors";
import {
  formatCompactDuration,
  formatDayLabel,
  formatDuration,
} from "../lib/analytics-date";
import type { AnalyticsData } from "../types/analytics.types";

const PERIODS: { value: TrendPeriod; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "3 months" },
  { value: 180, label: "6 months" },
  { value: 365, label: "12 months" },
];

export function ActivityTrends({
  data,
  now,
}: {
  data: AnalyticsData;
  now: Date;
}) {
  const [period, setPeriod] = useState<TrendPeriod>(30);
  const bars = useMemo(() => trendBars(data, period, now), [data, period, now]);
  const comparison = useMemo(
    () => comparePeriods(data, period, now),
    [data, period, now]
  );
  const max = Math.max(1, ...bars.map((bar) => bar.seconds));
  const { current, previous } = comparison;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Learning trends</CardTitle>
          <Tabs
            value={String(period)}
            onValueChange={(value) => setPeriod(Number(value) as TrendPeriod)}
            className="gap-0"
          >
            <TabsList className="h-auto flex-wrap">
              {PERIODS.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={String(option.value)}
                  className="px-2.5 text-xs"
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          role="img"
          aria-label={`Learning time over the last ${period} days. ${formatDuration(
            current.seconds
          )} total across ${current.activeDays} active days.`}
          className="flex h-40 items-end gap-[2px] sm:h-48"
        >
          {bars.map((bar) => {
            const height = bar.seconds > 0 ? Math.max(3, (bar.seconds / max) * 100) : 0;
            return (
              <div
                key={bar.id}
                title={`${bar.label}: ${bar.seconds > 0 ? formatDuration(bar.seconds) : "No learning"}`}
                className="group relative flex h-full min-w-0 flex-1 items-end"
              >
                <div
                  className={cn(
                    "w-full rounded-t-[3px] transition-colors",
                    bar.seconds > 0
                      ? "bg-primary/70 group-hover:bg-primary"
                      : "bg-muted/50"
                  )}
                  style={{ height: bar.seconds > 0 ? `${height}%` : "2px" }}
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <TrendStat label="Total time" value={formatDuration(current.seconds)} />
          <TrendStat
            label="Average / day"
            value={formatDuration(current.seconds / Math.max(1, period))}
          />
          <TrendStat label="Lessons" value={`${current.lessonsCompleted}`} />
          <TrendStat label="Active days" value={`${current.activeDays}`} />
          <TrendStat
            label="Best day"
            value={
              current.mostProductiveDay
                ? `${formatDayLabel(current.mostProductiveDay)} · ${formatCompactDuration(
                    current.mostProductiveSeconds
                  )}`
                : "—"
            }
          />
          <div className="col-span-2 rounded-xl border bg-muted/20 px-3 py-2 sm:col-span-1 lg:col-span-2">
            <p className="text-[11px] text-muted-foreground">
              Compared with the previous {period} days
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                {comparison.secondsChangePercent === null ? (
                  <>
                    <Minus className="size-3.5 text-muted-foreground" /> First period
                  </>
                ) : comparison.secondsChangePercent >= 0 ? (
                  <>
                    <TrendingUp className="size-3.5 text-success" />
                    +{comparison.secondsChangePercent}%
                  </>
                ) : (
                  <>
                    <TrendingDown className="size-3.5 text-muted-foreground" />
                    {comparison.secondsChangePercent}%
                  </>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDuration(previous.seconds)} before · {previous.lessonsCompleted} lessons
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
