import { toast } from "sonner";
import {
  formatResourceSize,
  isFileResourceKind,
  type Resource,
} from "./resource";
import { readResourceFile } from "./resource-db";

/** File name to use when opening or downloading an upload. */
export function resourceFileName(resource: Resource): string {
  return resource.fileName || resource.title;
}

/** One-line hint shown under a resource title in the compact list. */
export function resourceSummary(resource: Resource): string {
  if (resource.description) return resource.description;
  if (resource.kind === "snippet") {
    return resource.language ? `${resource.language} snippet` : "Code snippet";
  }
  if (resource.url) return resource.url;
  if (isFileResourceKind(resource.kind)) {
    return [resource.fileName, formatResourceSize(resource.sizeBytes)]
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

export async function openResource(resource: Resource): Promise<void> {
  if (resource.url) {
    window.open(resource.url, "_blank", "noopener,noreferrer");
    return;
  }
  if (!isFileResourceKind(resource.kind)) return;

  // Open the tab up front so the async IndexedDB read doesn't get popup-blocked.
  const win = window.open("", "_blank");
  try {
    const file = await readResourceFile(resource.id);
    if (!file) {
      win?.close();
      toast.error("That file isn't saved in this browser anymore.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([file.data], { type: file.mimeType }),
    );
    if (win) win.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    win?.close();
    toast.error("Couldn't open that attachment.");
  }
}

export async function downloadResource(resource: Resource): Promise<void> {
  if (!isFileResourceKind(resource.kind)) return;
  try {
    const file = await readResourceFile(resource.id);
    if (!file) {
      toast.error("That file isn't saved in this browser anymore.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([file.data], { type: file.mimeType }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = resourceFileName(resource);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Couldn't download that attachment.");
  }
}
