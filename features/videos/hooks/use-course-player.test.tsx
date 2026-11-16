import { beforeEach, describe, expect, test, mock } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { Course } from "@/shared/lib/types";

mock.module("next/navigation", () => ({
  useParams: () => ({ id: "course-1" }),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

const { useCoursePlayer } = await import("./use-course-player");
const { useLibrary } = await import("@/shared/store/library");

const COURSE: Course = {
  id: "course-1",
  videoId: "vid-1",
  title: "Deep work",
  thumbnail: "",
  description: "",
  durationSeconds: 600,
  createdAt: 1,
  chapters: [
    { id: "c1", title: "Intro", startSeconds: 0, endSeconds: 60 },
    { id: "c2", title: "Setup", startSeconds: 60, endSeconds: 120 },
    { id: "c3", title: "Wrap up", startSeconds: 120, endSeconds: null },
  ],
};

function Harness({ startAt }: { startAt?: number }) {
  const player = useCoursePlayer(startAt);
  return (
    <div>
      <span data-testid="loaded">{String(player.loaded)}</span>
      <span data-testid="active">{player.active?.title ?? "none"}</span>
      <span data-testid="resume">{String(player.resumeAt)}</span>
      <span data-testid="exact">{String(player.resumeExact)}</span>
      <span data-testid="resumed-from">{String(player.resumedFrom)}</span>
    </div>
  );
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useLibrary.setState({
    courses: { [COURSE.id]: COURSE },
    hydrated: true,
  });
});

describe("useCoursePlayer deep links", () => {
  test("selects the chapter containing ?t= and cues exactly there", () => {
    render(<Harness startAt={75} />);
    expect(screen.getByTestId("loaded").textContent).toBe("true");
    expect(screen.getByTestId("active").textContent).toBe("Setup");
    expect(screen.getByTestId("resume").textContent).toBe("75");
    expect(screen.getByTestId("exact").textContent).toBe("true");
    // A deep link is not a resume — no "Resumed from" banner.
    expect(screen.getByTestId("resumed-from").textContent).toBe("null");
  });

  test("keeps a near-end timestamp exact instead of falling back", () => {
    render(<Harness startAt={119} />);
    expect(screen.getByTestId("active").textContent).toBe("Setup");
    expect(screen.getByTestId("resume").textContent).toBe("119");
    expect(screen.getByTestId("exact").textContent).toBe("true");
  });

  test("without ?t= it opens the saved chapter as a normal resume", () => {
    localStorage.setItem(
      "yt-course:progress:course-1",
      JSON.stringify({
        completedIds: [],
        lastChapterId: "c2",
        positions: { c2: 80 },
        updatedAt: 1,
      }),
    );
    render(<Harness />);
    expect(screen.getByTestId("active").textContent).toBe("Setup");
    expect(screen.getByTestId("resume").textContent).toBe("80");
    expect(screen.getByTestId("exact").textContent).toBe("false");
    expect(screen.getByTestId("resumed-from").textContent).toBe("80");
  });
});
