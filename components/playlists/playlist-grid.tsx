import { ListVideo, type LucideIcon } from "lucide-react";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { AddPlaylistButton } from "@/components/add-playlist-dialog";
import type { Playlist } from "@/lib/types";

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
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((p) => (
        <PlaylistCard key={p.playlistId} playlist={p} />
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
