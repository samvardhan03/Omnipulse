export const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL ?? null;
export const CONTACT_EMAIL = "shekhawatsamvardhan@gmail.com";
export const GITHUB_URL = "https://github.com/samvardhan03/Omnipulse";

export const primaryCta = {
  href: PLATFORM_URL ?? `mailto:${CONTACT_EMAIL}?subject=OmniPulse%20access%20request`,
  label: PLATFORM_URL ? "Sign in" : "Request access",
} as const;

export const getStartedCta = {
  href: PLATFORM_URL ?? `mailto:${CONTACT_EMAIL}?subject=OmniPulse%20access%20request`,
  label: PLATFORM_URL ? "Get started" : "Request access",
} as const;
