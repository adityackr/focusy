"use client";

import dynamic from "next/dynamic";
import { Code2, Maximize2, Minimize2, MonitorPlay } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import {
  addStudioFile,
  deleteStudioFile,
  deleteStudioFolder,
  renameStudioFile,
  renameStudioFolder,
} from "../lib/studio-files";
import {
  EMPTY_STUDIO_RUNTIME_SNAPSHOT,
  type StudioRuntimeSnapshot,
} from "../lib/runtime";
import { STUDIO_TEMPLATES } from "../lib/templates";
import { useStudioWorkspaces } from "../store/studio-store";
import { useStudioPreferences } from "../store/studio-preferences-store";
import type { StudioWorkspace } from "../types/studio.types";
import { StudioEditor } from "./studio-editor";
import { StudioEditorPreferences } from "./studio-editor-preferences";
import { StudioFileExplorer } from "./studio-file-explorer";
import { StudioPackageManager } from "./studio-package-manager";

const StudioRuntime = dynamic(
  () => import("./studio-runtime").then((module) => module.StudioRuntime),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/20">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    ),
  }
);

export type StudioWorkspaceViewVariant = "page" | "lesson";

function StudioMobileSwitch({
  value,
  onChange,
}: {
  value: "editor" | "preview";
  onChange: (value: "editor" | "preview") => void;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/30 p-1 xl:hidden"
      role="tablist"
      aria-label="Studio panel"
    >
      {(
        [
          { id: "editor", label: "Editor", icon: Code2 },
          { id: "preview", label: "Preview", icon: MonitorPlay },
        ] as const
      ).map((panel) => {
        const Icon = panel.icon;
        const active = value === panel.id;
        return (
          <button
            key={panel.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(panel.id)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {panel.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The editing surface shared by the standalone Studio page and lesson panels:
 * file explorer, Monaco editor, Sandpack preview and dependency manager.
 * Workspace loading and persistence stay with the caller.
 */
export function StudioWorkspaceView({
  workspace,
  updateWorkspace,
  variant = "page",
  leading,
  className,
}: {
  workspace: StudioWorkspace;
  updateWorkspace: (
    updater: (workspace: StudioWorkspace) => StudioWorkspace
  ) => void;
  variant?: StudioWorkspaceViewVariant;
  /** Extra content for the page layout's left column (e.g. the tutorial). */
  leading?: ReactNode;
  className?: string;
}) {
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<StudioRuntimeSnapshot>(
    EMPTY_STUDIO_RUNTIME_SNAPSHOT
  );
  const handleRuntimeState = useCallback(
    (snapshot: StudioRuntimeSnapshot) => setRuntimeSnapshot(snapshot),
    []
  );

  const fontSize = useStudioPreferences((state) => state.fontSize);
  const wordWrap = useStudioPreferences((state) => state.wordWrap);
  const [mobilePanel, setMobilePanel] = useState<"editor" | "preview">(
    "editor"
  );
  const [editorFullscreen, setEditorFullscreen] = useState(false);

  useEffect(() => {
    if (!editorFullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Keep Escape from also closing the Studio sheet underneath.
      event.stopImmediatePropagation();
      setEditorFullscreen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [editorFullscreen]);

  function editActiveFile(content: string) {
    updateWorkspace((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.path === current.activeFile ? { ...file, content } : file
      ),
    }));
  }

  function selectFile(path: string) {
    if (workspace.activeFile === path) return;
    useStudioWorkspaces.getState().setActiveFile(workspace.id, path);
    updateWorkspace((current) =>
      current.activeFile === path ? current : { ...current, activeFile: path }
    );
  }

  function createFile(path: string): string | null {
    const result = addStudioFile(workspace, path);
    if (!result.ok) return result.error.message;
    updateWorkspace(() => result.value);
    return null;
  }

  function renameFile(from: string, to: string): string | null {
    const result = renameStudioFile(workspace, from, to);
    if (!result.ok) return result.error.message;
    updateWorkspace(() => result.value);
    return null;
  }

  function deleteFile(path: string): string | null {
    const result = deleteStudioFile(workspace, path);
    if (!result.ok) return result.error.message;
    updateWorkspace(() => result.value);
    return null;
  }

  function renameFolder(from: string, to: string): string | null {
    const result = renameStudioFolder(workspace, from, to);
    if (!result.ok) return result.error.message;
    updateWorkspace(() => result.value);
    return null;
  }

  function deleteFolder(path: string): string | null {
    const result = deleteStudioFolder(workspace, path);
    if (!result.ok) return result.error.message;
    updateWorkspace(() => result.value);
    return null;
  }

  const definition = STUDIO_TEMPLATES[workspace.template];
  const activeFile =
    workspace.files.find((file) => file.path === workspace.activeFile) ??
    workspace.files[0];
  const compact = variant === "lesson";

  const editorCard = (
    <Card
      className={cn(
        "overflow-hidden",
        editorFullscreen &&
          "fixed inset-0 z-[70] flex flex-col rounded-none border-0 bg-background"
      )}
    >
      <CardHeader className="shrink-0 space-y-3 border-b pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Code2 className="size-4 text-primary" />
            Editor
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {definition.label}
            </span>
            <StudioEditorPreferences />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 [&_svg]:size-3.5"
              aria-label={
                editorFullscreen
                  ? "Exit full screen"
                  : "Open editor full screen"
              }
              title={editorFullscreen ? "Exit full screen" : "Full screen"}
              onClick={() => setEditorFullscreen((value) => !value)}
            >
              {editorFullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </div>
        </div>
        <div
          className="flex flex-wrap items-center gap-1"
          role="tablist"
          aria-label="Open files"
        >
          {workspace.files.map((file) => (
            <button
              key={file.path}
              type="button"
              role="tab"
              aria-selected={file.path === workspace.activeFile}
              onClick={() => selectFile(file.path)}
              className={cn(
                "cursor-pointer rounded-md px-2 py-1 font-mono text-[11px] transition-colors",
                file.path === workspace.activeFile
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {file.path.replace(/^\//, "")}
            </button>
          ))}
        </div>
      </CardHeader>
      <div
        className={
          editorFullscreen
            ? "grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1"
            : cn(
                "grid md:grid-cols-[210px_minmax(0,1fr)]",
                compact && "md:grid-cols-[180px_minmax(0,1fr)]"
              )
        }
      >
        <StudioFileExplorer
          files={workspace.files}
          activeFile={workspace.activeFile}
          onSelectFile={selectFile}
          onCreateFile={createFile}
          onRenameFile={renameFile}
          onDeleteFile={deleteFile}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          className={cn(
            "border-b md:border-b-0 md:border-r",
            editorFullscreen
              ? "h-44 md:h-full"
              : compact
                ? "h-44 md:h-[360px]"
                : "h-56 md:h-[380px]"
          )}
        />
        <div className="min-h-0 min-w-0">
          <div
            className={
              editorFullscreen
                ? "h-full min-h-0"
                : compact
                  ? "h-[360px]"
                  : "h-[380px]"
            }
          >
            {activeFile ? (
              <StudioEditor
                workspaceId={workspace.id}
                filePath={activeFile.path}
                value={activeFile.content}
                onChange={editActiveFile}
                fontSize={fontSize}
                wordWrap={wordWrap}
              />
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );

  const previewCard = (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MonitorPlay className="size-4 text-primary" />
          Preview
        </CardTitle>
        <CardDescription>
          Runs on Sandpack&apos;s hosted bundler — network access is required,
          and project source is processed by that external runtime. Refresh
          re-runs the current files; Restart starts a clean runtime.
        </CardDescription>
      </CardHeader>
      <div className={compact ? "h-[360px]" : "h-[420px]"}>
        <StudioRuntime
          key={workspace.id}
          workspaceId={workspace.id}
          definition={definition}
          files={workspace.files}
          dependencies={workspace.dependencies}
          onStateChange={handleRuntimeState}
        />
      </div>
    </Card>
  );

  const packageManager = (
    <StudioPackageManager
      key={workspace.id}
      workspace={workspace}
      updateWorkspace={updateWorkspace}
      runtime={runtimeSnapshot}
    />
  );

  if (compact) {
    return (
      <div className={cn("space-y-4", className)}>
        <StudioMobileSwitch value={mobilePanel} onChange={setMobilePanel} />
        <div className="grid gap-4 xl:grid-cols-2">
          <div className={cn(mobilePanel !== "editor" && "hidden xl:block")}>
            {editorCard}
          </div>
          <div className={cn(mobilePanel !== "preview" && "hidden xl:block")}>
            {previewCard}
          </div>
        </div>
        {packageManager}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-1">
        {leading}
      </div>
      <div className="flex min-w-0 flex-col gap-4 xl:col-start-2 xl:row-span-2 xl:row-start-1">
        <StudioMobileSwitch value={mobilePanel} onChange={setMobilePanel} />
        <div className={cn(mobilePanel !== "editor" && "hidden xl:block")}>
          {editorCard}
        </div>
        <div className={cn(mobilePanel !== "preview" && "hidden xl:block")}>
          {previewCard}
        </div>
      </div>
      <div className="min-w-0 xl:col-start-1 xl:row-start-2">
        {packageManager}
      </div>
    </div>
  );
}
