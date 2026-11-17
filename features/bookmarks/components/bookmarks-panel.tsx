"use client";

import * as React from "react";
import {
  Bookmark,
  Clock,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { formatTimestamp } from "@/shared/lib/chapters";
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
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Textarea } from "@/shared/ui/textarea";
import {
  MAX_BOOKMARK_DESCRIPTION_LENGTH,
  type Bookmark as BookmarkEntry,
  type BookmarkSource,
  type BookmarksError,
} from "../lib/bookmark";
import {
  addBookmark,
  removeBookmark,
  updateBookmark,
  useVideoBookmarks,
} from "../lib/bookmark-store";

const ERROR_MESSAGES: Record<BookmarksError, string> = {
  empty: "Add a short description first.",
  "too-long": "Keep the description under 280 characters.",
  "not-found": "That bookmark no longer exists.",
  storage: "Couldn't save the bookmark in this browser.",
};

function errorMessage(error: BookmarksError): string {
  return ERROR_MESSAGES[error] ?? "Couldn't save the bookmark.";
}

function capturedTime(getCurrentTime?: () => number | null): number {
  const time = getCurrentTime?.();
  return typeof time === "number" && Number.isFinite(time) && time >= 0
    ? Math.floor(time)
    : 0;
}

export interface BookmarksPanelProps {
  videoId: string;
  /** The lesson this player is showing, stored for jump-back links. */
  source?: BookmarkSource | null;
  /** Live playback position captured when composing a bookmark. */
  getCurrentTime?: () => number | null;
  /** Seek this player — enables in-place jump-to-moment. */
  onSeek?: (seconds: number) => void;
  /** Optional context line under the heading (lesson / playlist title). */
  title?: string;
  /** Reports sheet visibility. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Timestamped bookmarks for the lesson in the player: capture the current
 * moment with a short description, jump back to saved moments in place, and
 * edit or delete them. Everything stays in this browser.
 */
export function BookmarksPanel({
  videoId,
  source = null,
  getCurrentTime,
  onSeek,
  title,
  onOpenChange,
  className,
}: BookmarksPanelProps) {
  const bookmarks = useVideoBookmarks(videoId);
  const [open, setOpen] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [time, setTime] = React.useState(0);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const deleteTarget =
    bookmarks.find((bookmark) => bookmark.id === deleteId) ?? null;

  React.useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const openComposer = () => {
    setTime(capturedTime(getCurrentTime));
    setDraft("");
    setEditingId(null);
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setDraft("");
  };

  const saveDraft = () => {
    const description = draft.trim();
    if (!description) {
      toast.error(ERROR_MESSAGES.empty);
      return;
    }
    const result = addBookmark({
      videoId,
      source,
      timeSeconds: time,
      description,
    });
    if (!result.ok) {
      toast.error(errorMessage(result.error));
      return;
    }
    toast.success(`Bookmark saved at ${formatTimestamp(time)}`);
    closeComposer();
  };

  const startEditing = (bookmark: BookmarkEntry) => {
    setComposerOpen(false);
    setEditingId(bookmark.id);
    setEditDraft(bookmark.description);
  };

  const saveEdit = (id: string) => {
    const result = updateBookmark(id, { description: editDraft });
    if (!result.ok) {
      toast.error(errorMessage(result.error));
      return;
    }
    toast.success("Bookmark updated");
    setEditingId(null);
    setEditDraft("");
  };

  const deleteBookmark = (id: string) => {
    const result = removeBookmark(id);
    if (!result.ok) {
      toast.error(errorMessage(result.error));
      return;
    }
    if (editingId === id) setEditingId(null);
    setDeleteId(null);
    toast.success("Bookmark deleted");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setComposerOpen(false);
      setDraft("");
      setEditingId(null);
      setEditDraft("");
      setDeleteId(null);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open lesson bookmarks"
        aria-haspopup="dialog"
        className={cn("gap-1.5", className)}
      >
        <Bookmark className="size-4" />
        Bookmarks
        {bookmarks.length > 0 && (
          <Badge variant="secondary" className="px-1.5 text-[10px]">
            {bookmarks.length}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          closeLabel="Close bookmarks"
          className="w-full sm:w-3/4 sm:max-w-none"
        >
          <SheetHeader className="bg-card">
            <SheetTitle className="flex items-center gap-2">
              <Bookmark className="size-4 text-primary" aria-hidden />
              Bookmarks
              {bookmarks.length > 0 && (
                <Badge variant="secondary" className="px-1.5 text-[10px]">
                  {bookmarks.length}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription className="truncate">
              {title ? `${title} · ` : ""}Saved in this browser only.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            {composerOpen ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Bookmark a moment</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={closeComposer}
                  >
                    <X /> Close
                  </Button>
                </div>

                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="What happens here? e.g. The clearest explanation of closures."
                  aria-label="Bookmark description"
                  maxLength={MAX_BOOKMARK_DESCRIPTION_LENGTH}
                  autoFocus
                  rows={3}
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 font-mono text-[11px] font-semibold text-primary tabular-nums">
                    <Clock className="size-3.5" aria-hidden />
                    {formatTimestamp(time)}
                  </span>
                  {getCurrentTime && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setTime(capturedTime(getCurrentTime))}
                      title="Use the player's current time"
                    >
                      <RefreshCw className="size-3" /> Now
                    </Button>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {draft.trim().length}/{MAX_BOOKMARK_DESCRIPTION_LENGTH}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={closeComposer}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveDraft}
                      disabled={!draft.trim()}
                    >
                      Save bookmark
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {bookmarks.length === 0
                      ? "Moments stay attached to this lesson"
                      : `${bookmarks.length} moment${bookmarks.length === 1 ? "" : "s"} in playback order`}
                  </p>
                  <Button type="button" size="sm" onClick={openComposer}>
                    <Plus /> Add bookmark
                  </Button>
                </div>

                {bookmarks.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-8 text-center">
                    <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Bookmark className="size-5" aria-hidden />
                    </span>
                    <p className="mt-3 text-sm font-medium">No bookmarks yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                      Bookmark the important bits — an explanation, a demo, a
                      definition — and jump back to them without scrubbing
                      through the video.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={openComposer}
                    >
                      <Plus /> Bookmark this moment
                    </Button>
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {bookmarks.map((bookmark) => {
                      const editing = editingId === bookmark.id;
                      return (
                        <li
                          key={bookmark.id}
                          className="rounded-lg border bg-background/60 p-2.5"
                        >
                          <div className="flex items-center gap-2">
                            {onSeek ? (
                              <button
                                type="button"
                                onClick={() => onSeek(bookmark.timeSeconds)}
                                title={`Jump to ${formatTimestamp(bookmark.timeSeconds)}`}
                                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary tabular-nums transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <PlayCircle className="size-3.5" aria-hidden />
                                {formatTimestamp(bookmark.timeSeconds)}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                                <Clock className="size-3" aria-hidden />
                                {formatTimestamp(bookmark.timeSeconds)}
                              </span>
                            )}

                            <div className="ml-auto flex items-center gap-1">
                              {!editing && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground"
                                  aria-label={`Edit bookmark at ${formatTimestamp(bookmark.timeSeconds)}`}
                                  onClick={() => startEditing(bookmark)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                aria-label={`Delete bookmark at ${formatTimestamp(bookmark.timeSeconds)}`}
                                onClick={() => setDeleteId(bookmark.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          {editing ? (
                            <div className="mt-2">
                              <Textarea
                                value={editDraft}
                                onChange={(event) =>
                                  setEditDraft(event.target.value)
                                }
                                aria-label="Edit bookmark description"
                                maxLength={MAX_BOOKMARK_DESCRIPTION_LENGTH}
                                rows={3}
                                autoFocus
                              />
                              <div className="mt-2 flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingId(null)}
                                >
                                  <X /> Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => saveEdit(bookmark.id)}
                                  disabled={!editDraft.trim()}
                                >
                                  Save changes
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1.5 text-sm leading-snug">
                              {bookmark.description}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(next) => !next && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bookmark?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `The bookmark at ${formatTimestamp(deleteTarget.timeSeconds)} will be removed from this lesson.`
                : "This bookmark will be removed from this lesson."}{" "}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteBookmark(deleteId)}
            >
              Delete bookmark
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
