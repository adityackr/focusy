"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useLibrary } from "@/shared/store/library";
import { clearProgress } from "@/shared/lib/storage";
import { cn } from "@/shared/lib/utils";

export function DeleteCourseButton({
  courseId,
  courseTitle,
  iconOnly = true,
  className,
  onDeleted,
}: {
  courseId: string;
  courseTitle: string;
  iconOnly?: boolean;
  className?: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const removeCourse = useLibrary((s) => s.removeCourse);

  function handleDelete() {
    clearProgress(courseId);
    removeCourse(courseId);
    toast.success("Video removed.");
    onDeleted?.();
  }

  return (
    <>
      <Button
        variant="ghost"
        size={iconOnly ? "icon" : "sm"}
        onClick={() => setOpen(true)}
        aria-label={`Delete "${courseTitle}"`}
        className={cn(
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          className
        )}
      >
        <Trash2 />
        {!iconOnly && "Delete"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{courseTitle}&rdquo; and its progress will be permanently removed from this
              browser. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}