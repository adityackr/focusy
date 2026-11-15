"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const STUDIO_PREFERENCES_STORAGE_KEY = "focusy-studio:preferences";

const FONT_SIZES = [12, 13, 14, 16, 18] as const;

export type StudioFontSize = (typeof FONT_SIZES)[number];

interface StudioPreferencesState {
  fontSize: StudioFontSize;
  wordWrap: boolean;
  setFontSize: (size: StudioFontSize) => void;
  setWordWrap: (enabled: boolean) => void;
}

export const useStudioPreferences = create<StudioPreferencesState>()(
  persist(
    (set) => ({
      fontSize: 13,
      wordWrap: true,
      setFontSize: (fontSize) => set({ fontSize }),
      setWordWrap: (wordWrap) => set({ wordWrap }),
    }),
    {
      name: STUDIO_PREFERENCES_STORAGE_KEY,
      partialize: (state) => ({
        fontSize: state.fontSize,
        wordWrap: state.wordWrap,
      }),
    }
  )
);
