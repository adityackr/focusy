"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookCheck,
  Code2,
  GraduationCap,
  NotebookPen,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { TimelineEntry, TimelineKind } from "../lib/activity-timeline";

const ICONS: Record<TimelineKind, React.ComponentType<{ className?: string }>> = {
  "lesson-watched": PlayCircle,
  "lesson-completed": BookCheck,
  "course-completed": GraduationCap,
  "studio-practice": Code2,
  note: NotebookPen,
  project: Sparkles,
};

function timeLabel(at: number): string {
  const date = new Date(at);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Your lesson completions, notes and Studio sessions will appear here as you learn.
          </p>
        ) : (
          <ol className="space-y-1">
            {entries.map((entry) => {
              const Icon = ICONS[entry.kind];
              const content = (
                <>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {entry.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {entry.detail}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {timeLabel(entry.at)}
                  </span>
                  {entry.href && (
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </>
              );

              return (
                <li key={`${entry.kind}-${entry.id}`}>
                  {entry.href ? (
                    <Link
                      href={entry.href}
                      className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-accent/50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2.5 px-1.5 py-1.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
