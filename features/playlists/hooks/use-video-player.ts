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
  // Captions truth lives in a ref: the state mirrors the button, while the
  // poll re-applies the ref because the (undocumented) captions module resets
  // itself on every video load and even on resume.
  const captionsRef = useRef(captionsOn);
  const captionsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingRef = useRef(false);

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
            const saved = loadPlayerSettings();
            try {
              // Restore the viewer's saved controls before anything plays.
              player?.setVolume(saved.volume);
              if (saved.muted) player?.mute();
              setVolumeState(saved.volume);
              setMuted(saved.muted);

              const start = cueAtRef.current;
              // Exact seek: allowSeekAhead=false snaps to the nearest entry
              // point, which on a freshly cued video is 0:00 — the resume
              // position then only lands once the viewer scrubs.
              if (start > 0) player?.seekTo(start, true);
              if (autoPlayRef.current) player?.playVideo();

              player?.setPlaybackRate(1);
              const rates = player?.getAvailablePlaybackRates?.();
              let rate = saved.playbackRate;
              if (Array.isArray(rates) && rates.length > 0) {
                const sorted = [...rates].sort((a, b) => a - b);
                setAvailableRates(sorted);
                // Fall back to 1x (or the lowest) when the saved speed isn't offered.
                if (!sorted.includes(rate)) rate = sorted.includes(1) ? 1 : sorted[0];
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
      if (captionsRetryRef.current) {
        clearTimeout(captionsRetryRef.current);
        captionsRetryRef.current = null;
      }
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
  }, [syncCaptions]);

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
    savePlayerSettings({ playbackRate: rate });
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
