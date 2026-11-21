"use client";

import * as React from "react";
import {
  BookOpen,
  ChevronDown,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import {
  formatResourceSize,
  isFileResourceKind,
  MAX_RESOURCE_CONTENT_LENGTH,
  MAX_RESOURCE_DESCRIPTION_LENGTH,
  MAX_RESOURCE_FILE_BYTES,
  MAX_RESOURCE_TITLE_LENGTH,
  RESOURCE_KINDS,
  RESOURCE_KIND_LABELS,
  resourcesForCourse,
  resourcesForPlaylist,
  type Resource,
  type ResourceDraft,
  type ResourceError,
  type ResourceKind,
} from "../lib/resource";
import {
  addFileResource,
  addTextResource,
  removeResource,
  useAllResources,
} from "../lib/resource-store";
import { readResourceFile } from "../lib/resource-db";
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
import { Input } from "@/shared/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Textarea } from "@/shared/ui/textarea";

const ERROR_MESSAGES: Record<ResourceError, string> = {
  empty: "Add a title and the resource details first.",
  "invalid-url": "Enter a full http(s) link, like https://react.dev/learn.",
  "too-large": "That attachment is too large — the limit is 25 MB.",
  "not-found": "That attachment no longer exists.",
  storage: "Couldn't save the attachment in this browser.",
  "file-store": "Couldn't store the file in this browser.",
  "invalid-file": "Choose a PDF for a PDF resource, or pick another file.",
};

function errorMessage(error: ResourceError): string {
  return ERROR_MESSAGES[error] ?? "Couldn't save the attachment.";
}

const KIND_ICONS: Record<ResourceKind, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  link: Link2,
  snippet: Code2,
  doc: BookOpen,
  download: Download,
};

const COMPOSER_KINDS: ResourceKind[] = [...RESOURCE_KINDS];

function filenameFor(resource: Resource): string {
  return resource.fileName || resource.title;
}

