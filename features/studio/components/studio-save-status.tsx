"use client";

import { cn } from "@/shared/lib/utils";
import type { StudioSaveState } from "../hooks/use-studio-workspace";

function saveLabel(state: StudioSaveState): string {
  switch (state) {
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved in this browser";
    case "error":
      return "Last save failed";
    default:
      return "Stored locally";
  }
}

/** Consistent local-save feedback for Studio surfaces. */
export function StudioSaveStatus({
  state,
  className,
}: {
  state: StudioSaveState;
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn(
        "text-xs",
        state === "error" ? "text-destructive" : "text-muted-foreground",
        className
      )}
    >
      {saveLabel(state)}
    </span>
  );
}
