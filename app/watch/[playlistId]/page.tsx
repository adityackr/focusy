import type { Metadata } from "next";
import { WatchView } from "@/features/playlists";

/**
 * Watch pages render from the visitor's own library (auto-imported in the
 * browser), so crawlers would only see a loading shell — keep them out of the
 * index while still allowing links to be followed.
 */
const DESCRIPTION =
  "Watch a YouTube playlist start-to-finish in a focused classroom: a lesson sidebar, chapter markers, progress tracking — no recommendations, no rabbit holes.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}): Promise<Metadata> {
  const { playlistId } = await params;
  return {
    title: `Watch playlist ${playlistId}`,
    description: DESCRIPTION,
    robots: { index: false, follow: true },
  };
}

export default async function PlaylistWatchPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;
  return <WatchView playlistId={playlistId} />;
}
