"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useLibrary, selectPlaylistList, selectCourseList } from "@/shared/store/library";
import { PageHeader } from "@/shared/ui/page-header";
import { SortablePlaylistGrid, PlaylistGridSkeleton, AddPlaylistButton } from "@/features/playlists";
import { SortableCourseGrid } from "@/features/videos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export function LibraryView() {
  const [tab, setTab] = useState("videos");
  const playlists = useLibrary(useShallow(selectPlaylistList));
  const courses = useLibrary(useShallow(selectCourseList));
  const hydrated = useLibrary((s) => s.hydrated);

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="My library"
        subtitle={
          hydrated
            ? `${plural(courses.length, "video")} · ${plural(playlists.length, "playlist")} · drag the grip to reorder`
            : "Loading your library…"
        }
        action={
          tab === "videos" ? (
            <Link href="/add" className={cn(buttonVariants())}>
              <Plus className="size-4" /> Add video
            </Link>
          ) : (
            <AddPlaylistButton />
          )
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="videos">
            Videos{hydrated ? ` · ${courses.length}` : ""}
          </TabsTrigger>
          <TabsTrigger value="playlists">
            Playlists{hydrated ? ` · ${playlists.length}` : ""}
          </TabsTrigger>
        </TabsList>
        {!hydrated ? (
          <PlaylistGridSkeleton count={3} />
        ) : (
          <>
            <TabsContent value="videos">
              <SortableCourseGrid />
            </TabsContent>
            <TabsContent value="playlists">
              <SortablePlaylistGrid />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}