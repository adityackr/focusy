"use client";

import { useEffect, useState } from "react";
import { Code2, Maximize2, TriangleAlert } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { useStudioWorkspace } from "../hooks/use-studio-workspace";
import { sourceKeyForSource } from "../lib/workspace-utils";
import {
  selectWorkspaceMetasBySourceKey,
  useStudioWorkspaces,
} from "../store/studio-store";
import type { StudioSource, StudioTemplate } from "../types/studio.types";
import { StudioProjectForm } from "./studio-project-form";
import { StudioProjectToolbar } from "./studio-project-toolbar";
import { StudioWorkspaceView } from "./studio-workspace-view";

interface StudioLessonCopy {
  description: string;
  linkedLabel: string;
  formTitle: string;
}

function copyForSource(source: StudioSource): StudioLessonCopy {
  switch (source.kind) {
    case "course":
      return {
        description:
          "Edit code and run it without leaving this course. Every chapter shares one saved workspace.",
        linkedLabel: "Linked to this course",
        formTitle: "Start a project for this course",
      };
    case "video":
      return {
        description:
          "Edit code and run it without leaving this video. It keeps its own saved workspace.",
        linkedLabel: "Linked to this video",
        formTitle: "Start a project for this video",
      };
    case "playlist-video":
      return {
        description:
          "Edit code and run it without leaving this lesson. Each lesson keeps its own saved workspace.",
        linkedLabel: "Linked to this lesson",
        formTitle: "Start a project for this lesson",
      };
  }
}

function defaultProjectName(lessonTitle?: string): string {
  const title = lessonTitle?.trim();
  return title ? title.slice(0, 80) : "Lesson project";
}

function StudioLessonWorkspace({
  source,
  lessonTitle,
}: {
  source: StudioSource;
  lessonTitle?: string;
}) {
  const copy = copyForSource(source);
  const sourceKey = sourceKeyForSource(source);
  const projects = useStudioWorkspaces(
    useShallow((state) => selectWorkspaceMetasBySourceKey(state, sourceKey))
  );
  const {
    status,
    workspace,
    error,
    saveState,
    createProject,
    renameProject,
    changeTemplate,
    deleteProject,
    openWorkspace,
    retry,
    updateWorkspace,
  } = useStudioWorkspace({ source });

  async function handleCreate(
    name: string,
    template: StudioTemplate
  ): Promise<string | null> {
    return createProject({ name, template });
  }

  return (
    <div className="bg-muted/10 p-3 sm:p-4">
      {status === "loading" ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : null}

      {status === "error" ? (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              This project couldn&apos;t open
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void retry()}>
            Try again
          </Button>
        </div>
      ) : null}

      {status === "empty" ? (
        <StudioProjectForm
          defaultName={defaultProjectName(lessonTitle)}
          formTitle={copy.formTitle}
          description="This project reopens with your files the next time you return. It is not created until you start one."
          submitLabel="Create practice project"
          onCreate={handleCreate}
        />
      ) : null}

      {status === "ready" && workspace ? (
        <>
          <StudioProjectToolbar
            className="mb-3"
            workspace={workspace}
            projects={projects}
            saveState={saveState}
            onOpenProject={(id) => void openWorkspace(id)}
            onCreateProject={(input) =>
              createProject({ ...input, allowDuplicateSource: true })
            }
            onRenameProject={renameProject}
            onChangeTemplate={changeTemplate}
            onDeleteProject={deleteProject}
          />
          <StudioWorkspaceView
            key={workspace.id}
            workspace={workspace}
            updateWorkspace={updateWorkspace}
            variant="lesson"
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Studio launcher attached to a video, course or playlist lesson. The
 * workspace opens in a full-size sheet so the editor and preview have room to
 * breathe, while the lesson page stays untouched behind it.
 */
export function StudioLessonPanel({
  source,
  lessonTitle,
  className,
  onOpenChange,
}: {
  source: StudioSource;
  lessonTitle?: string;
  className?: string;
  /** Reports sheet visibility so the lesson page can track Studio practice. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const sourceKey = sourceKeyForSource(source);
  const copy = copyForSource(source);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  return (
    <>
      <section
        className={cn(
          "mt-6 overflow-hidden rounded-2xl border bg-card",
          className
        )}
        aria-label="Practice in Studio"
      >
        <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Code2 className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Practice in Studio</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {copy.description}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <Maximize2 />
            Open Studio
          </Button>
        </div>
      </section>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          closeLabel="Close Studio"
          className="w-full max-w-none gap-0 p-0"
        >
          <SheetHeader className="bg-card">
            <div className="flex flex-wrap items-center gap-2 pr-4">
              <Code2 className="size-4 text-primary" />
              <SheetTitle>Practice in Studio</SheetTitle>
              <Badge variant="outline" className="ml-auto">
                {copy.linkedLabel}
              </Badge>
            </div>
            <SheetDescription>{copy.description}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <StudioLessonWorkspace
              key={sourceKey ?? "lesson"}
              source={source}
              lessonTitle={lessonTitle}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
