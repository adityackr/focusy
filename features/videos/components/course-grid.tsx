import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { CourseCard } from "@/features/videos/components/course-card";
import { cn } from "@/shared/lib/utils";
import type { Course } from "@/shared/lib/types";

export function CourseGrid({
  items,
  emptyIcon: EmptyIcon = Clapperboard,
  emptyTitle = "No videos yet",
  emptyText = "Paste a YouTube link and we'll split it into lessons using its timestamps.",
  emptyAction,
}: {
  items: Course[];
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <EmptyIcon className="size-7" />
        </span>
        <div>
          <h3 className="font-bold">{emptyTitle}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{emptyText}</p>
        </div>
        {emptyAction ?? (
          <Link href="/add" className={cn(buttonVariants())}>
            Add a video
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((c) => (
        <CourseCard key={c.id} course={c} />
      ))}
    </div>
  );
}