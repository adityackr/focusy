"use client";

import { useState } from "react";
import { Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { parseVideoId } from "@/shared/lib/youtube";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useInbox } from "@/features/inbox/lib/inbox-store";
import { fetchInboxMeta } from "@/features/inbox/lib/inbox-meta";

/**
 * Paste-a-link form at the top of the inbox. The title is filled in from
 * YouTube when it can be, but a title can also be typed before saving.
 */
export function AddInboxItemForm() {
  const { url, setUrl, title, setTitle, tags, setTags, saving, handleSubmit } =
    useAddInboxItemForm();

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Link2
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste a YouTube link to watch later…"
              aria-label="YouTube link"
              className="pl-9"
              required
            />
          </div>
          <Button type="submit" disabled={saving || !url.trim()}>
            <Plus className="size-4" />
            {saving ? "Saving…" : "Save link"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inbox-title" className="text-xs text-muted-foreground">
              Title (optional — fetched automatically)
            </Label>
            <Input
              id="inbox-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Intro to TypeScript"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inbox-tags" className="text-xs text-muted-foreground">
              Tags (comma separated)
            </Label>
            <Input
              id="inbox-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="e.g. typescript, web-dev"
              className="h-9"
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Links stay in this browser. Add tags to group them by topic, then mark
          each one watched when you&apos;re done.
        </p>
      </div>
    </form>
  );
}

/** Form state + save flow for `AddInboxItemForm` — kept out of the JSX. */
function useAddInboxItemForm() {
  const addItem = useInbox((state) => state.addItem);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const videoId = parseVideoId(url);
    if (!videoId) {
      toast.error("That doesn't look like a YouTube video link.");
      return;
    }
    if (useInbox.getState().items.some((item) => item.videoId === videoId)) {
      toast.error("That video is already in your inbox.");
      return;
    }

    setSaving(true);
    try {
      let resolvedTitle = title.trim();
      let channelTitle = "";
      if (!resolvedTitle) {
        const meta = await fetchInboxMeta(videoId);
        if (meta) {
          resolvedTitle = meta.title;
          channelTitle = meta.channelTitle;
        }
      }

      const result = addItem({
        videoId,
        title: resolvedTitle,
        channelTitle,
        tags: tags.split(","),
      });
      if (!result.ok) {
        toast.error(
          result.error === "duplicate"
            ? "That video is already in your inbox."
            : "Couldn't save that link."
        );
        return;
      }

      toast.success("Saved to your inbox.");
      setUrl("");
      setTitle("");
      setTags("");
    } finally {
      setSaving(false);
    }
  }

  return {
    url,
    setUrl,
    title,
    setTitle,
    tags,
    setTags,
    saving,
    handleSubmit,
  };
}
