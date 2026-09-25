import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/hero/HeroSection";
import ProblemTicker from "@/components/ProblemTicker";
import HowItIsUsed from "@/components/HowItIsUsed";
import ProgressStrip from "@/components/ProgressStrip";
import EnterprisePricing from "@/components/pricing/EnterprisePricing";
import FoundersCreatorsBios from "@/components/bios/FoundersCreatorsBios";
import ContactSection from "@/components/ContactSection";
import SiteFooter from "@/components/footer/SiteFooter";

export const metadata: Metadata = {
  title: { absolute: "OmniPulse" },
  description:
    "Wavelet-scattering fingerprint for audio and images. Register media, find copies, prove ownership. Ed25519-signed attestations. Private beta.",
  alternates: { canonical: "./" },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <ProblemTicker />
        <HowItIsUsed />
        <ProgressStrip />
        <EnterprisePricing />
        <FoundersCreatorsBios />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}
