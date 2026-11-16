import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import {
  createEmptyAnalytics,
  getAnalyticsSnapshot,
  replaceAnalytics,
} from "./analytics-store";
import {
  startPresenceActivity,
  startVideoActivity,
  stopAllActivity,
} from "./activity-tracker";

const SOURCE = {
  kind: "playlist" as const,
  id: "p1",
  title: "Playlist",
  href: "/watch/p1/v1",
  videoId: "v1",
  lessonTitle: "Lesson one",
};

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value,
    configurable: true,
  });
}

beforeEach(() => {
  // Drop any ticker a previous test file left behind before installing the
  // fake clock, so this file always gets its own interval.
  stopAllActivity();
  jest.useFakeTimers();
  localStorage.clear();
  replaceAnalytics(createEmptyAnalytics());
  setVisibility("visible");
});

afterEach(() => {
  stopAllActivity();
  jest.useRealTimers();
  setVisibility("visible");
});

describe("playback session tracking", () => {
  test("counts one second per tick while playback is active", () => {
    const stop = startVideoActivity({ videoId: "v1", source: SOURCE });
    jest.advanceTimersByTime(5_000);
    expect(getAnalyticsSnapshot().days[dayKeyToday()].videoSeconds).toBe(5);

    stop();
    jest.advanceTimersByTime(5_000);
    expect(getAnalyticsSnapshot().days[dayKeyToday()].videoSeconds).toBe(5);
  });

  test("never counts a hidden tab", () => {
    const stop = startVideoActivity({ videoId: "v1", source: SOURCE });
    setVisibility("hidden");
    jest.advanceTimersByTime(10_000);
    expect(getAnalyticsSnapshot().days[dayKeyToday()]).toBeUndefined();

    setVisibility("visible");
    jest.advanceTimersByTime(2_000);
    expect(getAnalyticsSnapshot().days[dayKeyToday()].videoSeconds).toBe(2);
    stop();
  });

  test("counts a session and a watched lesson after a real minute", () => {
    const stop = startVideoActivity({ videoId: "v1", source: SOURCE });
    jest.advanceTimersByTime(61_000);
    const day = getAnalyticsSnapshot().days[dayKeyToday()];
    expect(day.sessions).toBe(1);
    expect(day.lessonsCompleted).toBe(1);
    expect(
      getAnalyticsSnapshot().events.filter((event) => event.type === "lesson-watched")
    ).toHaveLength(1);

    // Staying in the same session must not count a second session.
    jest.advanceTimersByTime(5_000);
    expect(getAnalyticsSnapshot().days[dayKeyToday()].sessions).toBe(1);
    stop();
  });

  test("two playback sessions for one lesson do not duplicate the event", () => {
    const first = startVideoActivity({ videoId: "v1", source: SOURCE });
    jest.advanceTimersByTime(61_000);
    first();

    const second = startVideoActivity({ videoId: "v1", source: SOURCE });
    jest.advanceTimersByTime(61_000);
    second();

    const data = getAnalyticsSnapshot();
    expect(data.days[dayKeyToday()].sessions).toBe(2);
    expect(data.days[dayKeyToday()].lessonsCompleted).toBe(1);
    expect(
      data.events.filter((event) => event.type === "lesson-watched")
    ).toHaveLength(1);
  });
});

describe("Studio and presence tracking", () => {
  test("counts Studio practice and one practice session per run", () => {
    const stop = startPresenceActivity("studio");
    jest.advanceTimersByTime(61_000);
    const day = getAnalyticsSnapshot().days[dayKeyToday()];
    expect(day.studioSeconds).toBe(61);
    expect(day.studioSessions).toBe(1);
    expect(
      getAnalyticsSnapshot().events.filter((event) => event.type === "studio-practice")
    ).toHaveLength(1);

    jest.advanceTimersByTime(5_000);
    expect(getAnalyticsSnapshot().days[dayKeyToday()].studioSessions).toBe(1);
    stop();
  });

  test("notes and reviewing count separately without session events", () => {
    const notes = startPresenceActivity("notes");
    jest.advanceTimersByTime(4_000);
    notes();
    const reviewing = startPresenceActivity("reviewing");
    jest.advanceTimersByTime(3_000);
    reviewing();

    const day = getAnalyticsSnapshot().days[dayKeyToday()];
    expect(day.noteSeconds).toBe(4);
    expect(day.reviewSeconds).toBe(3);
    expect(day.sessions).toBe(0);
  });

  test("overlapping activities are counted once (highest priority wins)", () => {
    const video = startVideoActivity({ videoId: "v1", source: SOURCE });
    const studio = startPresenceActivity("studio");
    jest.advanceTimersByTime(5_000);

    const day = getAnalyticsSnapshot().days[dayKeyToday()];
    expect(day.studioSeconds).toBe(5);
    expect(day.videoSeconds).toBe(0);
    video();
    studio();
  });
});

/** Same local-day helper the tracker uses. */
function dayKeyToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}
