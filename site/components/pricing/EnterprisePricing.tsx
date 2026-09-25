import Eyebrow from "@/components/primitives/Eyebrow";
import { CONTACT_EMAIL, primaryCta } from "@/lib/links";

const USE_CASES = [
  {
    eyebrow: "Major Label · Studio",
    headline: "Derivative detection at catalogue scale",
    body: "Detect unauthorized derivatives, interpolations, and AI reproductions across a catalogue. Deterministic Morlet scattering fingerprints: no model, no retraining, no false-positive amnesty.",
    how: "Fingerprint the catalogue at ingest (passive), embed new releases at creation (active, goal), one signed ledger.",
    spec: "write-once JSON audit trail · AGPL-3.0 + Commercial · on-prem, no egress",
  },
  {
    eyebrow: "Generative music platforms",
    headline: "IP verification before distribution",
    body: "Every generation gets a fingerprint at creation time. Match probability is computed against the rights-holder catalogue before the track ships. The JSON-RPC audit trail writes the compliance documentation automatically.",
    how: "Sign outputs at generation; downstream verification never depends on you being online.",
    spec: "per-generation attestation (built) · IPFS pin hash (goal) · licensable origin certificate (goal)",
  },
  {
    eyebrow: "IP Litigation · Forensics",
    headline: "Expert-witness-grade match probability",
    body: "The Sliced-Wasserstein distance between two fingerprints is a number a judge can examine. Every comparison is a write-once JSON line. No opaque model, no black-box score: a mathematically interpretable result.",
    how: "A linear parity check and an Ed25519 signature: public procedures, bit-exactly reproducible.",
    spec: "full audit replay · on-prem · zero data egress",
  },
] as const;

export default function EnterprisePricing() {
  return (
    <section id="pricing" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="mb-10 flex flex-col gap-3">
          <Eyebrow>Who it is for</Eyebrow>
          <h2
            className="font-serif font-light"
            style={{ fontSize: "clamp(26px,3.2vw,48px)", color: "var(--ink)" }}
          >
            Built for organizations where provenance is a legal question.
          </h2>
          <p className="text-[17px] leading-[1.6] max-w-[600px]" style={{ color: "var(--ink-mute)" }}>
            One fingerprint plane, three high-stakes domains. Items marked (goal) are design
            goals, not yet in production. Pricing is contract-based; talk to us.
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px"
          style={{ border: "1px solid var(--rule)" }}
        >
          {USE_CASES.map((uc) => (
            <div
              key={uc.eyebrow}
              className="flex flex-col gap-4 p-8"
              style={{ borderRight: "1px solid var(--rule)", backgroundColor: "var(--bg)" }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.16em]"
                style={{ color: "var(--ink-mute)" }}
              >
                {uc.eyebrow}
              </p>
              <h3
                className="font-serif font-light text-[20px] leading-snug"
                style={{ color: "var(--ink)" }}
              >
                {uc.headline}
              </h3>
              <p className="text-[15px] leading-[1.65]" style={{ color: "var(--ink-mute)" }}>
                {uc.body}
              </p>
              <p
                className="text-[13px] leading-[1.6] pt-3"
                style={{ borderTop: "1px solid var(--rule)", color: "var(--ink)" }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] mr-2" style={{ color: "var(--ink-mute)" }}>How:</span>
                {uc.how}
              </p>
              <p
                className="font-mono text-[11px] leading-[1.7] mt-auto pt-3"
                style={{ borderTop: "1px solid var(--rule)", color: "var(--ink-mute)" }}
              >
                {uc.spec}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border"
              style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}
            >
              Custom Pricing
            </span>
            <span className="font-mono text-[12px]" style={{ color: "var(--ink-mute)" }}>
              Contract-based · SLA committed
            </span>
          </div>
          <a
            href={primaryCta.href}
            className="font-mono text-[13px] uppercase tracking-[0.12em] px-6 py-3 border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--signal-warm)", backgroundColor: "var(--signal-warm)", color: "var(--bg)" }}
          >
            {primaryCta.label}
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-mono text-[13px] uppercase tracking-[0.12em] px-6 py-3 border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
          >
            Talk to founders
          </a>
        </div>
      </div>
    </section>
  );
}
