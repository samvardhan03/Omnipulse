import Link from "next/link";
import Eyebrow from "@/components/primitives/Eyebrow";

const STEPS = [
  {
    label: "Register",
    body: "Submit your media and a fingerprint is computed on CPU, written to your catalogue with an Ed25519-signed attestation that anyone can verify.",
  },
  {
    label: "Detect",
    body: "A query file is fingerprinted and matched against your catalogue; the engine returns a verdict of Exact, Perceptual, or Miss.",
  },
  {
    label: "Prove",
    body: "The signed attestation record carries three public fields and is verifiable by anyone, with no account and no network call to the original issuer.",
  },
];

export default function HowItIsUsed() {
  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="mb-8 flex flex-col gap-3">
          <Eyebrow>How it is used</Eyebrow>
          <h2
            className="font-serif font-light"
            style={{ fontSize: "clamp(26px,3.2vw,48px)", color: "var(--ink)" }}
          >
            Three steps. One signed record.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-[11px] uppercase tracking-[0.16em] w-5 h-5 flex items-center justify-center border shrink-0"
                  style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}
                >
                  {i + 1}
                </span>
                <p
                  className="font-mono text-[11px] uppercase tracking-[0.16em]"
                  style={{ color: "var(--ink-mute)" }}
                >
                  {step.label}
                </p>
              </div>
              <p className="text-[15px] leading-[1.65]" style={{ color: "var(--ink-mute)" }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/how-it-works"
          className="font-mono text-[12px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
          style={{ color: "var(--ink-mute)" }}
        >
          Full technical walkthrough
        </Link>
      </div>
    </section>
  );
}
