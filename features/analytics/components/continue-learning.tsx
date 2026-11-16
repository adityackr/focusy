"use client";

import Link from "next/link";
import Image from "next/image";
import { Code2, PlayCircle, Timer } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { formatDuration } from "../lib/analytics-date";
import type {
  ContinueCourse,
  ContinuePlaylist,
} from "../lib/progress-snapshot";
import type { StudioProjectSummary } from "../lib/studio-analytics";

export function ContinueLearningCard({
  playlist,
  course,
  studioProject,
}: {
  playlist: ContinuePlaylist | null;
  course: ContinueCourse | null;
  studioProject: StudioProjectSummary | null;
}) {
  const nothing = !playlist && !course && !studioProject;
  const firstIsPlaylist = Boolean(playlist);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlayCircle className="size-4" /> Continue learning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nothing ? (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center">
            <p className="text-sm font-medium">Nothing to resume yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Open a lesson from your library and Focusy will remember where you stopped.
            </p>
            <Link
              href="/library"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
            >
              Browse library
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {playlist && (
              <ResumeCard
                kind="Playlist"
                title={playlist.playlist.playlistTitle}
                thumbnail={playlist.playlist.playlistThumbnail.url}
                subtitle={playlist.videoTitle ?? "Playlist overview"}
                position={playlist.positionSeconds}
                completed={playlist.completed}
                total={playlist.total}
                percent={playlist.percent}
                href={playlist.href}
                primary={firstIsPlaylist}
              />
            )}
            {course && (
              <ResumeCard
                kind="Video course"
                title={course.course.title}
                thumbnail={course.course.thumbnail}
                subtitle={course.chapterTitle ?? "Course overview"}
                position={course.positionSeconds}
                completed={course.completed}
                total={course.total}
                percent={course.percent}
                href={course.href}
                primary={!firstIsPlaylist}
              />
            )}
          </div>
        )}

        {studioProject && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Code2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{studioProject.name}</p>
              <p className="text-[11px] text-muted-foreground">
                Last Studio project · {studioProject.files} file
                {studioProject.files === 1 ? "" : "s"}
              </p>
            </div>
            {studioProject.href ? (
              <Link
                href={studioProject.href}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Open lesson
              </Link>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Its lesson is no longer in your library
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResumeCard({
  kind,
  title,
  thumbnail,
  subtitle,
  position,
  completed,
  total,
  percent,
  href,
  primary,
}: {
  kind: string;
  title: string;
  thumbnail: string;
  subtitle: string;
  position: number | null;
  completed: number;
  total: number;
  percent: number;
  href: string;
  primary: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-xl border p-2.5">
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
        {thumbnail ? (
          <Image src={thumbnail} alt="" width={224} height={126} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xl">🎬</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {kind}
        </p>
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        <div className="mt-1 flex items-center gap-2">
          <Progress value={percent} className="h-1.5 flex-1" />
          <span className="shrink-0 text-[10px] font-medium tabular-nums">{percent}%</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
            <Timer className="size-3" />
            {position != null ? `Resume at ${formatDuration(position)}` : `${completed}/${total} lessons`}
          </span>
          <Link
            href={href}
            className={cn(
              buttonVariants({ variant: primary ? "default" : "outline", size: "sm" }),
              "h-7 px-2 text-[11px]"
            )}
          >
            {primary ? "Continue" : "Resume"}
          </Link>
        </div>
      </div>
    </div>
  );
}
