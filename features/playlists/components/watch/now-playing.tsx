"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { VideoPlayer, type SeekRequest } from "@/features/playlists/components/watch/video-player";
import { chaptersForVideo } from "@/shared/lib/chapters";
import VideoDescription from "@/shared/components/video-description";
import type { Playlist, PlaylistVideo } from "@/shared/lib/types";

export function NowPlaying({
  playlist,
  activeVideo,
  activeIndex,
  watched,
  startAt,
  seekRequest,
  onChapterChange,
  onProgress,
}: {
  playlist: Playlist;
  activeVideo: PlaylistVideo;
  activeIndex: number;
  watched: string[];
  /** Deep-linked start time (`?t=`) applied when the player mounts. */
  startAt?: number;
  /** Sidebar-initiated seek for this video. */
  seekRequest?: SeekRequest | null;
  /** Reports the chapter containing the current playback time (-1 = none). */
  onChapterChange?: (index: number) => void;
  /** Playback reports (throttled) used to remember where to resume. */
  onProgress?: (time: number, duration: number) => void;
}) {
  const { chapters, nextVideo, progress, goNext } = useNowPlaying({
    playlist,
    activeVideo,
    activeIndex,
    watched,
  });

  return (
    <>
      <div className="overflow-hidden rounded-2xl border bg-black shadow-xl">
        <VideoPlayer
          key={activeVideo.videoId}
          videoId={activeVideo.videoId}
          chapters={chapters}
          startAt={startAt ?? null}
          seekRequest={seekRequest}
          onChapterChange={onChapterChange}
          onProgress={onProgress}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          Lesson {activeIndex + 1} of {playlist.videos.length}
        </Badge>
        <Badge variant="secondary">{progress}% completed</Badge>
        {nextVideo && (
          <Button size="sm" className="ml-auto" onClick={goNext}>
            Next lesson <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
      <h1 className="mt-3 text-xl font-extrabold leading-snug tracking-tight sm:text-2xl">
        {activeVideo.title}
      </h1>
      <p className="mt-1 text-sm font-medium text-muted-foreground">
        {playlist.channelTitle}
      </p>
      <VideoDescription description={activeVideo.description ?? ""} />
    </>
  );
}

/** Derived player data for `NowPlaying` — kept out of the JSX. */
function useNowPlaying({
  playlist,
  activeVideo,
  activeIndex,
  watched,
}: {
  playlist: Playlist;
  activeVideo: PlaylistVideo;
  activeIndex: number;
  watched: string[];
}) {
  const router = useRouter();
  const chapters = useMemo(() => chaptersForVideo(activeVideo), [activeVideo]);
  const nextVideo =
    activeIndex + 1 < playlist.videos.length ? playlist.videos[activeIndex + 1] : undefined;
  const progress = playlist.videos.length
    ? Math.round((watched.length / playlist.videos.length) * 100)
    : 0;

  const goNext = () => {
    if (nextVideo) router.push(`/watch/${playlist.playlistId}/${nextVideo.videoId}`);
  };

  return { chapters, nextVideo, progress, goNext };
}
