import type { Metadata } from "next";
import { WatchEntryView } from "@/features/playlists";
import { parseStartAt } from "@/shared/lib/start-at";

/**
 * One player route for both saved videos and playlists. The active content is
 * picked from the visitor's own library client-side, so crawlers would only
 * see a loading shell — keep it out of the index while still allowing links to
 * be followed.
 */
const DESCRIPTION =
  "Watch a YouTube video or playlist in a focused classroom: lessons, chapters, progress tracking — no recommendations, no rabbit holes.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Watch ${id}`,
    description: DESCRIPTION,
    robots: { index: false, follow: true },
  };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  return <WatchEntryView id={id} startAt={parseStartAt(t)} />;
}
