"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  changeWorkspaceTemplate,
  createWorkspace,
  deleteWorkspace,
  loadLastWorkspace,
  loadWorkspace,
  loadWorkspaceForSource,
  renameWorkspace,
  saveWorkspace,
  type CreateWorkspaceInput,
} from "../lib/workspaces";
import { sourceKeyForSource } from "../lib/workspace-utils";
import { useStudioWorkspaces } from "../store/studio-store";
import type {
  StudioSource,
  StudioTemplate,
  StudioWorkspace,
} from "../types/studio.types";

export type StudioWorkspaceStatus = "loading" | "empty" | "ready" | "error";
export type StudioSaveState = "idle" | "saving" | "saved" | "error";

const SAVE_DELAY_MS = 600;

export interface UseStudioWorkspaceOptions {
  /**
   * Load and create the workspace associated with a video, course or playlist
   * lesson. Omit it for the standalone Studio page, which opens the most
   * recently used project instead.
   */
  source?: StudioSource | null;
}

export interface UseStudioWorkspaceResult {
  status: StudioWorkspaceStatus;
  workspace: StudioWorkspace | null;
  error: string | null;
  saveState: StudioSaveState;
  /** Create a project; resolves to a user-facing error, or null on success. */
  createProject: (input: CreateWorkspaceInput) => Promise<string | null>;
  /** Rename the open project; resolves to an error message or null. */
  renameProject: (name: string) => Promise<string | null>;
  /** Replace the open project's files with another template's starter. */
  changeTemplate: (template: StudioTemplate) => Promise<string | null>;
  /** Delete the open project and return to the empty state. */
  deleteProject: () => Promise<string | null>;
  openWorkspace: (id: string) => Promise<void>;
  retry: () => Promise<void>;
  /** Clear the failed workspace and show the create form. */
  startNewProject: () => void;
  /** Apply an edit and schedule a debounced IndexedDB save. */
  updateWorkspace: (updater: (workspace: StudioWorkspace) => StudioWorkspace) => void;
  flush: () => Promise<void>;
}

/**
 * Owns workspace boot, switching and debounced persistence for Studio. UI
 * components only consume the returned state and callbacks.
 *
 * With a `source`, the hook follows that video/course/playlist lesson: opening
 * another lesson loads its own workspace, and a first visit starts empty so the
 * user can choose a template instead of silently creating a project.
 */
