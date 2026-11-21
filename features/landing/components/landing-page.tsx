import { SiteHeader } from "@/features/shell";
import { HeroSection } from "@/features/landing/components/hero";
import { FeaturesSection } from "@/features/landing/components/features";
import { LearningToolkitSection } from "@/features/landing/components/learning-toolkit";
import { SpotlightSection } from "@/features/landing/components/spotlight";
import { HowItWorksSection } from "@/features/landing/components/how-it-works";
import { FaqSection } from "@/features/landing/components/faq";
import { CtaSection } from "@/features/landing/components/cta";
import { ScrollProgress } from "@/features/landing/components/scroll-progress";
import { LandingBackground } from "@/features/landing/components/landing-background";
import { Marquee } from "@/features/landing/components/marquee";
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
			alternateName: [...SITE.alternateNames],
			url: SITE.url,
			description: SITE.description,
			sameAs: [...SITE.sameAs],
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
			alternateName: [...SITE.alternateNames],
			url: SITE.url,
			description: SITE.description,
			inLanguage: SITE.lang,
			publisher: { "@id": `${SITE_URL}/#organization` },
		},
		{
			"@type": "SoftwareApplication",
			name: SITE.name,
			alternateName: [SITE.name, ...SITE.alternateNames],
			url: SITE.url,
			description: SITE.description,
			inLanguage: SITE.lang,
			applicationCategory: "MultimediaApplication",
			operatingSystem: "Any",
			browserRequirements: "Requires JavaScript and a modern browser",
			sameAs: [...SITE.sameAs],
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
			featureList: [
				"Turn a YouTube video's timestamps into chapter lessons",
				"Import a full YouTube playlist as a classroom",
				"Distraction-free player with no recommendations, Shorts or comments",
				"Timestamped Markdown notes, lesson bookmarks and attached resources",
				"PDFs, reference links, code snippets and downloads attached per course or lesson",
				"Learning inbox for saving YouTube links with tags and notes",
				"Local analytics, study goals, streaks and daily reminders",
				"Completion certificates and a built-in coding workspace",
				"Per-lesson progress, resume points and completion tracking",
				"Everything stored locally in the browser — no account, no tracking",
			],
			publisher: { "@id": `${SITE_URL}/#organization` },
		},
	],
};

/** The marketing landing page — composes the landing sections. */
export function LandingPage() {
	return (
		<div className="relative min-h-screen">
			<JsonLd data={STRUCTURED_DATA} />
			<LandingBackground />
			<ScrollProgress />
			<div className="relative z-10">
				<SiteHeader />
				<main>
					<HeroSection />
					<Marquee />
					<FeaturesSection />
					<LearningToolkitSection />
					<SpotlightSection />
					<HowItWorksSection />
					<FaqSection />
					<CtaSection />
				</main>
			</div>
		</div>
	);
}
