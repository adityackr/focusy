"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronsLeft, Heart, History, LayoutGrid, Plus, Search, Settings, Star } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/shared/lib/utils";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useLibrary, selectPlaylistList, selectCourseList } from "@/shared/store/library";
import { AddPlaylistDialog, DeletePlaylistButton } from "@/features/playlists";
import { DeleteCourseButton } from "@/features/videos";
import { LogoMark } from "@/features/shell/components/logo";

const NAV = [
  { href: "/library", label: "Library", icon: LayoutGrid },
  { href: "/recent", label: "Recent", icon: History },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const {
    pathname,
    hydrated,
    tab,
    setTab,
    query,
    setQuery,
    dialogOpen,
    setDialogOpen,
    playlistList,
    courseList,
    list,
    favCount,
    favorites,
    courseFavorites,
    toggleFavorite,
    toggleCourseFavorite,
    handleNavigate,
    handleCourseNavigate,
    redirectIfActive,
  } = useAppSidebar(onNavigate);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-19" : "w-72"
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 hover:bg-sidebar-accent"
        >
          <LogoMark size={36} />
          {!collapsed && (
            <span className="truncate leading-tight">
              <span className="block truncate text-sm font-extrabold">
                Focus<span className="text-primary">y</span>
              </span>
              <span className="block text-[11px] text-muted-foreground">focus mode</span>
            </span>
          )}
        </Link>
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Collapse sidebar" className="shrink-0">
          <ChevronsLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <nav className="space-y-1 px-3">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              title={n.label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <n.icon className="size-4 shrink-0" />
              {!collapsed && <span>{n.label}</span>}
              {!collapsed && n.href === "/favorites" && favCount > 0 && (
                <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {favCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator className="my-3" />

      <div className="px-3">
        {collapsed ? (
          <Button size="icon" onClick={() => setDialogOpen(true)} aria-label="Add playlist" className="w-full">
            <Plus className="size-4" />
          </Button>
        ) : (
          <>
            <div className="flex gap-2">
              <Link
                href="/add"
                onClick={onNavigate}
                className={cn(buttonVariants({ variant: "outline" }), "h-9 flex-1 px-3")}
              >
                <Plus className="size-4" /> Add video
              </Link>
              <Button onClick={() => setDialogOpen(true)} className="h-9 flex-1 px-3">
                <Plus className="size-4" /> Playlist
              </Button>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-9 bg-background pl-9"
              />
            </div>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
          <Tabs value={tab} onValueChange={setTab} className="gap-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="playlists">Playlists</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="px-1 pt-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {tab === "videos" ? "Videos" : "Playlists"} · {hydrated ? list.length : "…"}
          </p>
          {!hydrated ? (
            <ul
              className="space-y-1.5"
              aria-busy="true"
              aria-label="Loading library"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="rounded-xl border p-2">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-11 w-20 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
          <>
          {list.length === 0 && (
            <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
              {query
                ? "No matches. Try another search."
                : tab === "videos"
                  ? "No videos yet. Add your first one above."
                  : "No playlists yet. Add your first one above."}
            </p>
          )}
          <ul className="space-y-1.5">
            {tab === "videos"
              ? courseList.map((c) => {
                  const active = pathname.includes(c.id);
                  const fav = courseFavorites.includes(c.id);
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        "group relative rounded-xl border p-2 transition-all hover:shadow-md",
                        active ? "border-primary/60 bg-primary/5" : "hover:border-primary/30"
                      )}
                    >
                      <Link
                        href={`/course/${c.id}`}
                        onClick={() => handleCourseNavigate(c.id)}
                        className="flex w-full items-center gap-2.5 text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://i.ytimg.com/vi/${c.videoId}/default.jpg`}
                          alt=""
                          className="h-11 w-20 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold leading-snug">
                            {c.title}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {c.chapters.length} lessons
                            {c.channelTitle ? ` · ${c.channelTitle}` : ""}
                          </span>
                        </span>
                      </Link>
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-lg border bg-card/95 p-0.5 shadow-md backdrop-blur opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleCourseFavorite(c.id)}
                          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                          className={cn(
                            "h-7 w-7 hover:bg-accent",
                            fav ? "text-primary opacity-100" : "text-muted-foreground"
                          )}
                        >
                          <Star className={cn("size-3.5", fav && "fill-current")} />
                        </Button>
                        <DeleteCourseButton
                          courseId={c.id}
                          courseTitle={c.title}
                          className="h-7 w-7 [&_svg]:size-3.5"
                          onDeleted={() => redirectIfActive(c.id)}
                        />
                      </div>
                    </li>
                  );
                })
              : playlistList.map((p) => {
                  const active = pathname.includes(p.playlistId);
                  const fav = favorites.includes(p.playlistId);
                  return (
                    <li
                      key={p.playlistId}
                      className={cn(
                        "group relative rounded-xl border p-2 transition-all hover:shadow-md",
                        active ? "border-primary/60 bg-primary/5" : "hover:border-primary/30"
                      )}
                    >
                      <Link
                        href={`/watch/${p.playlistId}`}
                        onClick={() => handleNavigate(p.playlistId)}
                        className="flex w-full items-center gap-2.5 text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.playlistThumbnail.url}
                          alt=""
                          className="h-11 w-20 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold leading-snug">
                            {p.playlistTitle}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {p.videos.length} videos · {p.channelTitle}
                          </span>
                        </span>
                      </Link>
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-lg border bg-card/95 p-0.5 shadow-md backdrop-blur opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavorite(p.playlistId)}
                          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                          className={cn(
                            "h-7 w-7 hover:bg-accent",
                            fav ? "text-primary opacity-100" : "text-muted-foreground"
                          )}
                        >
                          <Star className={cn("size-3.5", fav && "fill-current")} />
                        </Button>
                        <DeletePlaylistButton
                          playlistId={p.playlistId}
                          playlistTitle={p.playlistTitle}
                          className="h-7 w-7 [&_svg]:size-3.5"
                          onDeleted={() => redirectIfActive(p.playlistId)}
                        />
                      </div>
                    </li>
                  );
                })}
          </ul>
          </>
          )}
        </div>
      )}

      {collapsed && !hydrated && (
        <div
          className="flex flex-1 flex-col items-center gap-2 overflow-y-auto px-2 py-3"
          aria-busy="true"
          aria-label="Loading library"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="size-11 rounded-xl" />
          ))}
        </div>
      )}

      {collapsed && hydrated && list.length > 0 && (
        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto px-2 py-3">
          {tab === "videos"
            ? courseList.slice(0, 12).map((c) => (
                <Link
                  key={c.id}
                  href={`/course/${c.id}`}
                  onClick={() => handleCourseNavigate(c.id)}
                  title={c.title}
                  aria-label={`Watch ${c.title}`}
                  className={cn(
                    "overflow-hidden rounded-xl border-2 transition-all hover:scale-105",
                    pathname.includes(c.id) ? "border-primary" : "border-transparent"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${c.videoId}/default.jpg`}
                    alt=""
                    className="size-11 object-cover"
                    loading="lazy"
                  />
                </Link>
              ))
            : playlistList.slice(0, 12).map((p) => (
                <Link
                  key={p.playlistId}
                  href={`/watch/${p.playlistId}`}
                  onClick={() => handleNavigate(p.playlistId)}
                  title={p.playlistTitle}
                  aria-label={`Watch ${p.playlistTitle}`}
                  className={cn(
                    "overflow-hidden rounded-xl border-2 transition-all hover:scale-105",
                    pathname.includes(p.playlistId) ? "border-primary" : "border-transparent"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.playlistThumbnail.url} alt="" className="size-11 object-cover" loading="lazy" />
                </Link>
              ))}
        </div>
      )}

      <AddPlaylistDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </aside>
  );
}

/**
 * Search, tabs, filtered lists and navigation handlers for `AppSidebar` —
 * kept out of the JSX.
 */
function useAppSidebar(onNavigate?: () => void) {
  const pathname = usePathname();
  const router = useRouter();
  const ordered = useLibrary(useShallow(selectPlaylistList));
  const orderedCourses = useLibrary(useShallow(selectCourseList));
  const hydrated = useLibrary((s) => s.hydrated);
  const favorites = useLibrary((s) => s.favorites);
  const courseFavorites = useLibrary((s) => s.courseFavorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const pushRecent = useLibrary((s) => s.pushRecent);
  const toggleCourseFavorite = useLibrary((s) => s.toggleCourseFavorite);
  const pushCourseRecent = useLibrary((s) => s.pushCourseRecent);
  const [tab, setTab] = useState("videos");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Courses saved before creator support have no `channelTitle` — backfill the
  // channel names (idempotent, session-guarded) so the sidebar can show them.
  useEffect(() => {
    void useLibrary.getState().backfillCourseChannels();
  }, []);

  const playlistList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (p) =>
        p.playlistTitle.toLowerCase().includes(q) ||
        p.channelTitle.toLowerCase().includes(q)
    );
  }, [ordered, query]);

  const courseList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orderedCourses;
    return orderedCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.videoId.toLowerCase().includes(q) ||
        c.chapters.some((ch) => ch.title.toLowerCase().includes(q))
    );
  }, [orderedCourses, query]);

  const list = tab === "videos" ? courseList : playlistList;
  const favCount = favorites.length + courseFavorites.length;

  function handleNavigate(id: string) {
    pushRecent(id);
    onNavigate?.();
  }

  function handleCourseNavigate(id: string) {
    pushCourseRecent(id);
    onNavigate?.();
  }

  // Deleting the item we're currently viewing → go back to the library.
  function redirectIfActive(id: string) {
    if (pathname.includes(id)) router.push("/library");
  }

  return {
    pathname,
    hydrated,
    tab,
    setTab,
    query,
    setQuery,
    dialogOpen,
    setDialogOpen,
    playlistList,
    courseList,
    list,
    favCount,
    favorites,
    courseFavorites,
    toggleFavorite,
    toggleCourseFavorite,
    handleNavigate,
    handleCourseNavigate,
    redirectIfActive,
  };
}