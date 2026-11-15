"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addStudioDependency,
  removeStudioDependency,
  updateStudioDependency,
} from "../lib/packages";
import type {
  StudioRuntimeIssue,
  StudioRuntimeSnapshot,
} from "../lib/runtime";
import type { StudioWorkspace } from "../types/studio.types";

export type StudioDependencyRuntimePhase =
  | "applying"
  | "starting"
  | "ready"
  | "error"
  | "unavailable";

export interface UseStudioPackagesResult {
  dependencies: Array<[string, string]>;
  name: string;
  version: string;
  setName: (value: string) => void;
  setVersion: (value: string) => void;
  formError: string | null;
  addPackage: () => void;
  canManage: boolean;
  editingName: string | null;
  editVersion: string;
  setEditVersion: (value: string) => void;
  editError: string | null;
  beginEdit: (name: string) => void;
  cancelEdit: () => void;
  saveEdit: () => void;
  removeTarget: string | null;
  requestRemove: (name: string) => void;
  cancelRemove: () => void;
  confirmRemove: () => void;
  pending: boolean;
  runtimePhase: StudioDependencyRuntimePhase;
  runtimeIssue: StudioRuntimeIssue | null;
}

function dependencySignature(dependencies: Record<string, string>): string {
  return JSON.stringify(dependencies);
}

/**
 * Owns package-manager form state and ties dependency edits to the live
 * runtime. The UI never labels a package "installed" before Sandpack has
 * rebuilt, and package-manager state resets when the workspace changes.
 */
export function useStudioPackages({
  workspace,
  updateWorkspace,
  runtime,
}: {
  workspace: StudioWorkspace;
  updateWorkspace: (
    updater: (workspace: StudioWorkspace) => StudioWorkspace
  ) => void;
  runtime: StudioRuntimeSnapshot;
}): UseStudioPackagesResult {
  const [name, setNameState] = useState("");
  const [version, setVersionState] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editVersion, setEditVersionState] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);

  const signature = dependencySignature(workspace.dependencies);
  const canManage = workspace.template !== "static";
  const runtimeMatches =
    runtime.workspaceId === workspace.id &&
    runtime.dependencySignature === signature;
  const runtimeIssue = runtimeMatches ? runtime.issue : null;
  const pending =
    pendingSignature === signature &&
    !(runtimeMatches && runtime.status === "running");

  useEffect(() => {
    if (!pendingSignature || pendingSignature !== signature) return;
    if (
      runtime.workspaceId !== workspace.id ||
      runtime.dependencySignature !== signature
    ) {
      return;
    }
    if (
      runtime.issue ||
      runtime.status === "running" ||
      runtime.status === "timeout" ||
      runtime.status === "done"
    ) {
      setPendingSignature(null);
    }
  }, [
    pendingSignature,
    signature,
    runtime.workspaceId,
    workspace.id,
    runtime.dependencySignature,
    runtime.status,
    runtime.issue,
  ]);

  function setName(value: string) {
    setNameState(value);
    setFormError(null);
  }

  function setVersion(value: string) {
    setVersionState(value);
    setFormError(null);
  }

  function applyDependencies(next: Record<string, string>) {
    setPendingSignature(dependencySignature(next));
    updateWorkspace((current) => ({ ...current, dependencies: next }));
  }

  function addPackage() {
    if (!canManage) {
      setFormError(
        "Static projects serve files as-is and can't import npm packages. Use a Vanilla or React template."
      );
      return;
    }
    const result = addStudioDependency(workspace.dependencies, name, version);
    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }
    applyDependencies(result.value);
    setNameState("");
    setVersionState("");
    setFormError(null);
  }

  function beginEdit(dependency: string) {
    if (!canManage) return;
    setEditingName(dependency);
    setEditVersionState(workspace.dependencies[dependency] ?? "");
    setEditError(null);
  }

  function setEditVersion(value: string) {
    setEditVersionState(value);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingName(null);
    setEditError(null);
  }

  function saveEdit() {
    if (!editingName) return;
    const result = updateStudioDependency(
      workspace.dependencies,
      editingName,
      editVersion
    );
    if (!result.ok) {
      setEditError(result.error.message);
      return;
    }
    if (result.value !== workspace.dependencies) applyDependencies(result.value);
    setEditingName(null);
    setEditError(null);
  }

  function requestRemove(dependency: string) {
    if (!Object.prototype.hasOwnProperty.call(workspace.dependencies, dependency)) {
      return;
    }
    setRemoveTarget(dependency);
  }

  function cancelRemove() {
    setRemoveTarget(null);
  }

  function confirmRemove() {
    if (!removeTarget) return;
    const result = removeStudioDependency(workspace.dependencies, removeTarget);
    if (!result.ok) {
      toast.error(result.error.message);
      setRemoveTarget(null);
      return;
    }
    applyDependencies(result.value);
    if (editingName === removeTarget) cancelEdit();
    setRemoveTarget(null);
  }

  let runtimePhase: StudioDependencyRuntimePhase;
  if (runtimeIssue) {
    runtimePhase = "error";
  } else if (
    runtimeMatches &&
    (runtime.status === "timeout" || runtime.status === "done")
  ) {
    runtimePhase = "unavailable";
  } else if (pending) {
    runtimePhase = "applying";
  } else if (!runtimeMatches || runtime.status !== "running") {
    runtimePhase = "starting";
  } else {
    runtimePhase = "ready";
  }

  return {
    dependencies: Object.entries(workspace.dependencies),
    name,
    version,
    setName,
    setVersion,
    formError,
    addPackage,
    canManage,
    editingName,
    editVersion,
    setEditVersion,
    editError,
    beginEdit,
    cancelEdit,
    saveEdit,
    removeTarget,
    requestRemove,
    cancelRemove,
    confirmRemove,
    pending,
    runtimePhase,
    runtimeIssue,
  };
}
