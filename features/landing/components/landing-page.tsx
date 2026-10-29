import { SiteHeader } from "@/features/shell";
import { HeroSection } from "@/features/landing/components/hero";
import { FeaturesSection } from "@/features/landing/components/features";
import { SpotlightSection } from "@/features/landing/components/spotlight";
import { HowItWorksSection } from "@/features/landing/components/how-it-works";
import { FaqSection } from "@/features/landing/components/faq";
import { CtaSection } from "@/features/landing/components/cta";
import { ScrollProgress } from "@/features/landing/components/scroll-progress";
import { JsonLd } from "@/shared/components/json-ld";
import { SITE, SITE_URL } from "@/shared/lib/site";

/**
 * WebSite + Organization + SoftwareApplication structured data for the
 * homepage — the entity graph other schema on the page (FAQ, HowTo) points at.
 */
const STRUCTURED_DATA = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "Organization",
			"@id": `${SITE_URL}/#organization`,
			name: SITE.name,
			url: SITE.url,
			logo: {
				"@type": "ImageObject",
				url: `${SITE_URL}/icons/icon-512.png`,
				width: 512,
				height: 512,
			},
			founder: {
				"@type": "Person",
				name: SITE.author.name,
				url: SITE.author.url,
			},
		},
		{
			"@type": "WebSite",
			"@id": `${SITE_URL}/#website`,
			name: SITE.name,
			url: SITE.url,
			description: SITE.description,
			inLanguage: SITE.lang,
			publisher: { "@id": `${SITE_URL}/#organization` },
		},
		{
			"@type": "SoftwareApplication",
			name: SITE.name,
			alternateName: "Focusy",
			url: SITE.url,
			description: SITE.description,
			inLanguage: SITE.lang,
			applicationCategory: "MultimediaApplication",
			operatingSystem: "Any",
			browserRequirements: "Requires JavaScript and a modern browser",
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
			featureList: [
				"Turn a YouTube video's timestamps into chapter lessons",
				"Import a full YouTube playlist as a classroom",
				"Distraction-free player with no recommendations, Shorts or comments",
				"Per-lesson progress, resume points and completion tracking",
				"Favorites, recents and drag-to-reorder library",
				"Everything stored locally in the browser — no account, no tracking",
			],
			publisher: { "@id": `${SITE_URL}/#organization` },
		},
	],
};

/** The marketing landing page — composes the landing sections. */
export function LandingPage() {
	return (
		<div className="min-h-screen">
			<JsonLd data={STRUCTURED_DATA} />
			<ScrollProgress />
			<SiteHeader />
			<main>
				<HeroSection />
				<FeaturesSection />
				<SpotlightSection />
				<HowItWorksSection />
				<FaqSection />
				<CtaSection />
			</main>
		</div>
	);
}
