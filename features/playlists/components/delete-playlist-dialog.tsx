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
import { cn } from "@/shared/lib/utils";
import { deletePlaylistData } from "../lib/delete-playlist";

export function DeletePlaylistButton({
  playlistId,
  playlistTitle,
  iconOnly = true,
  className,
  onDeleted,
}: {
  playlistId: string;
  playlistTitle: string;
  iconOnly?: boolean;
  className?: string;
  onDeleted?: () => void;
}) {
  const { open, setOpen, handleDelete } = useDeletePlaylistDialog({ playlistId, onDeleted });

  return (
    <>
      <Button
        variant="ghost"
        size={iconOnly ? "icon" : "sm"}
        onClick={() => setOpen(true)}
        aria-label={`Delete "${playlistTitle}"`}
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
            <AlertDialogTitle>Delete this playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{playlistTitle}&rdquo; and its lessons&apos; notes, bookmarks,
              Studio projects and progress will be permanently removed from this
              browser. A completed certificate is kept. You can re-import it
              anytime with the playlist link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete playlist</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Confirm state + delete handler for `DeletePlaylistButton` — kept out of the JSX. */
function useDeletePlaylistDialog({
  playlistId,
  onDeleted,
}: {
  playlistId: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    await deletePlaylistData(playlistId);
    toast.success("Playlist and its saved notes and bookmarks removed.");
    onDeleted?.();
  }

  return { open, setOpen, handleDelete };
}
