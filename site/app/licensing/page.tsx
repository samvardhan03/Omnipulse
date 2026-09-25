import Navbar from "@/components/Navbar";
import DualLicensingProtocolSection from "@/components/licensing/DualLicensingProtocolSection";
import HairlineRule from "@/components/primitives/HairlineRule";
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
      <main id="main-content" className="mx-auto max-w-[1280px] px-6 pt-28 pb-24">
        <p
          className="font-mono text-[11px] uppercase tracking-[0.18em]"
          style={{ color: "var(--ink-mute)" }}
        >
          Licensing
        </p>
        <h1
          className="font-serif font-light mt-3"
          style={{ fontSize: "clamp(32px,4vw,64px)", color: "var(--ink)" }}
        >
          Dual-licensing protocol
        </h1>
        <HairlineRule className="my-12" />
        <DualLicensingProtocolSection />
      </main>
      <SiteFooter />
    </>
  );
}
