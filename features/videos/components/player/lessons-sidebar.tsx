import { ListVideo, PanelLeftClose } from "lucide-react";
import type { Course } from "@/shared/lib/types";
import ChapterSidebar from "@/features/videos/components/player/chapter-sidebar";
import { Button } from "@/shared/ui/button";

interface Props {
  course: Course;
  activeId: string | null;
  completedIds: string[];
  toggleSidebar: () => void;
  select: (id: string) => void;
  toggleComplete: (id: string) => void;
}

export default function LessonsSidebar({
  course,
  activeId,
  completedIds,
  toggleSidebar,
  select,
  toggleComplete,
}: Props) {
  return (
    <aside className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ListVideo className="size-3.5" /> LESSONS
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          title="Collapse sidebar"
          aria-label="Collapse lessons sidebar"
          className="size-8"
        >
          <PanelLeftClose />
        </Button>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <ChapterSidebar
          chapters={course.chapters}
          activeId={activeId}
          completedIds={completedIds}
          onSelect={select}
          onToggleComplete={toggleComplete}
        />
      </div>
    </aside>
  );
}