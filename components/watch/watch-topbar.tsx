"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, ListVideo } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/store/library";
import { DeletePlaylistButton } from "@/components/playlists/delete-playlist-dialog";

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
  const router = useRouter();
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const fav = favorites.includes(playlistId);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link
        href="/library"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
      >
        <ArrowLeft className="size-4" /> Library
      </Link>
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={() => toggleFavorite(playlistId)}>
          <Heart className={cn("size-4", fav && "fill-primary text-primary")} />
          {fav ? "Favorited" : "Favorite"}
        </Button>
        <DeletePlaylistButton
          playlistId={playlistId}
          playlistTitle={playlistTitle}
          iconOnly={false}
          className="h-8 px-3 text-xs"
          onDeleted={() => router.push("/library")}
        />
        <Button variant="outline" size="sm" onClick={onToggleSidebar}>
          <ListVideo className="size-4" />
          {sidebarOpen ? "Hide lessons" : "Show lessons"}
        </Button>
      </div>
    </div>
  );
}
