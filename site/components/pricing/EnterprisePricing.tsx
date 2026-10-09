import Eyebrow from "@/components/primitives/Eyebrow";
import FeatureIcon from "@/components/primitives/FeatureIcon";
import { CONTACT_EMAIL, primaryCta } from "@/lib/links";

const USE_CASES = [
  {
    eyebrow: "Major Label · Studio",
    icon: "catalogue",
    headline: "Derivative detection at catalogue scale",
    body: "Detect unauthorized derivatives, interpolations, and AI reproductions across a catalogue. Deterministic Morlet scattering fingerprints: no model, no retraining, no false-positive amnesty.",
    how: "Fingerprint the catalogue at ingest (passive), embed new releases at creation (active, goal), one signed ledger.",
    spec: "write-once JSON audit trail · AGPL-3.0 + Commercial · on-prem, no egress",
  },
  {
    eyebrow: "Generative music platforms",
    icon: "generation",
    headline: "IP verification before distribution",
    body: "Every generation gets a fingerprint at creation time. Match probability is computed against the rights-holder catalogue before the track ships. The JSON-RPC audit trail writes the compliance documentation automatically.",
    how: "Sign outputs at generation; downstream verification never depends on you being online.",
    spec: "per-generation attestation (built) · IPFS pin hash (goal) · licensable origin certificate (goal)",
  },
  {
    eyebrow: "IP Litigation · Forensics",
    icon: "legal",
    headline: "Expert-witness-grade match probability",
    body: "The Sliced-Wasserstein distance between two fingerprints is a number a judge can examine. Every comparison is a write-once JSON line. No opaque model, no black-box score: a mathematically interpretable result.",
    how: "A linear parity check and an Ed25519 signature: public procedures, bit-exactly reproducible.",
    spec: "full audit replay · on-prem · zero data egress",
  },
] as const;

export default function EnterprisePricing() {
  return (
    <section id="pricing" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="site-container">
        <div className="mb-10 flex flex-col gap-3">
          <Eyebrow>Who it is for</Eyebrow>
          <h2
            className="font-display font-medium text-section"
            style={{ color: "var(--ink)" }}
          >
            Built for organizations where provenance is a legal question.
          </h2>
          <p className="text-body max-w-[600px]" style={{ color: "var(--ink-mute)" }}>
            One fingerprint plane, three high-stakes domains. Items marked (goal) are design
            goals, not yet in production. Pricing is contract-based; talk to us.
          </p>
        </div>

        <div
          className="flex flex-col"
        >
          {USE_CASES.map((uc) => (
            <div
              key={uc.eyebrow}
              className="use-case-row grid grid-cols-1 lg:grid-cols-[64px_1fr_1fr] gap-5 lg:gap-x-8 py-8"
            >
              <FeatureIcon kind={uc.icon} />
              <div className="flex flex-col gap-3">
              <p
                className="font-sans text-label uppercase tracking-label"
                style={{ color: "var(--ink-mute)" }}
              >
                {uc.eyebrow}
              </p>
              <h3
                className="font-display font-medium text-card-title"
                style={{ color: "var(--ink)" }}
              >
                {uc.headline}
              </h3>
              </div>
              <div className="flex flex-col gap-4">
              <p className="text-body" style={{ color: "var(--ink-mute)" }}>
                {uc.body}
              </p>
              <p
                className="text-small pt-3"
                style={{ borderTop: "1px solid var(--rule)", color: "var(--ink)" }}
              >
                <span className="font-sans text-label uppercase tracking-label mr-2" style={{ color: "var(--ink-mute)" }}>How:</span>
                {uc.how}
              </p>
              <p
                className="font-sans text-small mt-auto pt-3"
                style={{ borderTop: "1px solid var(--rule)", color: "var(--ink-mute)" }}
              >
                {uc.spec}
              </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span
              className="font-sans text-label uppercase tracking-label px-3 py-1.5 border"
              style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}
            >
              Custom Pricing
            </span>
            <span className="font-sans text-small" style={{ color: "var(--ink-mute)" }}>
              Contract-based · SLA committed
            </span>
          </div>
          <a
            href={primaryCta.href}
            className="ui-button font-sans border"
            style={{ borderColor: "var(--signal-warm)", backgroundColor: "var(--signal-warm)", color: "var(--bg)" }}
          >
            {primaryCta.label}
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="ui-button font-sans border"
            style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
          >
            Talk to founders
          </a>
        </div>
      </div>
    </section>
  );
}
