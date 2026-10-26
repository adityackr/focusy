import type { Playlist, PlaylistVideo, Thumbnail } from "@/lib/types";

const API_BASE = "https://www.googleapis.com/youtube/v3";

interface PlaylistItemsResponse {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      position?: number;
      thumbnails?: { medium?: Thumbnail; default?: Thumbnail };
      resourceId?: { videoId?: string };
    };
  }>;
  nextPageToken?: string;
}

async function fetchPlaylistItems(
  playlistId: string,
  key: string,
  pageToken = "",
  acc: PlaylistVideo[] = []
): Promise<PlaylistVideo[]> {
  const url =
    `${API_BASE}/playlistItems?part=snippet,contentDetails` +
    `&maxResults=50&playlistId=${encodeURIComponent(playlistId)}` +
    `&key=${key}&pageToken=${encodeURIComponent(pageToken)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ??
        `YouTube API error (${res.status})`
    );
  }
  const data = (await res.json()) as PlaylistItemsResponse;

  const batch: PlaylistVideo[] = (data.items ?? [])
    .filter((item) => item.snippet?.resourceId?.videoId)
    .map((item, i) => ({
      videoId: item.snippet!.resourceId!.videoId!,
      title: item.snippet!.title ?? "Untitled",
      description: item.snippet!.description ?? "",
      thumbnail: item.snippet!.thumbnails?.medium ??
        item.snippet!.thumbnails?.default ?? {
          url: `https://i.ytimg.com/vi/${item.snippet!.resourceId!.videoId}/mqdefault.jpg`,
          width: 320,
          height: 180,
        },
      position: item.snippet!.position ?? acc.length + i,
    }));

  const merged = [...acc, ...batch];
  if (data.nextPageToken) {
    return fetchPlaylistItems(playlistId, key, data.nextPageToken, merged);
  }
  return merged;
}

export async function fetchPlaylistFromYouTube(
  playlistId: string,
  key: string
): Promise<Playlist> {
  const metaUrl =
    `${API_BASE}/playlists?part=snippet,contentDetails` +
    `&id=${encodeURIComponent(playlistId)}&key=${key}`;
  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) {
    const body = await metaRes.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ??
        `YouTube API error (${metaRes.status})`
    );
  }
  const meta = (await metaRes.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        description?: string;
        channelId?: string;
        channelTitle?: string;
        thumbnails?: { medium?: Thumbnail; default?: Thumbnail };
      };
      contentDetails?: { itemCount?: number };
    }>;
  };

  const entry = meta.items?.[0];
  if (!entry?.snippet) throw new Error("Playlist not found. Check the ID or link.");

  const videos = await fetchPlaylistItems(playlistId, key);

  return {
    playlistId,
    playlistTitle: entry.snippet.title ?? "Untitled playlist",
    playlistDescription: entry.snippet.description ?? "",
    playlistThumbnail: entry.snippet.thumbnails?.medium ??
      entry.snippet.thumbnails?.default ?? {
        url: "https://i.ytimg.com/vi/placeholder/mqdefault.jpg",
        width: 320,
        height: 180,
      },
    channelId: entry.snippet.channelId ?? "",
    channelTitle: entry.snippet.channelTitle ?? "Unknown channel",
    itemCount: entry.contentDetails?.itemCount ?? videos.length,
    videos,
    addedAt: new Date().toISOString(),
  };
}
