import { describe, expect, test } from "bun:test";
import {
  chaptersForVideo,
  formatTimestamp,
  isChapterLine,
  parseChapters,
  stripTimestampLines,
} from "./chapters";
import type { PlaylistVideo } from "./types";

function makeVideo(videoId: string, description: string): PlaylistVideo {
  return {
    videoId,
    title: `Video ${videoId}`,
    description,
    thumbnail: { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, width: 320, height: 180 },
    position: 0,
  };
}

describe("parseChapters", () => {
  test("parses timestamp-at-start lines into ordered chapters", () => {
    const chapters = parseChapters("00:00 Intro\n05:12 Setup\n1:02:03 Deep dive");
    expect(chapters.map((c) => c.title)).toEqual(["Intro", "Setup", "Deep dive"]);
    expect(chapters.map((c) => c.startSeconds)).toEqual([0, 312, 3723]);
  });

  test("accepts separators, parens, and timestamp-at-end lines", () => {
    const chapters = parseChapters(
      ["(00:10) Warm up", "Recap - 00:40", "01:05 | Main event"].join("\n")
    );
    expect(chapters.map((c) => c.title)).toEqual(["Warm up", "Recap", "Main event"]);
    expect(chapters.map((c) => c.startSeconds)).toEqual([10, 40, 65]);
  });

  test("sorts, dedupes by start, and chains endSeconds", () => {
    const chapters = parseChapters("02:00 Second\n01:00 First\n01:00 First again");
    expect(chapters.map((c) => c.title)).toEqual(["First", "Second"]);
    expect(chapters[0].endSeconds).toBe(120);
    expect(chapters[1].endSeconds).toBeNull(); // no duration known
  });

  test("last chapter ends at the video duration when known", () => {
    const chapters = parseChapters("00:00 Intro\n01:00 Outro", 300);
    expect(chapters[1].endSeconds).toBe(300);
  });

  test("returns an empty list when there are no timestamps", () => {
    expect(parseChapters("Just a normal description\nwith two lines")).toEqual([]);
    expect(parseChapters("")).toEqual([]);
  });

  test("ignores lines whose numbers are not timestamps", () => {
    const chapters = parseChapters("Lesson 3 covers 12:34 of content\n00:00 Start");
    expect(chapters.map((c) => c.title)).toEqual(["Start"]);
  });
});

describe("formatTimestamp", () => {
  test("formats as M:SS and H:MM:SS", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(75)).toBe("1:15");
    expect(formatTimestamp(3723)).toBe("1:02:03");
    expect(formatTimestamp(-5)).toBe("0:00");
  });
});

describe("stripTimestampLines / isChapterLine", () => {
  test("detects chapter lines in both orders", () => {
    expect(isChapterLine("00:00 Intro")).toBe(true);
    expect(isChapterLine("(1:02:03) Deep dive")).toBe(true);
    expect(isChapterLine("Intro - 00:00")).toBe(true);
    expect(isChapterLine("Welcome to the course")).toBe(false);
  });

  test("removes chapter lines but keeps the rest of the description", () => {
    const cleaned = stripTimestampLines(
      "Welcome!\n00:00 Intro\nSome blurb here\n05:00 Setup\nSee you there"
    );
    expect(cleaned).toBe("Welcome!\nSome blurb here\nSee you there");
  });
});

describe("chaptersForVideo", () => {
  test("parses the video description and memoizes per video object", () => {
    const video = makeVideo("abc", "00:00 Intro\n01:00 Outro");
    const first = chaptersForVideo(video);
    expect(first.map((c) => c.title)).toEqual(["Intro", "Outro"]);
    // Same object → same array (stable React keys across renders)
    expect(chaptersForVideo(video)).toBe(first);
    // A different video object parses independently
    expect(chaptersForVideo(makeVideo("abc", "00:00 Intro\n01:00 Outro"))).not.toBe(first);
  });

  test("returns an empty list for videos without chapters", () => {
    expect(chaptersForVideo(makeVideo("xyz", "no timestamps here"))).toEqual([]);
  });
});
