import { LandingPage } from "@/features/landing";
import type { Metadata } from "next";
import { SITE } from "@/shared/lib/site";

export const metadata: Metadata = {
	alternates: { canonical: "/" },
	openGraph: {
		type: "website",
		locale: SITE.locale,
		siteName: SITE.name,
		url: "/",
		// title/description are inherited from this page's resolved metadata.
	},
};

export default LandingPage;
