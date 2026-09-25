import Eyebrow from "@/components/primitives/Eyebrow";
import { CONTACT_EMAIL, GITHUB_URL, getStartedCta } from "@/lib/links";

export default function ContactSection() {
  return (
    <section id="contact" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-8 flex flex-col gap-6">
            <Eyebrow>Pilot program</Eyebrow>
            <h2
              className="font-serif font-light"
              style={{ fontSize: "clamp(32px,4.4vw,72px)", color: "var(--ink)" }}
            >
              Run a pilot with us.
            </h2>
            <p className="text-[18px] leading-[1.65] max-w-[640px]" style={{ color: "var(--ink-mute)" }}>
              We are onboarding a small number of pilot partners for the merged
              platform: labels, generative platforms, and rights organizations.
              You bring a catalogue or an output stream; we bring the registry,
              the embedding, and the verification procedure. Honest engineering,
              no black boxes, and we will tell you what is measured versus what
              is still a goal.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-mono text-[14px] uppercase tracking-[0.12em] px-8 py-4 border transition-opacity hover:opacity-70"
                style={{
                  borderColor: "var(--ink)",
                  color: "var(--bg)",
                  backgroundColor: "var(--ink)",
                }}
              >
                Start the conversation
              </a>
              <a
                href={getStartedCta.href}
                className="font-mono text-[14px] uppercase tracking-[0.12em] px-8 py-4 border transition-opacity hover:opacity-70"
                style={{ borderColor: "var(--signal-warm)", backgroundColor: "var(--signal-warm)", color: "var(--bg)" }}
              >
                {getStartedCta.label}
              </a>
            </div>
            <p className="font-mono text-[12px]" style={{ color: "var(--ink-mute)" }}>
              Or reach us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="transition-opacity hover:opacity-60"
                style={{ color: "var(--ink)" }}
              >
                {CONTACT_EMAIL}
              </a>
              {" "}or browse the{" "}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-60"
                style={{ color: "var(--ink)" }}
              >
                source on GitHub
              </a>
              . Core is AGPL-3.0 + Commercial.
            </p>
          </div>

          <div className="col-span-12 md:col-span-4 flex flex-col justify-center gap-4">
            <div
              className="border p-6 flex flex-col gap-4"
              style={{ borderColor: "var(--rule)" }}
            >
              <p
                className="font-mono text-[11px] uppercase tracking-[0.16em]"
                style={{ color: "var(--ink-mute)" }}
              >
                What a pilot includes
              </p>
              {[
                "Registry setup and key provisioning",
                "Catalogue fingerprinting run",
                "Active embed test on a sample release",
                "Verification procedure walkthrough",
                "Honest report on what worked and what did not",
              ].map((item) => (
                <div key={item} className="flex gap-3 items-start">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0"
                    style={{ backgroundColor: "var(--signal-warm)" }}
                  />
                  <p className="text-[14px] leading-[1.55]" style={{ color: "var(--ink-mute)" }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
