"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useLibrary } from "@/shared/store/library";
import { PlaylistGrid, PlaylistGridSkeleton } from "@/features/playlists";
import { PageHeader } from "@/shared/ui/page-header";
import { CourseGrid } from "@/features/videos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function FavoritesView() {
  const [tab, setTab] = useState("videos");
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const courseFavorites = useLibrary((s) => s.courseFavorites);
  const courses = useLibrary((s) => s.courses);
  const hydrated = useLibrary((s) => s.hydrated);

  const playlistItems = favorites.map((id) => playlists[id]).filter(Boolean);
  const courseItems = courseFavorites.map((id) => courses[id]).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="Favorites"
        subtitle={
          hydrated
            ? "Videos and playlists you pinned for quick access"
            : "Loading your favorites…"
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="videos">Videos{hydrated ? ` · ${courseItems.length}` : ""}</TabsTrigger>
          <TabsTrigger value="playlists">
            Playlists{hydrated ? ` · ${playlistItems.length}` : ""}
          </TabsTrigger>
        </TabsList>
        {!hydrated ? (
          <PlaylistGridSkeleton count={3} />
        ) : (
          <>
            <TabsContent value="videos">
              <CourseGrid
                items={courseItems}
                emptyIcon={Heart}
                emptyTitle="No favorite videos yet"
                emptyText="Tap the heart icon on any video to pin it here for quick access."
                emptyAction={
                  <Link href="/add" className={cn(buttonVariants({ variant: "outline" }))}>
                    Add a video
                  </Link>
                }
              />
            </TabsContent>
            <TabsContent value="playlists">
              <PlaylistGrid
                items={playlistItems}
                emptyIcon={Heart}
                emptyTitle="No favorites yet"
                emptyText="Tap the heart icon on any playlist to pin it here for quick access."
                emptyAction={
                  <Link href="/library" className={cn(buttonVariants({ variant: "outline" }))}>
                    Browse library
                  </Link>
                }
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}