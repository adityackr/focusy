"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  PlayCircle,
  Search,
  X,
} from "lucide-react";
import { formatTimestamp } from "@/shared/lib/chapters";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { usePresenceActivity } from "@/features/analytics";
import {
  bookmarkHref,
  filterBookmarks,
  groupBookmarksByLesson,
} from "../lib/bookmark";
import { useAllBookmarks } from "../lib/bookmark-store";

/**
 * Every saved moment, grouped by lesson. The timestamp next to each
 * description is a deep link that opens the player at exactly that second.
 */
export function BookmarksView() {
  const bookmarks = useAllBookmarks();
  usePresenceActivity("reviewing", true);
  const [query, setQuery] = useState("");

  const lessons = useMemo(
    () => groupBookmarksByLesson(bookmarks),
    [bookmarks],
  );
  const visible = useMemo(
    () => filterBookmarks(lessons, query),
    [lessons, query],
  );

  const total = bookmarks.length;
  const shown = visible.reduce(
    (count, lesson) => count + lesson.bookmarks.length,
    0,
  );
  const filtering = query.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <PageHeader
        title="Bookmarks"
        subtitle={
          total === 0
            ? "Saved moments from your lessons, ready to replay."
            : `${total} bookmark${total === 1 ? "" : "s"} across ${
                lessons.length
              } lesson${lessons.length === 1 ? "" : "s"} · jump straight to the moment`
        }
        action={
          total > 0 ? (
            <Link
              href="/library"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Browse library
            </Link>
          ) : undefined
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          text="Open a lesson and bookmark the moments worth revisiting — an explanation, a demo or a definition. Add a short description and jump back without scrubbing through the video."
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
        <>
          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bookmarks, lessons, descriptions…"
              aria-label="Search bookmarks"
              className="h-10 bg-background pl-9 pr-9"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {filtering
                ? `${shown} of ${total} bookmark${total === 1 ? "" : "s"}`
                : `${visible.length} lesson${visible.length === 1 ? "" : "s"}`}
            </p>
            {filtering && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching bookmarks"
              text={`Nothing matched “${query.trim()}”. Try fewer words, or search for the lesson title.`}
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuery("")}
                >
                  Show all bookmarks
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {visible.map((lesson) => (
                <section
                  key={lesson.key}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm"
                >
                  <header className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2.5">
                    {lesson.kind && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] capitalize"
                      >
                        {lesson.kind === "course" ? "Course" : "Playlist"}
                      </Badge>
                    )}
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                      <h2 className="min-w-0 truncate text-sm font-bold">
                        {lesson.title}
                      </h2>
                      {lesson.collectionTitle &&
                        lesson.collectionTitle !== lesson.title && (
                          <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                            · {lesson.collectionTitle}
                          </span>
                        )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {lesson.bookmarks.length} moment
                      {lesson.bookmarks.length === 1 ? "" : "s"}
                    </span>
                    {lesson.lessonHref && (
                      <Link
                        href={lesson.lessonHref}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "h-6 gap-1 px-2 text-[11px]",
                        )}
                      >
                        <PlayCircle className="size-3.5" />
                        Open lesson
                      </Link>
                    )}
                  </header>

                  <ol className="divide-y">
                    {lesson.bookmarks.map((bookmark) => {
                      const href = bookmarkHref(bookmark);
                      return (
                        <li
                          key={bookmark.id}
                          className="flex items-start gap-3 px-3 py-2.5"
                        >
                          {href ? (
                            <Link
                              href={href}
                              title={`Open at ${formatTimestamp(bookmark.timeSeconds)}`}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary tabular-nums transition-colors hover:bg-primary/15"
                            >
                              <PlayCircle className="size-3.5" aria-hidden />
                              {formatTimestamp(bookmark.timeSeconds)}
                            </Link>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground tabular-nums">
                              <BookmarkCheck className="size-3.5" aria-hidden />
                              {formatTimestamp(bookmark.timeSeconds)}
                            </span>
                          )}
                          <p className="min-w-0 flex-1 text-sm leading-snug">
                            {bookmark.description}
                          </p>
                        </li>
                      );
                    })}
                  </ol>

                  {!lesson.lessonHref && (
                    <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
                      This lesson isn&apos;t in your library on this device, so
                      the moment can&apos;t be opened.
                    </p>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
