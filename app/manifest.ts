import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Colors match globals.css: the app defaults
// to dark (oklch(0.17 0.032 256) ≈ #06101d), light is oklch(0.984 0.007 243).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Focusy — distraction-free YouTube learning",
    short_name: "Focusy",
    description:
      "Turn any YouTube video or playlist into a focused, course-style classroom — no recommendations, no shorts, no rabbit holes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#06101d",
    theme_color: "#06101d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
