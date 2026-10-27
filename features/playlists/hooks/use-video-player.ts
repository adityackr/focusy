"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          host?: string;
          playerVars?: Record<string, string | number>;
          events?: { onReady?: () => void };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayer {
  loadVideoById(opts: { videoId: string; startSeconds?: number }): void;
  cueVideoById(opts: { videoId: string; startSeconds?: number }): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getVideoLoadedFraction(): number;
  loadModule(name: string): void;
  unloadModule(name: string): void;
  destroy(): void;
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

const PLAYING = 1;

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export interface UseVideoPlayerOptions {
  videoId: string;
  /** Absolute video time to cue on load. */
  startAt?: number | null;
  autoPlay?: boolean;
}

/**
 * Whole-video playback state over the YouTube IFrame API with native controls
 * hidden — the VideoPlayer component renders its own chrome. Ported from the
 * chapterly app and simplified: this player runs a full video (no chapter
 * bounds), chapters only drive seeking/highlights.
 */
export function useVideoPlayer({
  videoId,
  startAt = null,
  autoPlay = false,
}: UseVideoPlayerOptions) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const cueAtRef = useRef<number>(startAt ?? 0);
  const autoPlayRef = useRef(autoPlay);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [availableRates, setAvailableRates] = useState<number[]>(PLAYBACK_RATES);
  const [currentTime, setCurrentTime] = useState(startAt ?? 0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(100);
  const [muted, setMuted] = useState(false);
  const [loadedFraction, setLoadedFraction] = useState(0);
  const [captionsOn, setCaptionsOn] = useState(false);

  useEffect(() => {
    cueAtRef.current = startAt ?? 0;
    autoPlayRef.current = autoPlay;
  }, [startAt, autoPlay]);

  // Init player once with our own chrome (native controls hidden).
  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;
    loadYouTubeAPI().then(() => {
      if (cancelled || !mountRef.current || !window.YT) return;
      player = new window.YT.Player(mountRef.current, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          rel: 0,
          autoplay: autoPlayRef.current ? 1 : 0,
          start: cueAtRef.current,
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
            try {
              const start = cueAtRef.current;
              // Exact seek: allowSeekAhead=false snaps to the nearest entry
              // point, which on a freshly cued video is 0:00 — the resume
              // position then only lands once the viewer scrubs.
              if (start > 0) player?.seekTo(start, true);
              if (autoPlayRef.current) player?.playVideo();
              player?.setPlaybackRate(1);
              const rates = player?.getAvailablePlaybackRates?.();
              if (Array.isArray(rates) && rates.length > 0) {
                const sorted = [...rates].sort((a, b) => a - b);
                setAvailableRates(sorted);
              }
              setVolumeState(player?.getVolume?.() ?? 100);
              setMuted(player?.isMuted?.() ?? false);
              // Captions off by default (best-effort: module API is undocumented).
              try {
                player?.unloadModule("captions");
                player?.unloadModule("cc");
              } catch {
                /* noop */
              }
            } catch {
              /* noop */
            }
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
    };
    // Player lifecycle is tied to mount; video switches remount via `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror play-state / time / duration / volume / buffered fraction.
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
      setIsPlaying(state === PLAYING);
      setCurrentTime(t);
      try {
        const d = p.getDuration?.() ?? 0;
        if (Number.isFinite(d) && d > 0)
          setDuration((prev) => (Math.abs(prev - d) > 0.5 ? d : prev));
        const frac = p.getVideoLoadedFraction?.() ?? 0;
        if (Number.isFinite(frac))
          setLoadedFraction((prev) => (Math.abs(prev - frac) > 0.01 ? frac : prev));
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
    }, 250);
    return () => clearInterval(id);
  }, []);

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

  /** Absolute seek (e.g. jumping to a chapter from the sidebar). Stable
   *  identity so it can be used inside effects. */
  const seekTo = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    const t = Math.max(0, seconds);
    try {
      p.seekTo(t, true);
    } catch {
      /* noop */
    }
    setCurrentTime(t);
  }, []);

  // The stored resume position loads in an effect one commit after mount, so
  // `startAt` can arrive after the player exists. Cue it then — unless the
  // viewer already started watching (don't yank them somewhere else).
  // When the player isn't ready yet, onReady cues from `cueAtRef` instead.
  const appliedStartRef = useRef(startAt ?? 0);
  useEffect(() => {
    const target = startAt ?? 0;
    if (target <= 0 || target === appliedStartRef.current) return;
    if (!readyRef.current) return;
    appliedStartRef.current = target;
    if (currentTime > 1) return;
    seekTo(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAt]);

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

  function setRate(rate: number) {
    setPlaybackRateState(rate);
    try {
      playerRef.current?.setPlaybackRate(rate);
    } catch {
      /* noop */
    }
  }

  function setVolumeLevel(v: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setVolumeState(clamped);
    try {
      const p = playerRef.current;
      if (!p) return;
      p.setVolume(clamped);
      if (clamped > 0 && p.isMuted?.()) {
        p.unMute();
        setMuted(false);
      }
    } catch {
      /* noop */
    }
  }

  function toggleMute() {
    try {
      const p = playerRef.current;
      if (!p) return;
      if (p.isMuted?.()) {
        p.unMute();
        setMuted(false);
      } else {
        p.mute();
        setMuted(true);
      }
    } catch {
      /* noop */
    }
  }

  /** Best-effort captions toggle (undocumented module API — may no-op). */
  function toggleCaptions() {
    try {
      const p = playerRef.current;
      if (!p) return;
      if (captionsOn) {
        p.unloadModule("captions");
        p.unloadModule("cc");
        setCaptionsOn(false);
      } else {
        p.loadModule("captions");
        p.loadModule("cc");
        setCaptionsOn(true);
      }
    } catch {
      /* noop */
    }
  }

  return {
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
  };
}
