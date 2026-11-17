"use client";

import { Check, Clock, ExternalLink, Play, RotateCcw } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  formatSavedAt,
  inboxThumbnail,
  type InboxItem,
} from "@/features/inbox/lib/inbox";
import { useInbox } from "@/features/inbox/lib/inbox-store";
import { badgeVariants } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  DeleteInboxItemButton,
  EditInboxItemButton,
} from "@/features/inbox/components/inbox-item-dialogs";

export function InboxItemCard({ item }: { item: InboxItem }) {
  const toggleWatched = useInbox((state) => state.toggleWatched);
  const watched = item.status === "watched";

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors sm:flex-row",
        watched && "bg-card/60"
      )}
    >
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Watch ${item.title} on YouTube`}
        className="group relative shrink-0 self-start overflow-hidden rounded-xl border bg-muted"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={inboxThumbnail(item.videoId)}
          alt=""
          loading="lazy"
          className="h-20 w-32 object-cover sm:h-24 sm:w-40"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/95 text-black">
            <Play className="size-4 fill-current" aria-hidden />
          </span>
        </span>
      </a>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-sm font-semibold leading-snug">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary"
            >
              {item.title}
            </a>
          </h2>
          <span
            className={cn(
              badgeVariants({ variant: watched ? "secondary" : "outline" }),
              "shrink-0 gap-1 text-[10px]"
            )}
          >
            {watched ? (
              <Check className="size-3" aria-hidden />
            ) : (
              <Clock className="size-3" aria-hidden />
            )}
            {watched ? "Watched" : "To watch"}
          </span>
        </div>

        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {item.channelTitle ? `${item.channelTitle} · ` : ""}
          {formatSavedAt(item.addedAt)}
        </p>

        {item.tags.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Tags">
            {item.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        {item.note && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
            {item.note}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 px-2 text-[11px]"
            )}
          >
            <ExternalLink className="size-3.5" />
            Watch on YouTube
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleWatched(item.id)}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {watched ? (
              <>
                <RotateCcw className="size-3.5" />
                Move back to watch
              </>
            ) : (
              <>
                <Check className="size-3.5" />
                Mark watched
              </>
            )}
          </Button>
          <div className="ml-auto flex items-center gap-0.5">
            <EditInboxItemButton item={item} />
            <DeleteInboxItemButton item={item} />
          </div>
        </div>
      </div>
    </article>
  );
}
