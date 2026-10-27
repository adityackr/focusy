"use client";

import Link from "next/link";
import { ListVideo } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useLibrary } from "@/shared/store/library";
import { AddPlaylistButton } from "@/features/playlists/components/add-playlist-dialog";

export function PlaylistNotFound() {
  const { error } = usePlaylistNotFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <ListVideo className="size-7 text-muted-foreground" />
      </span>
      <h1 className="text-xl font-bold">Playlist not found</h1>
      <p className="text-sm text-muted-foreground">
        {error ?? "This playlist isn't in your library. Import it to start watching."}
      </p>
      <div className="flex gap-2">
        <AddPlaylistButton />
        <Link href="/library" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to library
        </Link>
      </div>
    </div>
  );
}

/** Store error surfaced on the not-found screen — kept out of the JSX. */
function usePlaylistNotFound() {
  const error = useLibrary((s) => s.error);
  return { error };
}
