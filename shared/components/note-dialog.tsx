"use client";

import * as React from "react";
import { NotebookPen, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { useNote } from "@/shared/lib/notes";
import { MarkdownView } from "@/shared/components/markdown-view";
import { Button, type ButtonProps } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";

const PLACEHOLDER = `Write in Markdown…

# Heading
- bullet point
**bold** · *italic* · \`code\`
[link](https://youtube.com)`;

export function NoteDialog({
  open,
  onOpenChange,
  videoId,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  videoId: string;
  title?: string;
}) {
  const { text, has, save, remove } = useNote(videoId);
  const [draft, setDraft] = React.useState("");
  const [tab, setTab] = React.useState<"write" | "preview">("write");

  // Re-seed the editor whenever the dialog opens (or the stored note changes).
  React.useEffect(() => {
    if (!open) return;
    setDraft(text ?? "");
    setTab("write");
  }, [open, text]);

  const handleSave = () => {
    save(draft);
    toast.success(draft.trim() ? "Note saved" : "Note removed");
    onOpenChange(false);
  };

  const handleDelete = () => {
    remove();
    toast.success("Note deleted");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="size-4 text-primary" /> Note
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            {title ? `${title} · ` : ""}Markdown, saved in this browser only.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")}>
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="write">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={PLACEHOLDER}
              className="min-h-[260px] resize-y font-mono text-[13px] leading-relaxed"
              aria-label="Note markdown"
            />
          </TabsContent>

          <TabsContent value="preview" className="min-h-[260px] rounded-xl border p-3">
            <MarkdownView markdown={draft} />
          </TabsContent>
        </Tabs>

        <p className="text-[11px] text-muted-foreground">
          {has ? "Saved on this device · clears when you delete the note." : "Nothing saved yet."}
        </p>

        <DialogFooter>
          {has && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="mr-auto text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!draft.trim()}>
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NoteButton({
  videoId,
  title,
  as = "icon",
  reveal = false,
  className,
  ...props
}: {
  videoId: string;
  title?: string;
  /** `icon` = compact icon button (lesson rows), `labeled` = text button. */
  as?: "icon" | "labeled";
  /** Fade the icon in on row hover (matches the watched/complete action). */
  reveal?: boolean;
  className?: string;
} & Omit<ButtonProps, "videoId" | "title" | "as" | "reveal" | "onClick">) {
  const [open, setOpen] = React.useState(false);
  const { has } = useNote(videoId);
  const label = has ? `Edit note for ${title ?? "video"}` : `Add note for ${title ?? "video"}`;

  if (as === "labeled") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          aria-label={label}
          title={label}
          className={cn(has && "border-primary/50 text-primary", className)}
          {...props}
        >
          <StickyNote className="size-4" /> Note
        </Button>
        <NoteDialog open={open} onOpenChange={setOpen} videoId={videoId} title={title} />
      </>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className={cn(
          "h-7 w-7 shrink-0",
          has
            ? "text-primary opacity-100"
            : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          reveal === false && "opacity-100",
          className
        )}
        {...props}
      >
        {has ? <NotebookPen className="size-4" /> : <StickyNote className="size-4" />}
      </Button>
      <NoteDialog open={open} onOpenChange={setOpen} videoId={videoId} title={title} />
    </>
  );
}
