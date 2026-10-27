import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesSection } from "@/components/landing/features";
import { SpotlightSection } from "@/components/landing/spotlight";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { FaqSection } from "@/components/landing/faq";
import { CtaSection } from "@/components/landing/cta";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
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