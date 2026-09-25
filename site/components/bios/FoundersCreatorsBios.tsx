import Eyebrow from "@/components/primitives/Eyebrow";
import { FOUNDERS } from "./founders.data";

export default function FoundersCreatorsBios() {
  return (
    <section id="team" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="mb-8 flex flex-col gap-3">
          <Eyebrow>Founders &amp; creators</Eyebrow>
          <h2
            className="font-serif font-light"
            style={{ fontSize: "clamp(28px,3.6vw,52px)", color: "var(--ink)" }}
          >
            The people behind the platform
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FOUNDERS.map((f) => (
            <div
              key={f.name}
              className="border flex flex-col gap-5 p-8"
              style={{ borderColor: "var(--rule)" }}
            >
              <div className="flex flex-col gap-1">
                <p
                  className="font-mono text-[11px] uppercase tracking-[0.18em]"
                  style={{ color: "var(--accent)" }}
                >
                  {f.eyebrow}
                </p>
                <h3
                  className="font-serif font-light text-[28px] leading-tight"
                  style={{ color: "var(--ink)" }}
                >
                  {f.name}
                </h3>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[14px] leading-[1.6]" style={{ color: "var(--ink)" }}>
                  {f.role}
                </p>
                <p className="text-[14px] leading-[1.6]" style={{ color: "var(--ink-mute)" }}>
                  {f.focus}
                </p>
                <p className="text-[14px] leading-[1.6]" style={{ color: "var(--ink-mute)" }}>
                  {f.maintainsLinks.length > 0 ? (
                    <>
                      Maintains{" "}
                      {f.maintainsLinks.map((m, i) => (
                        <span key={m.label}>
                          <a
                            href={m.href}
                            className="transition-opacity hover:opacity-70"
                            style={{ color: "var(--ink)" }}
                          >
                            <code className="font-mono text-[13px]">{m.label}</code>
                          </a>
                          {i < f.maintainsLinks.length - 1 ? ", " : "."}
                        </span>
                      ))}
                    </>
                  ) : (
                    f.maintains
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-1 pt-2">
                {f.portfolio && (
                  <a
                    href={f.portfolio}
                    className="font-mono text-[12px] transition-opacity hover:opacity-60"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    {f.portfolio.replace("https://", "")}
                  </a>
                )}
                {f.linkedin && (
                  <a
                    href={f.linkedin}
                    className="font-mono text-[12px] transition-opacity hover:opacity-60"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    {f.linkedin.replace("https://", "")}
                  </a>
                )}
                {f.github && (
                  <a
                    href={f.github}
                    className="font-mono text-[12px] transition-opacity hover:opacity-60"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    {f.github.replace("https://", "")}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <aside
          className="mt-4 border-t pt-6 font-mono text-[13px]"
          style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}
        >
          Co-authored:{" "}
          <strong style={{ color: "var(--ink)" }}>
            Phase 3: The Agentic Control Plane
          </strong>{" "}
          is jointly maintained by <em>Samvardhan</em> and <em>Yash</em> across{" "}
          <code>omnipulse-agent</code> (Python) and the{" "}
          <code>omnipulse-mcp</code> server in <code>omnipulse-rs</code>.
        </aside>
      </div>
    </section>
  );
}
