"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Course, Playlist } from "@/shared/lib/types";
import { getApiKey } from "@/shared/lib/storage";
import {
  fetchPlaylistFromYouTube,
  fetchVideoDurations,
  fetchChannelTitles,
} from "@/shared/lib/youtube";

/** Playlists with a duration backfill currently in flight (avoids duplicate calls). */
const durationBackfills = new Set<string>();

/**
 * Course ids whose creator backfill already ran this session — keeps card
 * mounts from re-issuing the same batched request (cleared on failure so a
 * later mount can retry).
 */
const channelBackfillTried = new Set<string>();

export const LIBRARY_STORAGE_KEY = "focustube-library";
const LEGACY_LIBRARY_STORAGE_KEY = "clean-youtube-library";
/** Chapterly's course list, adopted once on upgrade. */
const CHAPTERLY_COURSES_STORAGE_KEY = "yt-course:courses";

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

/**
 * One-time upgrade: adopt courses saved by the Chapterly app so its users
 * keep their video courses after the merge. Chapterly stored them as an
 * ordered array; the first entry was the most recently saved.
 */
export function migrateChapterlyCourses() {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(CHAPTERLY_COURSES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.removeItem(CHAPTERLY_COURSES_STORAGE_KEY);
      return;
    }
    const existingRaw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    const existing = existingRaw
      ? JSON.parse(existingRaw)
      : { state: {}, version: 0 };
    const state = existing.state ?? {};
    const courses: Record<string, Course> = { ...(state.courses ?? {}) };
    const courseOrder: string[] = [...(state.courseOrder ?? [])];
    for (const course of parsed as Course[]) {
      if (!course?.id || courses[course.id]) continue;
      courses[course.id] = course;
      courseOrder.push(course.id);
    }
    existing.state = { ...state, courses, courseOrder };
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(existing));
    localStorage.removeItem(CHAPTERLY_COURSES_STORAGE_KEY);
  } catch {
    /* malformed legacy data — drop it and start fresh */
    try {
      localStorage.removeItem(CHAPTERLY_COURSES_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }
}

migrateLegacyLibraryStorage();
migrateChapterlyCourses();

interface LibraryState {
  playlists: Record<string, Playlist>;
  /** Manual playlist order (playlist IDs). New playlists go first. */
  order: string[];
  favorites: string[];
  recent: string[];
  /** Single-video courses (from Chapterly), keyed by course id. */
  courses: Record<string, Course>;
  /** Manual course order (course IDs). New courses go first. */
  courseOrder: string[];
  courseFavorites: string[];
  courseRecent: string[];
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
  /**
   * Best-effort: fetch `durationSeconds` for videos imported before duration
   * support existed, so their thumbnails can show a time badge.
   */
  backfillDurations: (playlistId: string) => Promise<void>;
  /**
   * Best-effort: fetch creator (channel) names for courses saved before
   * `channelTitle` existed, so cards can show the video creator.
   */
  backfillCourseChannels: () => Promise<void>;
  addCourse: (course: Course) => void;
  updateCourse: (course: Course) => void;
  removeCourse: (courseId: string) => void;
  setCourseOrder: (ids: string[]) => void;
  toggleCourseFavorite: (courseId: string) => void;
  pushCourseRecent: (courseId: string) => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      playlists: {},
      order: [],
      favorites: [],
      recent: [],
      courses: {},
      courseOrder: [],
      courseFavorites: [],
      courseRecent: [],
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
        const key = getApiKey();
        if (!key) {
          set({
            error:
              "No YouTube API key set. Add one in Settings — it takes about 2 minutes.",
          });
          return false;
        }
        set((s) => ({ loadingIds: [...s.loadingIds, playlistId], error: null }));
        try {
          const playlist = await fetchPlaylistFromYouTube(playlistId, key);
          get().addPlaylist(playlist);
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

      backfillDurations: async (playlistId) => {
        const playlist = get().playlists[playlistId];
        if (!playlist || durationBackfills.has(playlistId)) return;
        const missing = playlist.videos.filter((v) => v.durationSeconds == null);
        if (missing.length === 0) return;
        const key = getApiKey();
        if (!key) return; // no key → badges stay hidden, nothing else breaks
        durationBackfills.add(playlistId);
        try {
          const durations = await fetchVideoDurations(
            missing.map((v) => v.videoId),
            key
          );
          const current = get().playlists[playlistId];
          if (!current) return;
          set((s) => ({
            playlists: {
              ...s.playlists,
              [playlistId]: {
                ...current,
                videos: current.videos.map((v) =>
                  v.durationSeconds == null
                    ? { ...v, durationSeconds: durations[v.videoId] ?? null }
                    : v
                ),
              },
            },
          }));
        } catch {
          /* best-effort — retry on the next visit */
        } finally {
          durationBackfills.delete(playlistId);
        }
      },

      backfillCourseChannels: async () => {
        const candidates = Object.values(get().courses).filter(
          (c) => !c.channelTitle && !channelBackfillTried.has(c.id)
        );
        if (candidates.length === 0) return;
        const key = getApiKey();
        if (!key) return; // no key → creator stays hidden, nothing else breaks
        candidates.forEach((c) => channelBackfillTried.add(c.id));
        try {
          const titles = await fetchChannelTitles(
            candidates.map((c) => c.videoId),
            key
          );
          if (Object.keys(titles).length === 0) return;
          set((s) => ({
            courses: Object.fromEntries(
              Object.entries(s.courses).map(([id, c]) => [
                id,
                { ...c, channelTitle: titles[c.videoId] ?? c.channelTitle },
              ])
            ),
          }));
        } catch {
          // Best-effort — let a later mount retry.
          candidates.forEach((c) => channelBackfillTried.delete(c.id));
        }
      },

      addCourse: (course) =>
        set((s) => ({
          courses: { ...s.courses, [course.id]: course },
          courseOrder: [
            course.id,
            ...s.courseOrder.filter((id) => id !== course.id),
          ],
          courseRecent: [
            course.id,
            ...s.courseRecent.filter((id) => id !== course.id),
          ].slice(0, 20),
        })),

      updateCourse: (course) =>
        set((s) =>
          s.courses[course.id]
            ? { courses: { ...s.courses, [course.id]: course } }
            : {}
        ),

      removeCourse: (courseId) =>
        set((s) => {
          const { [courseId]: _removed, ...rest } = s.courses;
          return {
            courses: rest,
            courseOrder: s.courseOrder.filter((id) => id !== courseId),
            courseFavorites: s.courseFavorites.filter((id) => id !== courseId),
            courseRecent: s.courseRecent.filter((id) => id !== courseId),
          };
        }),

      setCourseOrder: (ids) =>
        set((s) => {
          const valid = ids.filter((id) => s.courses[id]);
          const missing = Object.keys(s.courses).filter((id) => !valid.includes(id));
          return { courseOrder: [...valid, ...missing] };
        }),

      toggleCourseFavorite: (courseId) =>
        set((s) => ({
          courseFavorites: s.courseFavorites.includes(courseId)
            ? s.courseFavorites.filter((id) => id !== courseId)
            : [...s.courseFavorites, courseId],
        })),

      pushCourseRecent: (courseId) =>
        set((s) => ({
          courseRecent: [
            courseId,
            ...s.courseRecent.filter((id) => id !== courseId),
          ].slice(0, 20),
        })),
    }),
    {
      name: LIBRARY_STORAGE_KEY,
      partialize: (s) => ({
        playlists: s.playlists,
        order: s.order,
        favorites: s.favorites,
        recent: s.recent,
        courses: s.courses,
        courseOrder: s.courseOrder,
        courseFavorites: s.courseFavorites,
        courseRecent: s.courseRecent,
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

export const selectCourseList = (s: LibraryState): Course[] => {
  const inOrder = s.courseOrder
    .map((id) => s.courses[id])
    .filter((c): c is Course => Boolean(c));
  const orderedIds = new Set(inOrder.map((c) => c.id));
  // Courses missing from `order` fall back to newest-first so nothing disappears.
  const missing = Object.values(s.courses)
    .filter((c) => !orderedIds.has(c.id))
    .sort((a, b) => b.createdAt - a.createdAt);
  return [...inOrder, ...missing];
};