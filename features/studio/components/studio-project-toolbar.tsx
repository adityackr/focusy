"use client";

import { useState } from "react";
import { Plus, Settings2, Trash2 } from "lucide-react";
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
import { cn } from "@/shared/lib/utils";
import type { StudioSaveState } from "../hooks/use-studio-workspace";
import { STUDIO_TEMPLATES, STUDIO_TEMPLATE_ORDER } from "../lib/templates";
import type {
  StudioTemplate,
  StudioWorkspace,
  StudioWorkspaceMeta,
} from "../types/studio.types";
import { StudioProjectForm } from "./studio-project-form";
import { StudioSaveStatus } from "./studio-save-status";

export function StudioProjectToolbar({
  workspace,
  projects,
  saveState,
  onOpenProject,
  onCreateProject,
  onRenameProject,
  onChangeTemplate,
  onDeleteProject,
  className,
}: {
  workspace: StudioWorkspace;
  projects: StudioWorkspaceMeta[];
  saveState: StudioSaveState;
  onOpenProject: (id: string) => void;
  onCreateProject: (input: {
    name: string;
    template: StudioTemplate;
  }) => Promise<string | null>;
  onRenameProject: (name: string) => Promise<string | null>;
  onChangeTemplate: (template: StudioTemplate) => Promise<string | null>;
  onDeleteProject: () => Promise<string | null>;
  className?: string;
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-2.5 sm:p-3",
        className
      )}
    >
      <Label htmlFor="studio-project-select" className="sr-only">
        Project
      </Label>
      <select
        id="studio-project-select"
        value={workspace.id}
        onChange={(event) => onOpenProject(event.target.value)}
        className="h-9 min-w-0 max-w-[280px] cursor-pointer rounded-lg border border-input bg-background px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <StudioSaveStatus state={saveState} />
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setNewOpen(true)}
        >
          <Plus />
          New project
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setSettingsOpen(true)}
          aria-label="Project settings"
          title="Project settings"
        >
          <Settings2 />
        </Button>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              {workspace.source
                ? "Creates another project linked to this lesson. Your current project stays saved."
                : "Creates a separate project. Your current project stays saved."}
            </DialogDescription>
          </DialogHeader>
          <StudioProjectForm
            formTitle="Project details"
            description="Pick a template once. The project keeps its own files and dependencies."
            onCreate={async (name, template) => {
              const error = await onCreateProject({ name, template });
              if (!error) setNewOpen(false);
              return error;
            }}
            onCancel={() => setNewOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project settings</DialogTitle>
            <DialogDescription>
              Rename this project, replace it with another template, or remove
              it from this browser.
            </DialogDescription>
          </DialogHeader>
          <ProjectSettingsForm
            key={workspace.id}
            workspace={workspace}
            onRename={onRenameProject}
            onChangeTemplate={onChangeTemplate}
            onDeleteRequest={() => {
              setSettingsOpen(false);
              setDeleteOpen(true);
            }}
            onClose={() => setSettingsOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{workspace.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its files and dependencies will be removed from this browser.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void onDeleteProject().then((message) => {
                  if (message) toast.error(message);
                });
              }}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectSettingsForm({
  workspace,
  onRename,
  onChangeTemplate,
  onDeleteRequest,
  onClose,
}: {
  workspace: StudioWorkspace;
  onRename: (name: string) => Promise<string | null>;
  onChangeTemplate: (template: StudioTemplate) => Promise<string | null>;
  onDeleteRequest: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(workspace.name);
  const [template, setTemplate] = useState<StudioTemplate>(workspace.template);
  const [savingName, setSavingName] = useState(false);
  const [changingTemplate, setChangingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const canRename = trimmedName.length > 0 && trimmedName !== workspace.name;
  const canChangeTemplate = template !== workspace.template;

  async function saveName() {
    if (!canRename || savingName) return;
    setSavingName(true);
    setError(null);
    const message = await onRename(trimmedName);
    setSavingName(false);
    if (message) {
      setError(message);
      return;
    }
    onClose();
  }

  async function replaceTemplate() {
    if (!canChangeTemplate || changingTemplate) return;
    setChangingTemplate(true);
    setError(null);
    const message = await onChangeTemplate(template);
    setChangingTemplate(false);
    if (message) {
      setError(message);
      return;
    }
    onClose();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="studio-project-name" className="text-xs">
          Project name
        </Label>
        <div className="flex gap-2">
          <Input
            id="studio-project-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            className="h-9"
            autoComplete="off"
          />
          <Button
            type="button"
            size="sm"
            className="h-9"
            disabled={!canRename || savingName}
            onClick={() => void saveName()}
          >
            {savingName ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="studio-project-template" className="text-xs">
          Template
        </Label>
        <select
          id="studio-project-template"
          value={template}
          onChange={(event) => {
            setTemplate(event.target.value as StudioTemplate);
            setError(null);
          }}
          className="h-9 w-full cursor-pointer rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STUDIO_TEMPLATE_ORDER.map((templateId) => (
            <option key={templateId} value={templateId}>
              {STUDIO_TEMPLATES[templateId].label}
            </option>
          ))}
        </select>
        {canChangeTemplate ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-muted-foreground">
              Switching to {STUDIO_TEMPLATES[template].label} replaces every
              file and dependency in this project with that template&apos;s
              starter.
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-2"
              disabled={changingTemplate}
              onClick={() => void replaceTemplate()}
            >
              {changingTemplate
                ? "Replacing…"
                : `Replace with ${STUDIO_TEMPLATES[template].label}`}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            The current starter files stay in place until you choose another
            template.
          </p>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDeleteRequest}
        >
          <Trash2 />
          Delete project
        </Button>
        <DialogFooter className="mt-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </div>
    </div>
  );
}
