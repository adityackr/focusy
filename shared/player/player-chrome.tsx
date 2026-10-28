"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Captions,
  ListVideo,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Chapter } from "@/shared/lib/types";
import { formatTimestamp } from "@/shared/lib/chapters";
import { cn } from "@/shared/lib/utils";
import { chapterAtTime, clamp01 } from "@/shared/player/chapter-at";
import { ChromeButton, Kbd, MenuCard, MenuItem } from "@/shared/player/chrome";

/** An external seek request (sidebar chapter click) for one video. */
export interface SeekRequest {
  videoId: string;
  time: number;
  /** Increments per request so clicking the same chapter twice re-seeks. */
  n: number;
}

/**
 * The control surface both `useVideoPlayer` hooks expose. Either hook's result
 * can drive the chrome — the wrappers in `features/videos` (chapter-bounds
 * hook) and `features/playlists` (whole-video hook) just wire their own state.
 */
export interface PlayerHandle {
  mountRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  playbackRate: number;
  availableRates: number[];
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  loadedFraction: number;
  captionsOn: boolean;
  nudge: (by: number) => void;
  seekTo: (seconds: number) => void;
  togglePlay: () => void;
  setRate: (rate: number) => void;
  setVolumeLevel: (level: number) => void;
  toggleMute: () => void;
  toggleCaptions: () => void;
}

interface Props {
  /** Video id — hover-preview thumbnail source and seek-request targeting. */
  videoId: string;
  /** Result of either `useVideoPlayer` hook. */
  player: PlayerHandle;
  /** Chapters — segmented seekbar dividers, hover preview, now-playing chip. */
  chapters?: Chapter[];
  /** Sidebar-initiated seek, applied when it targets this video. */
  seekRequest?: SeekRequest | null;
  /** Fires with the index of the chapter containing the current time (-1 = none). */
  onChapterChange?: (index: number) => void;
  /** Throttled playback reports (~every 5s, and at the end) for resume tracking. */
  onProgress?: (time: number, duration: number) => void;
}

type Menu = "speed" | "quality" | "chapters" | null;

/**
 * Rich custom player chrome over the YouTube IFrame API — the one player used
 * by both the course page and the playlist watch page. Segmented seekbar with
 * chapter dividers, hover preview, in-bar now-playing chip, keyboard
 * shortcuts, speed/quality/chapters menus.
 *
 * Honest limits (YouTube platform, not our UI):
 * - Quality is Auto-only: YouTube deprecated setPlaybackQuality /
 *   getAvailableQualityLevels, so manual resolution picks are no-ops.
 * - Hover preview shows the video thumbnail + time + chapter name. Exact-frame
 *   storyboards require YouTube's private signed storyboard spec, which the
 *   official API doesn't expose.
 */
