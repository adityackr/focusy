"use client";

import { useState } from "react";
import type { Chapter } from "@/shared/lib/types";
import { formatTimestamp } from "@/shared/lib/chapters";

function parseTimeInput(v: string): number | null {
  const parts = v.trim().split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 1) return parts[0];
  return null;
}

function withDerivedEnds(chapters: Chapter[]): Chapter[] {
  return chapters.map((c, i, arr) => ({
    ...c,
    endSeconds: i < arr.length - 1 ? arr[i + 1].startSeconds : c.endSeconds,
  }));
}

export function useChapterEditor(chapters: Chapter[], onChange: (chapters: Chapter[]) => void) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [formError, setFormError] = useState("");

  function startEdit(c: Chapter) {
    setEditingId(c.id);
    setTitle(c.title);
    setStart(formatTimestamp(c.startSeconds));
    setFormError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setFormError("");
  }

  function saveEdit() {
    if (!editingId) return;
    const secs = parseTimeInput(start);
    if (secs == null || secs < 0) {
      setFormError("Invalid time. Use MM:SS or HH:MM:SS.");
      return;
    }
    const next = withDerivedEnds(
      chapters
        .map((c) =>
          c.id === editingId ? { ...c, title: title.trim() || c.title, startSeconds: secs } : c
        )
        .sort((a, b) => a.startSeconds - b.startSeconds)
    );
    onChange(next);
    setEditingId(null);
  }

  function remove(id: string) {
    onChange(withDerivedEnds(chapters.filter((c) => c.id !== id)));
  }

  function move(id: string, dir: -1 | 1) {
    const i = chapters.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= chapters.length) return;
    const next = [...chapters];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(withDerivedEnds(next));
  }

  return {
    editingId,
    title,
    setTitle,
    start,
    setStart,
    formError,
    startEdit,
    cancelEdit,
    saveEdit,
    remove,
    move,
  };
}