import { useLibrary } from "@/shared/store/library";
import { clearProgress, getProgress } from "@/shared/lib/storage";
import { getAnalyticsSnapshot } from "@/features/analytics";
import {
  archiveCertificate,
  certificateProgress,
} from "@/features/certificates";
import { removeNotesForVideo } from "@/features/notes";
import { removeBookmarksForVideo } from "@/features/bookmarks";
import { removeResourcesForCourse } from "@/features/resources";
import { deleteWorkspacesForCourse } from "@/features/studio";

/**
 * Delete a video/course and everything created from it.
 *
 * Notes, bookmarks, attachments (metadata and their IndexedDB files), Studio
 * projects and watch progress belong to the course, so they go too. A finished
 * course leaves its certificate behind: it is snapshotted before the course and
 * progress are removed.
 */
export async function deleteCourseData(courseId: string): Promise<void> {
  if (!courseId) return;

  const course = useLibrary.getState().courses[courseId];

  if (course) {
    const progress = getProgress(courseId);
    const certificate = certificateProgress(course, progress);
    if (certificate.complete) {
      archiveCertificate({
        kind: "course",
        sourceId: courseId,
        title: course.title,
        channelTitle: course.channelTitle ?? "",
        thumbnail: course.thumbnail,
        completed: certificate.completed,
        total: certificate.total,
        completedAt:
          getAnalyticsSnapshot().completedCourses[courseId] ??
          (progress.updatedAt > 0 ? progress.updatedAt : Date.now()),
      });
    }

    removeNotesForVideo(course.videoId);
    removeBookmarksForVideo(course.videoId);
  }

  clearProgress(courseId);
  useLibrary.getState().removeCourse(courseId);

  await Promise.all([
    removeResourcesForCourse(courseId),
    deleteWorkspacesForCourse(courseId),
  ]);
}
