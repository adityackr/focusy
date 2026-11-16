"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  NotebookPen,
  PlayCircle,
  Search,
  X,
} from "lucide-react";
import { useLibrary } from "@/shared/store/library";
import { useAllNotes } from "@/shared/lib/learning-notes";
import { formatTimestamp } from "@/shared/lib/chapters";
import { cn } from "@/shared/lib/utils";
import { notePreview } from "@/shared/lib/note-preview";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  filterNoteEntries,
  resolveNoteContext,
  type NoteFilter,
} from "@/features/notes/lib/note-search";

const FILTERS: { value: NoteFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "playlist", label: "Playlists" },
  { value: "course", label: "Courses" },
];

export function NotesView() {
  const notes = useAllNotes();
  const playlists = useLibrary((s) => s.playlists);
  const courses = useLibrary((s) => s.courses);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NoteFilter>("all");

  const entries = useMemo(
    () =>
      notes.map((note) => ({
        note,
        context: resolveNoteContext(note, playlists, courses),
      })),
    [notes, playlists, courses],
  );
  const visible = useMemo(
    () => filterNoteEntries(entries, query, filter),
    [entries, query, filter],
  );

  const filtering = query.trim().length > 0 || filter !== "all";
  const countLabel =
    entries.length === visible.length
      ? `${entries.length} note${entries.length === 1 ? "" : "s"}`
      : `${visible.length} of ${entries.length} notes`;

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <PageHeader
        title="Notes"
        subtitle={
          entries.length === 0
            ? "Timestamped ideas, snippets and reminders from your lessons."
            : `${countLabel} across your library · newest edit first`
        }
        action={
          entries.length > 0 ? (
            <Link
              href="/library"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Browse library
            </Link>
          ) : undefined
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          text="Open a lesson and capture a moment in the notes sheet. Everything you save shows up here, searchable across your whole library."
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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notes, lessons, code…"
                aria-label="Search notes"
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

            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as NoteFilter)}
              className="gap-0"
            >
              <TabsList>
                {FILTERS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {visible.length === 0
                ? "0 matches"
                : `${visible.length} note${visible.length === 1 ? "" : "s"}`}
            </p>
            {filtering && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching notes"
              text={
                query.trim()
                  ? `Nothing matched “${query.trim()}”. Try fewer words or another filter.`
                  : "No notes in this filter yet. Try another lesson type."
              }
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Show all notes
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {visible.map(({ note, context }) => {
                const preview = notePreview(note.markdown);
                return (
                  <article
                    key={note.id}
                    className="rounded-xl border bg-card px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        {context.kind && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] capitalize"
                          >
                            {context.kind === "course" ? "Course" : "Playlist"}
                          </Badge>
                        )}
                        <h2 className="min-w-0 truncate text-sm font-bold">
                          {context.lessonTitle}
                        </h2>
                        {context.collectionTitle &&
                          context.collectionTitle !== context.lessonTitle && (
                            <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                              · {context.collectionTitle}
                            </span>
                          )}
                      </div>

                      {note.timeSeconds === null ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <Clock className="size-3" aria-hidden /> Whole lesson
                        </span>
                      ) : context.href ? (
                        <Link
                          href={context.href}
                          title={`Open at ${formatTimestamp(note.timeSeconds)}`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary tabular-nums transition-colors hover:bg-primary/15"
                        >
                          <PlayCircle className="size-3.5" aria-hidden />
                          {formatTimestamp(note.timeSeconds)}
                        </Link>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                          <Clock className="size-3" aria-hidden />
                          {formatTimestamp(note.timeSeconds)}
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 line-clamp-1 text-sm leading-snug text-muted-foreground">
                      {preview || "No text"}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <time
                        dateTime={
                          note.updatedAt
                            ? new Date(note.updatedAt).toISOString()
                            : undefined
                        }
                        className="text-[11px] text-muted-foreground"
                      >
                        {editedLabel(note.updatedAt)}
                      </time>
                      {context.href ? (
                        <Link
                          href={context.href}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-6 gap-1 px-2 text-[11px]",
                          )}
                        >
                          {note.timeSeconds === null
                            ? "Open lesson"
                            : `Open at ${formatTimestamp(note.timeSeconds)}`}
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Not linked to a lesson in this library
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Compact edit date; legacy notes have no useful timestamp. */
function editedLabel(updatedAt: number): string {
  if (!updatedAt) return "Imported note";
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "Saved note";
  return `Edited ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)}`;
}
