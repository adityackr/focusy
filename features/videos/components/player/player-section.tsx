import { PanelLeftOpen } from "lucide-react";
import type { Course } from "@/shared/lib/types";
import { formatTimestamp } from "@/shared/lib/chapters";
import VideoPlayer from "@/features/videos/components/player/video-player";
import ChapterEditor from "@/features/videos/components/player/chapter-editor";
import { Button } from "@/shared/ui/button";

interface Props {
  course: Course;
  activeIndex: number;
  completedIds: string[];
  autoAdvance: boolean;
  editing: boolean;
  sidebarOpen: boolean;
  resumeAt: number | null;
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
            pauseAtEnd={!autoAdvance}
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
            <Button
              size="sm"
              variant={completedIds.includes(active.id) ? "secondary" : "default"}
              onClick={() => toggleComplete(active.id)}
              className={
                completedIds.includes(active.id)
                  ? "shrink-0 border-green-600 bg-green-600 text-white hover:bg-green-600 hover:text-white dark:border-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-600 dark:hover:text-white"
                  : "shrink-0"
              }
            >
              {completedIds.includes(active.id) ? "✓ Done" : "Mark done"}
            </Button>
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