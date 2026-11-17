"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import type { PlayerTimeControls } from "@/shared/player/player-chrome";
import { VideoPlayer, type SeekRequest } from "@/features/playlists/components/watch/video-player";
import { chaptersForVideo } from "@/shared/lib/chapters";
import { NotesPanel } from "@/shared/components/notes/notes-panel";
import { BookmarksPanel } from "@/features/bookmarks";
import VideoDescription from "@/shared/components/video-description";
import type { Playlist, PlaylistVideo } from "@/shared/lib/types";
import { usePresenceActivity } from "@/features/analytics";

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
  const controlsRef = useRef<PlayerTimeControls | null>(null);
  const getCurrentTime = useCallback(
    () => controlsRef.current?.getCurrentTime() ?? null,
    [],
  );
  const seekTo = useCallback(
    (seconds: number) => controlsRef.current?.seekTo(seconds),
    [],
  );
  // Note-taking time is tracked while the notes sheet is open and recently used.
  const [notesOpen, setNotesOpen] = useState(false);
  usePresenceActivity("notes", notesOpen);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border bg-black shadow-xl">
        <VideoPlayer
          key={activeVideo.videoId}
          videoId={activeVideo.videoId}
          chapters={chapters}
          startAt={startAt ?? null}
          seekRequest={seekRequest}
          controlsRef={controlsRef}
          onChapterChange={onChapterChange}
          onProgress={onProgress}
          activitySource={{
            kind: "playlist",
            id: playlist.playlistId,
            title: playlist.playlistTitle,
            href: `/watch/${playlist.playlistId}/${activeVideo.videoId}`,
            videoId: activeVideo.videoId,
            lessonTitle: activeVideo.title,
          }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          Lesson {activeIndex + 1} of {playlist.videos.length}
        </Badge>
        <Badge variant="secondary">{progress}% completed</Badge>
        <NotesPanel
          key={activeVideo.videoId}
          videoId={activeVideo.videoId}
          title={activeVideo.title}
          source={{
            kind: "playlist",
            playlistId: playlist.playlistId,
            videoId: activeVideo.videoId,
            title: activeVideo.title,
          }}
          getCurrentTime={getCurrentTime}
          onSeek={seekTo}
          onOpenChange={setNotesOpen}
        />
        <BookmarksPanel
          key={activeVideo.videoId}
          videoId={activeVideo.videoId}
          title={activeVideo.title}
          source={{
            kind: "playlist",
            playlistId: playlist.playlistId,
            videoId: activeVideo.videoId,
            title: activeVideo.title,
            collectionTitle: playlist.playlistTitle,
          }}
          getCurrentTime={getCurrentTime}
          onSeek={seekTo}
        />
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
