/**
 * Site-wide SEO constants — the single source of truth for metadata,
 * robots, the sitemap, OpenGraph images and JSON-LD structured data.
 */

/**
 * Production origin. Override with `NEXT_PUBLIC_SITE_URL` when the app is
 * served from a custom domain (see `.env.example`).
 */
export const SITE_URL = (
	process.env.NEXT_PUBLIC_SITE_URL ?? "https://focusy-rosy.vercel.app"
).replace(/\/+$/, "");

export const SITE = {
	/** Used for the `<title>` template: "%s · Focusy". */
	name: "Focusy",
	/** Full default document title (root `title.default`). */
	title: "Focusy — distraction-free YouTube learning",
	/** Short strapline used in headers, cards and the OG image. */
	tagline: "distraction-free YouTube learning",
	description:
		"Turn any YouTube video or playlist into a focused, course-style classroom — no recommendations, no shorts, no rabbit holes.",
	url: SITE_URL,
	locale: "en_US",
	lang: "en",
	author: {
		name: "Aditya Chakraborty",
		url: "https://adityackr.vercel.app",
	},
} as const;

/** Search phrases the marketing pages are written and tagged for. */
export const KEYWORDS = [
	"distraction free YouTube player",
	"YouTube playlist as a course",
	"watch YouTube without recommendations",
	"turn YouTube video into lessons",
	"YouTube chapter player",
	"YouTube playlist progress tracker",
	"focus mode for YouTube",
	"course style YouTube classroom",
	"learn from YouTube playlists",
	"watch tutorials start to finish",
] as const;

/** Absolute URL for a path on the production origin. */
export function absoluteUrl(path = "/"): string {
	return new URL(path, `${SITE_URL}/`).toString();
}
