import Link from "next/link";
import ProfileLink from "@/components/primitives/ProfileLink";
import { CONTACT_EMAIL, GITHUB_URL } from "@/lib/links";

const NAV_COLS = [
  {
    title: "Explore",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Build progress", href: "/progress" },
      { label: "Enterprise", href: "/tiers/enterprise" },
      { label: "Licensing", href: "/licensing" },
    ],
  },
  {
    title: "Open source",
    links: [
      { label: "omnipulse-agent", href: "https://pypi.org/project/omnipulse-agent/" },
      { label: "omni-wst-core", href: "https://pypi.org/project/omni-wst-core/" },
      { label: "vector-index", href: "https://crates.io/crates/vector-index" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Meet the team", href: "/#team" },
      { label: "Pilot program", href: "/#contact" },
      { label: "Email the founders", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
];

const linkClass = "inline-flex items-center gap-2 min-h-11 py-2 text-small text-[var(--ink-mute)] hover:text-[var(--signal-warm)] hover:underline underline-offset-4";

function ExternalIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}

export default function SiteFooter() {
  return (
    <footer className="pt-12 md:pt-16 pb-6 border-t border-[var(--rule)] bg-[var(--surface)]">
      <div className="site-container">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16 pb-10 md:pb-14">
          <div className="flex flex-col items-start gap-5">
            <Link href="/" aria-label="OmniPulse home" className="font-display text-card-title font-medium inline-flex items-center gap-2">
              <span aria-hidden="true" className="text-[var(--signal-warm)]">Ω</span> OmniPulse
            </Link>
            <p className="text-small text-[var(--ink-mute)] max-w-[320px]">
              Media provenance and rights infrastructure. Fingerprint your media. Keep a verifiable record.
            </p>
            <div className="flex items-center gap-3">
              <ProfileLink kind="github" href={GITHUB_URL} name="OmniPulse" />
              <span className="text-small text-[var(--ink-mute)]">Built in the open.</span>
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-8">
            {NAV_COLS.map((col) => (
              <div key={col.title}>
                <h2 className="text-label font-semibold uppercase tracking-label mb-3">{col.title}</h2>
                <ul className="flex flex-col">
                  {col.links.map((link) => {
                    const external = link.href.startsWith("https://");
                    return (
                      <li key={link.href}>
                        {external || link.href.startsWith("mailto:") ? (
                          <a href={link.href} className={linkClass} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
                            {link.label}{external && <ExternalIcon />}
                          </a>
                        ) : (
                          <Link href={link.href} className={linkClass}>{link.label}</Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-[var(--rule)] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6">
          <p className="text-small text-[var(--ink-mute)]">© 2026 OmniPulse</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <a href={`${GITHUB_URL}/blob/main/LICENSING.md`} target="_blank" rel="noopener noreferrer" className={linkClass}>AGPL-3.0 + Commercial <ExternalIcon /></a>
            <a href="#main-content" className={linkClass}>Back to top <span aria-hidden="true">↑</span></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
