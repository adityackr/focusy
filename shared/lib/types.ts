export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface PlaylistVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: Thumbnail;
  position: number;
  /** Video length in seconds (fetched at import). Absent on old imports. */
  durationSeconds?: number | null;
}

export interface Chapter {
  id: string;
  title: string;
  startSeconds: number;
  /** null = plays until the end of the video */
  endSeconds: number | null;
}

/** A single YouTube video turned into a chapter-based course (from Chapterly). */
export interface Course {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  description: string;
  durationSeconds: number | null;
  chapters: Chapter[];
  createdAt: number;
}

export interface CourseProgress {
  completedIds: string[];
  lastChapterId: string | null;
  updatedAt: number;
  /** Per-chapter resume positions: chapterId -> absolute video time in seconds. */
  positions?: Record<string, number>;
}

export interface VideoMeta {
  title: string;
  description: string;
  thumbnail: string;
  durationSeconds: number | null;
}

export interface Playlist {
  playlistId: string;
  playlistTitle: string;
  playlistDescription: string;
  playlistThumbnail: Thumbnail;
  channelId: string;
  channelTitle: string;
  itemCount: number;
  videos: PlaylistVideo[];
  addedAt: string;
}
