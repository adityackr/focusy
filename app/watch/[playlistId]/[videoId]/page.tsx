import type { Metadata } from "next";
import { WatchView } from "@/features/playlists";

/**
 * The active lesson is picked from the visitor's own library client-side, so
 * this route is `noindex` like the rest of the app pages.
 */
const DESCRIPTION =
  "Play one lesson of a YouTube playlist in a distraction-free player with chapters, a lesson sidebar and resume-where-you-left-off progress.";

/** Title comes from the layout template: "Watch lesson · Focusy". */
export function generateMetadata(): Metadata {
  return {
    title: "Watch lesson",
    description: DESCRIPTION,
    robots: { index: false, follow: true },
  };
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
