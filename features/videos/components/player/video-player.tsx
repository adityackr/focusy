"use client";

import { useEffect, type RefObject } from "react";
import { useVideoPlayer, type UseVideoPlayerOptions } from "@/features/videos/hooks/use-video-player";
import type { Chapter } from "@/shared/lib/types";
import {
  PlayerChrome,
  type PlayerTimeControls,
} from "@/shared/player/player-chrome";

type Props = UseVideoPlayerOptions & {
  /** All course chapters — segmented seekbar + now-playing chip. */
  chapters?: Chapter[];
  /** Filled with live time/seek access for the notes panel. */
  controlsRef?: RefObject<PlayerTimeControls | null>;
};

/**
 * Course player adapter — wires the chapter-bounds `useVideoPlayer` hook into
 * the shared player chrome (same component the playlist watch page uses).
 */
export default function VideoPlayer(props: Props) {
  const { chapters = [], controlsRef, ...playerOpts } = props;
  const player = useVideoPlayer(playerOpts);

  useEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = {
      getCurrentTime: player.getCurrentTime,
      seekTo: player.seekTo,
    };
    return () => {
      controlsRef.current = null;
    };
  }, [controlsRef, player.getCurrentTime, player.seekTo]);

  return <PlayerChrome videoId={playerOpts.videoId} player={player} chapters={chapters} />;
}