import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/footer/SiteFooter";
import TwoLayerMergerSection from "@/components/TwoLayerMergerSection";
import TwoLayerSynthIdGrid from "@/components/TwoLayerSynthIdGrid";
import OmniLockEmbedSimulator from "@/components/OmniLockEmbedSimulator";
import InteractiveSimulator from "@/components/simulator/InteractiveSimulator";
import ModularCommercializationGrid from "@/components/grid/ModularCommercializationGrid";
import Eyebrow from "@/components/primitives/Eyebrow";
import Link from "next/link";

export const metadata = {
  title: "How it works",
  description:
    "Two-engine architecture, scattering fingerprints, OmniLock watermark, verdicts, and signed attestations. Full technical walkthrough.",
  alternates: { canonical: "./" },
};

function VerdictsSection() {
  const verdicts = [
    {
      label: "Exact",
      description:
        "The fingerprints match within the exact-match threshold. The query file is a bit-identical or perceptually identical copy of the registered original.",
    },
    {
      label: "Perceptual",
      description:
        "The Sliced-Wasserstein distance falls between the exact and perceptual thresholds. The content is likely a derivative, pitch-shifted copy, or re-encode.",
    },
    {
      label: "Miss",
      description:
        "The distance exceeds the perceptual threshold. No match found in the catalogue for this query.",
    },
  ];

  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="mb-8 flex flex-col gap-3">
          <Eyebrow>Verdicts</Eyebrow>
          <h2
            className="font-serif font-light"
            style={{ fontSize: "clamp(28px,3.6vw,52px)", color: "var(--ink)" }}
          >
            Three outcomes. One unambiguous number.
          </h2>
          <p className="text-[17px] leading-[1.6] max-w-[640px]" style={{ color: "var(--ink-mute)" }}>
            Every comparison returns one of three verdicts. The thresholds below are
            provisional: they will be recalibrated on real-world data before the platform
            exits private beta.
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px"
          style={{ border: "1px solid var(--rule)" }}
        >
          {verdicts.map((v) => (
            <div
              key={v.label}
              className="p-8 flex flex-col gap-4"
              style={{ borderRight: "1px solid var(--rule)", backgroundColor: "var(--bg)" }}
            >
              <h3
                className="font-serif font-light text-[22px]"
                style={{ color: "var(--ink)" }}
              >
                {v.label}
              </h3>
              <p className="text-[15px] leading-[1.65]" style={{ color: "var(--ink-mute)" }}>
                {v.description}
              </p>
            </div>
          ))}
        </div>

        <p
          className="mt-6 font-mono text-[12px] leading-[1.6]"
          style={{ color: "var(--ink-mute)" }}
        >
          Threshold note: Exact and Perceptual thresholds are set conservatively and have not
          been calibrated against a production corpus. Treat all Perceptual verdicts as
          candidates for human review until calibration data is published.
        </p>
      </div>
    </section>
  );
}

function AttestationsSection() {
  const fields = [
    { label: "asset_id", description: "The SHA3-256 hash of the fingerprint vector at registration time." },
    { label: "owner_key", description: "The Ed25519 public key of the registering organization." },
    { label: "timestamp", description: "Unix timestamp of registration, included in the signed payload." },
  ];

  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="mb-8 flex flex-col gap-3">
          <Eyebrow>Signed attestations</Eyebrow>
          <h2
            className="font-serif font-light"
            style={{ fontSize: "clamp(28px,3.6vw,52px)", color: "var(--ink)" }}
          >
            Ed25519. Three public fields. No account required.
          </h2>
          <p className="text-[17px] leading-[1.6] max-w-[640px]" style={{ color: "var(--ink-mute)" }}>
            Every match verdict is accompanied by a signed attestation. The signature is
            verifiable by anyone who holds the three public fields below, with no call back
            to OmniPulse and no account. The signing key is the organization&apos;s own key,
            not ours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {fields.map((f) => (
            <div
              key={f.label}
              className="border p-6 flex flex-col gap-3"
              style={{ borderColor: "var(--rule)" }}
            >
              <code
                className="font-mono text-[14px]"
                style={{ color: "var(--ink)" }}
              >
                {f.label}
              </code>
              <p className="text-[14px] leading-[1.6]" style={{ color: "var(--ink-mute)" }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/tiers/enterprise"
            className="font-mono text-[12px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
            style={{ color: "var(--ink-mute)" }}
          >
            Enterprise tier
          </Link>
          <Link
            href="/tiers/phase-1-dsp"
            className="font-mono text-[12px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
            style={{ color: "var(--ink-mute)" }}
          >
            Phase I: DSP
          </Link>
          <Link
            href="/tiers/phase-2-vector"
            className="font-mono text-[12px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
            style={{ color: "var(--ink-mute)" }}
          >
            Phase II: Vector
          </Link>
          <Link
            href="/tiers/phase-3-agent"
            className="font-mono text-[12px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
            style={{ color: "var(--ink-mute)" }}
          >
            Phase III: Agent
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-[64px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-16 pb-8">
          <Eyebrow>Technical walkthrough</Eyebrow>
          <h1
            className="font-serif font-light mt-4 leading-[1.04] tracking-[-0.02em]"
            style={{ fontSize: "clamp(36px,4.8vw,72px)", color: "var(--ink)" }}
          >
            How OmniPulse works.
          </h1>
          <p
            className="mt-4 text-[18px] leading-[1.6] max-w-[640px]"
            style={{ color: "var(--ink-mute)" }}
          >
            Two engines, one registry, one signed token. This page walks through
            the full pipeline: from the passive scattering fingerprint to the active
            OmniLock watermark, through verdicts and signed attestations, to the four
            deployment tiers.
          </p>
        </div>

        {/*
          Section order rationale:
          1. TwoLayerMergerSection: establishes the two-engine architecture and shows
             both the DCT explorer (active/OmniLock) and the attack toggle (passive).
             Starting here gives the reader the conceptual frame before we go deeper.
          2. TwoLayerSynthIdGrid: the honest comparison with SynthID. Placed here so the
             reader knows where OmniPulse fits in the landscape before seeing the demos.
          3. OmniLockEmbedSimulator: deep dive into the active embedding pipeline
             (ingest, DCT, LDPC encode, embed, token mint). Placed after the architecture
             overview so the mechanics are grounded.
          4. InteractiveSimulator: the full end-to-end passive pipeline with configurable
             J/Q parameters. Placed last among the "engine" sections because it requires
             the most context to read meaningfully.
          5. VerdictsSection: explains the three outcome labels produced by the pipeline.
             Comes after the simulator so readers have seen a run before encountering
             the verdict vocabulary.
          6. AttestationsSection: the Ed25519 attestation format. Comes last in the
             technical depth sections because it is the output of a completed run.
          7. ModularCommercializationGrid: the four deployment tiers and links to deep
             dives. Placed at the end as a natural "what next" after understanding the
             technology.
        */}

        <TwoLayerMergerSection />
        <TwoLayerSynthIdGrid />
        <OmniLockEmbedSimulator />
        <InteractiveSimulator />
        <VerdictsSection />
        <AttestationsSection />
        <ModularCommercializationGrid />
      </main>
      <SiteFooter />
    </>
  );
}
