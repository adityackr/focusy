"use client";

import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { formatDuration } from "../lib/analytics-date";
import type { PeriodSummary } from "../types/analytics.types";

const SEGMENTS = [
  { key: "videoSeconds", label: "Video learning", color: "var(--primary)" },
  { key: "studioSeconds", label: "Studio practice", color: "var(--success)" },
  { key: "noteSeconds", label: "Note-taking", color: "oklch(0.72 0.15 70)" },
  { key: "reviewSeconds", label: "Reviewing notes", color: "oklch(0.65 0.13 300)" },
] as const;

export function ActivityBreakdown({ summary }: { summary: PeriodSummary }) {
  const total =
    summary.videoSeconds +
    summary.studioSeconds +
    summary.noteSeconds +
    summary.reviewSeconds;

  let cursor = 0;
  const stops: string[] = [];
  for (const segment of SEGMENTS) {
    const seconds = summary[segment.key];
    if (seconds <= 0) continue;
    const start = (cursor / total) * 100;
    cursor += seconds;
    const end = (cursor / total) * 100;
    stops.push(`${segment.color} ${start}% ${end}%`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="size-4" /> Where your time goes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <PieChart className="size-6" />
            </span>
            <p className="text-sm font-medium">No activity in the last 30 days</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Watch a lesson, take notes or practice in Studio and the mix appears here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div
              role="img"
              aria-label={`Learning breakdown: ${SEGMENTS.map(
                (segment) => `${segment.label} ${formatDuration(summary[segment.key])}`
              ).join(", ")}`}
              className="relative size-36 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(${stops.join(", ")})`,
              }}
            >
              <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-card">
                <span className="text-lg font-extrabold tabular-nums">
                  {formatDuration(total)}
                </span>
                <span className="text-[10px] text-muted-foreground">last 30 days</span>
              </div>
            </div>
            <ul className="w-full min-w-0 space-y-2">
              {SEGMENTS.map((segment) => {
                const seconds = summary[segment.key];
                const percent = total === 0 ? 0 : Math.round((seconds / total) * 100);
                return (
                  <li key={segment.key} className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: segment.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{segment.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatDuration(seconds)}
                    </span>
                    <span className="w-8 shrink-0 text-right font-medium tabular-nums">
                      {percent}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">
          Each second is credited to one activity only — when activities overlap, the more
          deliberate one counts (Studio, then notes, then video).
        </p>
      </CardContent>
    </Card>
  );
}
