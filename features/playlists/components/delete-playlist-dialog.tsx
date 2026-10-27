"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLibrary } from "@/store/library";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const removePlaylist = useLibrary((s) => s.removePlaylist);

  function handleDelete() {
    removePlaylist(playlistId);
    toast.success("Playlist removed.");
    onDeleted?.();
  }

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
              &ldquo;{playlistTitle}&rdquo; will be removed from your library, recents
              and favorites. You can re-import it anytime with the playlist link.
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
