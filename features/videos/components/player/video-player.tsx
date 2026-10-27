"use client";

import { useVideoPlayer, type UseVideoPlayerOptions } from "@/features/videos/hooks/use-video-player";
import type { Chapter } from "@/shared/lib/types";
import { PlayerChrome } from "@/shared/player/player-chrome";

type Props = UseVideoPlayerOptions & {
  /** All course chapters — segmented seekbar + now-playing chip. */
  chapters?: Chapter[];
};

/**
 * Course player adapter — wires the chapter-bounds `useVideoPlayer` hook into
 * the shared player chrome (same component the playlist watch page uses).
 */
export default function VideoPlayer(props: Props) {
  const { chapters = [], ...playerOpts } = props;
  const player = useVideoPlayer(playerOpts);
  return <PlayerChrome videoId={playerOpts.videoId} player={player} chapters={chapters} />;
}