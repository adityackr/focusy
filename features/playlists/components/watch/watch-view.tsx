"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SeekRequest } from "@/features/playlists/components/watch/video-player";
import { useRouter } from "next/navigation";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/lib/utils";
import { useLibrary } from "@/shared/store/library";
import { useWatchProgress } from "@/features/playlists/hooks/use-watch-progress";
import { VideoList } from "@/features/playlists/components/watch/video-list";
import { WatchSkeleton } from "@/features/playlists/components/watch/watch-skeleton";
import { WatchTopbar } from "@/features/playlists/components/watch/watch-topbar";
import { NowPlaying } from "@/features/playlists/components/watch/now-playing";
import { PlaylistOverview } from "@/features/playlists/components/watch/playlist-overview";
import { LessonSidebar } from "@/features/playlists/components/watch/lesson-sidebar";
import { PlaylistNotFound } from "@/features/playlists/components/watch/playlist-not-found";

export function WatchView({
  playlistId,
  activeVideoId,
  startAt,
}: {
  playlistId: string;
  activeVideoId?: string;
  /** Deep-linked start time from `?t=` — cued when the player mounts. */
  startAt?: number;
}) {
  const router = useRouter();
  const playlists = useLibrary((s) => s.playlists);
  const fetchPlaylist = useLibrary((s) => s.fetchPlaylist);
  const loadingIds = useLibrary((s) => s.loadingIds);
  const hydrated = useLibrary((s) => s.hydrated);
  const pushRecent = useLibrary((s) => s.pushRecent);

  const playlist = playlists[playlistId];
  const loading = loadingIds.includes(playlistId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Sidebar chapter click inside the active video → seek the player in place.
  const [seekReq, setSeekReq] = useState<SeekRequest | null>(null);
  // Chapter containing the current playback time (for the sidebar highlight).
  const [activeChapterIndex, setActiveChapterIndex] = useState(-1);
  const {
    watched,
    completedChapters,
    positions,
    markWatched,
    toggleWatched,
    toggleChapter,
    savePosition,
  } = useWatchProgress(playlistId);

  // Last resume point we saved — flushed again when the lesson changes (or
  // this page unmounts) so the exact final position survives navigation (the
  // player only reports every ~5s).
  const lastReportRef = useRef<{ videoId: string; time: number } | null>(null);

  const handleProgress = useCallback(
    (time: number, duration: number) => {
      if (!activeVideoId) return;
      // Reaching the end drops the resume point so the next open starts at 0.
      const resumeAt = duration > 0 && time >= duration - 1 ? 0 : time;
      lastReportRef.current = { videoId: activeVideoId, time: resumeAt };
      savePosition(activeVideoId, resumeAt);
    },
    [activeVideoId, savePosition]
  );

  useEffect(() => {
    return () => {
      const last = lastReportRef.current;
      if (last) savePosition(last.videoId, last.time);
    };
  }, [activeVideoId, savePosition]);

  const handleChapterSelect = (videoId: string, time: number) => {
    // Only called for the already-active video (VideoList links other lessons
    // with a ?t= href, which the route turns into a startAt deep link).
    if (videoId !== activeVideoId) return;
    setSeekReq((prev) => ({ videoId, time, n: (prev?.n ?? 0) + 1 }));
  };

  // Auto-import when opening a shared link for a playlist not in the library.
  // Wait for hydration first so we don't re-fetch something already in localStorage.
  useEffect(() => {
    if (hydrated && !playlist && !loading) fetchPlaylist(playlistId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId, hydrated]);

  useEffect(() => {
    if (playlist) pushRecent(playlistId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId, !!playlist]);

  useEffect(() => {
    if (activeVideoId) markWatched(activeVideoId);
  }, [activeVideoId, markWatched]);

  const activeIndex =
    activeVideoId && playlist ? playlist.videos.findIndex((v) => v.videoId === activeVideoId) : -1;
  const activeVideo = playlist && activeIndex >= 0 ? playlist.videos[activeIndex] : undefined;

  if (!playlist) {
    if (!hydrated || loading) return <WatchSkeleton />;
    return <PlaylistNotFound />;
  }

  // Where to cue the player: an explicit ?t= deep link wins, otherwise the
  // stored position for this video (undefined → start from 0).
  const resumeAt = activeVideoId ? positions[activeVideoId] : undefined;

  return (
    <div className="mx-auto max-w-350 px-4 py-4 sm:px-6 lg:py-6">
      <WatchTopbar
        playlistId={playlistId}
        playlistTitle={playlist.playlistTitle}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div
        className={cn(
          "grid gap-6",
          sidebarOpen ? "lg:grid-cols-[minmax(0,1fr)_380px]" : "lg:grid-cols-1"
        )}
      >
        <div className="min-w-0">
          {activeVideo ? (
            <NowPlaying
              playlist={playlist}
              activeVideo={activeVideo}
              activeIndex={activeIndex}
              watched={watched}
              startAt={startAt ?? resumeAt}
              seekRequest={seekReq}
              onChapterChange={setActiveChapterIndex}
              onProgress={handleProgress}
            />
          ) : (
            <PlaylistOverview
              playlist={playlist}
              onStart={(videoId) => router.push(`/watch/${playlistId}/${videoId}`)}
            />
          )}
        </div>

        <LessonSidebar
          playlist={playlist}
          playlistId={playlistId}
          activeVideoId={activeVideoId}
          watched={watched}
          onToggleWatched={toggleWatched}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          activeChapterIndex={activeChapterIndex}
          onChapterSelect={handleChapterSelect}
          completedChapters={completedChapters}
          onToggleChapter={toggleChapter}
        />
      </div>

      <Separator className="my-8" />

      {/* Mobile lesson list (always visible below on small screens) */}
      <div className="lg:hidden">
        <h2 className="mb-3 font-bold">All lessons</h2>
        <VideoList
          videos={playlist.videos}
          playlistId={playlistId}
          channelTitle={playlist.channelTitle}
          activeVideoId={activeVideoId}
          watched={watched}
          onToggleWatched={toggleWatched}
          activeChapterIndex={activeChapterIndex}
          onChapterSelect={handleChapterSelect}
          completedChapters={completedChapters}
          onToggleChapter={toggleChapter}
          compact
        />
      </div>
    </div>
  );
}
