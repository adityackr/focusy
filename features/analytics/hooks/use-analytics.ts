"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  EMPTY_ANALYTICS,
  getAnalyticsSnapshot,
  subscribeAnalytics,
} from "../lib/analytics-store";
import { startPresenceActivity, stopAllActivity } from "../lib/activity-tracker";
import { summarizeStudio, type StudioSummary } from "../lib/studio-analytics";
import { collectStudioBackup } from "@/features/studio";
import type { AnalyticsData } from "../types/analytics.types";
import type { Course, Playlist } from "@/shared/lib/types";

/** Reactive analytics snapshot (updates as tracking ticks and goals change). */
export function useAnalyticsData(): AnalyticsData {
  return useSyncExternalStore(
    subscribeAnalytics,
    getAnalyticsSnapshot,
    () => EMPTY_ANALYTICS
  );
}

/**
 * Count time while a Studio/notes/reviewing surface is open. Presence goes
 * idle after two minutes without interaction, and hidden tabs never count.
 */
export function usePresenceActivity(
  kind: "studio" | "notes" | "reviewing",
  active: boolean
): void {
  useEffect(() => {
    if (!active) return;
    return startPresenceActivity(kind);
  }, [kind, active]);
}

export interface StudioAnalyticsState {
  loading: boolean;
  error: string | null;
  summary: StudioSummary | null;
}

/** Load every Studio project from IndexedDB and summarize it. */
export function useStudioAnalytics(
  courses: Course[],
  playlists: Playlist[]
): StudioAnalyticsState {
  const [state, setState] = useState<StudioAnalyticsState>({
    loading: true,
    error: null,
    summary: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    collectStudioBackup()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setState({
            loading: false,
            error: result.error.message,
            summary: null,
          });
          return;
        }
        setState({
          loading: false,
          error: null,
          summary: summarizeStudio(result.value.workspaces, courses, playlists),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          loading: false,
          error: "Couldn't read Studio projects from this browser.",
          summary: null,
        });
      });
    return () => {
      cancelled = true;
    };
    // Reload when the library changes; Studio metadata itself is read fresh.
  }, [courses, playlists]);

  return state;
}

/** Clear sessions when the whole app unmounts (tests and hot reloads). */
export function useActivityCleanup(): void {
  useEffect(() => () => stopAllActivity(), []);
}
