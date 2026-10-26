"use client";

import { useShallow } from "zustand/react/shallow";
import { useLibrary, selectPlaylistList } from "@/store/library";
import { PageHeader } from "@/components/playlists/playlist-grid";
import { SortablePlaylistGrid } from "@/components/playlists/sortable-playlist-grid";
import { PlaylistGridSkeleton } from "@/components/playlists/playlist-grid-skeleton";
import { AddPlaylistButton } from "@/components/add-playlist-dialog";

export default function LibraryPage() {
  const items = useLibrary(useShallow(selectPlaylistList));
  const hydrated = useLibrary((s) => s.hydrated);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="My library"
        subtitle={
          hydrated
            ? `${items.length} playlist${items.length === 1 ? "" : "s"} · drag the grip to reorder`
            : "Loading your library…"
        }
        action={<AddPlaylistButton />}
      />
      {hydrated ? <SortablePlaylistGrid /> : <PlaylistGridSkeleton />}
    </div>
  );
}
