"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js (the installability + offline-caching worker) in
 * production only — dev servers and tests must never install one, or stale
 * caches will shadow fresh code during `next dev`.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* private mode / unsupported — the app works fine without a SW */
      });
    };

    // Wait for load so the worker never competes with first paint/hydration.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
