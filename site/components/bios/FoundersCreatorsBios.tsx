import Eyebrow from "@/components/primitives/Eyebrow";
import ProfileLink from "@/components/primitives/ProfileLink";
import { FOUNDERS } from "./founders.data";

export default function FoundersCreatorsBios() {
  return (
    <section id="team" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="site-container">
        <div className="mb-8 flex flex-col gap-3">
          <Eyebrow>Founders &amp; creators</Eyebrow>
          <h2
            className="font-display font-medium text-section"
            style={{ color: "var(--ink)" }}
          >
            The people behind the platform
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FOUNDERS.map((f) => (
            <div
              key={f.name}
              className="team-profile flex flex-col gap-5 py-6"
              style={{ borderColor: "var(--rule)" }}
            >
              <div className="flex flex-col gap-1">
                <p
                  className="font-sans text-label uppercase tracking-label"
                  style={{ color: "var(--accent)" }}
                >
                  {f.eyebrow}
                </p>
                <h3
                  className="font-display font-medium text-card-title"
                  style={{ color: "var(--ink)" }}
                >
                  {f.name}
                </h3>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-body" style={{ color: "var(--ink)" }}>
                  {f.role}
                </p>
                <p className="text-body" style={{ color: "var(--ink-mute)" }}>
                  {f.focus}
                </p>
                <p className="text-body" style={{ color: "var(--ink-mute)" }}>
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
                            <code className="font-mono text-code">{m.label}</code>
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

              <div className="mt-auto flex items-center gap-3 pt-2">
                {f.portfolio && <ProfileLink kind="portfolio" href={f.portfolio} name={f.name} />}
                {f.linkedin && <ProfileLink kind="linkedin" href={f.linkedin} name={f.name} />}
                {f.github && <ProfileLink kind="github" href={f.github} name={f.name} />}
              </div>
            </div>
          ))}
        </div>

        <aside
          className="mt-4 border-t pt-6 font-sans text-small"
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
