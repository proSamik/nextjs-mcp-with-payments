import { HeroSection } from "@/components/hero-section";
import { InteractiveDemoSection } from "@/components/landing/interactive-demo-section";
import { DemoVideoSection } from "@/components/landing/demo-video-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { CTASection } from "@/components/landing/cta-section";
import { FAQSection } from "@/components/landing/faq-section";
import { FooterSection } from "@/components/landing/footer-section";
import { FloatingNavDemo } from "@/components/landing/floating-nav-demo";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { ComparisonSection } from "@/components/landing/comparison-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GrabLink | Your Instant File Sharing Solution",
  description:
    "GrabLink is a simple and fast way to share files with anyone. Just grab a link and share it.",
};

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: "https://grablink.xyz",
    name: "GrabLink",
    description:
      "GrabLink is a simple and fast way to share files with anyone. Just grab a link and share it.",
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FloatingNavDemo />
      <HeroSection />
      <HowItWorksSection />
      <InteractiveDemoSection />
      <FeaturesSection />
      <DemoVideoSection />
      <ComparisonSection />
      <PricingSection />
      <CTASection />
      <FAQSection />
      <FooterSection />
    </div>
  );
}
