"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Check,
  Download,
  Loader2,
  LockKeyhole,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useLibrary } from "@/shared/store/library";
import {
  getPlaylistCompletedAt,
  getPlaylistProgress,
  getProgress,
  type PlaylistProgress,
} from "@/shared/lib/storage";
import type { CourseProgress } from "@/shared/lib/types";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";
import { LogoMark } from "@/features/shell";
import { useAnalyticsData } from "@/features/analytics";
import { cn } from "@/shared/lib/utils";
import {
  certificateProgress,
  certificateReference,
  playlistCertificateProgress,
  readCertificateName,
  saveCertificateName,
  type CertificateProgress,
} from "../lib/certificate";
import {
  getArchivedCertificate,
  type ArchivedCertificate,
  type CertificateKind,
} from "../lib/certificate-archive";
import {
  downloadCertificateImage,
  type CertificateOrientation,
} from "../lib/certificate-image";

export function CourseCertificateView({ courseId }: { courseId: string }) {
  return <CertificateView kind="course" sourceId={courseId} />;
}

export function PlaylistCertificateView({
  playlistId,
}: {
  playlistId: string;
}) {
  return <CertificateView kind="playlist" sourceId={playlistId} />;
}

function certificateReferenceFor(
  kind: CertificateKind,
  sourceId: string,
  completedAt: number | null
): string {
  return certificateReference(
    kind === "playlist" ? `playlist:${sourceId}` : sourceId,
    completedAt
  );
}

