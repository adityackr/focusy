import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesSection } from "@/components/landing/features";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { CtaSection } from "@/components/landing/cta";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
    </div>
  );
}
