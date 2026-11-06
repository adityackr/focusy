"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import {
  useLibrary,
  type PlaylistRefreshReport,
  type PlaylistRefreshResult,
} from "@/shared/store/library";

/**
 * Refreshes every saved playlist from YouTube and opens a report of how many
 * lessons each playlist gained or lost. Progress is stored separately per
 * playlist and is never touched by a refresh.
 */
export function RefreshAllPlaylistsButton() {
  const { busy, open, setOpen, reports, refreshAll, hasPlaylists } =
    useRefreshAllPlaylists();

  return (
    <>
      <Button
        variant="outline"
        onClick={refreshAll}
        disabled={busy || !hasPlaylists}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {busy ? "Refreshing…" : "Refresh all"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Playlist refresh</DialogTitle>
            <DialogDescription>{summarize(reports)}</DialogDescription>
          </DialogHeader>

          <ul className="divide-y rounded-lg border">
            {reports.map((report) => (
              <li
                key={report.playlistId}
                className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {report.playlistTitle}
                </span>
                {report.change ? (
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium",
                      report.change.added > 0 || report.change.removed > 0
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {describeChange(report.change)}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-destructive sm:max-w-[55%] sm:text-right">
                    Failed — {report.error ?? "Unknown error"}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Runs the bulk refresh and holds the report dialog state. */
function useRefreshAllPlaylists() {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<PlaylistRefreshReport[]>([]);
  const refreshAllPlaylists = useLibrary((s) => s.refreshAllPlaylists);
  const hasPlaylists = useLibrary((s) => Object.keys(s.playlists).length > 0);

  async function refreshAll() {
    setBusy(true);
    try {
      const next = await refreshAllPlaylists();
      if (next.length === 0) {
        toast.error(
          useLibrary.getState().error ?? "There are no playlists to refresh."
        );
        return;
      }
      setReports(next);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  return { busy, open, setOpen, reports, refreshAll, hasPlaylists };
}

/** "2 lessons added · 1 removed" — the per-playlist change line. */
function describeChange(change: PlaylistRefreshResult) {
  const parts: string[] = [];
  if (change.added > 0) {
    parts.push(`${change.added} added`);
  }
  if (change.removed > 0) {
    parts.push(`${change.removed} removed`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Up to date";
}

/** Aggregate line above the per-playlist report. */
function summarize(reports: PlaylistRefreshReport[]) {
  const added = reports.reduce((n, r) => n + (r.change?.added ?? 0), 0);
  const removed = reports.reduce((n, r) => n + (r.change?.removed ?? 0), 0);
  const failed = reports.filter((r) => !r.change).length;
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} lesson${added === 1 ? "" : "s"} added`);
  if (removed > 0) parts.push(`${removed} lesson${removed === 1 ? "" : "s"} removed`);
  if (parts.length === 0) parts.push("No lesson changes");
  if (failed > 0) {
    parts.push(`${failed} playlist${failed === 1 ? "" : "s"} failed`);
  }
  return `${parts.join(" · ")} across ${reports.length} playlist${
    reports.length === 1 ? "" : "s"
  }.`;
}
