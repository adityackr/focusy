import { CoursePlayerView } from "@/features/videos";
import { parseStartAt } from "@/shared/lib/start-at";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const [, { t }] = await Promise.all([params, searchParams]);
  return <CoursePlayerView startAt={parseStartAt(t)} />;
}
