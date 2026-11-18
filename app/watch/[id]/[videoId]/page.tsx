import type { Metadata } from "next";
import { WatchView } from "@/features/playlists";
import { parseStartAt } from "@/shared/lib/start-at";

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

export default async function VideoWatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; videoId: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const [{ id, videoId }, { t }] = await Promise.all([params, searchParams]);
  return <WatchView playlistId={id} activeVideoId={videoId} startAt={parseStartAt(t)} />;
}
