"use client";

import Link from "next/link";
import { Database, ExternalLink, MonitorPlay } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { useStudioWorkspace } from "../hooks/use-studio-workspace";
import { STUDIO_TEMPLATES } from "../lib/templates";
import {
  selectWorkspaceMetaList,
  useStudioWorkspaces,
} from "../store/studio-store";
import type { StudioTemplate } from "../types/studio.types";
import { StudioProjectForm } from "./studio-project-form";
import { StudioProjectToolbar } from "./studio-project-toolbar";
import { StudioWorkspaceView } from "./studio-workspace-view";

/** Standalone Studio route: pick a project and edit it with a demo tutorial. */
export function StudioPrototype() {
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
    startNewProject,
  } = useStudioWorkspace();

  const metas = useStudioWorkspaces(useShallow(selectWorkspaceMetaList));

  async function handleCreate(
    name: string,
    template: StudioTemplate
  ): Promise<string | null> {
    return createProject({ name, template });
  }

  const definition = workspace ? STUDIO_TEMPLATES[workspace.template] : null;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge>Local workspace</Badge>
            <span className="text-xs text-muted-foreground">
              Saved in this browser
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {workspace ? workspace.name : "Focusy Studio"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Projects are also available while you watch a video or follow a
            course. Videos, playlist lessons and courses restore their saved
            workspace, and every file stays in this browser.
          </p>
        </div>
        <Link
          href="/library"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Back to library
          <ExternalLink />
        </Link>
      </header>

      {status === "loading" ? (
        <Card className="mt-5">
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {status === "error" ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">
              This project couldn&apos;t open
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void retry()}>
              Try again
            </Button>
            <Button size="sm" variant="outline" onClick={startNewProject}>
              Start a new project
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {status === "empty" ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4 text-primary" />
              Create your first project
            </CardTitle>
            <CardDescription>
              Pick a template once — the project keeps its own files,
              dependencies and open file after a refresh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudioProjectForm
              formTitle="Project details"
              description="Pick a template once — the project keeps its own files, dependencies and open file after a refresh."
              onCreate={handleCreate}
            />
          </CardContent>
        </Card>
      ) : null}

      {status === "ready" && workspace && definition ? (
        <>
          <StudioProjectToolbar
            className="mt-5"
            workspace={workspace}
            projects={metas}
            saveState={saveState}
            onOpenProject={(id) => void openWorkspace(id)}
            onCreateProject={(input) => createProject(input)}
            onRenameProject={renameProject}
            onChangeTemplate={changeTemplate}
            onDeleteProject={deleteProject}
          />

          <StudioWorkspaceView
            key={workspace.id}
            workspace={workspace}
            updateWorkspace={updateWorkspace}
            className="mt-4"
            leading={
              <Card className="overflow-hidden">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MonitorPlay className="size-4 text-primary" />
                    Tutorial
                  </CardTitle>
                  <CardDescription>
                    Playback runs independently of every editor update.
                  </CardDescription>
                </CardHeader>
                <div className="aspect-video bg-black">
                  <iframe
                    className="h-full w-full"
                    src="https://www.youtube-nocookie.com/embed/PkZNo7MFNFg"
                    title="Learn JavaScript — full course"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </Card>
            }
          />
        </>
      ) : null}
    </div>
  );
}
