"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ListVideo, Play } from "lucide-react";
import type { Course } from "@/shared/lib/types";
import { getProgress } from "@/shared/lib/storage";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { Button } from "@/shared/ui/button";
import { useLibrary } from "@/shared/store/library";
import { DeleteCourseButton } from "@/features/videos/components/delete-course-dialog";
import { cn } from "@/shared/lib/utils";

/** Video course card — Chapterly's card, with Focusy's favorite action. */
export function CourseCard({ course }: { course: Course }) {
  const [done, setDone] = useState(0);
  const favorites = useLibrary((s) => s.courseFavorites);
  const toggleCourseFavorite = useLibrary((s) => s.toggleCourseFavorite);
  const pushCourseRecent = useLibrary((s) => s.pushCourseRecent);
  const fav = favorites.includes(course.id);

  // Progress lives in localStorage — read after mount to avoid hydration drift.
  useEffect(() => {
    setDone(getProgress(course.id).completedIds.length);
  }, [course.id]);

  const pct =
    course.chapters.length === 0 ? 0 : Math.round((done / course.chapters.length) * 100);
  const href = `/course/${course.id}`;

  return (
    <Card className="h-full gap-0 overflow-hidden py-0 transition-all hover:-translate-y-1 hover:shadow-xl">
      <Link
        href={href}
        onClick={() => pushCourseRecent(course.id)}
        className="group relative block"
        aria-label={`Watch ${course.title}`}
      >
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            width={480}
            height={270}
            className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted text-3xl">
            🎬
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/40 group-hover:opacity-100 opacity-0">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
            <Play className="size-6 fill-current" />
          </span>
        </span>
        <Badge className="absolute bottom-2 right-2 gap-1">
          <ListVideo className="size-3" /> {course.chapters.length}
        </Badge>
      </Link>
      <CardHeader className="px-4 pt-3">
        <Link
          href={href}
          onClick={() => pushCourseRecent(course.id)}
          title={course.title}
          className="rounded outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardTitle className="line-clamp-1 text-sm leading-snug font-semibold hover:text-primary">
            {course.title}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="px-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {done}/{course.chapters.length} done
          </span>
          <span className="font-medium">{pct}%</span>
        </div>
        <Progress value={pct} className="mb-2 [&>div]:bg-green-600" />
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between px-4 pb-3">
        <span className="text-[11px] font-medium text-muted-foreground">
          {course.chapters.length} lessons
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleCourseFavorite(course.id)}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "h-8 w-8",
              fav ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Heart className={cn(fav && "fill-current")} />
          </Button>
          <DeleteCourseButton
            courseId={course.id}
            courseTitle={course.title}
            className="h-8 w-8"
          />
        </div>
      </CardFooter>
    </Card>
  );
}