export function PlayerChrome(props: Props) {
  const {
    mountRef,
    containerRef,
    isPlaying,
    chromeShown,
    openMenu,
    setOpenMenu,
    isFullscreen,
    compact,
    minimal,
    scrubbing,
    setScrubbing,
    setChromeVisible,
    setHover,
    total,
    progressRatio,
    bufferedRatio,
    currentTime,
    playbackRate,
    availableRates,
    volume,
    muted,
    captionsOn,
    chapters,
    current,
    hover,
    hoverChapter,
    previewSrc,
    pokeChrome,
    onWrapperKeyDown,
    togglePlay,
    toggleFullscreen,
    nudge,
    seekTo,
    seekRatio,
    ratioToTime,
    handleSeekbarMove,
    timeToRatio,
    goChapter,
    toggleMute,
    setVolumeLevel,
    toggleCaptions,
    setRate,
  } = usePlayerChrome(props);

  return (
    <div>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onWrapperKeyDown}
        onMouseMove={pokeChrome}
        onMouseLeave={() => {
          if (isPlaying) setChromeVisible(false);
          setHover(null);
        }}
        className={cn(
          "group relative aspect-video w-full overflow-hidden rounded-xl bg-black outline-none",
          !chromeShown && "cursor-none",
          isFullscreen && "rounded-none"
        )}
      >
        {/* YouTube surface — native controls hidden, we render our own chrome. */}
        <div ref={mountRef} className="pointer-events-none h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />

        {/* Click-to-toggle layer (kept above iframe since iframe swallows clicks). */}
        <button
          type="button"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={() => {
            togglePlay();
            pokeChrome();
          }}
          className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
        />

        {/* Center play affordance */}
        {!isPlaying && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
              <Play className="size-7 fill-current" aria-hidden />
            </span>
          </div>
        )}

        {/* Bottom chrome */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pt-8 pb-2.5 transition-opacity duration-200",
            chromeShown ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Segmented seekbar with chapter dividers + hover preview */}
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(currentTime)}
            aria-valuetext={`${formatTimestamp(currentTime)} of ${total > 0 ? formatTimestamp(total) : "--:--"}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                nudge(-5);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                nudge(5);
              } else if (e.key === "Home") {
                e.preventDefault();
                seekTo(0);
              }
            }}
            onMouseMove={(e) => handleSeekbarMove(e.clientX, e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => {
              if (!scrubbing) setHover(null);
            }}
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = clamp01((e.clientX - rect.left) / rect.width);
              setScrubbing(true);
              setHover({ t: ratioToTime(ratio), ratio });
              seekRatio(ratio);
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!scrubbing) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = clamp01((e.clientX - rect.left) / rect.width);
              setHover({ t: ratioToTime(ratio), ratio });
              seekRatio(ratio);
            }}
            onPointerUp={(e) => {
              setScrubbing(false);
              const rect = e.currentTarget.getBoundingClientRect();
              handleSeekbarMove(e.clientX, rect);
            }}
            className="relative mb-2 flex h-5 cursor-pointer items-center outline-none"
          >
            <div className="relative h-1.5 w-full overflow-visible rounded-full bg-white/25">
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/30"
                style={{ width: `${bufferedRatio * 100}%` }}
              />
              {/* Played */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progressRatio * 100}%` }} />
              {/* Chapter dividers */}
              {total > 0 &&
                chapters.slice(1).map((c) => (
                  <span
                    key={c.id}
                    className="absolute top-1/2 h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/80"
                    style={{ left: `${timeToRatio(c.startSeconds) * 100}%` }}
                  />
                ))}
              {/* Playhead */}
              <span
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow ring-2 ring-white/80 transition-opacity group-hover:opacity-100 [.group:hover_&]:opacity-100"
                style={{ left: `${progressRatio * 100}%` }}
              />
            </div>

            {/* Hover preview: thumbnail + time + chapter name */}
            {hover && total > 0 && (
              <div
                className="pointer-events-none absolute bottom-6 z-30 w-40 -translate-x-1/2 overflow-hidden rounded-lg border border-white/15 bg-black/95 shadow-xl"
                style={{ left: `${Math.min(92, Math.max(8, hover.ratio * 100))}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewSrc}
                  alt=""
                  aria-hidden
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
                <div className="px-2 py-1.5">
                  <div className="font-mono text-[11px] font-semibold text-white tabular-nums">
                    {formatTimestamp(hover.t)}
                    {total > 0 && <span className="text-white/60"> / {formatTimestamp(total)}</span>}
                  </div>
                  {hoverChapter && (
                    <div className="truncate text-[11px] text-white/85">
                      {hoverChapter.index + 1}. {hoverChapter.chapter.title}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controls row — wraps when narrow (e.g. fullscreen on a phone) so
              nothing is clipped by the overflow-hidden container. */}
          <div className={cn("flex items-center gap-1 text-white", compact && "flex-wrap gap-y-1.5")}>
            {!minimal && (
              <ChromeButton label="Previous chapter" onClick={() => goChapter(-1)}>
                <SkipBack className="fill-current" />
              </ChromeButton>
            )}
            <ChromeButton label={isPlaying ? "Pause (k)" : "Play (k)"} onClick={togglePlay}>
              {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            </ChromeButton>
            {!minimal && (
              <>
                <ChromeButton label="Next chapter" onClick={() => goChapter(1)}>
                  <SkipForward className="fill-current" />
                </ChromeButton>
                <ChromeButton label="Back 10 seconds (j)" onClick={() => nudge(-10)}>
                  <RotateCcw />
                </ChromeButton>
                <ChromeButton label="Forward 10 seconds (l)" onClick={() => nudge(10)}>
                  <RotateCw />
                </ChromeButton>

                {/* Volume */}
                <div className="flex items-center gap-1">
                  <ChromeButton label={muted || volume === 0 ? "Unmute (m)" : "Mute (m)"} onClick={toggleMute}>
                    {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
                  </ChromeButton>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={muted ? 0 : volume}
                    onChange={(e) => setVolumeLevel(Number(e.target.value))}
                    aria-label="Volume"
                    className="h-1 w-20 cursor-pointer accent-white"
                  />
                </div>
              </>
            )}

            <div className="ml-1 font-mono text-xs whitespace-nowrap text-white/90 tabular-nums">
              {formatTimestamp(currentTime)}
              <span className="text-white/60"> / {total > 0 ? formatTimestamp(total) : "--:--"}</span>
            </div>

            {/* Now-playing chapter — lives in the bar (auto-hides with it), click to restart */}
            {current && (
              <button
                type="button"
                onClick={() => seekTo(current.chapter.startSeconds)}
                title={`Restart chapter "${current.chapter.title}"`}
                aria-label={`Now playing: ${current.chapter.title}. Activate to restart the chapter.`}
                className={cn(
                  "ml-2 min-w-0 max-w-56 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20",
                  isFullscreen ? "flex" : "hidden md:flex"
                )}
              >
                <ListVideo className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  {current.index + 1}. {current.chapter.title}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-white/60 tabular-nums">
                  {formatTimestamp(current.chapter.startSeconds)}
                </span>
              </button>
            )}

            <div className="flex-1" />

            {/* Captions */}
            {!minimal && (
              <ChromeButton label={captionsOn ? "Turn subtitles off (c)" : "Turn subtitles on (c)"} onClick={toggleCaptions} active={captionsOn}>
                <Captions />
              </ChromeButton>
            )}

            {/* Speed */}
            {!minimal && (
              <div className="relative">
                <ChromeButton
                  label="Playback speed"
                  onClick={() => setOpenMenu(openMenu === "speed" ? null : "speed")}
                  active={openMenu === "speed"}
                >
                  <span className="px-0.5 font-mono text-xs font-semibold tabular-nums">{playbackRate}x</span>
                </ChromeButton>
                {openMenu === "speed" && (
                  <MenuCard title="Speed">
                    {availableRates.map((r) => (
                      <MenuItem key={r} selected={r === playbackRate} onClick={() => { setRate(r); setOpenMenu(null); }}>
                        {r}x
                      </MenuItem>
                    ))}
                  </MenuCard>
                )}
              </div>
            )}

            {/* Quality (Auto-only — YouTube deprecated manual selection) */}
            {!minimal && (
              <div className="relative">
                <ChromeButton
                  label="Quality — YouTube manages this automatically"
                  onClick={() => setOpenMenu(openMenu === "quality" ? null : "quality")}
                  active={openMenu === "quality"}
                >
                  <Settings />
                </ChromeButton>
                {openMenu === "quality" && (
                  <MenuCard title="Quality" wide>
                    <MenuItem selected onClick={() => setOpenMenu(null)}>
                      Auto
                    </MenuItem>
                    <p className="px-3 py-2 text-[11px] leading-snug text-white/60">
                      YouTube removed manual resolution control from the embed API, so quality stays on
                      Auto. Exact-frame hover previews aren&apos;t exposed either — hovering shows the
                      video thumbnail plus time and chapter.
                    </p>
                  </MenuCard>
                )}
              </div>
            )}

            {/* Chapters */}
            {!minimal && chapters.length > 0 && (
              <div className="relative">
                <ChromeButton
                  label="Chapters"
                  onClick={() => setOpenMenu(openMenu === "chapters" ? null : "chapters")}
                  active={openMenu === "chapters"}
                >
                  <ListVideo />
                </ChromeButton>
                {openMenu === "chapters" && (
                  <MenuCard title={`Chapters (${chapters.length})`} wide>
                    <div className="max-h-56 overflow-y-auto">
                      {chapters.map((c, i) => {
                        const active = current?.chapter.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              seekTo(c.startSeconds + 0.1);
                              setOpenMenu(null);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-white/10",
                              active ? "bg-white/10 text-white" : "text-white/80"
                            )}
                          >
                            <span className="w-6 shrink-0 font-mono text-white/50 tabular-nums">{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate">{c.title}</span>
                            <span className="shrink-0 font-mono text-white/60 tabular-nums">
                              {formatTimestamp(c.startSeconds)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </MenuCard>
                )}
              </div>
            )}

            <ChromeButton label={isFullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"} onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize /> : <Maximize />}
            </ChromeButton>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Shortcuts: <Kbd>Space</Kbd>/<Kbd>K</Kbd> play · <Kbd>J</Kbd>/<Kbd>L</Kbd> ±10s ·{" "}
        <Kbd>←</Kbd>/<Kbd>→</Kbd> ±5s · <Kbd>↑</Kbd>/<Kbd>↓</Kbd> volume · <Kbd>M</Kbd> mute ·{" "}
        <Kbd>C</Kbd> subtitles · <Kbd>F</Kbd> fullscreen
      </p>
    </div>
  );
}

/**
 * All state, effects and handlers for `PlayerChrome` — the one place the
 * YouTube surface is wired up. Kept out of the JSX.
 */
function usePlayerChrome({
  videoId,
  player,
  chapters = [],
  seekRequest,
  onChapterChange,
  onProgress,
}: Props) {
  const {
    mountRef,
    isPlaying,
    playbackRate,
    availableRates,
    currentTime,
    duration,
    volume,
    muted,
    loadedFraction,
    captionsOn,
    nudge,
    seekTo,
    togglePlay,
    setRate,
    setVolumeLevel,
    toggleMute,
    toggleCaptions,
  } = player;
  const current = chapterAtTime(chapters, currentTime);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [openMenu, setOpenMenu] = useState<Menu>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hover, setHover] = useState<{ t: number; ratio: number } | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  // Container width drives the small-screen strategy: below `sm` the bar
  // collapses to a minimal set (play / time / fullscreen) so nothing is
  // clipped. In fullscreen the full control set comes back and wraps onto
  // extra rows instead of overflowing. Seeded from the viewport so the first
  // client render already matches narrow screens (no flash of the full bar).
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth
  );
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = containerWidth > 0 && containerWidth < 640;
  const minimal = compact && !isFullscreen;

  // Effective total: live duration preferred, chapter bounds as fallback.
  const lastEnd = chapters.length > 0 ? (chapters[chapters.length - 1].endSeconds ?? null) : null;
  const total = duration > 0 ? duration : (lastEnd ?? 0);
  const progressRatio = total > 0 ? clamp01(currentTime / total) : 0;
  const bufferedRatio = total > 0 ? clamp01(loadedFraction) : 0;

  // Report the active chapter upward (sidebar highlight) when it changes.
  const currentChapterIndex = current?.index ?? -1;
  const onChapterChangeRef = useRef(onChapterChange);
  useEffect(() => {
    onChapterChangeRef.current = onChapterChange;
  });
  useEffect(() => {
    onChapterChangeRef.current?.(currentChapterIndex);
  }, [currentChapterIndex]);

  // Report playback upward for resume tracking: once per 5s bucket, plus a
  // final report when the video reaches its end (the caller then drops the
  // resume point so the next open starts from 0).
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  });
  const lastReportRef = useRef<{ bucket: number; ended: boolean } | null>(null);
  useEffect(() => {
    if (!onProgressRef.current) return;
    const ended = duration > 0 && currentTime >= duration - 1;
    const bucket = Math.floor(Math.max(0, currentTime) / 5);
    const prev = lastReportRef.current;
    if (prev && prev.bucket === bucket && prev.ended === ended) return;
    lastReportRef.current = { bucket, ended };
    onProgressRef.current?.(currentTime, duration);
  }, [currentTime, duration]);

  // Apply sidebar seek requests that target this video (once per request).
  const appliedSeekRef = useRef<number | null>(null);
  useEffect(() => {
    if (!seekRequest || seekRequest.videoId !== videoId) return;
    if (appliedSeekRef.current === seekRequest.n) return;
    appliedSeekRef.current = seekRequest.n;
    seekTo(seekRequest.time);
  }, [seekRequest, videoId, seekTo]);

  const pokeChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 3000);
  }, []);

  useEffect(() => {
    // Initial auto-hide timer (callback setState is fine — no sync setState here).
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 3000);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Keep chrome visible while paused / menu open / scrubbing.
  const chromeShown = chromeVisible || !isPlaying || openMenu !== null || scrubbing;

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Close menus on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void el.requestFullscreen();
    } catch {
      /* noop */
    }
  }

  function timeToRatio(t: number) {
    return total > 0 ? clamp01(t / total) : 0;
  }

  function ratioToTime(ratio: number) {
    return clamp01(ratio) * total;
  }

  function handleSeekbarMove(clientX: number, rect: DOMRect) {
    if (total <= 0) return;
    const ratio = clamp01((clientX - rect.left) / rect.width);
    setHover({ t: ratioToTime(ratio), ratio });
  }

  function seekRatio(ratio: number) {
    if (total <= 0) return;
    seekTo(ratioToTime(ratio));
  }

  function goChapter(dir: -1 | 1) {
    if (!current || chapters.length === 0) {
      nudge(dir * 10);
      return;
    }
    const j = current.index + dir;
    if (j < 0 || j >= chapters.length) return;
    seekTo(chapters[j].startSeconds + 0.1);
  }

  function onWrapperKeyDown(e: React.KeyboardEvent) {
    // Don't hijack keys while typing in a menu input (volume slider).
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        pokeChrome();
        break;
      case "ArrowLeft":
      case "j":
        e.preventDefault();
        nudge(e.key === "ArrowLeft" ? -5 : -10);
        pokeChrome();
        break;
      case "ArrowRight":
      case "l":
        e.preventDefault();
        nudge(e.key === "ArrowRight" ? 5 : 10);
        pokeChrome();
        break;
      case "ArrowUp":
        e.preventDefault();
        setVolumeLevel((muted ? 0 : volume) + 5);
        pokeChrome();
        break;
      case "ArrowDown":
        e.preventDefault();
        setVolumeLevel((muted ? 0 : volume) - 5);
        pokeChrome();
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
      case "c":
        toggleCaptions();
        break;
    }
  }

  const hoverChapter = hover ? chapterAtTime(chapters, hover.t) : null;
  const previewSrc = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;


  return {
    mountRef,
    containerRef,
    isPlaying,
    chromeShown,
    openMenu,
    setOpenMenu,
    isFullscreen,
    compact,
    minimal,
    scrubbing,
    setScrubbing,
    setChromeVisible,
    setHover,
    total,
    progressRatio,
    bufferedRatio,
    currentTime,
    playbackRate,
    availableRates,
    volume,
    muted,
    captionsOn,
    chapters,
    current,
    hover,
    hoverChapter,
    previewSrc,
    pokeChrome,
    onWrapperKeyDown,
    togglePlay,
    toggleFullscreen,
    nudge,
    seekTo,
    seekRatio,
    ratioToTime,
    handleSeekbarMove,
    timeToRatio,
    goChapter,
    toggleMute,
    setVolumeLevel,
    toggleCaptions,
    setRate,
  };
}