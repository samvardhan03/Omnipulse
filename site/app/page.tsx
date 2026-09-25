import Navbar from "@/components/Navbar";
import HeroSection from "@/components/hero/HeroSection";
import ProblemTicker from "@/components/ProblemTicker";
import HowItIsUsed from "@/components/HowItIsUsed";
import ProgressStrip from "@/components/ProgressStrip";
import EnterprisePricing from "@/components/pricing/EnterprisePricing";
import FoundersCreatorsBios from "@/components/bios/FoundersCreatorsBios";
import ContactSection from "@/components/ContactSection";
import SiteFooter from "@/components/footer/SiteFooter";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
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
