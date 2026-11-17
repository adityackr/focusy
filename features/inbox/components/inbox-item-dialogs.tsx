"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { tagsToInput, type InboxItem } from "@/features/inbox/lib/inbox";
import { useInbox } from "@/features/inbox/lib/inbox-store";
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
import { Textarea } from "@/shared/ui/textarea";

export function EditInboxItemButton({
  item,
  className,
}: {
  item: InboxItem;
  className?: string;
}) {
  const { open, setOpen, title, setTitle, tags, setTags, note, setNote, handleSave } =
    useEditInboxItemDialog(item);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={`Edit "${item.title}"`}
        title="Edit saved link"
        className={cn("h-8 w-8 text-muted-foreground hover:text-primary", className)}
      >
        <Pencil className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit saved link</DialogTitle>
            <DialogDescription>
              Rename it, adjust its tags, or add a note for later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="inbox-edit-title">Title</Label>
              <Input
                id="inbox-edit-title"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Intro to TypeScript"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inbox-edit-tags">Tags (comma separated)</Label>
              <Input
                id="inbox-edit-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="e.g. typescript, web-dev"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inbox-edit-note">Note (optional)</Label>
              <Textarea
                id="inbox-edit-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Why did you save this? What do you want to learn?"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteInboxItemButton({
  item,
  className,
}: {
  item: InboxItem;
  className?: string;
}) {
  const removeItem = useInbox((state) => state.removeItem);
  const [open, setOpen] = useState(false);

  function handleDelete() {
    removeItem(item.id);
    toast.success("Removed from your inbox.");
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={`Delete "${item.title}"`}
        title="Delete saved link"
        className={cn(
          "h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          className
        )}
      >
        <Trash2 className="size-3.5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this link?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{item.title}&rdquo; will be removed from your learning
              inbox. The video itself is untouched on YouTube.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove link</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Edit form state + save handler for `EditInboxItemButton` — kept out of the JSX. */
function useEditInboxItemDialog(item: InboxItem) {
  const updateItem = useInbox((state) => state.updateItem);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState(tagsToInput(item.tags));
  const [note, setNote] = useState(item.note);

  function openDialog() {
    setTitle(item.title);
    setTags(tagsToInput(item.tags));
    setNote(item.note);
    setOpen(true);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    updateItem(item.id, {
      title,
      tags: tags.split(","),
      note,
    });
    toast.success("Saved link updated.");
    setOpen(false);
  }

  return {
    open,
    setOpen: (value: boolean) => (value ? openDialog() : setOpen(false)),
    title,
    setTitle,
    tags,
    setTags,
    note,
    setNote,
    handleSave,
  };
}
