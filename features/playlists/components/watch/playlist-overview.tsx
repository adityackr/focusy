import Image from "next/image";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import VideoDescription from "@/components/course/VideoDescription";
import type { Playlist } from "@/lib/types";

export function PlaylistOverview({
  playlist,
  onStart,
}: {
  playlist: Playlist;
  onStart: (videoId: string) => void;
}) {
  const first = playlist.videos[0];

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="relative aspect-video w-full">
          <Image
            src={playlist.playlistThumbnail.url}
            alt={playlist.playlistTitle}
            fill
            sizes="(max-width: 1400px) 100vw, 1400px"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <Badge className="mb-3">{playlist.videos.length} lessons</Badge>
          <h1 className="max-w-2xl text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            {playlist.playlistTitle}
          </h1>
          <p className="mt-1 text-sm text-zinc-300">{playlist.channelTitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {first && (
              <Button onClick={() => onStart(first.videoId)}>
                <Play className="size-4 fill-current" /> Start watching
              </Button>
            )}
          </div>
        </div>
      </div>
      {playlist.playlistDescription && (
        <VideoDescription
          description={playlist.playlistDescription}
          title="ABOUT THIS PLAYLIST"
        />
      )}
    </Card>
  );
}
