"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useLibrary } from "@/shared/store/library";
import { cn } from "@/shared/lib/utils";

export function RenameCategoryButton({
  categoryId,
  categoryName,
  className,
}: {
  categoryId: string;
  categoryName: string;
  className?: string;
}) {
  const { open, setOpen, name, setName, handleRename } = useRenameCategoryDialog(
    categoryId,
    categoryName
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={`Rename "${categoryName}"`}
        title="Rename category"
        className={cn("h-7 w-7 text-muted-foreground hover:text-primary", className)}
      >
        <Pencil className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
            <DialogDescription>
              The videos and playlists inside stay exactly where they are.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-2">
            <Label htmlFor="category-name">Category name</Label>
            <Input
              id="category-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteCategoryButton({
  categoryId,
  categoryName,
  videoCount,
  playlistCount,
  className,
}: {
  categoryId: string;
  categoryName: string;
  videoCount: number;
  playlistCount: number;
  className?: string;
}) {
  const { open, setOpen, handleDelete } = useDeleteCategoryDialog(categoryId, categoryName);

  const total = videoCount + playlistCount;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={`Delete "${categoryName}"`}
        title="Delete category"
        className={cn(
          "h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          className
        )}
      >
        <Trash2 className="size-3.5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{categoryName}&rdquo; will be removed.
              {total > 0
                ? ` Its ${total} item${total === 1 ? "" : "s"} will move to Uncategorized — nothing is deleted.`
                : " It has no items."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete category</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Rename form state + handler for `RenameCategoryButton` — kept out of the JSX. */
function useRenameCategoryDialog(categoryId: string, categoryName: string) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(categoryName);
  const renameCategory = useLibrary((s) => s.renameCategory);

  function openDialog() {
    setName(categoryName);
    setOpen(true);
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameCategory(categoryId, name)) {
      toast.error("That category name is already taken.");
      return;
    }
    toast.success("Category renamed.");
    setOpen(false);
  }

  return { open, setOpen: (v: boolean) => (v ? openDialog() : setOpen(false)), name, setName, handleRename };
}

/** Confirm state + delete handler for `DeleteCategoryButton` — kept out of the JSX. */
function useDeleteCategoryDialog(categoryId: string, categoryName: string) {
  const [open, setOpen] = useState(false);
  const removeCategory = useLibrary((s) => s.removeCategory);

  function handleDelete() {
    removeCategory(categoryId);
    toast.success(`"${categoryName}" deleted.`);
  }

  return { open, setOpen, handleDelete };
}
