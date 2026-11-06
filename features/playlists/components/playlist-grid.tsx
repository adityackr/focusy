import { ListVideo, type LucideIcon } from "lucide-react";
import { PlaylistCard } from "@/features/playlists/components/playlist-card";
import { AddPlaylistButton } from "@/features/playlists/components/add-playlist-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
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
      <EmptyState
        icon={EmptyIcon}
        title={emptyTitle}
        text={emptyText}
        action={emptyAction}
      />
    );
  }
  return (
    <div className="columns-1 gap-5 sm:columns-2 xl:columns-3">
      {items.map((p, i) => (
        <div
          key={p.playlistId}
          className="card-enter mb-5 break-inside-avoid"
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
        >
          <PlaylistCard playlist={p} />
        </div>
      ))}
    </div>
  );
}
