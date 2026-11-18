import type {
  StudioSource,
  StudioWorkspace,
} from "@/features/studio";
import type { Course, Playlist } from "@/shared/lib/types";

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "SCSS",
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  json: "JSON",
  md: "Markdown",
  svg: "SVG",
};

export interface StudioLanguage {
  language: string;
  files: number;
}

export interface StudioProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  files: number;
  href: string | null;
}

export interface StudioSummary {
  projects: number;
  files: number;
  languages: StudioLanguage[];
  recentProjects: StudioProjectSummary[];
}

export function languageForPath(path: string): string | null {
  const name = path.split("/").pop() ?? path;
  const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() : "";
  return extension ? LANGUAGE_BY_EXTENSION[extension] ?? null : null;
}

/** Where a Studio project's lesson lives, when it is still in the library. */
export function studioSourceHref(
  source: StudioSource | null,
  courses: Course[],
  playlists: Playlist[]
): string | null {
  if (!source) return null;
  if (source.kind === "course") {
    return courses.some((course) => course.id === source.courseId)
      ? `/watch/${source.courseId}`
      : null;
  }
  if (source.kind === "playlist-video") {
    const playlist = playlists.find((p) => p.playlistId === source.playlistId);
    return playlist?.videos.some((video) => video.videoId === source.videoId)
      ? `/watch/${source.playlistId}/${source.videoId}`
      : null;
  }
  const course = courses.find((c) => c.videoId === source.videoId);
  return course ? `/watch/${course.id}` : null;
}

/**
 * Counts only what Studio actually stores. File and line counts are shown as
 * activity, never as a measure of programming skill.
 */
export function summarizeStudio(
  workspaces: StudioWorkspace[],
  courses: Course[],
  playlists: Playlist[]
): StudioSummary {
  const languageFiles = new Map<string, number>();
  let files = 0;

  for (const workspace of workspaces) {
    for (const file of workspace.files) {
      files += 1;
      const language = languageForPath(file.path);
      if (language) languageFiles.set(language, (languageFiles.get(language) ?? 0) + 1);
    }
  }

  const languages = [...languageFiles.entries()]
    .map(([language, count]) => ({ language, files: count }))
    .sort((a, b) => b.files - a.files || a.language.localeCompare(b.language))
    .slice(0, 5);

  const recentProjects = [...workspaces]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)
    .map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      updatedAt: workspace.updatedAt,
      files: workspace.files.length,
      href: studioSourceHref(workspace.source, courses, playlists),
    }));

  return {
    projects: workspaces.length,
    files,
    languages,
    recentProjects,
  };
}
