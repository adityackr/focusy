"use client";

import * as React from "react";
import {
  Clock,
  NotebookPen,
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
  addNote,
  removeNote,
  updateNote,
  useVideoNotes,
  type LearningNotesError,
  type NoteSource,
} from "@/shared/lib/learning-notes";
import { notePreview } from "@/shared/lib/note-preview";
import { NoteEditor } from "@/shared/components/notes/note-editor";
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

const ERROR_MESSAGES: Record<LearningNotesError, string> = {
  empty: "Write something first.",
  "too-large": "This note is too long — try splitting it up.",
  "not-found": "That note no longer exists.",
  storage: "Couldn't save the note in this browser.",
};

function errorMessage(error: LearningNotesError): string {
  return ERROR_MESSAGES[error] ?? "Couldn't save the note.";
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
  );
}

export interface NotesPanelProps {
  videoId: string;
  /** Where the note was written, stored for jump-back links. */
  source?: NoteSource | null;
  /** Live playback position for the note being composed. */
  getCurrentTime?: () => number | null;
  /** Seek the player — enables jump-to-timestamp on saved notes. */
  onSeek?: (seconds: number) => void;
  /** Optional context line under the heading (lesson / playlist title). */
  title?: string;
  className?: string;
}

/**
 * Lesson notes in a right-hand sheet: timestamped Markdown capture, playback
 * order list, inline editing and confirmed deletion. The trigger stays by the
 * player; every notes action happens inside the sheet.
 */
