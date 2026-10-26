"use client";

import { useState } from "react";
import { ChevronsRight, ListVideo, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Playlist } from "@/lib/types";
import { chaptersForVideo } from "@/lib/chapters";
import { VideoList } from "@/components/watch/video-list";

export function LessonSidebar({
  playlist,
  playlistId,
  activeVideoId,
  watched,
  onToggleWatched,
  open,
  onOpenChange,
  activeChapterIndex = -1,
  onChapterSelect,
  completedChapters,
  onToggleChapter,
}: {
  playlist: Playlist;
  playlistId: string;
  activeVideoId?: string;
  watched: string[];
  onToggleWatched: (videoId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Index of the chapter currently playing in the active video (-1 = none). */
  activeChapterIndex?: number;
  /** Seek request for a chapter inside the already-active video. */
  onChapterSelect?: (videoId: string, time: number) => void;
  /** Chapter completion keys (see `chapterKey`). */
  completedChapters?: string[];
  /** Manual completed-mark toggle for one chapter. */
  onToggleChapter?: (key: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? playlist.videos.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          chaptersForVideo(v).some((c) => c.title.toLowerCase().includes(q))
      )
    : playlist.videos;
  const progress = playlist.videos.length
    ? Math.round((watched.length / playlist.videos.length) * 100)
    : 0;

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => onOpenChange(true)}
        className="hidden justify-self-start lg:inline-flex"
      >
        <ListVideo className="size-4" /> Show {playlist.videos.length} lessons
      </Button>
    );
  }

  return (
    <aside className="min-w-0">
      <div className="lg:sticky lg:top-4">
        <div className="rounded-2xl border bg-card">
          <div className="border-b p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">Lessons</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Collapse lessons"
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {watched.length}/{playlist.videos.length} watched
            </p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lessons…"
                className="h-9 pl-9"
              />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3 lg:max-h-[calc(100vh-280px)]">
            <VideoList
              videos={filtered}
              playlistId={playlistId}
              channelTitle={playlist.channelTitle}
              activeVideoId={activeVideoId}
              watched={watched}
              onToggleWatched={onToggleWatched}
              activeChapterIndex={activeChapterIndex}
              onChapterSelect={onChapterSelect}
              completedChapters={completedChapters}
              onToggleChapter={onToggleChapter}
            />
            {filtered.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No lessons match.
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
