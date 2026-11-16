import {
  BookCheck,
  Clock3,
  Flame,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { formatDuration } from "../lib/analytics-date";
import type { OverviewStats } from "../lib/analytics-selectors";

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-0">
      <CardContent className="flex items-start gap-3 p-4 sm:p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-2xl font-extrabold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** The four headline numbers plus quieter supporting statistics. */
export function SummaryCards({ stats }: { stats: OverviewStats }) {
  const streakHint =
    stats.streak === 0
      ? "Learn 5+ minutes today to start"
      : `${stats.longestStreak} day best all time`;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Clock3}
          label="Total learning time"
          value={formatDuration(stats.totalSeconds)}
          hint={`${stats.activeDays} active day${stats.activeDays === 1 ? "" : "s"} tracked`}
        />
        <SummaryCard
          icon={BookCheck}
          label="Lessons completed"
          value={`${stats.lessonsCompleted}`}
          hint={`${stats.completionRate}% of all lessons`}
        />
        <SummaryCard
          icon={GraduationCap}
          label="Courses completed"
          value={`${stats.coursesCompleted}`}
          hint={`${stats.coursesStarted} started`}
        />
        <SummaryCard
          icon={Flame}
          label="Current streak"
          value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`}
          hint={streakHint}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-muted/20 p-3 text-center sm:grid-cols-4">
        <SupportingStat
          label="Average active day"
          value={formatDuration(stats.averageDailySeconds)}
        />
        <SupportingStat
          label="Videos watched"
          value={`${stats.videosWatched}`}
        />
        <SupportingStat
          label="Courses started"
          value={`${stats.coursesStarted}`}
        />
        <SupportingStat
          label="Completion rate"
          value={`${stats.completionRate}%`}
        />
      </div>
    </div>
  );
}

function SupportingStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
