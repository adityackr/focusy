"use client";

import { useState } from "react";
import Link from "next/link";
import { Clapperboard, History } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useLibrary } from "@/shared/store/library";
import { PlaylistGrid, PlaylistGridSkeleton } from "@/features/playlists";
import { PageHeader } from "@/shared/ui/page-header";
import { CourseGrid } from "@/features/videos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function RecentView() {
  const { tab, setTab, hydrated, playlistItems, courseItems } = useRecentView();

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="Recently watched"
        subtitle={
          hydrated
            ? "The last videos and playlists you opened — most recent first"
            : "Loading your recent videos…"
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
                emptyIcon={History}
                emptyTitle="No recent videos yet"
                emptyText="Videos you open will show up here, most recent first."
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
                emptyIcon={History}
                emptyTitle="No recent playlists yet"
                emptyText="Playlists you open will show up here, most recent first."
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

/** View state + data for `RecentView` — kept out of the JSX. */
function useRecentView() {
  const [tab, setTab] = useState("videos");
  const recent = useLibrary((s) => s.recent);
  const playlists = useLibrary((s) => s.playlists);
  const courseRecent = useLibrary((s) => s.courseRecent);
  const courses = useLibrary((s) => s.courses);
  const hydrated = useLibrary((s) => s.hydrated);

  const playlistItems = recent.map((id) => playlists[id]).filter(Boolean).slice(0, 12);
  const courseItems = courseRecent.map((id) => courses[id]).filter(Boolean).slice(0, 12);

  return { tab, setTab, hydrated, playlistItems, courseItems };
}