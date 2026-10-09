import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/footer/SiteFooter";
import PageHeader from "@/components/primitives/PageHeader";
import StatusExplorer from "@/components/StatusExplorer";
import StatusBadge from "@/components/primitives/StatusBadge";
import { LAST_REVIEWED, STATE_ORDER } from "@/content/status";
import { CONTACT_EMAIL } from "@/lib/links";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Progress",
  description: "Current build status of the OmniPulse platform. Audio and image fingerprinting built. Product screens in development. Private beta.",
  alternates: { canonical: "./" },
};

export default function ProgressPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-16">
        <PageHeader eyebrow="Platform status" title="Progress." description="OmniPulse is in private beta. This page reflects the state of the platform as of the date shown. States are not upgraded without the team verifying the claim.">
          <div className="flex flex-wrap items-center gap-5">
            <span className="status-pill">Private beta</span>
            <span className="font-mono text-code text-[var(--ink-mute)]">Last reviewed <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time></span>
          </div>
        </PageHeader>
        <div className="site-container py-section">
          <aside aria-label="Status key" className="mb-8 p-6 border border-[var(--rule)] rounded-2xl">
            <h2 className="text-label font-semibold uppercase tracking-label mb-4 text-[var(--ink-mute)]">Status key</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATE_ORDER.map((state) => <StatusBadge key={state} state={state} />)}
            </div>
          </aside>
          <StatusExplorer />
          <p className="mt-10 pt-6 border-t border-[var(--rule)] text-small text-[var(--ink-mute)]">
            Last reviewed: <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>. To report an inaccuracy, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--ink)] underline underline-offset-4">{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
