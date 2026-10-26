"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronsLeft,
  Heart,
  History,
  LayoutGrid,
  Plus,
  Search,
  Star,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLibrary, selectPlaylistList } from "@/store/library";
import { AddPlaylistDialog } from "@/components/add-playlist-dialog";
import { DeletePlaylistButton } from "@/components/playlists/delete-playlist-dialog";
import { LogoMark } from "@/components/logo";

const NAV = [
  { href: "/library", label: "Library", icon: LayoutGrid },
  { href: "/recent", label: "Recent", icon: History },
  { href: "/favorites", label: "Favorites", icon: Heart },
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
  const pathname = usePathname();
  const router = useRouter();
  const ordered = useLibrary(useShallow(selectPlaylistList));
  const hydrated = useLibrary((s) => s.hydrated);
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const pushRecent = useLibrary((s) => s.pushRecent);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (p) =>
        p.playlistTitle.toLowerCase().includes(q) ||
        p.channelTitle.toLowerCase().includes(q)
    );
  }, [ordered, query]);

  function handleNavigate(id: string) {
    pushRecent(id);
    onNavigate?.();
  }

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
                Focus<span className="text-primary">Tube</span>
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
              {!collapsed && n.href === "/favorites" && favorites.length > 0 && (
                <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {favorites.length}
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
            <Button onClick={() => setDialogOpen(true)} className="w-full">
              <Plus className="size-4" /> Add playlist
            </Button>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search playlists…"
                className="h-9 bg-background pl-9"
              />
            </div>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
          <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Playlists · {hydrated ? list.length : "…"}
          </p>
          {!hydrated ? (
            <ul
              className="space-y-1.5"
              aria-busy="true"
              aria-label="Loading playlists"
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
              {query ? "No matches. Try another search." : "No playlists yet. Add your first one above."}
            </p>
          )}
          <ul className="space-y-1.5">
            {list.map((p) => {
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
                      onDeleted={() => {
                        if (pathname.includes(p.playlistId)) router.push("/library");
                      }}
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
          aria-label="Loading playlists"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="size-11 rounded-xl" />
          ))}
        </div>
      )}

      {collapsed && hydrated && list.length > 0 && (
        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto px-2 py-3">
          {list.slice(0, 12).map((p) => (
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
