"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parsePlaylistInput } from "@/lib/utils";
import { useLibrary } from "@/store/library";

export function AddPlaylistButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        <Plus className="size-4" /> Add playlist
      </Button>
      <AddPlaylistDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function AddPlaylistDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const fetchPlaylist = useLibrary((s) => s.fetchPlaylist);
  const playlists = useLibrary((s) => s.playlists);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parsePlaylistInput(value);
    if (!id) {
      toast.error("Paste a valid playlist ID or YouTube playlist link.");
      return;
    }
    if (playlists[id]) {
      toast.info("That playlist is already in your library.");
      onOpenChange(false);
      router.push(`/watch/${id}`);
      return;
    }
    setBusy(true);
    const ok = await fetchPlaylist(id);
    setBusy(false);
    if (ok) {
      toast.success("Playlist added to your library.");
      setValue("");
      onOpenChange(false);
      router.push(`/watch/${id}`);
    } else {
      toast.error(useLibrary.getState().error ?? "Could not fetch that playlist.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a playlist</DialogTitle>
          <DialogDescription>
            Paste a YouTube playlist ID or full link. We&apos;ll import it so you can watch it
            without recommendations or distractions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. https://www.youtube.com/playlist?list=PL…"
              className="pl-10"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Importing…" : "Import playlist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
