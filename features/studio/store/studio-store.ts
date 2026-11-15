"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StudioWorkspaceMeta } from "../types/studio.types";
import { sourceKeyForSource } from "../lib/workspace-utils";

/** Metadata index only — file contents live in IndexedDB. */
export const STUDIO_METADATA_STORAGE_KEY = "focusy-studio:workspaces";

interface StudioWorkspaceState {
  workspaces: Record<string, StudioWorkspaceMeta>;
  /** Most recently opened/created first. */
  order: string[];
  activeWorkspaceId: string | null;
  hydrated: boolean;

  upsertWorkspace: (workspace: StudioWorkspaceMeta) => void;
  removeWorkspace: (id: string) => void;
  replaceWorkspaceIndex: (
    workspaces: StudioWorkspaceMeta[],
    activeWorkspaceId?: string | null
  ) => void;
  setActiveWorkspace: (id: string | null) => void;
  setActiveFile: (id: string, path: string) => void;
  setHydrated: () => void;
}

export const useStudioWorkspaces = create<StudioWorkspaceState>()(
  persist(
    (set) => ({
      workspaces: {},
      order: [],
      activeWorkspaceId: null,
      hydrated: false,

      upsertWorkspace: (workspace) =>
        set((state) => {
          const meta: StudioWorkspaceMeta = {
            id: workspace.id,
            name: workspace.name,
            template: workspace.template,
            source: workspace.source,
            sourceKey: sourceKeyForSource(workspace.source),
            activeFile: workspace.activeFile,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
          };
          return {
            workspaces: { ...state.workspaces, [meta.id]: meta },
            order: [meta.id, ...state.order.filter((id) => id !== meta.id)],
          };
        }),

      removeWorkspace: (id) =>
        set((state) => {
          if (!state.workspaces[id]) return {};
          const { [id]: _removed, ...workspaces } = state.workspaces;
          return {
            workspaces,
            order: state.order.filter((workspaceId) => workspaceId !== id),
            activeWorkspaceId:
              state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
          };
        }),

      replaceWorkspaceIndex: (workspaces, activeWorkspaceId) =>
        set(() => {
          const byId: Record<string, StudioWorkspaceMeta> = {};
          const order: string[] = [];
          for (const workspace of workspaces) {
            if (byId[workspace.id]) continue;
            byId[workspace.id] = workspace;
            order.push(workspace.id);
          }
          return {
            workspaces: byId,
            order,
            activeWorkspaceId:
              activeWorkspaceId && byId[activeWorkspaceId]
                ? activeWorkspaceId
                : order[0] ?? null,
          };
        }),

      setActiveWorkspace: (id) =>
        set((state) => {
          if (!id || !state.workspaces[id]) return { activeWorkspaceId: null };
          return {
            activeWorkspaceId: id,
            order: [id, ...state.order.filter((workspaceId) => workspaceId !== id)],
          };
        }),

      setActiveFile: (id, path) =>
        set((state) => {
          const workspace = state.workspaces[id];
          const activeFile = path.trim();
          if (!workspace || !activeFile) return {};
          return {
            workspaces: {
              ...state.workspaces,
              [id]: { ...workspace, activeFile },
            },
          };
        }),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: STUDIO_METADATA_STORAGE_KEY,
      partialize: (state) => ({
        workspaces: state.workspaces,
        order: state.order,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);

/** Saved workspaces, most recent first, with any unordered entries appended. */
export const selectWorkspaceMetaList = (
  state: StudioWorkspaceState
): StudioWorkspaceMeta[] => {
  const inOrder = state.order
    .map((id) => state.workspaces[id])
    .filter((workspace): workspace is StudioWorkspaceMeta => Boolean(workspace));
  const orderedIds = new Set(inOrder.map((workspace) => workspace.id));
  const missing = Object.values(state.workspaces)
    .filter((workspace) => !orderedIds.has(workspace.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return [...inOrder, ...missing];
};

/** Find the workspace associated with a video, course or playlist lesson. */
export const selectWorkspaceMetaBySourceKey = (
  state: StudioWorkspaceState,
  sourceKey: string | null
): StudioWorkspaceMeta | null => selectWorkspaceMetasBySourceKey(state, sourceKey)[0] ?? null;

/** All projects explicitly linked to one learning resource, most recent first. */
export const selectWorkspaceMetasBySourceKey = (
  state: StudioWorkspaceState,
  sourceKey: string | null
): StudioWorkspaceMeta[] => {
  if (!sourceKey) return [];
  return selectWorkspaceMetaList(state).filter(
    (workspace) => workspace.sourceKey === sourceKey
  );
};
