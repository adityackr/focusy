import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
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
      <EmptyState
        icon={EmptyIcon}
        title={emptyTitle}
        text={emptyText}
        action={
          emptyAction ?? (
            <Link href="/add" className={cn(buttonVariants())}>
              Add a video
            </Link>
          )
        }
      />
    );
  }
  return (
    <div className="columns-1 gap-5 sm:columns-2 xl:columns-3">
      {items.map((c, i) => (
        <div
          key={c.id}
          className="card-enter mb-5 break-inside-avoid"
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
        >
          <CourseCard course={c} />
        </div>
      ))}
    </div>
  );
}