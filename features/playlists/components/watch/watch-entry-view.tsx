"use client";

import { useEffect, useState } from "react";
import { useLibrary } from "@/shared/store/library";
import { CoursePlayerView } from "@/features/videos";
import { WatchView } from "@/features/playlists/components/watch/watch-view";
import { WatchSkeleton } from "@/features/playlists/components/watch/watch-skeleton";

/**
 * `/watch/[id]` is the single player route for both content types. A saved
 * video course and a playlist are both keyed by id, so this picks the right
 * player from the library. Unknown ids fall through to `WatchView`, which can
 * auto-import a shared playlist.
 */
export function WatchEntryView({
  id,
  activeVideoId,
  startAt,
}: {
  id: string;
  activeVideoId?: string;
  /** Deep-linked start time from `?t=` — cued when the player mounts. */
  startAt?: number;
}) {
  const isCourse = useLibrary((state) => Boolean(state.courses[id]));
  const isPlaylist = useLibrary((state) => Boolean(state.playlists[id]));

  // The library is hydrated from localStorage on the client only. Render a
  // neutral skeleton on the server and first client paint so the two content
  // types never hydrate into different markup.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <WatchSkeleton />;

  if (isCourse && !isPlaylist) {
    return <CoursePlayerView courseId={id} startAt={startAt} />;
  }

  return (
    <WatchView
      playlistId={id}
      activeVideoId={activeVideoId}
      startAt={startAt}
    />
  );
}
