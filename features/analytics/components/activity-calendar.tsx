"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  calendarWeeks,
  dayTotalSeconds,
  type CalendarCell,
} from "../lib/analytics-selectors";
import { formatDuration, formatFullDayLabel } from "../lib/analytics-date";
import type { AnalyticsData, CourseProgressItem } from "../types/analytics.types";

const LEVEL_CLASS: Record<CalendarCell["level"], string> = {
  0: "bg-muted",
  1: "bg-primary/20",
  2: "bg-primary/40",
  3: "bg-primary/65",
  4: "bg-primary/90",
};

const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function ActivityCalendar({
  data,
  items,
  now,
}: {
  data: AnalyticsData;
  items: CourseProgressItem[];
  now: Date;
}) {
  const weeks = useMemo(() => calendarWeeks(data, now), [data, now]);
  const todayKey = useMemo(
    () =>
      `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`,
    [now]
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const selectedKey = hovered ?? pinned ?? todayKey;

  const selectedCell = useMemo(() => {
    for (const week of weeks) {
      const cell = week.cells.find((entry) => entry.key === selectedKey);
      if (cell) return cell;
    }
    return null;
  }, [weeks, selectedKey]);

  const titlesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) map.set(`${item.kind}:${item.id}`, item.title);
    return map;
  }, [items]);

  const studied = selectedCell?.day
    ? Object.keys(selectedCell.day.sources)
        .map((key) => titlesById.get(key))
        .filter((title): title is string => Boolean(title))
    : [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="size-4" /> Learning activity
        </CardTitle>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          Less
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={cn("size-2.5 rounded-[3px]", LEVEL_CLASS[level as CalendarCell["level"]])}
            />
          ))}
          More
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="mt-[18px] flex shrink-0 flex-col gap-[3px] text-[9px] leading-[12px] text-muted-foreground">
            {WEEKDAYS.map((day, index) => (
              <span key={index} className="h-3">
                {day}
              </span>
            ))}
          </div>

          <div className="no-scrollbar overflow-x-auto pb-1">
            <div
              role="group"
              aria-label="Daily learning activity over the last 12 months"
              className="flex w-max gap-[3px]"
            >
              {weeks.map((week) => (
                <div key={week.cells[0].key} className="flex flex-col gap-[3px]">
                  <span className="h-4 text-[9px] leading-4 text-muted-foreground">
                    {week.monthLabel ?? ""}
                  </span>
                  {week.cells.map((cell) => {
                    const future = cell.date > now;
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={future}
                        aria-label={`${formatFullDayLabel(cell.key)}: ${
                          cell.seconds > 0
                            ? `${formatDuration(cell.seconds)} of learning, ${cell.day?.lessonsCompleted ?? 0} lessons completed`
                            : "no learning recorded"
                        }`}
                        title={`${cell.key} · ${
                          cell.seconds > 0 ? formatDuration(cell.seconds) : "No learning"
                        }`}
                        onMouseEnter={() => setHovered(cell.key)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered(cell.key)}
                        onBlur={() => setHovered(null)}
                        onClick={() => setPinned((current) => (current === cell.key ? null : cell.key))}
                        className={cn(
                          "size-3 rounded-[3px] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          future ? "cursor-default bg-transparent" : LEVEL_CLASS[cell.level],
                          !future && "hover:scale-125",
                          selectedKey === cell.key && !future && "ring-2 ring-foreground/60"
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="rounded-xl border bg-muted/20 px-3 py-2.5"
          aria-live="polite"
        >
          {selectedCell ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="font-semibold">{formatFullDayLabel(selectedCell.key)}</span>
              <span className="text-muted-foreground">
                {dayTotalSeconds(selectedCell.day) > 0
                  ? `${formatDuration(selectedCell.seconds)} studied`
                  : "No learning recorded"}
              </span>
              {selectedCell.day && selectedCell.seconds > 0 && (
                <>
                  <span className="text-muted-foreground">
                    {selectedCell.day.lessonsCompleted} lesson
                    {selectedCell.day.lessonsCompleted === 1 ? "" : "s"} completed
                  </span>
                  {studied.length > 0 && (
                    <span className="min-w-0 truncate text-muted-foreground">
                      Studied {studied.slice(0, 3).join(", ")}
                      {studied.length > 3 ? ` +${studied.length - 3}` : ""}
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Hover or tap a day to see its learning activity.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
