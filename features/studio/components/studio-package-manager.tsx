"use client";

import {
  Check,
  Loader2,
  Package,
  Pencil,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
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
import {
  useStudioPackages,
  type StudioDependencyRuntimePhase,
} from "../hooks/use-studio-packages";
import type {
  StudioRuntimeIssue,
  StudioRuntimeSnapshot,
} from "../lib/runtime";
import type { StudioWorkspace } from "../types/studio.types";

const PHASE_COPY: Record<
  StudioDependencyRuntimePhase,
  { label: string; detail: string; tone: string }
> = {
  applying: {
    label: "Applying dependency changes to the preview runtime…",
    detail:
      "Changes are saved locally. The preview rebuilds when package resolution finishes.",
    tone: "border-primary/30 bg-primary/5",
  },
  starting: {
    label: "Waiting for the preview runtime…",
    detail: "The runtime has not finished starting this dependency set yet.",
    tone: "border-border bg-muted/30",
  },
  ready: {
    label: "Preview runtime is running.",
    detail:
      "Dependencies are in this project. Import a package to confirm it resolves in the preview.",
    tone: "border-success/30 bg-success/5",
  },
  error: {
    label: "The preview runtime reported an error.",
    detail:
      "Check the package name, version and import, then refresh the preview.",
    tone: "border-destructive/40 bg-destructive/5",
  },
  unavailable: {
    label: "The hosted preview runtime is unavailable.",
    detail:
      "Dependencies could not be checked. Check your connection, then restart the preview.",
    tone: "border-destructive/40 bg-destructive/5",
  },
};

function RuntimeFeedback({
  phase,
  issue,
}: {
  phase: StudioDependencyRuntimePhase;
  issue: StudioRuntimeIssue | null;
}) {
  const copy = PHASE_COPY[phase];
  const busy = phase === "applying" || phase === "starting";
  const failed = phase === "error" || phase === "unavailable";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-start gap-2 rounded-xl border px-3 py-2", copy.tone)}
    >
      {busy ? (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
      ) : failed ? (
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      ) : (
        <Check className="mt-0.5 size-4 shrink-0 text-success" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium">{copy.label}</p>
        <p className="text-xs text-muted-foreground">{copy.detail}</p>
        {phase === "error" && issue ? (
          <p className="max-h-24 overflow-auto break-words rounded-lg bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
            {issue.title}: {issue.message}
            {issue.location ? ` (${issue.location})` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Dependency editor for one Studio workspace. */
export function StudioPackageManager({
  workspace,
  updateWorkspace,
  runtime,
}: {
  workspace: StudioWorkspace;
  updateWorkspace: (
    updater: (workspace: StudioWorkspace) => StudioWorkspace
  ) => void;
  runtime: StudioRuntimeSnapshot;
}) {
  const packages = useStudioPackages({ workspace, updateWorkspace, runtime });
  const dependencyCount = packages.dependencies.length;
  const showRuntime =
    dependencyCount > 0 || packages.pending || packages.runtimeIssue !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="size-4 text-primary" />
              Dependencies
            </CardTitle>
            <CardDescription>
              Public npm packages only. Names are validated here; Sandpack&apos;s
              hosted runtime resolves them on rebuild.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {dependencyCount} {dependencyCount === 1 ? "package" : "packages"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showRuntime ? (
          <RuntimeFeedback
            phase={packages.runtimePhase}
            issue={packages.runtimeIssue}
          />
        ) : null}

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            packages.addPackage();
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px_auto]">
            <div className="space-y-1">
              <Label
                htmlFor="package-name"
                className="text-xs text-muted-foreground"
              >
                Package
              </Label>
              <Input
                id="package-name"
                value={packages.name}
                onChange={(event) => packages.setName(event.target.value)}
                placeholder="dayjs"
                autoComplete="off"
                spellCheck={false}
                disabled={!packages.canManage}
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="package-version"
                className="text-xs text-muted-foreground"
              >
                Version
              </Label>
              <Input
                id="package-version"
                value={packages.version}
                onChange={(event) => packages.setVersion(event.target.value)}
                placeholder="latest"
                autoComplete="off"
                spellCheck={false}
                disabled={!packages.canManage}
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                size="sm"
                className="h-9 w-full sm:w-auto"
                disabled={!packages.canManage || !packages.name.trim()}
              >
                <Plus />
                Add
              </Button>
            </div>
          </div>
          {packages.formError ? (
            <p role="alert" className="text-xs text-destructive">
              {packages.formError}
            </p>
          ) : null}
        </form>

        {dependencyCount > 0 ? (
          <ul className="divide-y rounded-xl border">
            {packages.dependencies.map(([dependency, version]) => {
              const editing = packages.editingName === dependency;
              return (
                <li key={dependency} className="px-3 py-2">
                  {editing ? (
                    <>
                      <form
                        className="flex flex-wrap items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          packages.saveEdit();
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-xs">
                          {dependency}
                        </span>
                        <Input
                          value={packages.editVersion}
                          onChange={(event) =>
                            packages.setEditVersion(event.target.value)
                          }
                          aria-label={`Version for ${dependency}`}
                          autoComplete="off"
                          spellCheck={false}
                          autoFocus
                          className="h-7 w-32 font-mono text-[11px]"
                        />
                        <Button type="submit" size="sm" className="h-7 px-2">
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={packages.cancelEdit}
                        >
                          Cancel
                        </Button>
                      </form>
                      {packages.editError ? (
                        <p role="alert" className="mt-1 text-xs text-destructive">
                          {packages.editError}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Package className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">
                        {dependency}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {version}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 [&_svg]:size-3.5"
                        aria-label={`Edit version of ${dependency}`}
                        title="Edit version"
                        disabled={!packages.canManage}
                        onClick={() => packages.beginEdit(dependency)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 [&_svg]:size-3.5"
                        aria-label={`Remove ${dependency}`}
                        title="Remove dependency"
                        onClick={() => packages.requestRemove(dependency)}
                      >
                        <X />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            No dependencies yet. Add one above, then import it in your code.
          </p>
        )}

        {packages.canManage ? (
          <p className="text-xs text-muted-foreground">
            Dependency changes are saved in this browser and applied to the
            preview runtime. A package is only usable once the runtime has
            resolved it and your import succeeds.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Static projects serve files as-is and can&apos;t import npm packages.
            Create a Vanilla or React project to use dependencies.
          </p>
        )}
      </CardContent>

      <Dialog
        open={packages.removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) packages.cancelRemove();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove dependency?</DialogTitle>
            <DialogDescription>
              {packages.removeTarget
                ? `${packages.removeTarget} will be removed from this project. `
                : ""}
              The preview will rebuild, and any file importing this package will
              fail until you remove the import.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={packages.cancelRemove}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={packages.confirmRemove}
            >
              Remove dependency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
