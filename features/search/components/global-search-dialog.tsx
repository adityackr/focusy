"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Code2,
  CornerDownLeft,
  ListVideo,
  NotebookPen,
  PlayCircle,
  Search,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/shared/lib/utils";
import { useAllNotes } from "@/shared/lib/learning-notes";
import {
  selectCourseList,
  selectPlaylistList,
  useLibrary,
} from "@/shared/store/library";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { resolveNoteContext } from "@/features/notes";
import {
  STUDIO_TEMPLATES,
  selectWorkspaceMetaList,
  useStudioWorkspaces,
  type StudioSource,
} from "@/features/studio";
import {
  buildGlobalSearchResults,
  type GlobalSearchGroupId,
  type GlobalSearchNoteInput,
  type GlobalSearchProjectInput,
} from "../lib/global-search";
import { OPEN_GLOBAL_SEARCH_EVENT } from "../lib/search-events";

const GROUP_ICONS: Record<GlobalSearchGroupId, LucideIcon> = {
  videos: PlayCircle,
  playlists: ListVideo,
  lessons: BookOpen,
  notes: NotebookPen,
  bookmarks: Star,
  projects: Code2,
};

function projectHref(source: StudioSource | null): string | null {
  if (!source) return null;
  switch (source.kind) {
    case "course":
      return `/watch/${encodeURIComponent(source.courseId)}`;
    case "playlist-video":
      return `/watch/${encodeURIComponent(source.playlistId)}/${encodeURIComponent(
        source.videoId,
      )}`;
    case "video":
      // Standalone videos have no lesson page to open.
      return null;
  }
}

/**
 * Command-palette search across the whole library. Mounted once in the app
 * shell; opens with Cmd/Ctrl+K or the sidebar trigger.
 */
export function GlobalSearchDialog() {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  const courses = useLibrary(useShallow(selectCourseList));
  const playlists = useLibrary(useShallow(selectPlaylistList));
  const coursesById = useLibrary((state) => state.courses);
  const playlistsById = useLibrary((state) => state.playlists);
  const courseFavorites = useLibrary((state) => state.courseFavorites);
  const playlistFavorites = useLibrary((state) => state.favorites);
  const notes = useAllNotes();
  const projects = useStudioWorkspaces(useShallow(selectWorkspaceMetaList));

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const noteInputs = useMemo<GlobalSearchNoteInput[]>(
    () =>
      notes.map((note) => {
        const context = resolveNoteContext(note, playlistsById, coursesById);
        return {
          id: note.id,
          markdown: note.markdown,
          lessonTitle: context.lessonTitle,
          collectionTitle: context.collectionTitle,
          href: context.href,
          timeSeconds: note.timeSeconds,
        };
      }),
    [notes, playlistsById, coursesById],
  );

  const projectInputs = useMemo<GlobalSearchProjectInput[]>(
    () =>
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        subtitle: `${STUDIO_TEMPLATES[project.template]?.label ?? "Studio"} project`,
        href: projectHref(project.source),
      })),
    [projects],
  );

  const results = useMemo(
    () =>
      buildGlobalSearchResults({
        query,
        courses,
        playlists,
        notes: noteInputs,
        projects: projectInputs,
        courseFavorites,
        playlistFavorites,
      }),
    [
      query,
      courses,
      playlists,
      noteInputs,
      projectInputs,
      courseFavorites,
      playlistFavorites,
    ],
  );

  const indexedGroups = useMemo(() => {
    let offset = 0;
    return results.groups.map((group) => {
      const start = offset;
      offset += group.items.length;
      return { group, start };
    });
  }, [results]);

  const flatItems = useMemo(
    () => results.groups.flatMap((group) => group.items),
    [results],
  );
  const activeIndex =
    flatItems.length === 0 ? -1 : Math.min(active, flatItems.length - 1);

  useEffect(() => {
    function openOnShortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setOpen(true);
      setActive(0);
    }

    function openOnEvent() {
      setOpen(true);
      setActive(0);
    }

    window.addEventListener("keydown", openOnShortcut);
    window.addEventListener(OPEN_GLOBAL_SEARCH_EVENT, openOnEvent);
    return () => {
      window.removeEventListener("keydown", openOnShortcut);
      window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, openOnEvent);
    };
  }, []);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActive(0);
    }
  }

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) =>
        flatItems.length === 0 ? 0 : (current + 1) % flatItems.length,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) =>
        flatItems.length === 0
          ? 0
          : (current - 1 + flatItems.length) % flatItems.length,
      );
      return;
    }
    if (event.key === "Enter") {
      const item = flatItems[activeIndex];
      if (!item?.href) return;
      event.preventDefault();
      go(item.href);
    }
  }

  const trimmed = query.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Search everything</DialogTitle>

        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          onKeyDown={handleKeyDown}
        >
          <Search
            className="pointer-events-none size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <Input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onFocus={(event) => event.currentTarget.select()}
            placeholder="Search videos, playlists, lessons, notes, bookmarks, projects…"
            aria-label="Search everything"
            role="combobox"
            aria-expanded
            aria-controls="global-search-results"
            aria-activedescendant={
              activeIndex >= 0
                ? `global-search-option-${activeIndex}`
                : undefined
            }
            className="h-9 border-0 bg-transparent px-0 pr-8 text-base focus-visible:ring-0"
          />
        </div>

        <div
          ref={listRef}
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {trimmed.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              Search across your whole library — videos, playlists, lessons,
              notes, bookmarks and Studio projects.
            </p>
          ) : flatItems.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              No matches for “{trimmed}”. Try fewer words.
            </p>
          ) : (
            indexedGroups.map(({ group, start }) => {
              const Icon = GROUP_ICONS[group.id];
              return (
                <section key={group.id} className="pb-1">
                  <h3 className="px-2.5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {group.label} · {group.total}
                    {group.total > group.items.length && (
                      <span className="ml-1 font-medium normal-case tracking-normal">
                        (top {group.items.length})
                      </span>
                    )}
                  </h3>
                  {group.items.map((item, offset) => {
                    const index = start + offset;
                    const selected = index === activeIndex;
                    const content = (
                      <>
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnail}
                            alt=""
                            loading="lazy"
                            className="h-10 w-16 shrink-0 rounded-lg border object-cover"
                          />
                        ) : (
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                            <Icon className="size-4" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {item.title}
                          </span>
                          {item.snippet ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.snippet}
                            </span>
                          ) : null}
                          {item.subtitle ? (
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {item.subtitle}
                            </span>
                          ) : null}
                          {!item.href && (
                            <span className="block truncate text-[11px] text-muted-foreground">
                              Standalone project — open it from a lesson.
                            </span>
                          )}
                        </span>
                        {selected && item.href && (
                          <CornerDownLeft
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        )}
                      </>
                    );

                    return (
                      <button
                        key={`${group.id}:${item.id}`}
                        type="button"
                        id={`global-search-option-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={selected}
                        aria-disabled={!item.href}
                        tabIndex={-1}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => item.href && go(item.href)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                          selected && "bg-accent text-accent-foreground",
                          !item.href && "opacity-70",
                        )}
                      >
                        {content}
                      </button>
                    );
                  })}
                </section>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
              ↑
            </kbd>
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
              ↓
            </kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
              ↵
            </kbd>
            open
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
              esc
            </kbd>
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
