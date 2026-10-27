"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, ListVideo } from "lucide-react";
import { Button, buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useLibrary } from "@/shared/store/library";
import { DeletePlaylistButton } from "@/features/playlists/components/delete-playlist-dialog";

export function WatchTopbar({
  playlistId,
  playlistTitle,
  sidebarOpen,
  onToggleSidebar,
}: {
  playlistId: string;
  playlistTitle: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const { fav, toggleFavorite, goLibrary } = useWatchTopbar(playlistId);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link
        href="/library"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
      >
        <ArrowLeft className="size-4" /> Library
      </Link>
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={toggleFavorite}>
          <Heart className={cn("size-4", fav && "fill-primary text-primary")} />
          {fav ? "Favorited" : "Favorite"}
        </Button>
        <DeletePlaylistButton
          playlistId={playlistId}
          playlistTitle={playlistTitle}
          iconOnly={false}
          className="h-8 px-3 text-xs"
          onDeleted={goLibrary}
        />
        <Button variant="outline" size="sm" onClick={onToggleSidebar}>
          <ListVideo className="size-4" />
          {sidebarOpen ? "Hide lessons" : "Show lessons"}
        </Button>
      </div>
    </div>
  );
}

/** Favorite state + actions for `WatchTopbar` — kept out of the JSX. */
function useWatchTopbar(playlistId: string) {
  const router = useRouter();
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavoriteStore = useLibrary((s) => s.toggleFavorite);
  const fav = favorites.includes(playlistId);

  return {
    fav,
    toggleFavorite: () => toggleFavoriteStore(playlistId),
    goLibrary: () => router.push("/library"),
  };
}
