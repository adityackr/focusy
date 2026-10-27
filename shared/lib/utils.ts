import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/.*[?&]list=)([^&#]+)/i,
  /(?:youtu\.be\/.*[?&]list=)([^&#]+)/i,
  /^([A-Za-z0-9_-]{13,64})$/,
];

/** Accepts a raw playlist ID, full youtube.com URL, or youtu.be URL. Returns the ID or null. */
export function parsePlaylistInput(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      const id = match[1].trim();
      // Guard against full URLs leaking through the bare-ID fallback
      if (id.startsWith("http")) continue;
      return id;
    }
  }
  // Fallback: ?list= query param via URL parsing
  try {
    const url = new URL(value);
    const list = url.searchParams.get("list");
    if (list) return list;
  } catch {
    /* not a URL */
  }
  return null;
}
