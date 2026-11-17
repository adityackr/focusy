"use client";

import { useMemo, useState } from "react";
import { Inbox as InboxIcon, Search, Tag, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  filterInboxItems,
  inboxStatusCounts,
  inboxTagList,
  type InboxFilter,
} from "@/features/inbox/lib/inbox";
import { useInbox } from "@/features/inbox/lib/inbox-store";
import { AddInboxItemForm } from "@/features/inbox/components/add-inbox-item-form";
import { InboxItemCard } from "@/features/inbox/components/inbox-item-card";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const STATUS_FILTERS: { value: InboxFilter; label: string }[] = [
  { value: "queued", label: "To watch" },
  { value: "watched", label: "Watched" },
  { value: "all", label: "All" },
];

export function InboxView() {
  const {
    items,
    hydrated,
    query,
    setQuery,
    tag,
    setTag,
    status,
    setStatus,
    counts,
    tags,
    visible,
    filtering,
    clearFilters,
  } = useInboxView();

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <PageHeader
        title="Learning Inbox"
        subtitle={
          hydrated
            ? `${counts.queued} to watch · ${counts.watched} watched · saved in this browser`
            : "Loading your saved links…"
        }
      />

      <AddInboxItemForm />

      {!hydrated ? (
        <InboxSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={InboxIcon}
          title="Your learning inbox is empty"
          text="Paste a YouTube link above to save it for later. Add tags to group the links by topic, then mark each one watched when you're done."
        />
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search saved links, notes, tags…"
                aria-label="Search saved links"
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
              value={status}
              onValueChange={(value) => setStatus(value as InboxFilter)}
              className="gap-0"
            >
              <TabsList>
                {STATUS_FILTERS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label} · {counts[option.value]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 pr-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <Tag className="size-3" aria-hidden />
                Tags
              </span>
              <TagChip active={tag === null} onClick={() => setTag(null)}>
                All
              </TagChip>
              {tags.map((entry) => (
                <TagChip
                  key={entry.tag}
                  active={tag?.toLowerCase() === entry.tag.toLowerCase()}
                  onClick={() =>
                    setTag(
                      tag?.toLowerCase() === entry.tag.toLowerCase()
                        ? null
                        : entry.tag
                    )
                  }
                >
                  {entry.tag}
                  <span className="ml-1 opacity-70">{entry.count}</span>
                </TagChip>
              ))}
            </div>
          )}

          <div className="mb-3 mt-5 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {visible.length === 0
                ? "0 links"
                : `${visible.length} link${visible.length === 1 ? "" : "s"}`}
              {filtering ? ` of ${items.length}` : ""}
            </p>
            {filtering && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No saved links match"
              text={
                query.trim()
                  ? `Nothing matched “${query.trim()}”. Try fewer words or another tag.`
                  : "Nothing in this filter yet. Try another status or tag."
              }
              action={
                <Button type="button" variant="outline" onClick={clearFilters}>
                  Show all links
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {visible.map((item) => (
                <InboxItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function InboxSkeleton() {
  return (
    <div className="mt-6 space-y-2.5" aria-busy="true" aria-label="Loading saved links">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 rounded-2xl border bg-card p-3"
        >
          <Skeleton className="h-20 w-32 shrink-0 rounded-xl sm:h-24 sm:w-40" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-7 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Search, filter and tag state for `InboxView` — kept out of the JSX. */
function useInboxView() {
  const items = useInbox((state) => state.items);
  const hydrated = useInbox((state) => state.hydrated);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [status, setStatus] = useState<InboxFilter>("queued");

  const counts = useMemo(() => inboxStatusCounts(items), [items]);
  const tags = useMemo(() => inboxTagList(items), [items]);
  const visible = useMemo(
    () => filterInboxItems(items, { query, tag, status }),
    [items, query, tag, status]
  );

  const filtering = query.trim().length > 0 || tag !== null || status !== "all";

  function clearFilters() {
    setQuery("");
    setTag(null);
    setStatus("all");
  }

  return {
    items,
    hydrated,
    query,
    setQuery,
    tag,
    setTag,
    status,
    setStatus,
    counts,
    tags,
    visible,
    filtering,
    clearFilters,
  };
}
