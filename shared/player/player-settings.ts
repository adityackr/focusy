/**
 * Persisted player preferences (volume / mute / speed / captions) shared by
 * every `useVideoPlayer` hook, so controls survive reloads and stay consistent
 * between the course player and the playlist watch page.
 */

export interface PlayerSettings {
  /** 0–100 */
  volume: number;
  muted: boolean;
  /** Playback speed, e.g. 1.5 */
  playbackRate: number;
  /** Whether captions should be on for new playback sessions. */
  captions: boolean;
}

const STORAGE_KEY = "yt-course:player-settings";

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  volume: 100,
  muted: false,
  playbackRate: 1,
  captions: false,
};

function clampVolume(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return DEFAULT_PLAYER_SETTINGS.volume;
  return Math.min(100, Math.max(0, Math.round(v)));
}

function clampRate(r: unknown): number {
  if (typeof r !== "number" || !Number.isFinite(r) || r <= 0 || r > 4)
    return DEFAULT_PLAYER_SETTINGS.playbackRate;
  return r;
}

/** Saved preferences, sanitised. Defaults on the server or when unreadable. */
export function loadPlayerSettings(): PlayerSettings {
  if (typeof window === "undefined") return DEFAULT_PLAYER_SETTINGS;
  let parsed: Partial<PlayerSettings> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw) as Partial<PlayerSettings>;
  } catch {
    return DEFAULT_PLAYER_SETTINGS;
  }
  return {
    volume: clampVolume(parsed.volume),
    muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_PLAYER_SETTINGS.muted,
    playbackRate: clampRate(parsed.playbackRate),
    captions:
      typeof parsed.captions === "boolean" ? parsed.captions : DEFAULT_PLAYER_SETTINGS.captions,
  };
}

/** Merge a patch into the saved preferences. No-ops on the server / when storage is unavailable. */
export function savePlayerSettings(patch: Partial<PlayerSettings>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadPlayerSettings(), ...patch }));
  } catch {
    /* private mode / quota — preferences just don't stick */
  }
}

/**
 * Force the player's captions module into the wanted state.
 *
 * `loadModule`/`unloadModule` is undocumented, and the player silently resets
 * the module whenever a video (re)loads — resuming after a pause can bring
 * auto-captions back. Callers therefore re-apply the wanted state after every
 * load/play transition instead of trusting a single call, which also keeps the
 * captions button's state in sync with what's actually on screen.
 */
export function applyCaptions(
  player: { loadModule(name: string): void; unloadModule(name: string): void } | null | undefined,
  on: boolean
): void {
  if (!player) return;
  try {
    if (on) {
      player.loadModule("captions");
      player.loadModule("cc");
    } else {
      player.unloadModule("captions");
      player.unloadModule("cc");
    }
  } catch {
    /* module API may not exist on this player build — never break playback */
  }
}
