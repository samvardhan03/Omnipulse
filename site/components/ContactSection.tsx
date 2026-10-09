import Eyebrow from "@/components/primitives/Eyebrow";
import { CONTACT_EMAIL, GITHUB_URL, getStartedCta } from "@/lib/links";

export default function ContactSection() {
  return (
    <section id="contact" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="site-container">
        <div className="contact-surface grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-8 flex flex-col gap-6">
            <Eyebrow>Pilot program</Eyebrow>
            <h2
              className="font-display font-medium text-section"
              style={{ color: "var(--ink)" }}
            >
              Run a pilot with us.
            </h2>
            <p className="text-body-lg max-w-[640px]" style={{ color: "var(--ink-mute)" }}>
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
                className="ui-button font-sans border"
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
                className="ui-button font-sans border"
                style={{ borderColor: "var(--signal-warm)", backgroundColor: "var(--signal-warm)", color: "var(--bg)" }}
              >
                {getStartedCta.label}
              </a>
            </div>
            <p className="font-sans text-small" style={{ color: "var(--ink-mute)" }}>
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
              className="surface-card p-card flex flex-col gap-4"
              style={{ borderColor: "var(--rule)" }}
            >
              <p
                className="font-sans text-label uppercase tracking-label"
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
                  <p className="text-body" style={{ color: "var(--ink-mute)" }}>
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
