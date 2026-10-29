import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/lib/site";

/**
 * Only indexable routes belong here — `/library`, `/recent`, `/favorites`,
 * `/watch/*` and `/course/*` are `noindex` (see `app/robots.ts`).
 */

const ROUTES: Array<{
	path: string;
	changeFrequency: "weekly" | "monthly" | "yearly";
	priority: number;
}> = [
	{ path: "/", changeFrequency: "weekly", priority: 1 },
	{ path: "/add", changeFrequency: "monthly", priority: 0.8 },
	{ path: "/settings", changeFrequency: "yearly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
	const lastModified = new Date();

	return ROUTES.map(({ path, changeFrequency, priority }) => ({
		url: `${SITE_URL}${path}`,
		lastModified,
		changeFrequency,
		priority,
	}));
}
