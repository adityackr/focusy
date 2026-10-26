"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/store/library";
import { PageHeader, PlaylistGrid } from "@/components/playlists/playlist-grid";
import { PlaylistGridSkeleton } from "@/components/playlists/playlist-grid-skeleton";

export default function RecentPage() {
  const recent = useLibrary((s) => s.recent);
  const playlists = useLibrary((s) => s.playlists);
  const hydrated = useLibrary((s) => s.hydrated);
  const items = recent
    .map((id) => playlists[id])
    .filter(Boolean)
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="Recently watched"
        subtitle={
          hydrated
            ? "The last playlists you opened — most recent first"
            : "Loading your recent playlists…"
        }
      />
      {hydrated ? (
        <PlaylistGrid
          items={items}
          emptyIcon={History}
          emptyTitle="No recent playlists yet"
          emptyText="Playlists you open will show up here, most recent first."
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
