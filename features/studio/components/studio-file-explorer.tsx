"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import {
  buildStudioFileTree,
  fileDirname,
  isValidFileName,
  joinFilePath,
  type StudioTreeEntry,
} from "../lib/file-utils";
import type { StudioFile } from "../types/studio.types";

type DeleteTarget = {
  kind: "file" | "folder";
  path: string;
  name: string;
};

function InlineRename({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="min-w-0 flex-1 py-0.5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onCancel();
          }
        }}
        aria-label="New name"
        spellCheck={false}
        className="h-6 min-w-0 px-1.5 font-mono text-[11px]"
      />
    </form>
  );
}

/**
 * File tree for a workspace. Folders are derived from file paths; empty
 * folders aren't representable, so a folder is created by adding a file inside
 * it. Deletion and folder renames operate on all files under the path.
 */
export function StudioFileExplorer({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onRenameFolder,
  onDeleteFolder,
  className,
}: {
  files: StudioFile[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => string | null;
  onRenameFile: (from: string, to: string) => string | null;
  onDeleteFile: (path: string) => string | null;
  onRenameFolder: (from: string, to: string) => string | null;
  onDeleteFolder: (path: string) => string | null;
  className?: string;
}) {
  const tree = useMemo(() => buildStudioFileTree(files), [files]);

  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);

  function startCreate() {
    setCreating(true);
    setCreateDraft("");
    setCreateError(null);
  }

  function cancelCreate() {
    setCreating(false);
    setCreateDraft("");
    setCreateError(null);
  }

  function submitCreate() {
    const error = onCreateFile(createDraft);
    if (error) {
      setCreateError(error);
      return;
    }
    setCreating(false);
    setCreateDraft("");
    setCreateError(null);
  }

  function startRename(entry: StudioTreeEntry) {
    setRenamingPath(entry.path);
    setRenameDraft(entry.name);
    setRenameError(null);
  }

  function cancelRename() {
    setRenamingPath(null);
    setRenameDraft("");
    setRenameError(null);
  }

  function submitRename(entry: StudioTreeEntry) {
    if (!isValidFileName(renameDraft)) {
      setRenameError("Enter a name without slashes.");
      return;
    }
    const nextPath = joinFilePath(fileDirname(entry.path), renameDraft);
    if (!nextPath) {
      setRenameError("Enter a valid name.");
      return;
    }
    const error =
      entry.kind === "file"
        ? onRenameFile(entry.path, nextPath)
        : onRenameFolder(entry.path, nextPath);
    if (error) {
      setRenameError(error);
      return;
    }
    cancelRename();
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const error =
      pendingDelete.kind === "file"
        ? onDeleteFile(pendingDelete.path)
        : onDeleteFolder(pendingDelete.path);
    if (error) toast.error(error);
    setPendingDelete(null);
  }

  function toggleFolder(path: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function isRenaming(entry: StudioTreeEntry): boolean {
    return renamingPath === entry.path;
  }

  function actions(entry: StudioTreeEntry) {
    return (
      <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 [&_svg]:size-3"
          aria-label={`Rename ${entry.name}`}
          onClick={() => startRename(entry)}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-destructive [&_svg]:size-3"
          aria-label={`Delete ${entry.name}`}
          onClick={() =>
            setPendingDelete({
              kind: entry.kind,
              path: entry.path,
              name: entry.name,
            })
          }
        >
          <Trash2 />
        </Button>
      </div>
    );
  }

  function renderEntry(entry: StudioTreeEntry, depth: number): React.ReactNode {
    const renaming = isRenaming(entry);
    const rowPadding = { paddingLeft: `${depth * 12 + 4}px` };

    if (entry.kind === "folder") {
      const open = !collapsed.has(entry.path);
      return (
        <li key={entry.path}>
          <div
            className="group flex items-center gap-1 rounded-md pr-1 hover:bg-accent"
            style={rowPadding}
          >
            <button
              type="button"
              onClick={() => toggleFolder(entry.path)}
              aria-label={open ? `Collapse ${entry.name}` : `Expand ${entry.name}`}
              aria-expanded={open}
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              {open ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </button>
            {open ? (
              <FolderOpen className="size-3.5 shrink-0 text-primary/80" />
            ) : (
              <Folder className="size-3.5 shrink-0 text-primary/80" />
            )}
            {renaming ? (
              <InlineRename
                value={renameDraft}
                onChange={(value) => {
                  setRenameDraft(value);
                  setRenameError(null);
                }}
                onSubmit={() => submitRename(entry)}
                onCancel={cancelRename}
              />
            ) : (
              <button
                type="button"
                onClick={() => toggleFolder(entry.path)}
                className="min-w-0 flex-1 cursor-pointer truncate py-1.5 text-left text-xs font-medium"
                title={entry.path}
              >
                {entry.name}
              </button>
            )}
            {!renaming ? actions(entry) : null}
          </div>
          {renaming && renameError ? (
            <p role="alert" className="px-2 pb-1 text-[11px] text-destructive">
              {renameError}
            </p>
          ) : null}
          {open ? (
            <ul>{entry.children.map((child) => renderEntry(child, depth + 1))}</ul>
          ) : null}
        </li>
      );
    }

    const active = entry.path === activeFile;
    return (
      <li key={entry.path}>
        <div
          className={cn(
            "group flex items-center gap-1 rounded-md pr-1",
            active ? "bg-secondary" : "hover:bg-accent"
          )}
          style={rowPadding}
        >
          <span className="w-5 shrink-0" aria-hidden />
          <FileCode2
            className={cn(
              "size-3.5 shrink-0",
              active ? "text-primary" : "text-muted-foreground"
            )}
          />
          {renaming ? (
            <InlineRename
              value={renameDraft}
              onChange={(value) => {
                setRenameDraft(value);
                setRenameError(null);
              }}
              onSubmit={() => submitRename(entry)}
              onCancel={cancelRename}
            />
          ) : (
            <button
              type="button"
              onClick={() => onSelectFile(entry.path)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "min-w-0 flex-1 cursor-pointer truncate py-1.5 text-left font-mono text-[11px]",
                active ? "text-foreground" : "text-muted-foreground"
              )}
              title={entry.path}
            >
              {entry.name}
            </button>
          )}
          {!renaming ? actions(entry) : null}
        </div>
        {renaming && renameError ? (
          <p role="alert" className="px-2 pb-1 text-[11px] text-destructive">
            {renameError}
          </p>
        ) : null}
      </li>
    );
  }

  const deletingFolderFiles =
    pendingDelete?.kind === "folder"
      ? files.filter((file) => file.path.startsWith(`${pendingDelete.path}/`))
          .length
      : 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-muted/10", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-2.5 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Files
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 [&_svg]:size-3.5"
          onClick={startCreate}
          aria-label="New file"
          title="New file"
        >
          <Plus />
        </Button>
      </div>

      {creating ? (
        <form
          className="shrink-0 border-b p-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitCreate();
          }}
        >
          <Input
            autoFocus
            value={createDraft}
            onChange={(event) => {
              setCreateDraft(event.target.value);
              setCreateError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                cancelCreate();
              }
            }}
            placeholder="src/App.jsx"
            aria-label="New file path"
            spellCheck={false}
            className="h-7 font-mono text-[11px]"
          />
          <div className="mt-1.5 flex gap-1">
            <Button type="submit" size="sm" className="h-7 px-2 text-[11px]">
              Create
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={cancelCreate}
            >
              Cancel
            </Button>
          </div>
          {createError ? (
            <p role="alert" className="mt-1 text-[11px] text-destructive">
              {createError}
            </p>
          ) : null}
        </form>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {tree.length > 0 ? (
          <ul>{tree.map((entry) => renderEntry(entry, 0))}</ul>
        ) : (
          <p className="px-2 py-3 text-[11px] text-muted-foreground">
            No files yet. Create one to start editing.
          </p>
        )}
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDelete?.kind === "folder" ? "folder" : "file"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "folder"
                ? `"${pendingDelete.name}" and its ${deletingFolderFiles} file${
                    deletingFolderFiles === 1 ? "" : "s"
                  } will be removed from this project.`
                : `"${pendingDelete?.name ?? ""}" will be removed from this project.`}{" "}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
