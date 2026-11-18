"use client";
/* eslint-disable react-hooks/set-state-in-effect -- client-only localStorage hydration on mount */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { Course } from "@/shared/lib/types";
import { getProgress, setProgress } from "@/shared/lib/storage";
import { useLibrary } from "@/shared/store/library";
import {
  trackCourseCompleted,
  trackLessonCompleted,
} from "@/features/analytics";

const SIDEBAR_KEY = "yt-course:sidebar-open";

/** Ignore tiny offsets and resumes within this many seconds of the chapter end. */
const RESUME_LEAD_IN = 1;
const RESUME_TAIL = 2;

/** Chapter containing `time`; before the first chapter start, use the first. */
function chapterAt(
  chapters: Course["chapters"],
  time: number,
): Course["chapters"][number] | null {
  let found: Course["chapters"][number] | null = null;
  for (const chapter of chapters) {
    if (time >= chapter.startSeconds - 0.5) found = chapter;
  }
  return found ?? chapters[0] ?? null;
}

function isResumable(
  saved: number | undefined,
  chapter: { startSeconds: number; endSeconds: number | null } | null | undefined
): saved is number {
  if (!chapter || saved == null || !Number.isFinite(saved)) return false;
  if (saved < chapter.startSeconds + RESUME_LEAD_IN) return false;
  if (chapter.endSeconds != null && saved >= chapter.endSeconds - RESUME_TAIL) return false;
  return true;
}

