/*
 * Focusy service worker — makes the app installable and survives flaky or
 * absent connectivity for the app shell. Written by hand on purpose: no
 * build-plugin coupling, and the caching rules stay auditable.
 *
 * What works offline: previously visited pages, the JS/CSS bundles (hashed,
 * immutable) and cached thumbnails — so the library UI opens from localStorage.
 * What never works offline: playback and imports. That's YouTube, not us.
 *
 * Rules:
 * - Only GET, only same-origin (plus the two YouTube thumbnail hosts).
 * - /_next/static/* is content-hashed → cache-first, never revalidated.
 * - Navigations → network-first, falling back to cache, then to the cached
 *   "/" shell so a cold offline launch still renders the app.
 * - Thumbnails (/next/image proxy + i.ytimg.com) → stale-while-revalidate,
 *   capped so the cache can't grow forever.
 * - Everything else (YouTube Data API, iframe_api, analytics) is passed
 *   through untouched — API responses must never be cached.
 */

const VERSION = "focusy-v1";
const STATIC_CACHE = VERSION + "-static";
const PAGE_CACHE = VERSION + "-pages";
const IMAGE_CACHE = VERSION + "-images";
const CACHES = [STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE];

const MAX_PAGES = 24;
const MAX_IMAGES = 80;

const IMAGE_HOSTS = ["i.ytimg.com", "img.youtube.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      // Best-effort offline shell: cache the landing page (the whole app is
      // client-rendered, so it hydrates from localStorage once loaded).
      try {
        await cache.add(new Request("/", { cache: "reload" }));
      } catch {
        /* offline at install time — navigations will still prefer network */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("focusy-") && !CACHES.includes(n))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isImage =
    (sameOrigin && url.pathname.startsWith("/_next/image")) ||
    (url.hostname === "i.ytimg.com" || url.hostname === "img.youtube.com");

  if (!sameOrigin && !isImage) return; // API, iframe_api, analytics → passthrough

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (sameOrigin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (isImage) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGES));
  }
  // Anything else: let the browser handle it normally.
});

async function handleNavigation(request) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, fresh.clone());
      await trimCache(cache, MAX_PAGES);
    }
    return fresh;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Cold offline launch: serve the app shell and let the router take over.
    const shell = (await caches.match("/")) || Response.error();
    return shell;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, fresh.clone());
  }
  return fresh;
}

async function staleWhileRevalidate(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(async (fresh) => {
      if (fresh.ok) {
        await cache.put(request, fresh.clone());
        await trimCache(cache, max);
      }
      return fresh;
    })
    .catch(() => undefined);
  if (cached) return cached;
  const fresh = await refresh;
  return fresh || Response.error();
}

async function trimCache(cache, max) {
  const keys = await cache.keys();
  if (keys.length <= max) return;
  // cache.keys() is insertion-oldest-first, so drop from the front.
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}
