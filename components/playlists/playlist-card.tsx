"use client";

import Link from "next/link";
import { Heart, ListVideo, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Playlist } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { DeletePlaylistButton } from "@/components/playlists/delete-playlist-dialog";

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const pushRecent = useLibrary((s) => s.pushRecent);
  const fav = favorites.includes(playlist.playlistId);
  const href = `/watch/${playlist.playlistId}`;

  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
      <Link
        href={href}
        onClick={() => pushRecent(playlist.playlistId)}
        aria-label={`Watch ${playlist.playlistTitle}`}
        className="relative block w-full text-left"
      >
        <div className="relative aspect-video overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={playlist.playlistThumbnail.url}
            alt={playlist.playlistTitle}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
              <Play className="size-6 fill-current" />
            </span>
          </span>
          <Badge className="absolute bottom-2 right-2 gap-1">
            <ListVideo className="size-3" /> {playlist.videos.length}
          </Badge>
        </div>
      </Link>
      <CardContent className="p-4">
        <Link
          href={href}
          onClick={() => pushRecent(playlist.playlistId)}
          className="line-clamp-2 min-h-10 text-[15px] font-bold leading-snug hover:text-primary"
        >
          {playlist.playlistTitle}
        </Link>
        <p className="mt-1 truncate text-xs text-muted-foreground">{playlist.channelTitle}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            {playlist.videos.length} lessons
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleFavorite(playlist.playlistId)}
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
        </div>
      </CardContent>
    </Card>
  );
}