export function useCoursePlayer(
  startAt?: number | null,
  courseId?: string
) {
  // The unified `/watch/[id]` route passes the id; keep reading route params as
  // a fallback for direct course-player renders.
  const params = useParams<{ id?: string; playlistId?: string }>();
  const id = courseId ?? params.id ?? params.playlistId ?? "";
  // Courses live in the shared library store (same data the tabs render).
  const course = useLibrary((s) => s.courses[id]) ?? null;
  const updateCourse = useLibrary((s) => s.updateCourse);
  const pushCourseRecent = useLibrary((s) => s.pushCourseRecent);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [restartNonce, setRestartNonce] = useState(0);
  const [openedResume, setOpenedResume] = useState<number | null>(null);
  // Explicit `?t=` position from a note/deep link. Cleared by navigation so it
  // can never re-seek after the viewer has moved on.
  const [deepLinkAt, setDeepLinkAt] = useState<number | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SIDEBAR_KEY) !== "0";
  });

  function toggleSidebar() {
    setSidebarOpen((v) => {
      localStorage.setItem(SIDEBAR_KEY, v ? "0" : "1");
      return !v;
    });
  }

  useEffect(() => {
    const c = useLibrary.getState().courses[id];
    if (c) {
      pushCourseRecent(c.id);
      const p = getProgress(c.id);
      setCompletedIds(p.completedIds);
      setPositions(p.positions ?? {});
      const deepLink =
        typeof startAt === "number" && Number.isFinite(startAt) && startAt > 0
          ? Math.floor(startAt)
          : null;
      const initialChapter = deepLink != null ? chapterAt(c.chapters, deepLink) : null;
      const initial = initialChapter?.id ?? p.lastChapterId ?? c.chapters[0]?.id ?? null;
      setActiveId(initial);
      setDeepLinkAt(deepLink);
      const ch = c.chapters.find((x) => x.id === initial);
      const saved = ch ? p.positions?.[ch.id] : undefined;
      setOpenedResume(
        deepLink == null && ch && !p.completedIds.includes(ch.id) && isResumable(saved, ch)
          ? saved
          : null
      );
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, startAt]);

  const activeIndex = useMemo(
    () => course?.chapters.findIndex((c) => c.id === activeId) ?? -1,
    [course, activeId]
  );
  const active = activeIndex >= 0 ? course!.chapters[activeIndex] : null;
  const pct =
    !course || course.chapters.length === 0
      ? 0
      : Math.round((completedIds.length / course.chapters.length) * 100);

  // Live resume point for the active chapter (follows progress saves).
  const resumeAt = useMemo(() => {
    if (!active || !activeId) return null;
    if (deepLinkAt != null) {
      const insideChapter =
        deepLinkAt >= active.startSeconds - 0.5 &&
        (active.endSeconds == null || deepLinkAt < active.endSeconds);
      if (insideChapter) return deepLinkAt;
    }
    if (completedIds.includes(activeId)) return null;
    const saved = positions[activeId];
    return isResumable(saved, active) ? saved : null;
  }, [positions, active, activeId, completedIds, deepLinkAt]);

  const positionsRef = useRef(positions);
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Record new completions for local analytics. The first pass adopts the
  // progress that already existed, so opening an old course never invents
  // history that didn't happen today.
  const trackedCourseIdRef = useRef<string | null>(null);
  const trackedCompletedRef = useRef<Set<string>>(new Set());
  const trackedCourseDoneRef = useRef(false);
  useEffect(() => {
    if (!course || !loaded) return;
    const current = new Set(completedIds);
    if (trackedCourseIdRef.current !== course.id) {
      trackedCourseIdRef.current = course.id;
      trackedCompletedRef.current = current;
      trackedCourseDoneRef.current =
        course.chapters.length > 0 && completedIds.length >= course.chapters.length;
      return;
    }

    const previous = trackedCompletedRef.current;
    for (const id of completedIds) {
      if (previous.has(id)) continue;
      const chapter = course.chapters.find((c) => c.id === id);
      trackLessonCompleted({
        courseId: course.id,
        courseTitle: course.title,
        lessonId: id,
        lessonTitle: chapter?.title,
        href: `/watch/${course.id}`,
      });
    }
    trackedCompletedRef.current = current;

    const complete =
      course.chapters.length > 0 && completedIds.length >= course.chapters.length;
    if (complete && !trackedCourseDoneRef.current) {
      trackedCourseDoneRef.current = true;
      trackCourseCompleted({
        courseId: course.id,
        courseTitle: course.title,
        href: `/watch/${course.id}`,
      });
    } else if (!complete) {
      trackedCourseDoneRef.current = false;
    }
  }, [course, loaded, completedIds]);

  function persistProgress(
    nextCompleted: string[],
    nextActive: string | null,
    nextPositions: Record<string, number> = positionsRef.current
  ) {
    if (!course) return;
    setProgress(course.id, {
      completedIds: nextCompleted,
      lastChapterId: nextActive,
      positions: nextPositions,
      updatedAt: Date.now(),
    });
  }

  function dropPositions(ids: string[], base: Record<string, number>) {
    if (ids.length === 0) return base;
    const next = { ...base };
    let changed = false;
    for (const id of ids) {
      if (id in next) {
        delete next[id];
        changed = true;
      }
    }
    return changed ? next : base;
  }

  function snapshotResume(chapterId: string, completed: string[]) {
    const ch = course?.chapters.find((c) => c.id === chapterId);
    if (!ch || completed.includes(chapterId)) {
      setOpenedResume(null);
      return;
    }
    const saved = positionsRef.current[chapterId];
    setOpenedResume(isResumable(saved, ch) ? saved : null);
  }

  function completeThrough(targetIdx: number, base: string[]) {
    if (!course || targetIdx <= 0) return base;
    const idsToAdd = course.chapters.slice(0, targetIdx).map((c) => c.id);
    const set = new Set(base);
    for (const id of idsToAdd) set.add(id);
    return [...set];
  }

  /** Persist a playback position. Maps the time to its chapter so scrub
   *  reports can't corrupt the previously-active chapter's resume point.
   *  Null clears (chapter finished). */
  function handleProgress(t: number | null) {
    if (!course) return;
    if (t === null) {
      if (!activeId || !(activeId in positionsRef.current)) return;
      const next = { ...positionsRef.current };
      delete next[activeId];
      positionsRef.current = next;
      setPositions(next);
      persistProgress(completedIds, activeId, next);
      return;
    }
    if (!Number.isFinite(t)) return;
    let idx = 0;
    course.chapters.forEach((c, i) => {
      if (t >= c.startSeconds - 0.5) idx = i;
    });
    const target = course.chapters[idx];
    if (!target) return;
    if (completedIds.includes(target.id)) {
      if (target.id in positionsRef.current) {
        const next = { ...positionsRef.current };
        delete next[target.id];
        positionsRef.current = next;
        setPositions(next);
        persistProgress(completedIds, activeId, next);
      }
      return;
    }
    if (!isResumable(t, target)) {
      // Too early to matter, or inside the end tail (effectively finished).
      if (target.id in positionsRef.current) {
        const next = { ...positionsRef.current };
        delete next[target.id];
        positionsRef.current = next;
        setPositions(next);
        persistProgress(completedIds, activeId, next);
      }
      return;
    }
    if (positionsRef.current[target.id] === t) return;
    const next = { ...positionsRef.current, [target.id]: t };
    positionsRef.current = next;
    setPositions(next);
    persistProgress(completedIds, activeId, next);
  }

  /** Forget the active chapter's resume point and restart it from the top. */
  function clearResume() {
    if (!course || !activeId) return;
    setDeepLinkAt(null);
    const next = dropPositions([activeId], positionsRef.current);
    positionsRef.current = next;
    setPositions(next);
    setOpenedResume(null);
    setRestartNonce((n) => n + 1);
    persistProgress(completedIds, activeId, next);
  }

  function select(id: string) {
    if (!course) return;
    setDeepLinkAt(null);
    const currentIdx = course.chapters.findIndex((c) => c.id === activeId);
    const targetIdx = course.chapters.findIndex((c) => c.id === id);
    if (targetIdx < 0) return;
    // Forward jump: auto-complete the chapter(s) being skipped (their
    // resume points are done, so drop them). Backward jumps keep everything.
    let nextCompleted = completedIds;
    let nextPositions = positionsRef.current;
    if (currentIdx >= 0 ? targetIdx > currentIdx : targetIdx > 0) {
      nextCompleted = completeThrough(targetIdx, completedIds);
      nextPositions = dropPositions(
        course.chapters.slice(0, targetIdx).map((c) => c.id),
        nextPositions
      );
      positionsRef.current = nextPositions;
      setPositions(nextPositions);
      setCompletedIds(nextCompleted);
    }
    setActiveId(id);
    snapshotResume(id, nextCompleted);
    persistProgress(nextCompleted, id, nextPositions);
  }

  function toggleComplete(id: string) {
    setDeepLinkAt(null);
    const markingComplete = !completedIds.includes(id);
    const next = markingComplete
      ? [...completedIds, id]
      : completedIds.filter((x) => x !== id);
    setCompletedIds(next);
    let nextPositions = positionsRef.current;
    if (markingComplete) {
      // A completed chapter always restarts from the top.
      nextPositions = dropPositions([id], nextPositions);
      positionsRef.current = nextPositions;
      setPositions(nextPositions);
      if (id === activeId) setOpenedResume(null);
    }
    persistProgress(next, activeId, nextPositions);
  }

  function go(dir: -1 | 1) {
    if (!course) return;
    setDeepLinkAt(null);
    const j = activeIndex + dir;
    if (j < 0 || j >= course.chapters.length) return;
    if (dir === 1) {
      // Next button: auto-complete current + everything before the target.
      const nextCompleted = completeThrough(j, completedIds);
      const nextPositions = dropPositions(
        course.chapters.slice(0, j).map((c) => c.id),
        positionsRef.current
      );
      positionsRef.current = nextPositions;
      setPositions(nextPositions);
      setCompletedIds(nextCompleted);
      const targetId = course.chapters[j].id;
      setActiveId(targetId);
      snapshotResume(targetId, nextCompleted);
      persistProgress(nextCompleted, targetId, nextPositions);
      return;
    }
    // Prev button: just navigate, never auto-complete.
    const targetId = course.chapters[j].id;
    setActiveId(targetId);
    snapshotResume(targetId, completedIds);
    persistProgress(completedIds, targetId);
  }

  function handleSeek(t: number) {
    if (!course) return;
    setDeepLinkAt(null);
    // Follow the user: highlight whichever chapter contains the scrubbed-to time.
    let idx = 0;
    course.chapters.forEach((c, i) => {
      if (t >= c.startSeconds - 0.5) idx = i;
    });
    const target = course.chapters[idx];
    if (target && target.id !== activeId) {
      // Forward scrub: auto-complete all chapters before the scrubbed-to time.
      // Backward scrub leaves completion untouched.
      let nextCompleted = completedIds;
      let nextPositions = positionsRef.current;
      if (idx > activeIndex) {
        nextCompleted = completeThrough(idx, completedIds);
        nextPositions = dropPositions(
          course.chapters.slice(0, idx).map((c) => c.id),
          nextPositions
        );
        positionsRef.current = nextPositions;
        setPositions(nextPositions);
        setCompletedIds(nextCompleted);
      }
      setActiveId(target.id);
      // The user chose this exact spot by scrubbing — not a resume.
      setOpenedResume(null);
      persistProgress(nextCompleted, target.id, nextPositions);
    }
  }

  function handleEnded() {
    if (!course || activeIndex < 0) return;
    // mark current complete on natural end (resume point is done — drop it)
    const id = course.chapters[activeIndex].id;
    const nextCompleted = completedIds.includes(id) ? completedIds : [...completedIds, id];
    setCompletedIds(nextCompleted);
    const nextPositions = dropPositions([id], positionsRef.current);
    positionsRef.current = nextPositions;
    setPositions(nextPositions);
    setOpenedResume(null);
    const next = course.chapters[activeIndex + 1];
    if (next && autoAdvance) {
      setActiveId(next.id);
      snapshotResume(next.id, nextCompleted);
      persistProgress(nextCompleted, next.id, nextPositions);
    } else {
      persistProgress(nextCompleted, activeId, nextPositions);
    }
  }

  function handleChaptersChange(next: Course["chapters"]) {
    if (!course) return;
    const updated = { ...course, chapters: next };
    updateCourse(updated);
    const keep = new Set(next.map((c) => c.id));
    const pruned = Object.fromEntries(
      Object.entries(positionsRef.current).filter(([id]) => keep.has(id))
    );
    positionsRef.current = pruned;
    setPositions(pruned);
    if (activeId && !next.find((c) => c.id === activeId)) {
      const fallback = next[0]?.id ?? null;
      setActiveId(fallback);
      if (fallback) snapshotResume(fallback, completedIds);
      persistProgress(completedIds, fallback, pruned);
    } else {
      persistProgress(completedIds, activeId, pruned);
    }
  }

  return {
    course,
    loaded,
    activeId,
    activeIndex,
    active,
    pct,
    completedIds,
    resumeAt,
    // True only while `resumeAt` comes from an explicit `?t=` deep link.
    resumeExact: deepLinkAt != null && resumeAt === deepLinkAt,
    resumedFrom: openedResume,
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
  };
}