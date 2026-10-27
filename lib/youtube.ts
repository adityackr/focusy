import type { Playlist, PlaylistVideo, Thumbnail, VideoMeta } from "@/lib/types";

const API_BASE = "https://www.googleapis.com/youtube/v3";

/** Random short id, used for chapter / course ids (ported from Chapterly). */
export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Extract an 11-char YouTube video ID from a URL or raw ID. Returns null if invalid. */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;

  // Try URL parsing (handles watch?v=, youtu.be, /embed/, /shorts/, /live/, /v/)
  try {
    const url = new URL(s.includes("://") ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\.|^m\.|^music\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split(/[?#/]/)[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      for (const prefix of ["/embed/", "/shorts/", "/live/", "/v/"]) {
        if (url.pathname.startsWith(prefix)) {
          const id = url.pathname.slice(prefix.length).split(/[?#/]/)[0];
          return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
        }
      }
    }
  } catch {
    // not a URL — fall through to regex search
  }

  const m = s.match(/[A-Za-z0-9_-]{11}/);
  // Only accept bare-regex hit if the whole string looks like URL-ish context
  // to avoid false positives; prefer explicit parse above.
  if (m && (s.includes("youtube") || s.includes("youtu.be"))) return m[0];
  return null;
}

function parseIso8601Duration(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const s = m[3] ? parseInt(m[3], 10) : 0;
  const total = h * 3600 + min * 60 + s;
  return total > 0 ? total : null;
}

/** Fetch title/thumbnail/description/duration for one video (client-side, caller's key). */
export async function fetchVideoMeta(videoId: string, apiKey: string): Promise<VideoMeta> {
  const url =
    `${API_BASE}/videos` +
    `?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}` +
    `&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 400) throw new Error("Invalid request — check the video ID and API key.");
    if (res.status === 403)
      throw new Error("API key rejected or quota exceeded (403). Check key or try manual paste.");
    throw new Error(`YouTube API error (${res.status}). Try manual paste instead.`);
  }
  const data = await res.json();
  const item = data?.items?.[0];
  if (!item) throw new Error("Video not found. Check the link/ID (it may be private or deleted).");
  const thumbs = item.snippet?.thumbnails;
  return {
    title: item.snippet?.title ?? videoId,
    description: item.snippet?.description ?? "",
    thumbnail:
      thumbs?.maxres?.url ?? thumbs?.standard?.url ?? thumbs?.high?.url ?? thumbs?.medium?.url ?? "",
    durationSeconds: item.contentDetails?.duration
      ? parseIso8601Duration(item.contentDetails.duration)
      : null,
  };
}

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
