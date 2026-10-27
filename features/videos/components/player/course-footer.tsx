import Link from "next/link";
import type { Course } from "@/shared/lib/types";
import VideoDescription from "@/shared/components/video-description";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Progress } from "@/shared/ui/progress";

interface Props {
  course: Course;
  pct: number;
  autoAdvance: boolean;
  setAutoAdvance: (v: boolean) => void;
  editing: boolean;
  setEditing: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export default function CourseFooter({
  course,
  pct,
  autoAdvance,
  setAutoAdvance,
  editing,
  setEditing,
}: Props) {
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div className="min-w-0">
          <Link href="/library" className="text-xs text-muted-foreground hover:underline">
            ← Library
          </Link>
          <h1 className="truncate text-xl font-semibold">{course.title}</h1>
          <div className="text-xs text-muted-foreground">
            {course.chapters.length} lessons • {pct}% complete •{" "}
            <Link
              href={`https://www.youtube.com/watch?v=${course.videoId}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              original video
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="auto-advance"
            checked={autoAdvance}
            onCheckedChange={(v) => setAutoAdvance(v === true)}
          />
          <Label htmlFor="auto-advance" className="text-xs font-normal">
            Auto-advance
          </Label>
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Done editing" : "Edit lessons"}
          </Button>
        </div>
      </div>
      <Progress value={pct} className="mt-2 [&>div]:bg-green-600" />

      {course.description?.trim() && <VideoDescription description={course.description} />}
    </>
  );
}