function CertificateView({
  kind,
  sourceId,
}: {
  kind: CertificateKind;
  sourceId: string;
}) {
  const hydrated = useLibrary((s) => s.hydrated);
  const course = useLibrary(useShallow((s) => s.courses[sourceId]));
  const playlist = useLibrary(useShallow((s) => s.playlists[sourceId]));
  const analytics = useAnalyticsData();
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [playlistProgress, setPlaylistProgress] =
    useState<PlaylistProgress | null>(null);
  const [archived, setArchived] = useState<
    ArchivedCertificate | null | undefined
  >(undefined);
  const [name, setName] = useState("");
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<CertificateOrientation | null>(
    null
  );

  useEffect(() => {
    setIssuedAt(Date.now());
    setName(readCertificateName());
    setArchived(getArchivedCertificate(kind, sourceId));
    setProgress(kind === "course" && sourceId ? getProgress(sourceId) : null);
    setPlaylistProgress(
      kind === "playlist" && sourceId ? getPlaylistProgress(sourceId) : null
    );
  }, [kind, sourceId]);

  if (
    !hydrated ||
    issuedAt === null ||
    archived === undefined ||
    (kind === "course" && course && !progress) ||
    (kind === "playlist" && playlist && !playlistProgress)
  ) {
    return <CertificateSkeleton />;
  }

  const live =
    kind === "course" && course && progress
      ? {
          title: course.title,
          channelTitle: course.channelTitle ?? "",
          href: `/watch/${course.id}`,
          backLabel: "Back to course",
          continueLabel: "Continue course",
          completedAt:
            analytics.completedCourses[course.id] ??
            (progress.updatedAt > 0 ? progress.updatedAt : null),
          certificate: certificateProgress(course, progress),
        }
      : kind === "playlist" && playlist && playlistProgress
        ? {
            title: playlist.playlistTitle,
            channelTitle: playlist.channelTitle,
            href: `/watch/${playlist.playlistId}`,
            backLabel: "Back to playlist",
            continueLabel: "Continue playlist",
            completedAt: getPlaylistCompletedAt(playlist.playlistId),
            certificate: playlistCertificateProgress(playlist, playlistProgress),
          }
        : null;

  if (!live && !archived) {
    return (
      <div className="mx-auto w-full max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {kind === "playlist" ? "Playlist not found" : "Course not found"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted from this browser.
        </p>
        <Link href="/certificates" className={cn(buttonVariants(), "mt-4")}>
          Back to certificates
        </Link>
      </div>
    );
  }

  const title = live?.title ?? archived!.title;
  const channelTitle = live?.channelTitle ?? archived!.channelTitle;
  const certificate: CertificateProgress = live?.certificate ?? {
    total: archived!.total,
    completed: archived!.completed,
    percent: 100,
    complete: true,
  };
  const completedAt = live?.completedAt ?? (archived!.completedAt || null);
  const reference = certificateReferenceFor(kind, sourceId, completedAt);
  const backHref = live?.href ?? "/certificates";
  const backLabel = live?.backLabel ?? "Back to certificates";

  if (!certificate.complete) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 pb-16 sm:p-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
        <Card className="mt-4 overflow-hidden">
          <div className="flex flex-col items-center gap-4 border-b bg-muted/30 px-6 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <LockKeyhole className="size-7" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Certificate not unlocked yet
              </h1>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Complete every lesson in{" "}
                <span className="font-medium text-foreground">{title}</span> to
                generate your completion certificate.
              </p>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium">
                  {certificate.completed} of {certificate.total} lessons complete
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {certificate.percent}%
                </span>
              </div>
              <Progress value={certificate.percent} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={backHref} className={buttonVariants()}>
                {live?.continueLabel ?? "Continue"}
              </Link>
              <Link
                href="/library"
                className={buttonVariants({ variant: "outline" })}
              >
                Back to library
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // New completions have an analytics timestamp for courses; playlists and
  // older completions fall back to the last saved progress time.
  const displayName = name.trim() || "Your name";
  const completedLabel = completedAt
    ? formatCertificateDate(completedAt)
    : "Not recorded";
  const issuedLabel = formatCertificateDate(issuedAt);

  async function handleDownload(orientation: CertificateOrientation) {
    setDownloading(orientation);
    try {
      const format = await downloadCertificateImage(
        {
          name: displayName,
          courseTitle: title,
          channelTitle,
          completedLabel,
          issuedLabel,
          reference,
          completed: certificate.completed,
          total: certificate.total,
        },
        orientation
      );
      const label =
        orientation === "portrait" ? "Portrait certificate" : "Certificate";
      toast.success(
        format === "png"
          ? `${label} image downloaded.`
          : `${label} downloaded as an SVG image.`
      );
    } catch {
      toast.error("Couldn't create the certificate image.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 pb-16 sm:p-8 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Print / Save as PDF
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={downloading !== null}
            onClick={() => handleDownload("landscape")}
          >
            {downloading === "landscape" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {downloading === "landscape" ? "Preparing…" : "Download PNG"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloading !== null}
            onClick={() => handleDownload("portrait")}
          >
            {downloading === "portrait" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {downloading === "portrait"
              ? "Preparing…"
              : "Portrait PNG"}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center print:hidden">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="certificate-name"
            className="text-sm font-semibold"
          >
            Name on certificate
          </label>
          <p className="text-xs text-muted-foreground">
            Saved only in this browser. Leave blank to show “Your name”.
          </p>
        </div>
        <Input
          id="certificate-name"
          value={name}
          maxLength={80}
          placeholder="Your name"
          onChange={(event) => {
            setName(event.target.value);
            saveCertificateName(event.target.value);
          }}
          className="sm:max-w-xs"
        />
      </div>

      <article className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-[#fffdf8] p-1.5 text-slate-900 shadow-2xl shadow-primary/10 sm:p-2 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-primary via-[#7C93FF] to-[#3E5CEB]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-[#E8B85C]/10 blur-3xl"
        />

        <div className="relative rounded-[1.6rem] border border-slate-200 px-5 py-8 sm:px-10 sm:py-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogoMark size={40} />
              <div>
                <p className="text-sm font-extrabold tracking-tight">
                  Focus<span className="text-primary">y</span>
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Local learning record
                </p>
              </div>
            </div>
            <span className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Certificate of completion
            </span>
          </header>

          <div className="mx-auto mt-10 max-w-3xl text-center sm:mt-12">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Award className="size-8" />
            </span>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
              This certifies that
            </p>
            <p className="mt-3 break-words text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {displayName}
            </p>
            <div className="mx-auto mt-3 h-px w-56 bg-linear-to-r from-transparent via-slate-300 to-transparent" />
            <p className="mt-5 text-sm text-slate-600">
              has successfully completed the {kind}
            </p>
            <h1 className="mt-2 text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {title}
            </h1>
            {channelTitle && (
              <p className="mt-2 text-sm text-slate-500">
                Created by {channelTitle}
              </p>
            )}
          </div>

          <dl className="mx-auto mt-10 grid max-w-3xl gap-4 border-y border-slate-200 py-5 text-center sm:grid-cols-3">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Lessons completed
              </dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {certificate.completed} of {certificate.total}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Completed
              </dt>
              <dd className="mt-1 text-sm font-semibold">{completedLabel}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Reference
              </dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {reference}
              </dd>
            </div>
          </dl>

          <footer className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="relative flex size-14 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/5 text-primary">
                <Check className="size-6" />
                <span className="absolute -bottom-1.5 rounded-full bg-primary px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                  Complete
                </span>
              </span>
              <div>
                <p className="text-xs font-semibold">All lessons complete</p>
                <p className="text-[11px] text-slate-500">
                  Progress saved in this browser.
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Generated locally
              </p>
              <p className="mt-0.5 text-sm font-semibold">{issuedLabel}</p>
            </div>
          </footer>

          <p className="mx-auto mt-8 max-w-2xl text-center text-[10px] leading-relaxed text-slate-400">
            This personal completion record was generated in this browser from
            saved {kind} progress. It is not an accredited credential or a
            public verification.
          </p>
        </div>
      </article>
    </div>
  );
}

function formatCertificateDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function CertificateSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <div className="h-[34rem] animate-pulse rounded-[2rem] border bg-muted/30" />
    </div>
  );
}
