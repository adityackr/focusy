import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newId } from "@/shared/lib/youtube";
import {
  inboxUrl,
  normalizeTags,
  type InboxDraft,
  type InboxItem,
  type InboxStatus,
} from "./inbox";

export const INBOX_STORAGE_KEY = "focusy-inbox:v1";

interface InboxState {
  /** Saved links, newest first. */
  items: InboxItem[];
  hydrated: boolean;
  setHydrated: () => void;
  /** Save a link. Returns `duplicate` when that video is already saved. */
  addItem: (
    input: InboxDraft
  ) => { ok: true; item: InboxItem } | { ok: false; error: "invalid" | "duplicate" };
  updateItem: (
    id: string,
    patch: { title?: string; tags?: string[]; note?: string }
  ) => void;
  removeItem: (id: string) => void;
  setStatus: (id: string, status: InboxStatus) => void;
  toggleWatched: (id: string) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Drop unreadable saved links instead of failing the whole inbox. */
export function normalizeInboxItems(raw: unknown): InboxItem[] {
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set<string>();
  const seenVideos = new Set<string>();
  const items: InboxItem[] = [];

  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = typeof entry.id === "string" ? entry.id : "";
    const videoId = typeof entry.videoId === "string" ? entry.videoId : "";
    if (!id || !videoId || seenIds.has(id) || seenVideos.has(videoId)) continue;
    seenIds.add(id);
    seenVideos.add(videoId);

    const status: InboxStatus = entry.status === "watched" ? "watched" : "queued";
    const addedAt =
      typeof entry.addedAt === "number" && Number.isFinite(entry.addedAt)
        ? entry.addedAt
        : Date.now();

    items.push({
      id,
      videoId,
      url:
        typeof entry.url === "string" && entry.url
          ? entry.url
          : inboxUrl(videoId),
      title:
        typeof entry.title === "string" && entry.title.trim()
          ? entry.title.trim()
          : "Saved YouTube video",
      channelTitle:
        typeof entry.channelTitle === "string" ? entry.channelTitle.trim() : "",
      tags: normalizeTags(
        Array.isArray(entry.tags)
          ? entry.tags.filter((tag): tag is string => typeof tag === "string")
          : []
      ),
      note: typeof entry.note === "string" ? entry.note.trim() : "",
      status,
      addedAt,
      watchedAt:
        typeof entry.watchedAt === "number" && Number.isFinite(entry.watchedAt)
          ? entry.watchedAt
          : null,
    });
  }

  return items.sort((a, b) => b.addedAt - a.addedAt);
}

export const useInbox = create<InboxState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      addItem: (input) => {
        const videoId = input.videoId.trim();
        if (!videoId) return { ok: false, error: "invalid" };
        if (get().items.some((item) => item.videoId === videoId)) {
          return { ok: false, error: "duplicate" };
        }

        const item: InboxItem = {
          id: newId(),
          videoId,
          url: inboxUrl(videoId),
          title: input.title?.trim() || "Saved YouTube video",
          channelTitle: input.channelTitle?.trim() || "",
          tags: normalizeTags(input.tags ?? []),
          note: input.note?.trim() || "",
          status: "queued",
          addedAt: Date.now(),
          watchedAt: null,
        };

        set((state) => ({ items: [item, ...state.items] }));
        return { ok: true, item };
      },

      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              ...(patch.title !== undefined
                ? { title: patch.title.trim() || item.title }
                : {}),
              ...(patch.tags !== undefined
                ? { tags: normalizeTags(patch.tags) }
                : {}),
              ...(patch.note !== undefined ? { note: patch.note.trim() } : {}),
            };
          }),
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      setStatus: (id, status) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status,
                  watchedAt: status === "watched" ? Date.now() : null,
                }
              : item
          ),
        })),

      toggleWatched: (id) => {
        const item = get().items.find((entry) => entry.id === id);
        if (!item) return;
        get().setStatus(id, item.status === "watched" ? "queued" : "watched");
      },
    }),
    {
      name: INBOX_STORAGE_KEY,
      partialize: (state) => ({ items: state.items }),
      merge: (persisted, current) => ({
        ...current,
        items: normalizeInboxItems(
          isRecord(persisted) ? persisted.items : undefined
        ),
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);

/** Live to-watch count, used by the sidebar badge. */
export function selectQueuedInboxCount(state: InboxState): number {
  return state.items.filter((item) => item.status === "queued").length;
}
