import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/lib/site";

/**
 * Routes whose entire content lives in the visitor's localStorage — a crawler
 * would only ever see an empty shell, so they are kept out of the index here
 * *and* marked `noindex` in their page metadata (belt and braces).
 */
const APP_ONLY_ROUTES = [
	"/library",
	"/recent",
	"/favorites",
	"/watch",
	"/course",
];

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: APP_ONLY_ROUTES,
			},
		],
		sitemap: `${SITE_URL}/sitemap.xml`,
		host: SITE_URL,
	};
}
