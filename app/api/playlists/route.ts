import { NextRequest, NextResponse } from "next/server";
import { fetchPlaylistFromYouTube } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const playlistId = req.nextUrl.searchParams.get("playlistId")?.trim();

  if (!playlistId) {
    return NextResponse.json({ error: "Missing playlistId" }, { status: 400 });
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Server is missing YOUTUBE_API_KEY. Add it to .env.local" },
      { status: 500 }
    );
  }

  try {
    const playlist = await fetchPlaylistFromYouTube(playlistId, key);
    return NextResponse.json(playlist, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch playlist";
    const status = message.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
