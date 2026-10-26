import type { Metadata } from "next";
import { WatchView } from "@/components/watch/watch-view";

/** Title comes from the layout template: "Watch · FocusTube". */
export function generateMetadata(): Metadata {
  return { title: "Watch" };
}

/** `?t=` start time in seconds (chapter deep links), or undefined. */
function parseStartAt(raw: string | string[] | undefined): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.floor(seconds);
}

export default async function VideoWatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ playlistId: string; videoId: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const [{ playlistId, videoId }, { t }] = await Promise.all([params, searchParams]);
  return <WatchView playlistId={playlistId} activeVideoId={videoId} startAt={parseStartAt(t)} />;
}
