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
}

export interface Chapter {
  id: string;
  title: string;
  startSeconds: number;
  /** null = plays until the end of the video */
  endSeconds: number | null;
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
