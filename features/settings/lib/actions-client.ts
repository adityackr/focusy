import { fetchVideoMeta } from "@/lib/youtube";

/** Test an API key with a known video. Returns a human message. */
export async function fetchTest(key: string): Promise<string> {
  if (!key) return "Enter a key first.";
  try {
    // Gangnam Style — stable public video for key testing
    const m = await fetchVideoMeta("9bZkp7q19f0", key);
    return `✓ Key works — test fetch returned “${m.title.slice(0, 60)}”.`;
  } catch (e) {
    return e instanceof Error ? `✕ ${e.message}` : "✕ Test failed.";
  }
}

export { getApiKey, setApiKey } from "@/lib/storage";