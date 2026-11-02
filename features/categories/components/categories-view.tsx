"use client";

import Link from "next/link";
import { Folder as FolderIcon, FolderOpen } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { Category } from "@/shared/lib/types";
import {
  useLibrary,
  selectCourseList,
  selectPlaylistList,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/shared/store/library";
import { PageHeader } from "@/shared/ui/page-header";
import { PlaylistGridSkeleton } from "@/features/playlists";
import {
  DeleteCategoryButton,
  RenameCategoryButton,
} from "@/features/categories/components/category-dialogs";

export function CategoriesView() {
  const { hydrated, folders } = useCategoriesView();

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="Categories"
        subtitle={
          hydrated
            ? `${folders.length} folder${folders.length === 1 ? "" : "s"} · your videos and playlists by topic`
            : "Loading your categories…"
        }
      />

      {!hydrated ? (
        <PlaylistGridSkeleton count={3} />
      ) : folders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FolderIcon className="size-7" />
          </span>
          <div>
            <h2 className="font-bold">No categories yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Save a video or playlist and pick a category, or use the folder button on any
              card to file it later.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {folders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      )}
    </div>
  );
}

interface FolderSummary extends Category {
  videoCount: number;
  playlistCount: number;
  previews: string[];
  /** Reserved folder for items that have no real category. */
  uncategorized?: boolean;
}

function FolderCard({ folder }: { folder: FolderSummary }) {
  return (
    <div className="group relative rounded-2xl border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
      <Link
        href={`/categories/${folder.id}`}
        className="flex flex-col gap-4 p-4"
        aria-label={`Open ${folder.name}`}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {folder.uncategorized ? (
              <FolderOpen className="size-5" />
            ) : (
              <FolderIcon className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-semibold group-hover:text-primary">{folder.name}</h2>
            <p className="text-xs text-muted-foreground">
              {folder.videoCount} video{folder.videoCount === 1 ? "" : "s"} ·{" "}
              {folder.playlistCount} playlist{folder.playlistCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {folder.previews.length > 0 ? (
          <div className="flex gap-2 overflow-hidden">
            {folder.previews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${src}-${i}`}
                src={src}
                alt=""
                loading="lazy"
                className="h-16 w-24 shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            Empty folder
          </div>
        )}
      </Link>

      {!folder.uncategorized && (
        <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg border bg-card/95 p-0.5 shadow-md backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <RenameCategoryButton categoryId={folder.id} categoryName={folder.name} />
          <DeleteCategoryButton
            categoryId={folder.id}
            categoryName={folder.name}
            videoCount={folder.videoCount}
            playlistCount={folder.playlistCount}
          />
        </div>
      )}
    </div>
  );
}

/** Folder summaries for `CategoriesView` — kept out of the JSX. */
function useCategoriesView() {
  const hydrated = useLibrary((s) => s.hydrated);
  const categories = useLibrary(
    useShallow((s) =>
      s.categoryOrder
        .map((id) => s.categories[id])
        .filter((c): c is Category => Boolean(c))
    )
  );
  const courses = useLibrary(useShallow(selectCourseList));
  const playlists = useLibrary(useShallow(selectPlaylistList));

  function summarize(
    category: Category,
    categoryCourses = courses.filter((c) => c.categoryId === category.id),
    categoryPlaylists = playlists.filter((p) => p.categoryId === category.id),
    uncategorized = false
  ): FolderSummary {
    const previews = [
      ...categoryCourses.map((c) => c.thumbnail),
      ...categoryPlaylists.map((p) => p.playlistThumbnail.url),
    ]
      .filter(Boolean)
      .slice(0, 3);
    return {
      ...category,
      videoCount: categoryCourses.length,
      playlistCount: categoryPlaylists.length,
      previews,
      uncategorized,
    };
  }

  const folders = categories.map((category) => summarize(category));

  // Anything unfiled (no category, or a category that no longer exists) gets
  // one trailing folder so it's reachable and can be filed from there.
  const knownIds = new Set(categories.map((c) => c.id));
  const looseCourses = courses.filter(
    (c) => !c.categoryId || !knownIds.has(c.categoryId)
  );
  const loosePlaylists = playlists.filter(
    (p) => !p.categoryId || !knownIds.has(p.categoryId)
  );
  if (looseCourses.length + loosePlaylists.length > 0) {
    folders.push(
      summarize(
        { id: UNCATEGORIZED_CATEGORY_ID, name: "Uncategorized", createdAt: 0 },
        looseCourses,
        loosePlaylists,
        true
      )
    );
  }

  return { hydrated, folders };
}