export function useStudioWorkspace(
  options: UseStudioWorkspaceOptions = {}
): UseStudioWorkspaceResult {
  const source = options.source ?? null;
  const sourceKey = sourceKeyForSource(source);

  const [status, setStatus] = useState<StudioWorkspaceStatus>("loading");
  const [workspace, setWorkspace] = useState<StudioWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<StudioSaveState>("idle");

  const mountedRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<StudioWorkspace | null>(null);
  const sourceRef = useRef<StudioSource | null>(source);
  const loadRequestRef = useRef(0);
  sourceRef.current = source;

  useEffect(() => {
    mountedRef.current = true;
    const requestId = ++loadRequestRef.current;

    // Switching lessons must not drop the previous lesson's latest edits.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pendingSwitchSave = pendingSaveRef.current;
    pendingSaveRef.current = null;
    const pendingWrite = pendingSwitchSave
      ? saveWorkspace(pendingSwitchSave)
      : null;

    setStatus("loading");
    setWorkspace(null);
    setError(null);
    setSaveState("idle");
    void loadInitial(requestId, pendingWrite);

    return () => {
      mountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (pending) void saveWorkspace(pending);
    };
    // Reload when the associated lesson changes; standalone Studio boots once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  async function loadInitial(
    requestId: number,
    pendingWrite: Promise<unknown> | null = null
  ) {
    // Let a previous lesson's last edit land before restoring another source.
    if (pendingWrite) await pendingWrite;
    const currentSource = sourceRef.current;
    const result = currentSource
      ? await loadWorkspaceForSource(currentSource)
      : await loadLastWorkspace();

    if (!mountedRef.current || requestId !== loadRequestRef.current) return;

    if (result === null) {
      setWorkspace(null);
      setStatus("empty");
      return;
    }
    if (result.ok) {
      setWorkspace(result.value);
      setSaveState("saved");
      setStatus("ready");
      return;
    }
    // A source without a project is a first visit, not a broken workspace.
    if (result.error.code === "not-found") {
      setWorkspace(null);
      setError(null);
      setStatus("empty");
      return;
    }
    setError(result.error.message);
    setStatus("error");
  }

  async function flush() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (!pending) return;

    if (mountedRef.current) setSaveState("saving");
    const result = await saveWorkspace(pending);
    if (pendingSaveRef.current === pending) pendingSaveRef.current = null;
    if (!mountedRef.current) return;

    if (result.ok) {
      setSaveState("saved");
      return;
    }
    setSaveState("error");
    toast.error(result.error.message);
  }

  function scheduleSave(next: StudioWorkspace) {
    setWorkspace(next);
    pendingSaveRef.current = next;
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flush();
    }, SAVE_DELAY_MS);
  }

  function updateWorkspace(
    updater: (current: StudioWorkspace) => StudioWorkspace
  ) {
    if (!workspace) return;
    const next = updater(workspace);
    if (next !== workspace) scheduleSave(next);
  }

  async function createProject(input: CreateWorkspaceInput): Promise<string | null> {
    await flush();
    const currentSource = sourceRef.current;
    // Linked lessons always own their project; callers can't detach it.
    const payload: CreateWorkspaceInput = currentSource
      ? { ...input, source: currentSource }
      : input;
    const result = await createWorkspace(payload);

    if (!mountedRef.current) return result.ok ? null : result.error.message;
    // The user moved to another lesson while this was being created.
    if (sourceKeyForSource(sourceRef.current) !== sourceKeyForSource(currentSource)) {
      return null;
    }
    if (!result.ok) return result.error.message;
    setWorkspace(result.value);
    setError(null);
    setSaveState("saved");
    setStatus("ready");
    return null;
  }

  async function openWorkspace(id: string) {
    if (!id || id === workspace?.id) return;
    await flush();
    if (!mountedRef.current) return;
    setStatus("loading");
    setError(null);

    const result = await loadWorkspace(id);
    if (!mountedRef.current) return;
    if (result.ok) {
      setWorkspace(result.value);
      useStudioWorkspaces.getState().setActiveWorkspace(result.value.id);
      setSaveState("saved");
      setStatus("ready");
      return;
    }
    setError(result.error.message);
    setStatus("error");
    toast.error(result.error.message);
  }

  async function renameProject(name: string): Promise<string | null> {
    if (!workspace) return "No project is open.";
    await flush();
    const result = await renameWorkspace(workspace.id, name);
    if (!result.ok) return result.error.message;
    setWorkspace(result.value);
    setSaveState("saved");
    return null;
  }

  async function changeTemplate(template: StudioTemplate): Promise<string | null> {
    if (!workspace) return "No project is open.";
    if (workspace.template === template) return null;
    await flush();
    const result = await changeWorkspaceTemplate(workspace.id, template);
    if (!result.ok) return result.error.message;
    setWorkspace(result.value);
    setSaveState("saved");
    setStatus("ready");
    return null;
  }

  async function deleteProject(): Promise<string | null> {
    if (!workspace) return "No project is open.";
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingSaveRef.current = null;

    const result = await deleteWorkspace(workspace.id);
    if (!result.ok) return result.error.message;
    if (!mountedRef.current) return null;

    // Other projects may still exist; open the next available one instead of
    // showing an empty screen. Lessons stay within their own source.
    const currentSource = sourceRef.current;
    const next = currentSource
      ? await loadWorkspaceForSource(currentSource)
      : await loadLastWorkspace();
    if (!mountedRef.current) return null;
    if (next?.ok) {
      setWorkspace(next.value);
      setError(null);
      setSaveState("saved");
      setStatus("ready");
      return null;
    }

    setWorkspace(null);
    setError(null);
    setSaveState("idle");
    setStatus("empty");
    return null;
  }

  function startNewProject() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingSaveRef.current = null;
    setWorkspace(null);
    setError(null);
    setSaveState("idle");
    setStatus("empty");
  }

  async function retry() {
    const requestId = ++loadRequestRef.current;
    setStatus("loading");
    setError(null);
    await loadInitial(requestId);
  }

  return {
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
    startNewProject,
    updateWorkspace,
    flush,
  };
}
