"use client";

import * as React from "react";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/shared/lib/utils";
import {
  selectCourseList,
  selectPlaylistList,
  useLibrary,
} from "@/shared/store/library";
import { buttonVariants } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { useAllResources } from "../lib/resource-store";
import type { Resource } from "../lib/resource";
import { ResourceRow } from "./resource-row";

interface ResourceGroup {
  key: string;
  title: string;
  href: string | null;
  resources: Resource[];
}

/** Every attachment in the library, grouped by its course or playlist. */
export function ResourcesView() {
  const resources = useAllResources();
  const playlists = useLibrary(useShallow(selectPlaylistList));
  const courses = useLibrary(useShallow(selectCourseList));

  const groups = React.useMemo(() => {
    const courseById = new Map(courses.map((course) => [course.id, course]));
    const playlistById = new Map(
      playlists.map((playlist) => [playlist.playlistId, playlist]),
    );
    const byOwner = new Map<string, ResourceGroup>();

    for (const resource of resources) {
      const playlistId = resource.playlistId;
      const ownerId = playlistId ?? resource.courseId;
      const key = `${playlistId ? "playlist" : "course"}:${ownerId}`;
      let group = byOwner.get(key);
      if (!group) {
        if (playlistId) {
          const playlist = playlistById.get(playlistId);
          group = {
            key,
            title: playlist?.playlistTitle ?? "Deleted playlist",
            href: playlist
              ? `/watch/${encodeURIComponent(playlistId)}`
              : null,
            resources: [],
          };
        } else {
          const course = courseById.get(resource.courseId);
          group = {
            key,
            title: course?.title ?? "Deleted video",
            href: course
              ? `/watch/${encodeURIComponent(course.id)}`
              : null,
            resources: [],
          };
        }
        byOwner.set(key, group);
      }

      group.resources.push(resource);
    }

    return [...byOwner.values()];
  }, [resources, courses, playlists]);

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <PageHeader
        title="Resources"
        subtitle={
          resources.length === 0
            ? "PDFs, links, snippets and downloads from your lessons."
            : `${resources.length} resource${
                resources.length === 1 ? "" : "s"
              } across your library`
        }
        action={
          resources.length > 0 ? (
            <Link
              href="/library"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Browse library
            </Link>
          ) : undefined
        }
      />

      {resources.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="No resources yet"
          text="Attach PDFs, links, code snippets and downloads from any video or playlist. Everything you save shows up here, searchable across your whole library."
          action={
            <Link
              href="/library"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Browse library
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                {group.href ? (
                  <Link
                    href={group.href}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {group.title}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium text-muted-foreground">
                    {group.title}
                  </span>
                )}
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {group.resources.length}
                </span>
              </div>
              <ol className="space-y-1.5">
                {group.resources.map((resource) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    badge={
                      resource.chapterId
                        ? "Lesson"
                        : resource.playlistId
                          ? "Playlist"
                          : "Video"
                    }
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
