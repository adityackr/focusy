"use client";

import { useCoursePlayer } from "@/features/videos/hooks/use-course-player";
import CourseSkeleton from "@/features/videos/components/player/course-skeleton";
import CourseNotFound from "@/features/videos/components/player/course-not-found";
import PlayerSection from "@/features/videos/components/player/player-section";
import LessonsSidebar from "@/features/videos/components/player/lessons-sidebar";
import CourseFooter from "@/features/videos/components/player/course-footer";

export function CoursePlayerView() {
  const {
    course,
    loaded,
    activeId,
    activeIndex,
    pct,
    completedIds,
    resumeAt,
    resumedFrom,
    restartNonce,
    autoAdvance,
    setAutoAdvance,
    editing,
    setEditing,
    sidebarOpen,
    toggleSidebar,
    select,
    toggleComplete,
    go,
    handleSeek,
    handleEnded,
    handleProgress,
    clearResume,
    handleChaptersChange,
  } = useCoursePlayer();

  if (!loaded) return <CourseSkeleton />;

  if (!course) return <CourseNotFound />;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4">
      <div className={`grid gap-4 ${sidebarOpen ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
        <PlayerSection
          course={course}
          activeIndex={activeIndex}
          completedIds={completedIds}
          autoAdvance={autoAdvance}
          editing={editing}
          sidebarOpen={sidebarOpen}
          resumeAt={resumeAt}
          resumedFrom={resumedFrom}
          restartNonce={restartNonce}
          toggleSidebar={toggleSidebar}
          toggleComplete={toggleComplete}
          go={go}
          handleSeek={handleSeek}
          handleEnded={handleEnded}
          handleProgress={handleProgress}
          clearResume={clearResume}
          handleChaptersChange={handleChaptersChange}
        />
        {sidebarOpen && (
          <LessonsSidebar
            course={course}
            activeId={activeId}
            completedIds={completedIds}
            toggleSidebar={toggleSidebar}
            select={select}
            toggleComplete={toggleComplete}
          />
        )}
      </div>

      <CourseFooter
        course={course}
        pct={pct}
        autoAdvance={autoAdvance}
        setAutoAdvance={setAutoAdvance}
        editing={editing}
        setEditing={setEditing}
      />
    </main>
  );
}