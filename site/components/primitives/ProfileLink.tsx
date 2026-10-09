type ProfileLinkProps = {
  kind: "portfolio" | "linkedin" | "github";
  href: string;
  name: string;
};

const LABELS = { portfolio: "Portfolio", linkedin: "LinkedIn", github: "GitHub" };

export default function ProfileLink({ kind, href, name }: ProfileLinkProps) {
  const label = `${name} — ${LABELS[kind]}`;
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
      className="profile-link inline-flex h-11 w-11 items-center justify-center border border-[var(--rule)] text-ink-mute hover:border-ink hover:bg-bg-elev hover:text-ink"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {kind === "portfolio" && (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z" />
          </>
        )}
        {kind === "linkedin" && (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7.5 10v7M11.5 17v-7m0 3a3 3 0 0 1 6 0v4" />
            <circle cx="7.5" cy="7" r="0.8" fill="currentColor" stroke="none" />
          </>
        )}
        {kind === "github" && (
          <>
            <path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7M15 22v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.7 4.7 0 0 0-1.3-3.3 4.3 4.3 0 0 0-.1-3.3S17.3 3.4 15 5a11.5 11.5 0 0 0-6 0C6.7 3.4 5.7 3.7 5.7 3.7A4.3 4.3 0 0 0 5.6 7a4.7 4.7 0 0 0-1.3 3.3c0 4.7 2.8 5.7 5.5 6a3 3 0 0 0-.8 2.3V22" />
          </>
        )}
      </svg>
    </a>
  );
}
