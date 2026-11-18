import type { Metadata } from "next";
import { PlaylistCertificateView } from "@/features/certificates";

export const metadata: Metadata = {
  title: "Playlist certificate",
  robots: { index: false, follow: true },
};

export default async function PlaylistCertificatePage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;
  return <PlaylistCertificateView playlistId={playlistId} />;
}
