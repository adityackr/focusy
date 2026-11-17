import * as React from "react";
import {
  normalizeReminderSettings,
  REMINDERS_STORAGE_KEY,
  type ReminderSettings,
} from "./reminders";

/**
 * Reminder preferences, stored only in this browser. They are per-device
 * settings (like the player preferences), so they stay out of backup files.
 */

/** Stable server snapshot for `useSyncExternalStore`. */
const SERVER_SETTINGS: ReminderSettings = Object.freeze(
  normalizeReminderSettings(null),
);

let cache: ReminderSettings | null = null;
const listeners = new Set<() => void>();

function invalidate(): void {
  cache = null;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function read(): ReminderSettings {
  if (typeof window === "undefined") return normalizeReminderSettings(null);
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    return normalizeReminderSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeReminderSettings(null);
  }
}

function snapshot(): ReminderSettings {
  if (!cache) cache = read();
  return cache;
}

/** Drop the memoized settings, e.g. after storage was cleared outside the app. */
export function invalidateReminderSettingsCache(): void {
  invalidate();
}

function persist(settings: ReminderSettings): boolean {
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(settings));
    invalidate();
    return true;
  } catch {
    return false;
  }
}

export function readReminderSettings(): ReminderSettings {
  return read();
}

/** Change some reminder preferences; unreadable storage keeps the defaults. */
export function updateReminderSettings(
  patch: Partial<ReminderSettings>,
): ReminderSettings {
  const next = normalizeReminderSettings({ ...read(), ...patch });
  persist(next);
  return next;
}

/** Remember that today's reminder was delivered, so it isn't repeated. */
export function markReminderSent(dayKey: string): void {
  updateReminderSettings({ lastSentOn: dayKey });
}

/** Reactive reminder preferences. */
export function useReminderSettings(): ReminderSettings {
  return React.useSyncExternalStore(
    subscribe,
    snapshot,
    () => SERVER_SETTINGS,
  );
}

let storageBound = false;
function bindStorageEvents(): void {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === REMINDERS_STORAGE_KEY) {
      invalidate();
    }
  });
}

if (typeof window !== "undefined") {
  bindStorageEvents();
}
