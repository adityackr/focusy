"use client";

import { useCoursePlayer } from "./_hooks/use-course-player";
import CourseSkeleton from "./_components/course-skeleton";
import CourseNotFound from "./_components/course-not-found";
import PlayerSection from "./_components/player-section";
import LessonsSidebar from "./_components/lessons-sidebar";
import CourseFooter from "./_components/course-footer";

export default function CoursePage() {
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