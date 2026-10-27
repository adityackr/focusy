import type { Chapter } from "@/shared/lib/types";

/** Which chapter contains absolute video time `t` (last start at or before `t`). */
export function chapterAtTime(
  chapters: Chapter[],
  t: number
): { chapter: Chapter; index: number } | null {
  if (chapters.length === 0) return null;
  let idx = 0;
  chapters.forEach((c, i) => {
    if (t >= c.startSeconds - 0.5) idx = i;
  });
  return { chapter: chapters[idx], index: idx };
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}