import Link from "next/link";
import { STATUS, STATUS_COUNTS, LAST_REVIEWED } from "@/content/status";
import StatusBadge from "@/components/primitives/StatusBadge";
import Eyebrow from "@/components/primitives/Eyebrow";

export default function ProgressStrip() {
  const builtItems = STATUS.filter((entry) => entry.state === "built-and-tested");
  return (
    <section className="build-section">
      <div className="site-container grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-20">
        <div>
          <Eyebrow>From the workbench</Eyebrow>
          <h2 className="font-display font-medium text-section mt-5">Working code.<br />An open roadmap.</h2>
          <p className="text-body text-[var(--ink-mute)] mt-5 max-w-[440px]">Audio and image fingerprinting, isolated catalogues, and signed attestations are built and tested. Here’s where the rest stands.</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-6 mt-8">
            {STATUS_COUNTS.map(({ state, count }) => <div key={state}>
              <p className="font-mono text-3xl mb-2">{String(count).padStart(2, "0")}</p>
              <StatusBadge state={state} />
            </div>)}
          </div>
          <Link href="/progress" className="ui-button border border-[var(--ink)] mt-8">Explore the build board <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="build-log">
          <div className="flex flex-wrap justify-between gap-3 border-b border-[var(--rule)] pb-4 text-label font-mono text-[var(--ink-mute)]"><span>BUILT & TESTED / {builtItems.length} CAPABILITIES</span><time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time></div>
          <ul>
            {builtItems.map((entry) => <li key={entry.item} className="py-5 border-b border-[var(--rule)] last:border-0">
              <div className="flex gap-4">
                <span aria-hidden="true" className="text-[var(--accent-teal)]">✓</span>
                <div><p className="text-label uppercase tracking-label font-semibold text-[var(--ink-mute)] mb-1">{entry.area}</p><p className="text-small">{entry.item}</p>{entry.note && <p className="text-small mt-2 text-[var(--ink-mute)]">{entry.note}</p>}</div>
              </div>
            </li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
