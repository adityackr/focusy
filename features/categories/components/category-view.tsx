"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, Folder as FolderIcon, FolderX } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import type { Category } from "@/shared/lib/types";
import {
  useLibrary,
  selectCourseList,
  selectPlaylistList,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/shared/store/library";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Button, buttonVariants } from "@/shared/ui/button";
import { CategoryDialog } from "@/shared/components/category-dialog";
import { cn } from "@/shared/lib/utils";
import { CourseGrid, SortableCourseGrid } from "@/features/videos";
import {
  PlaylistGrid,
  PlaylistGridSkeleton,
  SortablePlaylistGrid,
} from "@/features/playlists";

export function CategoryView({ categoryId }: { categoryId: string }) {
  const {
    tab,
    setTab,
    hydrated,
    category,
    courses,
    playlists,
    isUncategorized,
    moveOpen,
    setMoveOpen,
    handleMoveAll,
  } = useCategoryView(categoryId);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <PageHeader title="Category" subtitle="Loading your category…" />
        <PlaylistGridSkeleton count={3} />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <EmptyState
          icon={FolderX}
          title="Category not found"
          text="This category doesn't exist in this browser. It may have been removed."
          action={
            <Link href="/categories" className={cn(buttonVariants({ variant: "outline" }))}>
              All categories
            </Link>
          }
        />
      </div>
    );
  }

  const moveCount = tab === "videos" ? courses.length : playlists.length;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title={category.name}
        subtitle={`${courses.length} video${courses.length === 1 ? "" : "s"} · ${playlists.length} playlist${playlists.length === 1 ? "" : "s"} · drag the grip to reorder`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {moveCount > 0 && (
              <Button variant="outline" onClick={() => setMoveOpen(true)}>
                <ArrowRightLeft className="size-4" />
                {tab === "videos" ? "Move videos" : "Move playlists"}
              </Button>
            )}
            <Link
              href="/categories"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ArrowLeft className="size-4" /> All categories
            </Link>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="videos">Videos · {courses.length}</TabsTrigger>
          <TabsTrigger value="playlists">Playlists · {playlists.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          {courses.length === 0 ? (
            <CourseGrid
              items={[]}
              emptyIcon={FolderIcon}
              emptyTitle="No videos in this category"
              emptyText="Use the folder button on any video card to file it here."
              emptyAction={
                <Link href="/library" className={cn(buttonVariants({ variant: "outline" }))}>
                  Browse library
                </Link>
              }
            />
          ) : (
            <SortableCourseGrid categoryId={categoryId} />
          )}
        </TabsContent>

        <TabsContent value="playlists">
          {playlists.length === 0 ? (
            <PlaylistGrid
              items={[]}
              emptyIcon={FolderIcon}
              emptyTitle="No playlists in this category"
              emptyText="Use the folder button on any playlist card to file it here."
              emptyAction={
                <Link href="/library" className={cn(buttonVariants({ variant: "outline" }))}>
                  Browse library
                </Link>
              }
            />
          ) : (
            <SortablePlaylistGrid categoryId={categoryId} />
          )}
        </TabsContent>
      </Tabs>

      <CategoryDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        onSave={handleMoveAll}
        initialCategoryId={isUncategorized ? null : categoryId}
        title={tab === "videos" ? "Move videos to a category" : "Move playlists to a category"}
        description={`Every ${tab === "videos" ? "video" : "playlist"} in this category moves together. You can still move items one by one from their cards.`}
        confirmLabel="Move"
      />
    </div>
  );
}

/** Category + its items and bulk-move state for `CategoryView` — kept out of the JSX. */
function useCategoryView(categoryId: string) {
  const [tab, setTab] = useState("videos");
  const [moveOpen, setMoveOpen] = useState(false);
  const hydrated = useLibrary((s) => s.hydrated);
  const categories = useLibrary((s) => s.categories);
  const storedCategory = useLibrary((s) => s.categories[categoryId]);
  const allCourses = useLibrary(useShallow(selectCourseList));
  const allPlaylists = useLibrary(useShallow(selectPlaylistList));
  const setCourseCategory = useLibrary((s) => s.setCourseCategory);
  const setPlaylistCategory = useLibrary((s) => s.setPlaylistCategory);

  const isUncategorized = categoryId === UNCATEGORIZED_CATEGORY_ID;
  const category: Category | undefined = isUncategorized
    ? { id: UNCATEGORIZED_CATEGORY_ID, name: "Uncategorized", createdAt: 0 }
    : storedCategory;

  const isKnown = (id?: string) => Boolean(id && categories[id]);
  const courses = allCourses.filter((c) =>
    isUncategorized ? !isKnown(c.categoryId) : c.categoryId === categoryId
  );
  const playlists = allPlaylists.filter((p) =>
    isUncategorized ? !isKnown(p.categoryId) : p.categoryId === categoryId
  );

  function handleMoveAll(targetId?: string) {
    const target = targetId ?? null;
    const current = isUncategorized ? null : categoryId;
    setMoveOpen(false);
    if (target === current) return;

    const movingCourses = tab === "videos";
    const count = movingCourses ? courses.length : playlists.length;
    if (movingCourses) {
      courses.forEach((c) => setCourseCategory(c.id, target));
    } else {
      playlists.forEach((p) => setPlaylistCategory(p.playlistId, target));
    }
    const targetName = target
      ? categories[target]?.name ?? "another category"
      : "Uncategorized";
    toast.success(
      `${count} ${movingCourses ? "video" : "playlist"}${count === 1 ? "" : "s"} moved to ${targetName}.`
    );
  }

  return {
    tab,
    setTab,
    hydrated,
    category,
    courses,
    playlists,
    isUncategorized,
    moveOpen,
    setMoveOpen,
    handleMoveAll,
  };
}
