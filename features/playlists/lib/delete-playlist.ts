import { useLibrary } from "@/shared/store/library";
import {
  clearPlaylistProgress,
  getPlaylistCompletedAt,
  getPlaylistProgress,
} from "@/shared/lib/storage";
import {
  archiveCertificate,
  playlistCertificateProgress,
} from "@/features/certificates";
import { removeNotesForVideo } from "@/features/notes";
import { removeBookmarksForVideo } from "@/features/bookmarks";
import { removeResourcesForPlaylist } from "@/features/resources";
import { deleteWorkspacesForPlaylist } from "@/features/studio";

/**
 * Delete a playlist and everything created from its lessons.
 *
 * Notes, bookmarks, Studio projects and watch progress belong to the playlist,
 * so they go too. A fully watched playlist leaves its certificate behind: it is
 * snapshotted before the playlist and its progress are removed.
 */
export async function deletePlaylistData(playlistId: string): Promise<void> {
  if (!playlistId) return;

  const playlist = useLibrary.getState().playlists[playlistId];

  if (playlist) {
    const progress = getPlaylistProgress(playlistId);
    const certificate = playlistCertificateProgress(playlist, progress);
    if (certificate.complete) {
      archiveCertificate({
        kind: "playlist",
        sourceId: playlistId,
        title: playlist.playlistTitle,
        channelTitle: playlist.channelTitle ?? "",
        thumbnail: playlist.playlistThumbnail?.url ?? "",
        completed: certificate.completed,
        total: certificate.total,
        completedAt: getPlaylistCompletedAt(playlistId) ?? Date.now(),
      });
    }

    for (const video of playlist.videos) {
      removeNotesForVideo(video.videoId);
      removeBookmarksForVideo(video.videoId);
    }
  }

  clearPlaylistProgress(playlistId);
  useLibrary.getState().removePlaylist(playlistId);

  await Promise.all([
    removeResourcesForPlaylist(playlistId),
    deleteWorkspacesForPlaylist(playlistId),
  ]);
}
