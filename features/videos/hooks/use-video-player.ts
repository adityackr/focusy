"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PLAYBACK_RATES,
  loadYouTubeAPI,
  type YTPlayer,
} from "@/shared/player/iframe-api";
import {
  applyCaptions,
  loadPlayerSettings,
  savePlayerSettings,
  type PlayerSettings,
} from "@/shared/player/player-settings";

const PLAYING = 1;
const SEEK_JUMP = 2; // seconds — bigger deltas between polls mean the user scrubbed

export interface UseVideoPlayerOptions {
  videoId: string;
  startSeconds: number;
  endSeconds: number | null;
  chapterKey: string;
  autoPlay?: boolean;
  /** Pause when playback naturally reaches the chapter end (auto-advance off). */
  pauseAtEnd?: boolean;
  /** Absolute video time to resume from (within the chapter). Falls back to startSeconds. */
  startAt?: number | null;
  /** Fired when the chapter ends through natural playback (not scrubbing). */
  onEnded?: () => void;
  /** Fired when the user scrubs to a time — parent follows by switching chapters. */
  onSeek?: (seconds: number) => void;
  /** Throttled playback-position reports while watching — parent persists for resume. Null = chapter finished, clear saved position. */
  onProgress?: (seconds: number | null) => void;
}

/**
 * Free-scrub chapter player logic. The user can seek anywhere with the native
 * YouTube controls (or the ±10s buttons). A chapter only counts as "ended"
 * when playback crosses endSeconds smoothly — manual seeks never trigger
 * auto-advance, they just move the sidebar highlight.
 */
