"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, ListVideo, Play } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { NoteButton } from "@/shared/components/note-dialog";
import { cn } from "@/shared/lib/utils";
import { chapterKey, chaptersForVideo, formatTimestamp } from "@/shared/lib/chapters";
import type { PlaylistVideo } from "@/shared/lib/types";

export function VideoList({
  videos,
  playlistId,
  channelTitle,
  activeVideoId,
  watched,
  onToggleWatched,
  compact = false,
  activeChapterIndex = -1,
  onChapterSelect,
  completedChapters = [],
  onToggleChapter,
}: {
  videos: PlaylistVideo[];
  playlistId: string;
  channelTitle: string;
  activeVideoId?: string;
  watched: string[];
  onToggleWatched: (videoId: string) => void;
  compact?: boolean;
  /** Index of the chapter currently playing in the active video (-1 = none). */
  activeChapterIndex?: number;
  /** Seek request for a chapter inside the already-active video. */
  onChapterSelect?: (videoId: string, time: number) => void;
  /** Chapter completion keys (see `chapterKey`). */
  completedChapters?: string[];
  /** Manual completed-mark toggle for one chapter. */
  onToggleChapter?: (key: string) => void;
}) {
  const { chaptersByVideo, isOpen, toggleOpen } = useVideoList({ videos, activeVideoId });

  return (
    <ul className="space-y-1.5">
      {videos.map((video, i) => {
        const active = video.videoId === activeVideoId;
        const done = watched.includes(video.videoId);
        const chapters = chaptersByVideo.get(video.videoId);
        const expanded = chapters ? isOpen(video.videoId) : false;
        return (
          <li key={video.videoId}>
            <div
              className={cn(
                "group flex gap-3 rounded-xl border p-2 transition-all",
                active
                  ? "border-primary bg-primary/5 shadow-md"
                  : "hover:border-primary/40 hover:shadow-sm"
              )}
            >
              <Link
                href={`/watch/${playlistId}/${video.videoId}`}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span
                  className={cn(
                    "relative shrink-0 overflow-hidden rounded-lg",
                    compact ? "h-11 w-20" : "h-14 w-24"
                  )}
                >
                  <Image
                    src={video.thumbnail.url}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 80px, 96px"
                    className="object-cover"
                  />
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                      <Play className="size-5 fill-white text-white" />
                    </span>
                  )}
                  {!active && (
                    <span className="absolute bottom-1 left-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                  {video.durationSeconds ? (
                    <span
                      title="Video length"
                      className="absolute bottom-1 right-1 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-white"
                    >
                      {formatTimestamp(video.durationSeconds)}
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "line-clamp-2 text-[13px] font-semibold leading-snug",
                      active && "text-primary"
                    )}
                  >
                    {video.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {channelTitle}
                  </span>
                </span>
              </Link>
              <div className="flex shrink-0 flex-col items-center gap-0.5 self-start">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleWatched(video.videoId)}
                  title={done ? "Mark as unwatched" : "Mark as watched"}
                  aria-label={done ? "Mark as unwatched" : "Mark as watched"}
                  className={cn(
                    "h-7 w-7",
                    done ? "text-green-500" : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  )}
                >
                  {done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                </Button>
                <NoteButton videoId={video.videoId} title={video.title} reveal />
              </div>
            </div>

            {/* Chapters nested under the video */}
            {chapters && (
              <div className="mt-1 mb-1 ml-4 border-l-2 pl-2">
                <button
                  type="button"
                  onClick={() => toggleOpen(video.videoId)}
                  aria-expanded={expanded}
                  aria-label={expanded ? `Hide chapters of ${video.title}` : `Show chapters of ${video.title}`}
                  className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronDown
                    className={cn("size-3 transition-transform", !expanded && "-rotate-90")}
                    aria-hidden
                  />
                  <ListVideo className="size-3" aria-hidden />
                  <span>
                    {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
                  </span>
                </button>

                {expanded && (
                  <ol className="mb-1 space-y-0.5">
                    {chapters.map((chapter, ci) => {
                      const current = active && ci === activeChapterIndex;
                      const key = chapterKey(video.videoId, chapter.startSeconds);
                      const done = completedChapters.includes(key);
                      const markLabel = done
                        ? `Mark chapter "${chapter.title}" as not completed`
                        : `Mark chapter "${chapter.title}" as completed`;
                      return (
                        <li key={chapter.id} className="group/chapter">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/watch/${playlistId}/${video.videoId}?t=${chapter.startSeconds}`}
                              onClick={(e) => {
                                if (active && onChapterSelect) {
                                  // Already on this video — seek in place, no navigation.
                                  e.preventDefault();
                                  onChapterSelect(video.videoId, chapter.startSeconds);
                                }
                              }}
                              title={formatTimestamp(chapter.startSeconds)}
                              aria-current={current ? "true" : undefined}
                              className={cn(
                                "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-[12px] transition-colors",
                                current
                                  ? "bg-primary/15 font-semibold text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <span className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums opacity-70">
                                {ci + 1}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{chapter.title}</span>
                              <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-70">
                                {formatTimestamp(chapter.startSeconds)}
                              </span>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onToggleChapter?.(key)}
                              title={markLabel}
                              aria-label={markLabel}
                              className={cn(
                                "h-6 w-6 shrink-0",
                                done
                                  ? "text-green-500"
                                  : "text-muted-foreground opacity-0 group-hover/chapter:opacity-100 focus-visible:opacity-100"
                              )}
                            >
                              {done ? (
                                <CheckCircle2 className="size-3.5" />
                              ) : (
                                <Circle className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Expansion state + parsed chapter map for `VideoList` — kept out of the JSX. */
function useVideoList({
  videos,
  activeVideoId,
}: {
  videos: PlaylistVideo[];
  activeVideoId?: string;
}) {
  // Explicit open/closed overrides; undefined falls back to "open when active".
  const [openState, setOpenState] = useState<Record<string, boolean>>({});

  const isOpen = (videoId: string) => openState[videoId] ?? videoId === activeVideoId;
  const toggleOpen = (videoId: string) =>
    setOpenState((prev) => ({ ...prev, [videoId]: !isOpen(videoId) }));

  const chaptersByVideo = useMemo(() => {
    const map = new Map<string, ReturnType<typeof chaptersForVideo>>();
    for (const video of videos) {
      const chapters = chaptersForVideo(video);
      if (chapters.length > 0) map.set(video.videoId, chapters);
    }
    return map;
  }, [videos]);

  return { chaptersByVideo, isOpen, toggleOpen };
}
