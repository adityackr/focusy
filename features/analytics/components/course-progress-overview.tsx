"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpenCheck, Clock3, ListVideo } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { EmptyState } from "@/shared/ui/empty-state";
import { formatDuration } from "../lib/analytics-date";
import type { CourseProgressItem } from "../types/analytics.types";

type ProgressFilter = "all" | "in-progress" | "completed" | "not-started";
type ProgressSort = "recent" | "highest" | "lowest" | "time";

const FILTERS: { value: ProgressFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "not-started", label: "Not started" },
];

const SORTS: { value: ProgressSort; label: string }[] = [
  { value: "recent", label: "Recently studied" },
  { value: "highest", label: "Highest progress" },
  { value: "lowest", label: "Lowest progress" },
  { value: "time", label: "Most learning time" },
];

function statusBadge(status: CourseProgressItem["status"]) {
  if (status === "completed") {
    return <Badge className="bg-success text-success-foreground">Completed</Badge>;
  }
  if (status === "in-progress") {
    return <Badge variant="secondary">In progress</Badge>;
  }
  return <Badge variant="outline">Not started</Badge>;
}

export function CourseProgressOverview({
  items,
}: {
  items: CourseProgressItem[];
}) {
  const [filter, setFilter] = useState<ProgressFilter>("all");
  const [sort, setSort] = useState<ProgressSort>("recent");

  const visible = useMemo(() => {
    const filtered = filter === "all" ? items : items.filter((item) => item.status === filter);
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "highest":
          return b.percent - a.percent || a.title.localeCompare(b.title);
        case "lowest":
          return a.percent - b.percent || a.title.localeCompare(b.title);
        case "time":
          return b.learningSeconds - a.learningSeconds;
        case "recent":
        default: {
          const aRecent = a.recentIndex ?? Number.MAX_SAFE_INTEGER;
          const bRecent = b.recentIndex ?? Number.MAX_SAFE_INTEGER;
          if (aRecent !== bRecent) return aRecent - bRecent;
          return b.learningSeconds - a.learningSeconds;
        }
      }
    });
  }, [items, filter, sort]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenCheck className="size-4" /> Course progress
          </CardTitle>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ProgressSort)}
              className="h-8 rounded-lg border bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as ProgressFilter)}
          className="gap-0"
        >
          <TabsList className="h-auto flex-wrap">
            {FILTERS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="text-xs">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={ListVideo}
            title="No courses yet"
            text="Add a video or import a playlist and your progress will show up here."
            action={
              <Link href="/library" className="text-sm font-medium text-primary hover:underline">
                Browse library
              </Link>
            }
            className="border-0 bg-transparent py-10"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ListVideo}
            title="Nothing in this filter"
            text="Try another completion status."
            className="border-0 bg-transparent py-10"
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <li key={`${item.kind}:${item.id}`}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border bg-background/40 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt=""
                        width={480}
                        height={270}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-2xl">
                        🎬
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {item.kind === "course" ? "Video course" : "Playlist"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                        {item.title}
                      </h3>
                      {statusBadge(item.status)}
                    </div>
                    {item.channelTitle && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {item.channelTitle}
                      </p>
                    )}
                    <div className="mt-auto pt-2.5">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {item.completed}/{item.total} lessons
                        </span>
                        <span className="font-medium">{item.percent}%</span>
                      </div>
                      <Progress
                        value={item.percent}
                        className={cn(item.status === "completed" && "[&>div]:bg-success")}
                      />
                      {item.learningSeconds > 0 && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock3 className="size-3" /> {formatDuration(item.learningSeconds)} tracked
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
