import { ListVideo, type LucideIcon } from "lucide-react";
import { PlaylistCard } from "@/features/playlists/components/playlist-card";
import { AddPlaylistButton } from "@/features/playlists/components/add-playlist-dialog";
import type { Playlist } from "@/shared/lib/types";

export function PlaylistGrid({
  items,
  emptyIcon: EmptyIcon = ListVideo,
  emptyTitle = "Nothing here yet",
  emptyText = "Import a YouTube playlist to start watching it distraction-free.",
  emptyAction = <AddPlaylistButton />,
}: {
  items: Playlist[];
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <EmptyIcon className="size-7" />
        </span>
        <div>
          <h3 className="font-bold">{emptyTitle}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{emptyText}</p>
        </div>
        {emptyAction}
      </div>
    );
  }
  return (
    <div className="columns-1 gap-5 sm:columns-2 xl:columns-3">
      {items.map((p) => (
        <div key={p.playlistId} className="mb-5 break-inside-avoid">
          <PlaylistCard playlist={p} />
        </div>
      ))}
    </div>
  );
}
