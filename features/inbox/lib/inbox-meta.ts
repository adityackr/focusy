import { getApiKey } from "@/shared/lib/storage";
import { fetchVideoMeta } from "@/shared/lib/youtube";

export interface InboxLinkMeta {
  title: string;
  channelTitle: string;
}

function oEmbedUrl(videoId: string): string {
  const watch = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  return `https://www.youtube.com/oembed?url=${encodeURIComponent(
    watch
  )}&format=json`;
}

/**
 * Best-effort title/channel lookup for a pasted link. Uses the user's YouTube
 * API key when one is set, otherwise YouTube's keyless oEmbed endpoint. Any
 * failure is fine: the link is still saved with a generic title.
 */
export async function fetchInboxMeta(
  videoId: string
): Promise<InboxLinkMeta | null> {
  const key = getApiKey();
  if (key) {
    try {
      const meta = await fetchVideoMeta(videoId, key);
      if (meta.title) {
        return { title: meta.title, channelTitle: meta.channelTitle };
      }
    } catch {
      // Fall through to oEmbed — the key may be rejected or out of quota.
    }
  }

  try {
    const response = await fetch(oEmbedUrl(videoId));
    if (!response.ok) return null;
    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
    };
    if (!data.title) return null;
    return {
      title: data.title,
      channelTitle: data.author_name ?? "",
    };
  } catch {
    return null;
  }
}
