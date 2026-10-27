"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ListVideo, Play } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { Playlist } from "@/shared/lib/types";
import { useLibrary } from "@/shared/store/library";
import { readWatchedCount } from "@/features/playlists/hooks/use-watch-progress";
import { DeletePlaylistButton } from "@/features/playlists/components/delete-playlist-dialog";

/** Playlist card — same layout as the video card so the grids read as one set. */
export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const { done, pct, fav, href, pushRecent, toggleFavorite } = usePlaylistCard(playlist);

  return (
    <Card className="h-full gap-0 overflow-hidden py-0 transition-all hover:-translate-y-1 hover:shadow-xl">
      <Link
        href={href}
        onClick={pushRecent}
        aria-label={`Watch ${playlist.playlistTitle}`}
        className="group relative block"
      >
        <div className="relative aspect-video overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={playlist.playlistThumbnail.url}
            alt={playlist.playlistTitle}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
            <Play className="size-6 fill-current" />
          </span>
        </span>
        <Badge className="absolute bottom-2 right-2 gap-1">
          <ListVideo className="size-3" /> {playlist.videos.length}
        </Badge>
      </Link>
      <CardHeader className="px-4 pt-3">
        <Link
          href={href}
          onClick={pushRecent}
          title={playlist.playlistTitle}
          className="rounded outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardTitle className="line-clamp-1 text-sm leading-snug font-semibold hover:text-primary">
            {playlist.playlistTitle}
          </CardTitle>
        </Link>
        <p className="truncate text-xs text-muted-foreground">{playlist.channelTitle}</p>
      </CardHeader>
      <CardContent className="px-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {done}/{playlist.videos.length} done
          </span>
          <span className="font-medium">{pct}%</span>
        </div>
        <Progress value={pct} className="mb-2 [&>div]:bg-green-600" />
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between px-4 pb-3">
        <span className="text-[11px] font-medium text-muted-foreground">
          {playlist.videos.length} lessons
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFavorite}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "h-8 w-8",
              fav ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Heart className={cn(fav && "fill-current")} />
          </Button>
          <DeletePlaylistButton
            playlistId={playlist.playlistId}
            playlistTitle={playlist.playlistTitle}
            className="h-8 w-8"
          />
        </div>
      </CardFooter>
    </Card>
  );
}

/** Card state + actions for `PlaylistCard` — kept out of the JSX. */
function usePlaylistCard(playlist: Playlist) {
  const [done, setDone] = useState(0);
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const pushRecent = useLibrary((s) => s.pushRecent);
  const fav = favorites.includes(playlist.playlistId);

  useEffect(() => {
    // Progress lives in localStorage — read after mount to avoid hydration drift.
    setDone(readWatchedCount(playlist.playlistId));
  }, [playlist.playlistId]);

  const pct =
    playlist.videos.length === 0
      ? 0
      : Math.round((done / playlist.videos.length) * 100);

  return {
    done,
    pct,
    fav,
    href: `/watch/${playlist.playlistId}`,
    pushRecent: () => pushRecent(playlist.playlistId),
    toggleFavorite: () => toggleFavorite(playlist.playlistId),
  };
}