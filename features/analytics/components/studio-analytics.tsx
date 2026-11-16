"use client";

import Link from "next/link";
import { Code2, FileCode2, FolderCode, Timer } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDuration } from "../lib/analytics-date";
import type { StudioAnalyticsState } from "../hooks/use-analytics";
import type { AnalyticsData } from "../types/analytics.types";

export function StudioAnalyticsCard({
  data,
  studio,
}: {
  data: AnalyticsData;
  studio: StudioAnalyticsState;
}) {
  const studioSeconds = Object.values(data.days).reduce(
    (total, day) => total + day.studioSeconds,
    0
  );
  const sessions = Object.values(data.days).reduce(
    (total, day) => total + day.studioSessions,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Code2 className="size-4" /> Focusy Studio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StudioStat
            icon={Timer}
            label="Practice time"
            value={formatDuration(studioSeconds)}
          />
          <StudioStat
            icon={FolderCode}
            label="Projects"
            value={studio.loading ? "…" : `${studio.summary?.projects ?? 0}`}
          />
          <StudioStat
            icon={FileCode2}
            label="Files created"
            value={studio.loading ? "…" : `${studio.summary?.files ?? 0}`}
          />
          <StudioStat icon={Code2} label="Coding sessions" value={`${sessions}`} />
        </div>

        {studio.loading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : studio.error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
            {studio.error}
          </p>
        ) : studio.summary && studio.summary.projects > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                Most-used languages
              </h3>
              {studio.summary.languages.length === 0 ? (
                <p className="text-xs text-muted-foreground">No language files yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {studio.summary.languages.map((language) => {
                    const max = studio.summary?.languages[0]?.files || 1;
                    return (
                      <li key={language.language} className="flex items-center gap-2 text-xs">
                        <span className="w-20 shrink-0 truncate">{language.language}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(6, (language.files / max) * 100)}%` }}
                          />
                        </span>
                        <span className="w-6 shrink-0 text-right text-muted-foreground tabular-nums">
                          {language.files}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                Recently modified
              </h3>
              <ul className="space-y-1.5">
                {studio.summary.recentProjects.map((project) => (
                  <li key={project.id} className="text-xs">
                    {project.href ? (
                      <Link
                        href={project.href}
                        className="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 transition-colors hover:border-primary/40 hover:bg-accent/40"
                      >
                        <span className="min-w-0 truncate font-medium">{project.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {project.files} file{project.files === 1 ? "" : "s"}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5">
                        <span className="min-w-0 truncate font-medium">{project.name}</span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          Unlinked
                        </Badge>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            Open a lesson and practice in Studio to see projects, languages and coding time
            here.
          </p>
        )}

        <p className="text-[11px] text-muted-foreground">
          Project and file counts describe activity only — not programming skill. Exercises
          aren&apos;t tracked, so no completion figure is shown.
        </p>
      </CardContent>
    </Card>
  );
}

function StudioStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 px-2.5 py-2">
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
