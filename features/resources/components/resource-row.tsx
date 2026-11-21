"use client";

import * as React from "react";
import {
  BookOpen,
  ChevronDown,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Trash2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  RESOURCE_KIND_LABELS,
  isFileResourceKind,
  type Resource,
  type ResourceKind,
} from "../lib/resource";
import {
  downloadResource,
  openResource,
  resourceSummary,
} from "../lib/resource-actions";

const KIND_ICONS: Record<
  ResourceKind,
  React.ComponentType<{ className?: string }>
> = {
  pdf: FileText,
  link: Link2,
  snippet: Code2,
  doc: BookOpen,
  download: Download,
};

export interface ResourceRowProps {
  resource: Resource;
  /** Extra badge after the kind, e.g. "Lesson" or "Playlist". */
  badge?: string;
  onDelete?: (id: string) => void;
}

/** One compact attachment row with on-demand URL/snippet details. */
export function ResourceRow({ resource, badge, onDelete }: ResourceRowProps) {
  const [expanded, setExpanded] = React.useState(false);
  const Icon = KIND_ICONS[resource.kind];
  const isFile = isFileResourceKind(resource.kind);
  const summary = resourceSummary(resource);
  const hasDetails = Boolean(
    resource.url || (resource.kind === "snippet" && resource.content),
  );

  return (
    <li className="overflow-hidden rounded-lg border bg-background/60">
      <div className="flex items-center gap-1 pr-1.5">
        <button
          type="button"
          onClick={() => hasDetails && setExpanded((value) => !value)}
          aria-expanded={hasDetails ? expanded : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span
                className="truncate text-sm font-medium"
                title={resource.title}
              >
                {resource.title}
              </span>
              <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
                {RESOURCE_KIND_LABELS[resource.kind]}
              </Badge>
              {badge && (
                <Badge variant="outline" className="shrink-0 px-1.5 text-[10px]">
                  {badge}
                </Badge>
              )}
            </span>
            {summary && (
              <span
                className="mt-0.5 block truncate text-[11px] text-muted-foreground"
                title={summary}
              >
                {summary}
              </span>
            )}
          </span>
          {hasDetails && (
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          )}
        </button>

        <div className="flex shrink-0 items-center">
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${resource.title}`}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
          {isFile && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label={`Open ${resource.title}`}
                onClick={() => void openResource(resource)}
              >
                <ExternalLink className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label={`Download ${resource.title}`}
                onClick={() => void downloadResource(resource)}
              >
                <Download className="size-3.5" />
              </Button>
            </>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${resource.title}`}
              onClick={() => onDelete(resource.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-1.5 border-t px-2.5 py-2">
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-xs font-medium text-primary hover:underline"
            >
              {resource.url}
            </a>
          )}
          {resource.kind === "snippet" && resource.content && (
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed">
              <code>{resource.content}</code>
            </pre>
          )}
        </div>
      )}
    </li>
  );
}
