"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/store/library";
import { PageHeader, PlaylistGrid } from "@/components/playlists/playlist-grid";
import { PlaylistGridSkeleton } from "@/components/playlists/playlist-grid-skeleton";

export default function FavoritesPage() {
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const hydrated = useLibrary((s) => s.hydrated);
  const items = favorites.map((id) => playlists[id]).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="Favorites"
        subtitle={
          hydrated ? "Playlists you pinned for quick access" : "Loading your favorites…"
        }
      />
      {hydrated ? (
        <PlaylistGrid
          items={items}
          emptyIcon={Heart}
          emptyTitle="No favorites yet"
          emptyText="Tap the heart icon on any playlist to pin it here for quick access."
          emptyAction={
            <Link href="/library" className={cn(buttonVariants({ variant: "outline" }))}>
              Browse library
            </Link>
          }
        />
      ) : (
        <PlaylistGridSkeleton count={3} />
      )}
    </div>
  );
}