export function NotesPanel({
  videoId,
  source = null,
  getCurrentTime,
  onSeek,
  title,
  className,
}: NotesPanelProps) {
  const notes = useVideoNotes(videoId);
  const [open, setOpen] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [capturedTime, setCapturedTime] = React.useState<number | null>(null);
  const [attachTime, setAttachTime] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const deleteTarget = notes.find((note) => note.id === deleteId) ?? null;

  // Shift+N opens the sheet from the lesson page. Player shortcuts use
  // Space/K, J/L, arrows, M, C and F, so N is free; skip typing targets,
  // modified presses and any other open dialog (e.g. Studio).
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (open || event.repeat || event.defaultPrevented) return;
      if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "n" || isTypingTarget(event.target)) return;
      if (
        document.querySelector(
          '[role="dialog"][aria-modal="true"], [role="alertdialog"]',
        )
      ) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Discard unfinished drafts; notes already saved are untouched.
      setComposerOpen(false);
      setDraft("");
      setEditingId(null);
      setEditDraft("");
      setDeleteId(null);
    }
  };

  const seedTime = React.useCallback(() => {
    const time = getCurrentTime?.();
    const normalized =
      typeof time === "number" && Number.isFinite(time) && time >= 0
        ? Math.floor(time)
        : null;
    setCapturedTime(normalized);
    setAttachTime(normalized !== null);
    return normalized;
  }, [getCurrentTime]);

  const openComposer = () => {
    seedTime();
    setDraft("");
    setEditingId(null);
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setDraft("");
  };

  const saveDraft = () => {
    const markdown = draft.trim();
    if (!markdown) {
      toast.error(ERROR_MESSAGES.empty);
      return;
    }
    const result = addNote({
      videoId,
      markdown,
      timeSeconds: attachTime ? capturedTime : null,
      source,
    });
    if (!result.ok) {
      toast.error(errorMessage(result.error));
      return;
    }
    toast.success(
      attachTime && capturedTime !== null
        ? `Note saved at ${formatTimestamp(capturedTime)}`
        : "Note saved",
    );
    closeComposer();
  };

  const startEditing = (id: string, markdown: string) => {
    setComposerOpen(false);
    setEditingId(id);
    setEditDraft(markdown);
  };

  const saveEdit = (id: string) => {
    const result = updateNote(videoId, id, { markdown: editDraft });
    if (!result.ok) {
      toast.error(errorMessage(result.error));
      return;
    }
    toast.success("Note updated");
    setEditingId(null);
    setEditDraft("");
  };

  const deleteNote = (id: string) => {
    const result = removeNote(videoId, id);
    if (!result.ok) {
      toast.error(errorMessage(result.error));
      return;
    }
    if (editingId === id) setEditingId(null);
    setDeleteId(null);
    toast.success("Note deleted");
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open lesson notes"
        title="Open lesson notes (Shift+N)"
        aria-keyshortcuts="Shift+N"
        aria-haspopup="dialog"
        className={cn("gap-1.5", className)}
      >
        <NotebookPen className="size-4" />
        Notes
        {notes.length > 0 && (
          <Badge variant="secondary" className="px-1.5 text-[10px]">
            {notes.length}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          closeLabel="Close notes"
          className="w-full sm:w-3/4 sm:max-w-none"
        >
          <SheetHeader className="bg-card">
            <SheetTitle className="flex items-center gap-2">
              <NotebookPen className="size-4 text-primary" aria-hidden />
              Notes
              {notes.length > 0 && (
                <Badge variant="secondary" className="px-1.5 text-[10px]">
                  {notes.length}
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
                  <h3 className="text-sm font-semibold">New note</h3>
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
                <NoteEditor
                  key={`new:${videoId}`}
                  initialMarkdown=""
                  onChange={setDraft}
                  onSubmit={saveDraft}
                  autoFocus
                  ariaLabel="New note"
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (attachTime) {
                        setAttachTime(false);
                        return;
                      }
                      if (capturedTime === null) seedTime();
                      else setAttachTime(true);
                    }}
                    title={
                      attachTime
                        ? "Save as a note for the whole lesson"
                        : "Attach the current playback time"
                    }
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[11px] font-medium tabular-nums transition-colors",
                      attachTime
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Clock className="size-3.5" aria-hidden />
                    {attachTime && capturedTime !== null
                      ? formatTimestamp(capturedTime)
                      : "Whole lesson"}
                  </button>
                  {attachTime && getCurrentTime && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={seedTime}
                      title="Use the player's current time"
                    >
                      <RefreshCw className="size-3" /> Now
                    </Button>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {attachTime && capturedTime !== null
                      ? "Jump back to this moment later."
                      : "Saved in this browser only."}
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
                      Save note
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {notes.length === 0
                      ? "Timestamps stay attached to this lesson"
                      : `${notes.length} note${notes.length === 1 ? "" : "s"} in playback order`}
                  </p>
                  <Button type="button" size="sm" onClick={openComposer}>
                    <Plus /> Add note
                  </Button>
                </div>

                {notes.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-8 text-center">
                    <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <NotebookPen className="size-5" aria-hidden />
                    </span>
                    <p className="mt-3 text-sm font-medium">No notes yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                      Capture a moment, an idea, or a code snippet — it stays
                      attached to this lesson and remembers where you were.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={openComposer}
                    >
                      <Plus /> Add your first note
                    </Button>
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {notes.map((note) => {
                      const editing = editingId === note.id;
                      const preview = notePreview(note.markdown);
                      return (
                        <li
                          key={note.id}
                          className="rounded-lg border bg-background/60 p-2.5"
                        >
                          <div className="flex items-center gap-2">
                            {note.timeSeconds === null ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                <Clock className="size-3" aria-hidden /> Whole lesson
                              </span>
                            ) : onSeek ? (
                              <button
                                type="button"
                                onClick={() => onSeek(note.timeSeconds!)}
                                title={`Jump to ${formatTimestamp(note.timeSeconds)}`}
                                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary tabular-nums transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <PlayCircle className="size-3.5" aria-hidden />
                                {formatTimestamp(note.timeSeconds)}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                                <Clock className="size-3" aria-hidden />
                                {formatTimestamp(note.timeSeconds)}
                              </span>
                            )}

                            <div className="ml-auto flex items-center gap-1">
                              {!editing && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground"
                                  aria-label={`Edit note${note.timeSeconds === null ? "" : ` at ${formatTimestamp(note.timeSeconds)}`}`}
                                  onClick={() =>
                                    startEditing(note.id, note.markdown)
                                  }
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                aria-label={`Delete note${note.timeSeconds === null ? "" : ` at ${formatTimestamp(note.timeSeconds)}`}`}
                                onClick={() => setDeleteId(note.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          {editing ? (
                            <div className="mt-2">
                              <NoteEditor
                                key={`edit:${note.id}`}
                                initialMarkdown={note.markdown}
                                onChange={setEditDraft}
                                onSubmit={() => saveEdit(note.id)}
                                autoFocus
                                ariaLabel="Edit note"
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
                                  onClick={() => saveEdit(note.id)}
                                  disabled={!editDraft.trim()}
                                >
                                  Save changes
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1.5 line-clamp-1 text-sm leading-snug text-muted-foreground">
                              {preview || "No text"}
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
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.timeSeconds != null
                ? `The note at ${formatTimestamp(deleteTarget.timeSeconds)} will be removed from this lesson.`
                : "This note will be removed from this lesson."}{" "}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteNote(deleteId)}
            >
              Delete note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
