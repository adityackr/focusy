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

/** Familiar time steps so the Y axis reads in seconds, minutes or hours. */
const AXIS_STEPS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800,
  21600, 43200, 86400,
];

function axisStep(maxSeconds: number): number {
  const target = Math.max(1, maxSeconds / 3);
  return AXIS_STEPS.find((step) => step >= target) ?? Math.ceil(target / 86400) * 86400;
}

function formatAxisDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)}m`;
  }
  const hours = seconds / 3600;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

/** Keep at most six X labels, always including the first and last. */
function xLabelIndices(count: number): Set<number> {
  const maxLabels = 6;
  if (count <= maxLabels) {
    return new Set(Array.from({ length: count }, (_, index) => index));
  }
  const step = Math.ceil((count - 1) / (maxLabels - 1));
  const indices = new Set<number>([0]);
  for (let index = step; index < count - 1; index += step) {
    indices.add(index);
  }
  indices.add(count - 1);
  return indices;
}

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
  const { ticks, axisMax } = useMemo(() => {
    const step = axisStep(max);
    const axisMax = Math.max(step, Math.ceil(max / step) * step);
    const ticks: number[] = [];
    for (let value = 0; value <= axisMax; value += step) ticks.push(value);
    return { ticks, axisMax };
  }, [max]);
  const xLabels = useMemo(() => xLabelIndices(bars.length), [bars.length]);
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
        <div className="flex gap-1.5 sm:gap-2">
          <div className="flex h-40 shrink-0 items-center gap-1.5 sm:h-48">
            <span className="rotate-180 text-[10px] font-medium uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl]">
              Learning time
            </span>
            <div className="relative h-full w-10" aria-hidden>
              {ticks.map((tick) => (
                <span
                  key={tick}
                  className="absolute right-0 translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                  style={{ bottom: `${(tick / axisMax) * 100}%` }}
                >
                  {formatAxisDuration(tick)}
                </span>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative h-40 sm:h-48">
              <div className="absolute inset-0" aria-hidden>
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    className="absolute inset-x-0 border-t border-border/50"
                    style={{ bottom: `${(tick / axisMax) * 100}%` }}
                  />
                ))}
              </div>
              <div
                role="img"
                aria-label={`Learning time over the last ${period} days. ${formatDuration(
                  current.seconds
                )} total across ${current.activeDays} active days.`}
                className="absolute inset-0 flex items-end gap-[2px]"
              >
                {bars.map((bar) => {
                  const height =
                    bar.seconds > 0 ? Math.max(3, (bar.seconds / axisMax) * 100) : 0;
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
            </div>

            <div className="mt-1.5 flex gap-[2px]" aria-hidden>
              {bars.map((bar, index) => (
                <div key={bar.id} className="relative h-3.5 min-w-0 flex-1">
                  {xLabels.has(index) && (
                    <span
                      className={cn(
                        "absolute top-0 whitespace-nowrap text-[10px] text-muted-foreground",
                        index === 0
                          ? "left-0"
                          : index === bars.length - 1
                            ? "right-0"
                            : "left-1/2 -translate-x-1/2"
                      )}
                    >
                      {bar.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Date
            </p>
          </div>
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
