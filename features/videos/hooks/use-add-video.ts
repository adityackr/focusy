"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Chapter } from "@/shared/lib/types";
import { chapterWarnings, parseChapters } from "@/shared/lib/chapters";
import { fetchVideoMeta, newId, parseVideoId } from "@/shared/lib/youtube";
import { getApiKey } from "@/shared/lib/storage";
import { useLibrary } from "@/shared/store/library";

export interface VideoMetaState {
  title: string;
  thumbnail: string;
  description: string;
  durationSeconds: number | null;
}

export function useAddVideo() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [meta, setMeta] = useState<VideoMetaState | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  async function handleFetch() {
    setError("");
    setMeta(null);
    setChapters([]);
    const id = parseVideoId(url);
    if (!id) {
      setError("Couldn't find a video ID in that input. Paste a full YouTube URL or 11-character ID.");
      return;
    }
    setVideoId(id);

    if (manualMode) return; // skip API, user will paste chapters manually

    const key = getApiKey();
    if (!key) {
      setError("No YouTube API key set. Add one in Settings — or tick “Skip API / paste chapters manually”.");
      return;
    }
    setLoading(true);
    try {
      const m = await fetchVideoMeta(id, key);
      setMeta(m);
      const parsed = parseChapters(m.description, m.durationSeconds);
      setChapters(parsed);
      if (parsed.length === 0) {
        setError("No timestamps found in this video's description. Paste the chapter list manually below.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed. Try manual paste.");
    } finally {
      setLoading(false);
    }
  }

  function handleManualTextChange(value: string) {
    setManualText(value);
    if (manualMode || chapters.length === 0) {
      const id = videoId ?? parseVideoId(url);
      if (id) {
        setVideoId(id);
        setChapters(parseChapters(value, meta?.durationSeconds ?? null));
      }
    }
  }

  function handleManualParse() {
    const id = videoId ?? parseVideoId(url);
    if (!id) {
      setError("Enter a valid YouTube link/ID first.");
      return;
    }
    setVideoId(id);
    const parsed = parseChapters(manualText, null);
    setChapters(parsed);
    if (parsed.length === 0) setError("No timestamps parsed. Use one per line, e.g. “00:00 Intro”.");
    else setError("");
  }

  function handleSave() {
    if (!videoId) return;
    if (chapters.length === 0) {
      setError("Add at least one chapter before saving.");
      return;
    }
    const title = manualMode
      ? manualTitle.trim() || `Video ${videoId}`
      : meta?.title || `Video ${videoId}`;
    const course = {
      id: newId(),
      videoId,
      title,
      thumbnail: manualMode ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : meta?.thumbnail || "",
      description: meta?.description ?? "",
      durationSeconds: meta?.durationSeconds ?? null,
      chapters,
      createdAt: Date.now(),
    };
    useLibrary.getState().addCourse(course);
    router.push(`/course/${course.id}`);
  }

  return {
    url,
    setUrl,
    manualMode,
    setManualMode,
    manualText,
    manualTitle,
    setManualTitle,
    loading,
    error,
    videoId,
    meta,
    chapters,
    warnings: chapterWarnings(chapters),
    handleFetch,
    handleManualTextChange,
    handleManualParse,
    handleSave,
  };
}