/** One-line hint shown under a resource title in the compact list. */
function summaryFor(resource: Resource): string {
  if (resource.description) return resource.description;
  if (resource.kind === "snippet") {
    return resource.language ? `${resource.language} snippet` : "Code snippet";
  }
  if (resource.url) return resource.url;
  if (isFileResourceKind(resource.kind)) {
    return [resource.fileName, formatResourceSize(resource.sizeBytes)]
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

async function openAttachment(resource: Resource): Promise<void> {
  if (resource.url) {
    window.open(resource.url, "_blank", "noopener,noreferrer");
    return;
  }
  if (!isFileResourceKind(resource.kind)) return;

  // Open the tab up front so the async IndexedDB read doesn't get popup-blocked.
  const win = window.open("", "_blank");
  try {
    const file = await readResourceFile(resource.id);
    if (!file) {
      win?.close();
      toast.error("That file isn't saved in this browser anymore.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([file.data], { type: file.mimeType }),
    );
    if (win) win.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    win?.close();
    toast.error("Couldn't open that attachment.");
  }
}

async function downloadAttachment(resource: Resource): Promise<void> {
  if (!isFileResourceKind(resource.kind)) return;
  try {
    const file = await readResourceFile(resource.id);
    if (!file) {
      toast.error("That file isn't saved in this browser anymore.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([file.data], { type: file.mimeType }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameFor(resource);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Couldn't download that attachment.");
  }
}

export interface ResourcesPanelProps {
  /** Course owner. Pass instead of `playlistId`. */
  courseId?: string;
  courseTitle?: string;
  /** Playlist owner. Pass instead of `courseId`. */
  playlistId?: string;
  playlistTitle?: string;
  /** Lesson the player is showing; null hides the lesson/collection scope picker. */
  chapterId?: string | null;
  chapterTitle?: string;
  /** Reports sheet visibility, so the page can track resource time. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Attach and open resources for a course, playlist or a single lesson: PDFs,
 * reference links, code snippets, documentation and downloadable files.
 * Everything stays in this browser and travels with the normal Focusy backup
 * file.
 */
export function ResourcesPanel({
  courseId,
  courseTitle,
  playlistId,
  playlistTitle,
  chapterId = null,
  chapterTitle,
  onOpenChange,
  className,
}: ResourcesPanelProps) {
  const isPlaylist = Boolean(playlistId);
  const ownerId = (playlistId ?? courseId ?? "").trim();
  const collectionName = isPlaylist ? "playlist" : "course";
  const collectionTitle = isPlaylist ? playlistTitle : courseTitle;

  const resources = useAllResources();
  const sorted = React.useMemo(
    () =>
      isPlaylist
        ? resourcesForPlaylist(resources, ownerId)
        : resourcesForCourse(resources, ownerId),
    [resources, isPlaylist, ownerId],
  );
  const groups = React.useMemo(
    () =>
      [
        {
          key: "lesson",
          label: "Lesson resources",
          items: sorted.filter((resource) => resource.chapterId),
        },
        {
          key: "collection",
          label: `Whole ${collectionName}`,
          items: sorted.filter((resource) => !resource.chapterId),
        },
      ].filter((group) => group.items.length > 0),
    [sorted, collectionName],
  );

  const [open, setOpen] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [kind, setKind] = React.useState<ResourceKind>("link");
  const [scope, setScope] = React.useState<"lesson" | "collection">(
    chapterId ? "lesson" : "collection",
  );
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [content, setContent] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const deleteTarget = sorted.find((item) => item.id === deleteId) ?? null;

  React.useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const resetComposer = () => {
    setKind("link");
    setScope(chapterId ? "lesson" : "collection");
    setTitle("");
    setUrl("");
    setDescription("");
    setContent("");
    setLanguage("");
    setFile(null);
  };

  const openComposer = () => {
    resetComposer();
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    resetComposer();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setComposerOpen(false);
      resetComposer();
      setDeleteId(null);
      setExpandedId(null);
    }
  };

  const save = async () => {
    if (saving) return;
    const draft: ResourceDraft = {
      courseId: isPlaylist ? undefined : ownerId,
      playlistId: isPlaylist ? ownerId : undefined,
      chapterId: scope === "lesson" ? chapterId : null,
      kind,
      title,
      description,
      url,
      content,
      language,
    };

    setSaving(true);
    try {
      const result = isFileResourceKind(kind)
        ? file
          ? await addFileResource({ ...draft, file })
          : { ok: false as const, error: "invalid-file" as const }
        : addTextResource(draft);

      if (!result.ok) {
        toast.error(errorMessage(result.error));
        return;
      }
      toast.success(
        scope === "lesson" && chapterTitle
          ? `Saved to “${chapterTitle}”`
          : `Saved to this ${collectionName}`,
      );
      closeComposer();
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (id: string) => {
    const result = await removeResource(id);
    if (!result.ok) {
      toast.error(errorMessage(result.error));
      return;
    }
    toast.success("Attachment deleted");
    setDeleteId(null);
  };

  const saveDisabled =
    saving ||
    !title.trim() ||
    (isFileResourceKind(kind) ? !file : false) ||
    (kind === "link" || kind === "doc" ? !url.trim() : false) ||
    (kind === "snippet" ? !content.trim() : false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Open ${collectionName} resources`}
        aria-haspopup="dialog"
        className={cn("gap-1.5", className)}
      >
        <Paperclip className="size-4" />
        Resources
        {sorted.length > 0 && (
          <Badge variant="secondary" className="px-1.5 text-[10px]">
            {sorted.length}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          closeLabel="Close resources"
          className="w-full sm:w-3/4 sm:max-w-none"
        >
          <SheetHeader className="bg-card">
            <SheetTitle className="flex items-center gap-2">
              <Paperclip className="size-4 text-primary" aria-hidden />
              Resources
              {sorted.length > 0 && (
                <Badge variant="secondary" className="px-1.5 text-[10px]">
                  {sorted.length}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription className="truncate">
              {collectionTitle ? `${collectionTitle} · ` : ""}
              PDFs, links, snippets and files — saved in this browser and
              included in backups.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            {composerOpen ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Attach a resource</h3>
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

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {COMPOSER_KINDS.map((option) => {
                    const Icon = KIND_ICONS[option];
                    const active = kind === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setKind(option);
                          setFile(null);
                        }}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                          active
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {RESOURCE_KIND_LABELS[option]}
                      </button>
                    );
                  })}
                </div>

                {chapterId && (
                  <fieldset className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <legend className="mb-1 text-[11px] text-muted-foreground">
                      Attach to
                    </legend>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        name="resource-scope"
                        className="size-3.5"
                        checked={scope === "lesson"}
                        onChange={() => setScope("lesson")}
                      />
                      This lesson
                      {chapterTitle ? ` (${chapterTitle})` : ""}
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        name="resource-scope"
                        className="size-3.5"
                        checked={scope === "collection"}
                        onChange={() => setScope("collection")}
                      />
                      Whole {collectionName}
                    </label>
                  </fieldset>
                )}

                <div className="mt-3 space-y-2">
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={
                      isFileResourceKind(kind)
                        ? "Name (defaults to the file name)"
                        : "Name, e.g. React docs — Hooks"
                    }
                    aria-label="Resource title"
                    maxLength={MAX_RESOURCE_TITLE_LENGTH}
                    autoFocus
                  />

                  {(kind === "link" || kind === "doc") && (
                    <Input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://react.dev/learn"
                      aria-label="Resource link"
                      inputMode="url"
                    />
                  )}

                  {kind === "snippet" && (
                    <>
                      <Input
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        placeholder="Language (optional), e.g. tsx"
                        aria-label="Snippet language"
                        maxLength={40}
                      />
                      <Textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Paste a code snippet or short example…"
                        aria-label="Snippet content"
                        rows={8}
                        maxLength={MAX_RESOURCE_CONTENT_LENGTH}
                        className="font-mono text-xs"
                      />
                    </>
                  )}

                  {isFileResourceKind(kind) && (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground hover:bg-accent/40">
                      <Upload className="size-4 shrink-0" />
                      <span className="min-w-0 truncate">
                        {file
                          ? `${file.name} · ${formatResourceSize(file.size)}`
                          : kind === "pdf"
                            ? "Choose a PDF (up to 25 MB)"
                            : "Choose a file to download later (up to 25 MB)"}
                      </span>
                      <input
                        type="file"
                        accept={kind === "pdf" ? "application/pdf,.pdf" : undefined}
                        className="hidden"
                        onChange={(event) => {
                          const picked = event.target.files?.[0] ?? null;
                          event.target.value = "";
                          if (picked && picked.size > MAX_RESOURCE_FILE_BYTES) {
                            toast.error(ERROR_MESSAGES["too-large"]);
                            return;
                          }
                          setFile(picked);
                          if (picked && !title.trim()) {
                            setTitle(picked.name);
                          }
                        }}
                      />
                    </label>
                  )}

                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={`Optional note — why this matters for the ${collectionName}`}
                    aria-label="Resource description"
                    rows={2}
                    maxLength={MAX_RESOURCE_DESCRIPTION_LENGTH}
                  />
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
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
                    onClick={() => void save()}
                    disabled={saveDisabled}
                  >
                    {saving && <Loader2 className="size-3.5 animate-spin" />}
                    {saving ? "Saving…" : "Save resource"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {sorted.length === 0
                      ? `Keep the ${collectionName} material next to the lessons`
                      : `${sorted.length} resource${sorted.length === 1 ? "" : "s"} attached`}
                  </p>
                  <Button type="button" size="sm" onClick={openComposer}>
                    <Plus /> Add resource
                  </Button>
                </div>

                {sorted.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-8 text-center">
                    <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Paperclip className="size-5" aria-hidden />
                    </span>
                    <p className="mt-3 text-sm font-medium">No resources yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                      Attach the official docs, a PDF cheat sheet, a reference
                      link or a code snippet to this {collectionName} or a
                      single lesson.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={openComposer}
                    >
                      <Plus /> Add your first resource
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groups.map((group) => (
                      <section key={group.key} className="space-y-1.5">
                        <div className="flex items-center justify-between px-0.5">
                          <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            {group.label}
                          </h4>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {group.items.length}
                          </span>
                        </div>
                        <ol className="space-y-1.5">
                          {group.items.map((resource) => {
                            const Icon = KIND_ICONS[resource.kind];
                            const isFile = isFileResourceKind(resource.kind);
                            const summary = summaryFor(resource);
                            const hasDetails = Boolean(
                              resource.url ||
                              (resource.kind === "snippet" && resource.content),
                            );
                            const expanded =
                              hasDetails && expandedId === resource.id;
                            return (
                              <li
                                key={resource.id}
                                className="overflow-hidden rounded-lg border bg-background/60"
                              >
                                <div className="flex items-center gap-1 pr-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      hasDetails &&
                                      setExpandedId(
                                        expanded ? null : resource.id,
                                      )
                                    }
                                    aria-expanded={
                                      hasDetails ? expanded : undefined
                                    }
                                    className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left"
                                  >
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                      <Icon className="size-3.5" aria-hidden />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="flex items-center gap-1.5">
                                        <span
                                          className="truncate text-sm font-medium"
                                          title={resource.title}
                                        >
                                          {resource.title}
                                        </span>
                                        <Badge
                                          variant="secondary"
                                          className="shrink-0 px-1.5 text-[10px]"
                                        >
                                          {RESOURCE_KIND_LABELS[resource.kind]}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="shrink-0 px-1.5 text-[10px]"
                                        >
                                          {resource.chapterId
                                            ? "Lesson"
                                            : isPlaylist
                                              ? "Playlist"
                                              : "Course"}
                                        </Badge>
                                      </span>
                                      {summary && (
                                        <span
                                          className="mt-0.5 block truncate text-[11px] text-muted-foreground"
                                          title={summary}
                                        >
                                          {summary}
                                        </span>
                                      )}
                                    </span>
                                    {hasDetails && (
                                      <ChevronDown
                                        className={cn(
                                          "size-3.5 shrink-0 text-muted-foreground transition-transform",
                                          expanded && "rotate-180",
                                        )}
                                        aria-hidden
                                      />
                                    )}
                                  </button>

                                  <div className="flex shrink-0 items-center">
                                    {resource.url && (
                                      <a
                                        href={resource.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={`Open ${resource.title}`}
                                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                                      >
                                        <ExternalLink className="size-3.5" />
                                      </a>
                                    )}
                                    {isFile && (
                                      <>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="size-7 text-muted-foreground"
                                          aria-label={`Open ${resource.title}`}
                                          onClick={() =>
                                            void openAttachment(resource)
                                          }
                                        >
                                          <ExternalLink className="size-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="size-7 text-muted-foreground"
                                          aria-label={`Download ${resource.title}`}
                                          onClick={() =>
                                            void downloadAttachment(resource)
                                          }
                                        >
                                          <Download className="size-3.5" />
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 text-muted-foreground hover:text-destructive"
                                      aria-label={`Delete ${resource.title}`}
                                      onClick={() => setDeleteId(resource.id)}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                {expanded && (
                                  <div className="space-y-1.5 border-t px-2.5 py-2">
                                    {resource.url && (
                                      <a
                                        href={resource.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block truncate text-xs font-medium text-primary hover:underline"
                                      >
                                        {resource.url}
                                      </a>
                                    )}
                                    {resource.kind === "snippet" &&
                                      resource.content && (
                                        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed">
                                          <code>{resource.content}</code>
                                        </pre>
                                      )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      </section>
                    ))}
                  </div>
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
            <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.title}” will be removed from this ${collectionName}`
                : `This resource will be removed from this ${collectionName}`}
              {deleteTarget && isFileResourceKind(deleteTarget.kind)
                ? ", including its stored file."
                : "."}{" "}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && void deleteResource(deleteId)}
            >
              Delete resource
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
