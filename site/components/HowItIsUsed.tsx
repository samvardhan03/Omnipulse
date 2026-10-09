import Link from "next/link";
import Eyebrow from "@/components/primitives/Eyebrow";
import FeatureIcon from "@/components/primitives/FeatureIcon";

const STEPS = [
  {
    label: "Register",
    icon: "register",
    body: "Submit your media and a fingerprint is computed on CPU, written to your catalogue with an Ed25519-signed attestation that anyone can verify.",
  },
  {
    label: "Detect",
    icon: "detect",
    body: "A query file is fingerprinted and matched against your catalogue; the engine returns a verdict of Exact, Perceptual, or Miss.",
  },
  {
    label: "Prove",
    icon: "prove",
    body: "The signed attestation record carries three public fields and is verifiable by anyone, with no account and no network call to the original issuer.",
  },
] as const;

export default function HowItIsUsed() {
  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="site-container">
        <div className="mb-8 flex flex-col gap-3">
          <Eyebrow>How it is used</Eyebrow>
          <h2
            className="font-display font-medium text-section"
            style={{ color: "var(--ink)" }}
          >
            Three steps. One signed record.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.label} className="workflow-step flex flex-col gap-5 py-6 md:pr-6">
              <FeatureIcon kind={step.icon} />
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-label w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--bg)", color: "var(--ink-mute)" }}
                >
                  {i + 1}
                </span>
                <p
                  className="font-display text-card-title font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  {step.label}
                </p>
              </div>
              <p className="text-body" style={{ color: "var(--ink-mute)" }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/how-it-works"
          className="font-sans text-label uppercase tracking-label transition-opacity hover:opacity-60"
          style={{ color: "var(--ink-mute)" }}
        >
          Try the interactive walkthrough ↗
        </Link>
      </div>
    </section>
  );
}
