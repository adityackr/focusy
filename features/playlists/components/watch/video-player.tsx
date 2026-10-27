"use client";

import { useVideoPlayer } from "@/features/playlists/hooks/use-video-player";
import type { Chapter } from "@/shared/lib/types";
import { PlayerChrome, type SeekRequest } from "@/shared/player/player-chrome";

export type { SeekRequest };

interface Props {
  videoId: string;
  /** Chapters of this video — segmented seekbar + now-playing chip. */
  chapters?: Chapter[];
  /** Absolute time to cue when the player mounts (from `?t=` deep links). */
  startAt?: number | null;
  /** Sidebar-initiated seek, applied when it targets this video. */
  seekRequest?: SeekRequest | null;
  /** Fires with the index of the chapter containing the current time (-1 = none). */
  onChapterChange?: (index: number) => void;
  /** Throttled playback reports (~every 5s, and at the end) for resume tracking. */
  onProgress?: (time: number, duration: number) => void;
}

/**
 * Playlist watch adapter — wires the whole-video `useVideoPlayer` hook into
 * the shared player chrome (same component the course page uses).
 */
export function VideoPlayer({
  videoId,
  chapters = [],
  startAt = null,
  seekRequest,
  onChapterChange,
  onProgress,
}: Props) {
  const player = useVideoPlayer({ videoId, startAt });
  return (
    <PlayerChrome
      videoId={videoId}
      player={player}
      chapters={chapters}
      seekRequest={seekRequest}
      onChapterChange={onChapterChange}
      onProgress={onProgress}
    />
  );
}