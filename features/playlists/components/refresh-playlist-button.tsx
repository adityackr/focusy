"use client";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useLibrary } from "@/shared/store/library";

/**
 * Re-fetches a saved playlist from YouTube, so lessons added there show up
 * without deleting and re-importing. Watch progress lives under its own
 * per-playlist key and is never touched by the refresh.
 */
export function RefreshPlaylistButton({
  playlistId,
  iconOnly = true,
  className,
}: {
  playlistId: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const { refreshing, refresh } = useRefreshPlaylist(playlistId);

  return (
    <Button
      variant="ghost"
      size={iconOnly ? "icon" : "sm"}
      onClick={refresh}
      disabled={refreshing}
      aria-label="Refresh from YouTube"
      title="Refresh from YouTube"
      className={className}
    >
      <RefreshCw className={cn(refreshing && "animate-spin")} />
      {!iconOnly && (refreshing ? "Refreshing…" : "Refresh from YouTube")}
    </Button>
  );
}

/** Refresh state + toast feedback for `RefreshPlaylistButton` — kept out of the JSX. */
function useRefreshPlaylist(playlistId: string) {
  const refreshPlaylist = useLibrary((s) => s.refreshPlaylist);
  const refreshing = useLibrary((s) => s.loadingIds.includes(playlistId));

  async function refresh() {
    const result = await refreshPlaylist(playlistId);
    if (!result) {
      toast.error(useLibrary.getState().error ?? "Couldn't refresh this playlist.");
      return;
    }
    if (result.added === 0 && result.removed === 0) {
      toast.success("Playlist is already up to date.");
      return;
    }
    const changes: string[] = [];
    if (result.added > 0) {
      changes.push(`${result.added} new lesson${result.added === 1 ? "" : "s"} added`);
    }
    if (result.removed > 0) {
      changes.push(
        `${result.removed} lesson${result.removed === 1 ? "" : "s"} no longer on YouTube`
      );
    }
    toast.success(`${changes.join(", ")}.`);
  }

  return { refreshing, refresh };
}
