import Navbar from "@/components/Navbar";
import DualLicensingProtocolSection from "@/components/licensing/DualLicensingProtocolSection";
import PageHeader from "@/components/primitives/PageHeader";
import SiteFooter from "@/components/footer/SiteFooter";

export const metadata = {
  title: "Licensing",
  description:
    "AGPL-3.0 plus Commercial: the OmniPulse dual-licensing model. Open source for research, commercial for production use.",
  alternates: { canonical: "./" },
};

export default function LicensingPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-16 pb-24">
        <PageHeader eyebrow="Licensing" title="Dual-licensing protocol" />
        <DualLicensingProtocolSection />
      </main>
      <SiteFooter />
    </>
  );
}