export function useVideoPlayer({
  videoId,
  startSeconds,
  endSeconds,
  chapterKey,
  autoPlay = true,
  pauseAtEnd = false,
  startAt = null,
  onEnded,
  onSeek,
  onProgress,
}: UseVideoPlayerOptions) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);
  const endedFiredFor = useRef<string>("");
  const boundsRef = useRef({ startSeconds, endSeconds });
  const startAtRef = useRef<number | null>(startAt);
  const onEndedRef = useRef(onEnded);
  const onSeekRef = useRef(onSeek);
  const onProgressRef = useRef(onProgress);
  const pauseAtEndRef = useRef(pauseAtEnd);
  const lastReportRef = useRef<{ wall: number; video: number }>({ wall: 0, video: -1e9 });
  useEffect(() => {
    boundsRef.current = { startSeconds, endSeconds };
    startAtRef.current = startAt;
    onEndedRef.current = onEnded;
    onSeekRef.current = onSeek;
    onProgressRef.current = onProgress;
    pauseAtEndRef.current = pauseAtEnd;
  }, [startSeconds, endSeconds, startAt, onEnded, onSeek, onProgress, pauseAtEnd]);

  const [rateIdx, setRateIdx] = useState(3); // PLAYBACK_RATES[3] === 1
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [availableRates, setAvailableRates] = useState<number[]>(PLAYBACK_RATES);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(startSeconds);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(100);
  const [muted, setMuted] = useState(false);
  const [loadedFraction, setLoadedFraction] = useState(0);
  const [captionsOn, setCaptionsOn] = useState(false);
  // Captions truth lives in a ref: the state mirrors the button, while the
  // poll/cue effects re-apply the ref because the (undocumented) captions
  // module resets itself on every video load and even on resume.
  const captionsRef = useRef(captionsOn);
  const captionsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingRef = useRef(false);

  function resolveCueAt(): number {
    const s = boundsRef.current.startSeconds;
    const e = boundsRef.current.endSeconds;
    const r = startAtRef.current;
    if (r == null || !Number.isFinite(r)) return s;
    // Ignore stale/tiny resumes and resumes past (or at) the chapter end.
    if (r < s + 1) return s;
    if (e != null && r >= e - 2) return s;
    return r;
  }

  /**
   * Force the player back to the wanted captions state. The module can reset
   * a beat after a load/resume, so apply now and once again shortly after —
   * cheap and idempotent, and the only reliable way to keep subtitles from
   * popping back on (and the button's state from drifting out of sync).
   */
  const syncCaptions = useCallback(() => {
    const apply = () => applyCaptions(playerRef.current, captionsRef.current);
    apply();
    if (captionsRetryRef.current) clearTimeout(captionsRetryRef.current);
    captionsRetryRef.current = setTimeout(apply, 700);
  }, []);

  const cueChapter = useCallback(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    const cueAt = resolveCueAt();
    endedFiredFor.current = "";
    lastTimeRef.current = cueAt;
    lastReportRef.current = { wall: 0, video: -1e9 };
    if (autoPlay) p.loadVideoById({ videoId, startSeconds: cueAt });
    else p.cueVideoById({ videoId, startSeconds: cueAt });
    setIsPlaying(autoPlay);
    // Loading a video resets the captions module — restore the preference.
    syncCaptions();
  }, [videoId, autoPlay, syncCaptions]);

  // Init player once with our own chrome (native controls hidden — we enforce
  // chapter ends ourselves so scrubbing stays free)
  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;
    loadYouTubeAPI().then(() => {
      if (cancelled || !mountRef.current || !window.YT) return;
      player = new window.YT.Player(mountRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          autoplay: autoPlay ? 1 : 0,
          start: startSeconds,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            const saved = loadPlayerSettings();
            try {
              // Restore the viewer's saved controls before anything plays.
              player?.setVolume(saved.volume);
              if (saved.muted) player?.mute();
              setVolumeState(saved.volume);
              setMuted(saved.muted);

              player?.setPlaybackRate(1);
              const rates = player?.getAvailablePlaybackRates?.();
              let rate = saved.playbackRate;
              if (Array.isArray(rates) && rates.length > 0) {
                const sorted = [...rates].sort((a, b) => a - b);
                setAvailableRates(sorted);
                // Fall back to 1x (or the lowest) when the saved speed isn't offered.
                if (!sorted.includes(rate)) rate = sorted.includes(1) ? 1 : sorted[0];
                setRateIdx(Math.max(0, sorted.indexOf(rate)));
              }
              player?.setPlaybackRate(rate);
              setPlaybackRateState(rate);

              // Captions follow the saved preference and keep being re-applied:
              // the undocumented module API resets on every load/resume, which
              // used to make subtitles pop back on against the user's choice.
              captionsRef.current = saved.captions;
              setCaptionsOn(saved.captions);
              syncCaptions();
            } catch {
              /* noop */
            }
            cueChapter();
          },
        },
      });
      playerRef.current = player;
    });
    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        /* noop */
      }
      playerRef.current = null;
      readyRef.current = false;
      lastTimeRef.current = null;
      if (captionsRetryRef.current) {
        clearTimeout(captionsRetryRef.current);
        captionsRetryRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-cue when the selected chapter changes — UNLESS the player is already
  // inside the new chapter's bounds (i.e. the change came from the user
  // scrubbing, which we must not override).
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    let t: number | null = null;
    try {
      t = p.getCurrentTime();
    } catch {
      /* noop */
    }
    if (
      t != null &&
      t >= startSeconds - 1 &&
      (endSeconds == null || t < endSeconds + 1)
    ) {
      lastTimeRef.current = t;
      return;
    }
    cueChapter();
  }, [chapterKey, startSeconds, endSeconds, cueChapter]);

  // Unified poll: play-state mirror, duration/volume/captions mirror, seek
  // detection, natural chapter-end detection, plus throttled progress reports.
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      let t: number;
      let state: number;
      try {
        t = p.getCurrentTime();
        state = p.getPlayerState();
      } catch {
        return;
      }
      const playing = state === PLAYING;
      setIsPlaying(playing);
      if (playing && !wasPlayingRef.current) {
        // (Re)starting playback (fresh load, resume after pause) resets the
        // captions module — re-assert the user's choice so subtitles can't
        // resurrect on their own.
        syncCaptions();
      }
      wasPlayingRef.current = playing;
      setCurrentTime(t);
      try {
        const d = p.getDuration?.() ?? 0;
        if (Number.isFinite(d) && d > 0) setDuration((prev) => (Math.abs(prev - d) > 0.5 ? d : prev));
        const frac = p.getVideoLoadedFraction?.() ?? 0;
        if (Number.isFinite(frac)) setLoadedFraction((prev) => (Math.abs(prev - frac) > 0.01 ? frac : prev));
        const v = p.getVolume?.() ?? 100;
        if (Number.isFinite(v)) setVolumeState((prev) => (prev !== v ? v : prev));
        const m = p.isMuted?.() ?? false;
        setMuted((prev) => (prev !== m ? m : prev));
        const r = p.getPlaybackRate?.() ?? 1;
        if (Number.isFinite(r) && r > 0) {
          setPlaybackRateState((prev) => (prev !== r ? r : prev));
        }
      } catch {
        /* mirror is best-effort */
      }
      const last = lastTimeRef.current;
      const { startSeconds: start, endSeconds: end } = boundsRef.current;

      if (last != null && Math.abs(t - last) > SEEK_JUMP) {
        // User scrubbed — follow them, never auto-advance.
        lastTimeRef.current = t;
        endedFiredFor.current = "";
        onSeekRef.current?.(t);
        // A scrub is also a fresh resume point — persist it immediately.
        if (end == null || t < end - 2) onProgressRef.current?.(t);
        else onProgressRef.current?.(null);
        return;
      }
      if (
        end != null &&
        state === PLAYING &&
        last != null &&
        last < end - 0.15 &&
        t >= end - 0.15 &&
        endedFiredFor.current !== chapterKey
      ) {
        endedFiredFor.current = chapterKey;
        if (pauseAtEndRef.current) {
          try {
            p.pauseVideo();
          } catch {
            /* noop */
          }
        }
        onEndedRef.current?.();
      }
      lastTimeRef.current = t;
      // Throttled resume report: at most ~every 4s while inside the chapter.
      const inChapter = t >= start - 1 && (end == null || t < end - 2);
      if (inChapter) {
        const now = Date.now();
        const prev = lastReportRef.current;
        if (now - prev.wall > 4000 && Math.abs(t - prev.video) > 1) {
          lastReportRef.current = { wall: now, video: t };
          onProgressRef.current?.(t);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [chapterKey, syncCaptions]);

  // Flush the latest position when the tab closes so resume survives
  // a browser quit. The callback writes to localStorage synchronously.
  useEffect(() => {
    function flush() {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      const { endSeconds: end } = boundsRef.current;
      try {
        const t = p.getCurrentTime();
        if (end != null && t >= end - 2) {
          onProgressRef.current?.(null);
          return;
        }
        onProgressRef.current?.(t);
      } catch {
        /* noop */
      }
    }
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [chapterKey]);

  function nudge(by: number) {
    const p = playerRef.current;
    if (!p) return;
    try {
      const t = Math.max(0, p.getCurrentTime() + by);
      p.seekTo(t, true);
      setCurrentTime(t);
    } catch {
      /* noop */
    }
  }

  /** Absolute seek (e.g. restart the current chapter from the chip). The
   *  poll loop detects the jump and notifies the parent via onSeek. */
  function seekTo(seconds: number) {
    const p = playerRef.current;
    if (!p) return;
    try {
      const t = Math.max(0, seconds);
      p.seekTo(t, true);
      setCurrentTime(t);
    } catch {
      /* noop */
    }
  }

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isPlaying) p.pauseVideo();
      else p.playVideo();
    } catch {
      /* noop */
    }
  }

  function cycleRate() {
    const rates = availableRates.length > 0 ? availableRates : PLAYBACK_RATES;
    const cur = playbackRate || PLAYBACK_RATES[rateIdx] || 1;
    let i = rates.indexOf(cur);
    if (i < 0) {
      // snap to nearest rate at or below current
      i = rates.reduce((best, r, idx) => (r <= cur + 1e-6 ? idx : best), 0);
    }
    const next = (i + 1) % rates.length;
    setRate(rates[next]);
  }

  function setRate(rate: number) {
    setPlaybackRateState(rate);
    savePlayerSettings({ playbackRate: rate });
    const rates = availableRates.length > 0 ? availableRates : PLAYBACK_RATES;
    const i = rates.indexOf(rate);
    if (i >= 0) setRateIdx(i);
    try {
      playerRef.current?.setPlaybackRate(rate);
    } catch {
      /* noop */
    }
  }

  function setVolumeLevel(v: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setVolumeState(clamped);
    const patch: Partial<PlayerSettings> = { volume: clamped };
    try {
      const p = playerRef.current;
      if (p) {
        p.setVolume(clamped);
        if (clamped > 0 && p.isMuted?.()) {
          p.unMute();
          setMuted(false);
          patch.muted = false;
        }
      }
    } catch {
      /* noop */
    }
    savePlayerSettings(patch);
  }

  function toggleMute() {
    try {
      const p = playerRef.current;
      if (!p) return;
      if (p.isMuted?.()) {
        p.unMute();
        setMuted(false);
        savePlayerSettings({ muted: false });
      } else {
        p.mute();
        setMuted(true);
        savePlayerSettings({ muted: true });
      }
    } catch {
      /* noop */
    }
  }

  /**
   * Toggle captions. The wanted state is persisted and re-asserted after
   * loads/resumes, so one press always flips what's actually on screen (the
   * module used to drift out of sync with the button, needing two presses).
   */
  function toggleCaptions() {
    const next = !captionsRef.current;
    captionsRef.current = next;
    setCaptionsOn(next);
    savePlayerSettings({ captions: next });
    syncCaptions();
  }

  return {
    mountRef,
    isPlaying,
    rateIdx,
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
    cycleRate,
    setRate,
    setVolumeLevel,
    toggleMute,
    toggleCaptions,
  };
}