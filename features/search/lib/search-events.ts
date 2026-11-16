/**
 * Global search is mounted once in the app shell, so any surface (the sidebar,
 * future shortcuts) opens it by dispatching this window event instead of
 * importing the dialog's state.
 */
export const OPEN_GLOBAL_SEARCH_EVENT = "focusy:open-global-search";

export function openGlobalSearch(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_GLOBAL_SEARCH_EVENT));
}
