import { describe, expect, test, beforeEach } from "bun:test";
import React, { useEffect } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useWatchProgress } from "./use-watch-progress";

const KEY = "focustube:progress:P1";
const LEGACY_KEY = "clean-youtube:progress:P1";

function read() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Mimics WatchView: auto-marks the open video, exposes a toggle button. */
function Harness({
  activeVideoId,
  toggleId,
  toggleChapterKey,
  resumeAt,
}: {
  activeVideoId?: string;
  toggleId?: string;
  toggleChapterKey?: string;
  /** Feed a playback time to savePosition when the button is clicked. */
  resumeAt?: number;
}) {
  const { watched, completedChapters, positions, markWatched, toggleWatched, toggleChapter, savePosition } =
    useWatchProgress("P1");
  useEffect(() => {
    if (activeVideoId) markWatched(activeVideoId);
  }, [activeVideoId, markWatched]);
  return (
    <div>
      <span data-testid="watched">{watched.join(",")}</span>
      <span data-testid="chapters">{completedChapters.join(",")}</span>
      <span data-testid="positions">{JSON.stringify(positions)}</span>
      {toggleId && (
        <button data-testid="toggle" onClick={() => toggleWatched(toggleId)}>
          toggle
        </button>
      )}
      {toggleChapterKey && (
        <button data-testid="toggle-chapter" onClick={() => toggleChapter(toggleChapterKey)}>
          toggle chapter
        </button>
      )}
      {resumeAt !== undefined && (
        <button data-testid="save-position" onClick={() => savePosition("V", resumeAt)}>
          save position
        </button>
      )}
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("useWatchProgress", () => {
  test("mounting a video merges with stored progress (no wipe)", () => {
    localStorage.setItem(KEY, JSON.stringify({ watched: ["A"], lastWatched: "A" }));
    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<Harness activeVideoId="B" />));
    });
    expect(read()).toEqual({ watched: ["A", "B"], lastWatched: "B", completedChapters: [], positions: {} });
    expect(screen.getByTestId("watched").textContent).toBe("A,B");
    unmount();
  });

  test("reported scenario: watch A -> next video B -> refresh keeps everything", () => {
    // 1. Open video A (opening auto-marks it watched, like WatchView does)
    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<Harness activeVideoId="A" />));
    });
    expect(read().watched).toEqual(["A"]);
    unmount();

    // 2. Navigate to video B (client-side nav, fresh mount like a new page load)
    act(() => {
      ({ unmount } = render(<Harness activeVideoId="B" />));
    });
    expect(read()).toEqual({ watched: ["A", "B"], lastWatched: "B", completedChapters: [], positions: {} });
    unmount();

    // 3. Refresh on video B
    act(() => {
      ({ unmount } = render(<Harness activeVideoId="B" />));
    });
    expect(read()).toEqual({ watched: ["A", "B"], lastWatched: "B", completedChapters: [], positions: {} });
    expect(screen.getByTestId("watched").textContent).toBe("A,B");
    unmount();
  });

  test("adopts progress saved under the legacy Clean YouTube key", () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ watched: ["A", "B"], lastWatched: "B" })
    );
    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<Harness />));
    });
    expect(screen.getByTestId("watched").textContent).toBe("A,B");
    expect(JSON.parse(localStorage.getItem(KEY)!).watched).toEqual(["A", "B"]);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    unmount();
  });

  test("toggling a list video on persists across refresh", () => {
    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<Harness toggleId="C" />));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("toggle"));
    });
    expect(read().watched).toEqual(["C"]);
    unmount();

    // refresh
    act(() => {
      ({ unmount } = render(<Harness />));
    });
    expect(read().watched).toEqual(["C"]);
    expect(screen.getByTestId("watched").textContent).toBe("C");
    unmount();
  });

  test("toggle off removes the video but keeps the rest", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ watched: ["A", "B"], lastWatched: "B" })
    );
    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<Harness toggleId="A" />));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("toggle"));
    });
    expect(read().watched).toEqual(["B"]);
    unmount();
  });

  test("chapter completion toggles on, survives refresh, and toggles off", () => {
    const KEY_A = "vid-a@0";
    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<Harness toggleChapterKey={KEY_A} />));
    });
    expect(screen.getByTestId("chapters").textContent).toBe("");

    act(() => {
      fireEvent.click(screen.getByTestId("toggle-chapter"));
    });
    expect(read().completedChapters).toEqual([KEY_A]);
    expect(screen.getByTestId("chapters").textContent).toBe(KEY_A);
    unmount();

    // refresh — the mark must not be wiped by the mount-time auto-mark
    act(() => {
      ({ unmount } = render(<Harness toggleChapterKey={KEY_A} />));
    });
    expect(screen.getByTestId("chapters").textContent).toBe(KEY_A);

    act(() => {
      fireEvent.click(screen.getByTestId("toggle-chapter"));
    });
    expect(read().completedChapters).toEqual([]);
    expect(screen.getByTestId("chapters").textContent).toBe("");
    unmount();
  });

  test("marking a video watched keeps chapter completion (no clobber)", () => {
    const KEY_A = "vid-a@0";
    localStorage.setItem(
      KEY,
      JSON.stringify({ watched: ["A"], lastWatched: "A", completedChapters: [KEY_A] })
    );
    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<Harness activeVideoId="B" />));
    });
    expect(read()).toEqual({
      watched: ["A", "B"],
      lastWatched: "B",
      completedChapters: [KEY_A],
      positions: {},
    });
    expect(screen.getByTestId("chapters").textContent).toBe(KEY_A);
    unmount();
  });

  test("saves a resume position, survives refresh, and clears at the end", () => {
    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<Harness resumeAt={123.7} />));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("save-position"));
    });
    expect(read().positions).toEqual({ V: 123 });
    expect(screen.getByTestId("positions").textContent).toBe('{"V":123}');
    unmount();

    // refresh — the resume point is still there for the next open
    act(() => {
      ({ unmount } = render(<Harness resumeAt={123.7} />));
    });
    expect(screen.getByTestId("positions").textContent).toBe('{"V":123}');
    unmount();

    // watching to the end (reported as 0) drops the resume point
    act(() => {
      ({ unmount } = render(<Harness resumeAt={0} />));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("save-position"));
    });
    expect(read().positions).toEqual({});
    expect(screen.getByTestId("positions").textContent).toBe("{}");
    unmount();
  });

  test("positions below the resume minimum are never stored", () => {
    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<Harness resumeAt={3} />));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("save-position"));
    });
    // Nothing was written at all (no stale resume point, no storage churn).
    expect(read()?.positions ?? {}).toEqual({});
    expect(screen.getByTestId("positions").textContent).toBe("{}");
    unmount();
  });

  test("resume points are readable during the very first render", () => {
    // Regression: the player is built from the first render, so a position
    // that only lands after an effect cues playback at 0:00 on reload.
    localStorage.setItem(
      KEY,
      JSON.stringify({ watched: ["A"], lastWatched: "A", positions: { V: 123 } })
    );
    const seen: Record<string, number>[] = [];
    function Probe() {
      const { positions } = useWatchProgress("P1");
      seen.push(positions);
      return null;
    }
    render(<Probe />);
    expect(seen[0]).toEqual({ V: 123 });
  });
});
