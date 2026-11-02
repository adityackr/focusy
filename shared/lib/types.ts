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

/** A user-defined folder that groups saved videos and playlists. Flat — no nesting. */
export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

/** A single YouTube video turned into a chapter-based course (from Chapterly). */
export interface Course {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  description: string;
  /** Video creator (channel). Optional — older saves predate it; backfilled lazily. */
  channelTitle?: string;
  /** Folder this video was saved into. Absent = uncategorized. */
  categoryId?: string;
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
  channelTitle: string;
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
  /** Folder this playlist was saved into. Absent = uncategorized. */
  categoryId?: string;
}
