import type { Metadata } from "next";
import { WatchView } from "@/components/watch/watch-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}): Promise<Metadata> {
  const { playlistId } = await params;
  return { title: `Watch · ${playlistId}` };
}

export default async function PlaylistWatchPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;
  return <WatchView playlistId={playlistId} />;
}
