"use client";

import { useCallback, useRef } from "react";
import { PanelLeftOpen } from "lucide-react";
import type { Course } from "@/shared/lib/types";
import { formatTimestamp } from "@/shared/lib/chapters";
import VideoPlayer from "@/features/videos/components/player/video-player";
import ChapterEditor from "@/features/videos/components/player/chapter-editor";
import { NotesPanel } from "@/shared/components/notes/notes-panel";
import type { PlayerTimeControls } from "@/shared/player/player-chrome";
import { Button } from "@/shared/ui/button";

interface Props {
  course: Course;
  activeIndex: number;
  completedIds: string[];
  autoAdvance: boolean;
  editing: boolean;
  sidebarOpen: boolean;
  resumeAt: number | null;
  /** `resumeAt` is an explicit deep link — cue exactly there. */
  resumeExact: boolean;
  resumedFrom: number | null;
  restartNonce: number;
  toggleSidebar: () => void;
  toggleComplete: (id: string) => void;
  go: (dir: -1 | 1) => void;
  handleSeek: (t: number) => void;
  handleEnded: () => void;
  handleProgress: (t: number | null) => void;
  clearResume: () => void;
  handleChaptersChange: (chapters: Course["chapters"]) => void;
}

export default function PlayerSection({
  course,
  activeIndex,
  completedIds,
  autoAdvance,
  editing,
  sidebarOpen,
  resumeAt,
  resumeExact,
  resumedFrom,
  restartNonce,
  toggleSidebar,
  toggleComplete,
  go,
  handleSeek,
  handleEnded,
  handleProgress,
  clearResume,
  handleChaptersChange,
}: Props) {
  const active = activeIndex >= 0 ? course.chapters[activeIndex] : null;
  const controlsRef = useRef<PlayerTimeControls | null>(null);
  const getCurrentTime = useCallback(
    () => controlsRef.current?.getCurrentTime() ?? null,
    [],
  );
  // A timestamp can sit in another chapter: follow it first, then seek once.
  const seekFromNote = useCallback(
    (seconds: number) => {
      handleSeek(seconds);
      controlsRef.current?.seekTo(seconds);
    },
    [handleSeek],
  );

  return (
    <section className="min-w-0">
      {!sidebarOpen && (
        <Button variant="outline" size="sm" onClick={toggleSidebar} className="mb-3">
          <PanelLeftOpen /> Show lessons ({course.chapters.length})
        </Button>
      )}
      {active ? (
        <>
          <VideoPlayer
            key={`${course.videoId}:${restartNonce}`}
            videoId={course.videoId}
            startSeconds={active.startSeconds}
            endSeconds={active.endSeconds}
            chapterKey={active.id}
            chapters={course.chapters}
            startAt={resumeAt}
            exactStart={resumeExact}
            pauseAtEnd={!autoAdvance}
            controlsRef={controlsRef}
            onEnded={handleEnded}
            onSeek={handleSeek}
            onProgress={handleProgress}
          />
          {resumedFrom != null && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground">
              <span>
                Resumed from{" "}
                <span className="font-mono font-medium text-foreground">
                  {formatTimestamp(resumedFrom)}
                </span>
              </span>
              <Button variant="ghost" size="sm" onClick={clearResume} className="h-7 text-xs">
                Start over
              </Button>
            </div>
          )}
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-xs text-muted-foreground">
                Lesson {activeIndex + 1}/{course.chapters.length} • {formatTimestamp(active.startSeconds)}
                {active.endSeconds != null && ` → ${formatTimestamp(active.endSeconds)}`}
              </div>
              <h2 className="truncate text-base font-semibold">{active.title}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NotesPanel
                key={course.videoId}
                videoId={course.videoId}
                title={course.title}
                source={{
                  kind: "course",
                  courseId: course.id,
                  videoId: course.videoId,
                  chapterId: active.id,
                  title: course.title,
                }}
                getCurrentTime={getCurrentTime}
                onSeek={seekFromNote}
              />
              <Button
                size="sm"
                variant={completedIds.includes(active.id) ? "success" : "default"}
                onClick={() => toggleComplete(active.id)}
              >
                {completedIds.includes(active.id) ? "✓ Done" : "Mark done"}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              onClick={() => go(-1)}
              disabled={activeIndex <= 0}
              className="flex-1"
            >
              ← Prev
            </Button>
            <Button
              onClick={() => go(1)}
              disabled={activeIndex >= course.chapters.length - 1}
              className="flex-1"
            >
              Next →
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No lessons in this course yet.</p>
      )}

      {editing && (
        <div className="mt-4 rounded-xl border p-3">
          <h3 className="mb-2 text-sm font-medium">Edit lessons</h3>
          <ChapterEditor chapters={course.chapters} onChange={handleChaptersChange} />
        </div>
      )}
    </section>
  );
}