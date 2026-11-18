import { redirect } from "next/navigation";
import { parseStartAt } from "@/shared/lib/start-at";

/**
 * The course player now lives at `/watch/[id]` with playlists. Keep this old
 * URL working for existing notes, bookmarks and shared links.
 */
export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const startAt = parseStartAt(t);
  redirect(
    `/watch/${encodeURIComponent(id)}${startAt != null ? `?t=${startAt}` : ""}`
  );
}
