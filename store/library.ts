"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Playlist } from "@/lib/types";

export const LIBRARY_STORAGE_KEY = "focustube-library";
const LEGACY_LIBRARY_STORAGE_KEY = "clean-youtube-library";

/**
 * One-time upgrade: adopt data saved under the old Clean YouTube key so
 * existing users keep their library. Runs before the store rehydrates.
 */
export function migrateLegacyLibraryStorage() {
  try {
    if (typeof window === "undefined") return;
    if (
      !localStorage.getItem(LIBRARY_STORAGE_KEY) &&
      localStorage.getItem(LEGACY_LIBRARY_STORAGE_KEY)
    ) {
      localStorage.setItem(
        LIBRARY_STORAGE_KEY,
        localStorage.getItem(LEGACY_LIBRARY_STORAGE_KEY)!
      );
      localStorage.removeItem(LEGACY_LIBRARY_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable — start fresh */
  }
}

migrateLegacyLibraryStorage();

interface LibraryState {
  playlists: Record<string, Playlist>;
  /** Manual playlist order (playlist IDs). New playlists go first. */
  order: string[];
  favorites: string[];
  recent: string[];
  loadingIds: string[];
  error: string | null;
  hydrated: boolean;

  setHydrated: () => void;
  setError: (msg: string | null) => void;
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (playlistId: string) => void;
  setOrder: (ids: string[]) => void;
  toggleFavorite: (playlistId: string) => void;
  pushRecent: (playlistId: string) => void;
  fetchPlaylist: (playlistId: string) => Promise<boolean>;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      playlists: {},
      order: [],
      favorites: [],
      recent: [],
      loadingIds: [],
      error: null,
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),
      setError: (msg) => set({ error: msg }),

      addPlaylist: (playlist) =>
        set((s) => ({
          playlists: { ...s.playlists, [playlist.playlistId]: playlist },
          order: [
            playlist.playlistId,
            ...s.order.filter((id) => id !== playlist.playlistId),
          ],
          recent: [
            playlist.playlistId,
            ...s.recent.filter((id) => id !== playlist.playlistId),
          ].slice(0, 20),
          error: null,
        })),

      removePlaylist: (playlistId) =>
        set((s) => {
          const { [playlistId]: _removed, ...rest } = s.playlists;
          return {
            playlists: rest,
            order: s.order.filter((id) => id !== playlistId),
            favorites: s.favorites.filter((id) => id !== playlistId),
            recent: s.recent.filter((id) => id !== playlistId),
          };
        }),

      setOrder: (ids) =>
        set((s) => {
          const valid = ids.filter((id) => s.playlists[id]);
          const missing = Object.keys(s.playlists).filter((id) => !valid.includes(id));
          return { order: [...valid, ...missing] };
        }),

      toggleFavorite: (playlistId) =>
        set((s) => ({
          favorites: s.favorites.includes(playlistId)
            ? s.favorites.filter((id) => id !== playlistId)
            : [...s.favorites, playlistId],
        })),

      pushRecent: (playlistId) =>
        set((s) => ({
          recent: [
            playlistId,
            ...s.recent.filter((id) => id !== playlistId),
          ].slice(0, 20),
        })),

      fetchPlaylist: async (playlistId) => {
        const { playlists, loadingIds } = get();
        if (playlists[playlistId] || loadingIds.includes(playlistId)) {
          if (playlists[playlistId]) get().pushRecent(playlistId);
          return true;
        }
        set((s) => ({
          loadingIds: [...s.loadingIds, playlistId],
          error: null,
        }));
        try {
          const res = await fetch(
            `/api/playlists?playlistId=${encodeURIComponent(playlistId)}`
          );
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Failed to fetch playlist");
          get().addPlaylist(json as Playlist);
          return true;
        } catch (e) {
          set({ error: e instanceof Error ? e.message : "Failed to fetch playlist" });
          return false;
        } finally {
          set((s) => ({
            loadingIds: s.loadingIds.filter((id) => id !== playlistId),
          }));
        }
      },
    }),
    {
      name: LIBRARY_STORAGE_KEY,
      partialize: (s) => ({
        playlists: s.playlists,
        order: s.order,
        favorites: s.favorites,
        recent: s.recent,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);

export const selectPlaylistList = (s: LibraryState): Playlist[] => {
  const inOrder = s.order
    .map((id) => s.playlists[id])
    .filter((p): p is Playlist => Boolean(p));
  const orderedIds = new Set(inOrder.map((p) => p.playlistId));
  // Playlists missing from `order` (e.g. saved before ordering existed)
  // fall back to newest-first so nothing ever disappears.
  const missing = Object.values(s.playlists)
    .filter((p) => !orderedIds.has(p.playlistId))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  return [...inOrder, ...missing];
};
