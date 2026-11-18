"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, CheckCircle2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import {
  selectCourseList,
  selectPlaylistList,
  useLibrary,
} from "@/shared/store/library";
import {
  getPlaylistCompletedAt,
  getPlaylistProgress,
  getProgress,
} from "@/shared/lib/storage";
import type { Course, Playlist } from "@/shared/lib/types";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useAnalyticsData } from "@/features/analytics";
import {
  certificateProgress,
  certificateReference,
  playlistCertificateProgress,
} from "../lib/certificate";
import {
  useArchivedCertificates,
  type ArchivedCertificate,
  type CertificateKind,
} from "../lib/certificate-archive";

interface GalleryItem {
  kind: CertificateKind;
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  completed: number;
  total: number;
  completedAt: number | null;
  reference: string;
}

function sourceKey(kind: CertificateKind, id: string): string {
  return `${kind}:${id}`;
}

function courseItem(
  course: Course,
  completed: number,
  total: number,
  completedAt: number | null
): GalleryItem {
  return {
    kind: "course",
    id: course.id,
    title: course.title,
    channelTitle: course.channelTitle ?? "",
    thumbnail: course.thumbnail,
    completed,
    total,
    completedAt,
    reference: certificateReference(course.id, completedAt),
  };
}

function playlistItem(
  playlist: Playlist,
  completed: number,
  total: number,
  completedAt: number | null
): GalleryItem {
  return {
    kind: "playlist",
    id: playlist.playlistId,
    title: playlist.playlistTitle,
    channelTitle: playlist.channelTitle,
    thumbnail: playlist.playlistThumbnail?.url ?? "",
    completed,
    total,
    completedAt,
    reference: certificateReference(`playlist:${playlist.playlistId}`, completedAt),
  };
}

function archivedItem(certificate: ArchivedCertificate): GalleryItem {
  return {
    kind: certificate.kind,
    id: certificate.sourceId,
    title: certificate.title,
    channelTitle: certificate.channelTitle,
    thumbnail: certificate.thumbnail,
    completed: certificate.completed,
    total: certificate.total,
    completedAt: certificate.completedAt || null,
    reference: certificateReference(
      certificate.kind === "playlist"
        ? `playlist:${certificate.sourceId}`
        : certificate.sourceId,
      certificate.completedAt || null
    ),
  };
}

function certificateHref(item: Pick<GalleryItem, "kind" | "id">): string {
  return item.kind === "playlist"
    ? `/watch/${item.id}/certificate`
    : `/course/${item.id}/certificate`;
}

/** Every completed course and playlist, newest completion first. */
export function CertificatesGalleryView() {
  const hydrated = useLibrary((s) => s.hydrated);
  const courses = useLibrary(useShallow(selectCourseList));
  const playlists = useLibrary(useShallow(selectPlaylistList));
  const analytics = useAnalyticsData();
  const archived = useArchivedCertificates();
  const [items, setItems] = useState<GalleryItem[] | null>(null);

  useEffect(() => {
    if (!hydrated) {
      setItems(null);
      return;
    }

    const next: GalleryItem[] = [];
    const seen = new Set<string>();

    for (const course of courses) {
      const progress = getProgress(course.id);
      const certificate = certificateProgress(course, progress);
      if (!certificate.complete) continue;
      const completedAt =
        analytics.completedCourses[course.id] ??
        (progress.updatedAt > 0 ? progress.updatedAt : null);
      next.push(
        courseItem(
          course,
          certificate.completed,
          certificate.total,
          completedAt
        )
      );
      seen.add(sourceKey("course", course.id));
    }

    for (const playlist of playlists) {
      const progress = getPlaylistProgress(playlist.playlistId);
      const certificate = playlistCertificateProgress(playlist, progress);
      if (!certificate.complete) continue;
      next.push(
        playlistItem(
          playlist,
          certificate.completed,
          certificate.total,
          getPlaylistCompletedAt(playlist.playlistId)
        )
      );
      seen.add(sourceKey("playlist", playlist.playlistId));
    }

    // Completed items whose course/playlist was deleted keep their certificate.
    for (const certificate of archived) {
      if (seen.has(sourceKey(certificate.kind, certificate.sourceId))) continue;
      next.push(archivedItem(certificate));
      seen.add(sourceKey(certificate.kind, certificate.sourceId));
    }

    next.sort(
      (a, b) =>
        (b.completedAt ?? 0) - (a.completedAt ?? 0) ||
        a.title.localeCompare(b.title)
    );
    setItems(next);
  }, [courses, playlists, hydrated, analytics.completedCourses, archived]);

  const courseCount =
    items?.filter((item) => item.kind === "course").length ?? 0;
  const playlistCount =
    items?.filter((item) => item.kind === "playlist").length ?? 0;

  const subtitle =
    items === null
      ? "Loading your completed courses…"
      : items.length === 0
        ? "Complete every lesson in a course or playlist to earn a certificate."
        : playlistCount === 0
          ? `${courseCount} completed course${courseCount === 1 ? "" : "s"} — open or download any certificate.`
          : courseCount === 0
            ? `${playlistCount} completed playlist${playlistCount === 1 ? "" : "s"} — open or download any certificate.`
            : `${courseCount} course${courseCount === 1 ? "" : "s"} and ${playlistCount} playlist${playlistCount === 1 ? "" : "s"} completed — open or download any certificate.`;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 pb-16 sm:p-8">
      <PageHeader
        title="Certificates"
        subtitle={subtitle}
        action={
          <Link
            href="/library"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <ArrowLeft className="size-3.5" />
            Library
          </Link>
        }
      />

      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-2xl border bg-muted/30"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No completed courses yet"
          text="Finish every lesson in a course or playlist and its certificate will appear here, ready to view, print or download."
          action={
            <Link href="/library" className={buttonVariants()}>
              Browse library
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <GalleryCard key={sourceKey(item.kind, item.id)} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const { kind, id, title, channelTitle, thumbnail, completed, total, completedAt, reference } =
    item;
  const href = certificateHref({ kind, id });

  return (
    <Card className="group gap-0 overflow-hidden p-0 transition-shadow hover:shadow-xl">
      <Link
        href={href}
        aria-label={`Open certificate for ${title}`}
        className="relative block aspect-[16/9] overflow-hidden bg-muted"
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full items-center justify-center bg-linear-to-br from-primary/15 via-muted to-muted text-primary">
            <Award className="size-12" />
          </span>
        )}
        <span className="absolute inset-0 bg-linear-to-t from-black/70 via-black/5 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm">
          <Award className="size-3" />
          Certificate
        </span>
        <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
          Completed {kind}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-sm font-bold leading-snug">
            <Link href={href} className="hover:text-primary">
              {title}
            </Link>
          </h2>
          {channelTitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {channelTitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-success" />
            {completed} of {total} lessons
          </span>
          {completedAt && <span>Completed {formatGalleryDate(completedAt)}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {reference}
          </span>
          <Link
            href={href}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-mr-2 shrink-0 gap-1 text-primary"
            )}
          >
            Open certificate
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function formatGalleryDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}
