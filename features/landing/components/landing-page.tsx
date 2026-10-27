import { SiteHeader } from "@/features/shell";
import { HeroSection } from "@/features/landing/components/hero";
import { FeaturesSection } from "@/features/landing/components/features";
import { SpotlightSection } from "@/features/landing/components/spotlight";
import { HowItWorksSection } from "@/features/landing/components/how-it-works";
import { FaqSection } from "@/features/landing/components/faq";
import { CtaSection } from "@/features/landing/components/cta";
import { ScrollProgress } from "@/features/landing/components/scroll-progress";

/** The marketing landing page — composes the landing sections. */
export function LandingPage() {
  return (
    <div className="min-h-screen">
      <ScrollProgress />
      <SiteHeader />
      <HeroSection />
      <FeaturesSection />
      <SpotlightSection />
      <HowItWorksSection />
      <FaqSection />
      <CtaSection />
    </div>
  );
}