/**
 * Shared body scroll lock for portalled overlays (sheet, dialog, alert dialog).
 * Reference-counted so closing a confirm dialog doesn't unlock scrolling
 * behind a sheet that is still open.
 */
let locks = 0;
let previousOverflow = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (locks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined" || locks === 0) return;
  locks -= 1;
  if (locks === 0) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = "";
  }
}
