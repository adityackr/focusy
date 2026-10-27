"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function keyFor(playlistId: string) {
  return `focustube:progress:${playlistId}`;
}

function legacyKeyFor(playlistId: string) {
  return `clean-youtube:progress:${playlistId}`;
}

interface Progress {
  watched: string[];
  lastWatched: string | null;
  /** Chapter completion keys (`chapterKey(videoId, startSeconds)`). */
  completedChapters: string[];
  /** Last playback position per video (seconds) — used to resume playback. */
  positions: Record<string, number>;
}

const EMPTY: Progress = {
  watched: [],
  lastWatched: null,
  completedChapters: [],
  positions: {},
};

/** Positions below this are treated as "no resume point" (start from 0). */
const RESUME_MIN_SECONDS = 5;

function parsePositions(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [videoId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= RESUME_MIN_SECONDS) {
      out[videoId] = value;
    }
  }
  return out;
}

/**
 * Resume points, read synchronously and without side effects so the value is
 * available during the *first* render. The player is created from that render
 * with the right start time; reading it in an effect instead cues the player
 * at 0:00 (the resume seek then arrives too late for YouTube to apply).
 */
function readPositions(playlistId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(keyFor(playlistId));
    if (raw) return parsePositions((JSON.parse(raw) as Partial<Progress>).positions);
  } catch {
    /* corrupted JSON or storage unavailable */
  }
  return {};
}

function readStored(playlistId: string): Progress {
  try {
    // One-time upgrade: adopt progress saved under the old Clean YouTube key.
    let raw = localStorage.getItem(keyFor(playlistId));
    if (!raw) {
      const legacy = localStorage.getItem(legacyKeyFor(playlistId));
      if (legacy) {
        localStorage.setItem(keyFor(playlistId), legacy);
        localStorage.removeItem(legacyKeyFor(playlistId));
        raw = legacy;
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      return {
        watched: Array.isArray(parsed.watched) ? parsed.watched : [],
        lastWatched: parsed.lastWatched ?? null,
        completedChapters: Array.isArray(parsed.completedChapters)
          ? parsed.completedChapters
          : [],
        positions: parsePositions(parsed.positions),
      };
    }
  } catch {
    /* corrupted JSON or storage unavailable */
  }
  return { ...EMPTY };
}

/**
 * Read-only watched-count lookup for cards/grids — no migration, no writes,
 * safe to call for any number of cards after mount.
 */
export function readWatchedCount(playlistId: string): number {
  try {
    let raw = localStorage.getItem(keyFor(playlistId));
    if (!raw) raw = localStorage.getItem(legacyKeyFor(playlistId));
    if (raw) {
      const watched = (JSON.parse(raw) as Partial<Progress>).watched;
      if (Array.isArray(watched)) return watched.length;
    }
  } catch {
    /* corrupted JSON or storage unavailable */
  }
  return 0;
}

export function useWatchProgress(playlistId: string) {
  const [watched, setWatched] = useState<string[]>([]);
  const [lastWatched, setLastWatched] = useState<string | null>(null);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<string, number>>(() =>
    readPositions(playlistId)
  );
  // Switching playlist: re-read synchronously during render so a player that
  // mounts in the same commit already sees this playlist's resume points.
  const [positionsFor, setPositionsFor] = useState(playlistId);
  if (positionsFor !== playlistId) {
    setPositionsFor(playlistId);
    setPositions(readPositions(playlistId));
  }
  // Ref mirror of the progress. State updates are async, so a `markWatched`
  // call in a mount effect would otherwise close over the initial empty
  // array and overwrite (wipe) the stored list. Mutations always go through
  // the ref, which the load effect below populates synchronously first.
  const progressRef = useRef<Progress>({ ...EMPTY });

  useEffect(() => {
    const stored = readStored(playlistId);
    progressRef.current = stored;
    setWatched(stored.watched);
    setLastWatched(stored.lastWatched);
    setCompletedChapters(stored.completedChapters);
    setPositions(stored.positions);
  }, [playlistId]);

  const persist = useCallback(
    (next: Progress) => {
      progressRef.current = next;
      setWatched(next.watched);
      setLastWatched(next.lastWatched);
      setCompletedChapters(next.completedChapters);
      setPositions(next.positions);
      try {
        localStorage.setItem(keyFor(playlistId), JSON.stringify(next));
      } catch {
        /* storage full / unavailable */
      }
    },
    [playlistId]
  );

  const markWatched = useCallback(
    (videoId: string) => {
      const current = progressRef.current;
      persist({
        ...current,
        watched: current.watched.includes(videoId)
          ? current.watched
          : [...current.watched, videoId],
        lastWatched: videoId,
      });
    },
    [persist]
  );

  const toggleWatched = useCallback(
    (videoId: string) => {
      const current = progressRef.current;
      persist({
        ...current,
        watched: current.watched.includes(videoId)
          ? current.watched.filter((v) => v !== videoId)
          : [...current.watched, videoId],
      });
    },
    [persist]
  );

  /** Flip a chapter's manual completed mark (`chapterKey(videoId, start)`). */
  const toggleChapter = useCallback(
    (key: string) => {
      const current = progressRef.current;
      persist({
        ...current,
        completedChapters: current.completedChapters.includes(key)
          ? current.completedChapters.filter((k) => k !== key)
          : [...current.completedChapters, key],
      });
    },
    [persist]
  );

  /** Record where playback stopped for a video; drops the resume point when
   *  the time is too small (restarting) or the video was watched to the end. */
  const savePosition = useCallback(
    (videoId: string, seconds: number) => {
      const current = progressRef.current;
      const time = Math.floor(seconds);
      const previous = current.positions[videoId];
      if (!Number.isFinite(time) || time < RESUME_MIN_SECONDS) {
        if (previous === undefined) return;
        const positions = { ...current.positions };
        delete positions[videoId];
        persist({ ...current, positions });
        return;
      }
      if (previous === time) return;
      persist({ ...current, positions: { ...current.positions, [videoId]: time } });
    },
    [persist]
  );

  return {
    watched,
    lastWatched,
    completedChapters,
    positions,
    markWatched,
    toggleWatched,
    toggleChapter,
    savePosition,
  };
}
