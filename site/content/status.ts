export type ItemState = "built-and-tested" | "in-development" | "research" | "planned";

export interface StatusEntry {
  area: string;
  item: string;
  state: ItemState;
  asOf: string;
  note?: string;
}

export const STATUS: StatusEntry[] = [
  {
    area: "Auth",
    item: "Sign-in, organizations and roles",
    state: "built-and-tested",
    asOf: "2026-09-23",
  },
  {
    area: "Billing",
    item: "Plans and checkout read live from Stripe",
    state: "built-and-tested",
    asOf: "2026-09-23",
    note: "Activation after payment still being verified.",
  },
  {
    area: "Fingerprinting",
    item: "Audio fingerprinting (WAV, FLAC, MP3) and image fingerprinting (PNG, JPEG, WebP) on CPU",
    state: "built-and-tested",
    asOf: "2026-09-23",
  },
  {
    area: "Catalogue",
    item: "Per-organization catalogue; one organization cannot search another",
    state: "built-and-tested",
    asOf: "2026-09-23",
  },
  {
    area: "Verdicts",
    item: "Verdicts: Exact, Perceptual, Miss",
    state: "built-and-tested",
    asOf: "2026-09-23",
    note: "Thresholds provisional.",
  },
  {
    area: "Attestations",
    item: "Ed25519-signed attestations verifiable without an account",
    state: "built-and-tested",
    asOf: "2026-09-23",
  },
  {
    area: "Product",
    item: "Product screens: catalogue, check, attestations",
    state: "in-development",
    asOf: "2026-09-23",
  },
  {
    area: "Registry",
    item: "Registration records carrying licence terms, with an OmniLock ID",
    state: "in-development",
    asOf: "2026-09-23",
  },
  {
    area: "Fingerprinting",
    item: "Video fingerprinting",
    state: "in-development",
    asOf: "2026-09-23",
  },
  {
    area: "Backend",
    item: "Apple Metal backend",
    state: "in-development",
    asOf: "2026-09-23",
  },
  {
    area: "OmniLock",
    item: "OmniLock watermark: a 64-bit ID embedded in images and video frames",
    state: "research",
    asOf: "2026-09-23",
  },
  {
    area: "Backend",
    item: "NVIDIA CUDA backend",
    state: "planned",
    asOf: "2026-09-23",
  },
  {
    area: "Platform",
    item: "Public platform launch",
    state: "planned",
    asOf: "2026-09-23",
  },
];

export const STATE_LABELS: Record<ItemState, string> = {
  "built-and-tested": "Built and tested",
  "in-development": "In development",
  research: "Research",
  planned: "Planned",
};

export const STATE_ORDER: ItemState[] = [
  "built-and-tested",
  "in-development",
  "research",
  "planned",
];

export const STATE_COLORS: Record<ItemState, string> = {
  "built-and-tested": "var(--accent-teal)",
  "in-development": "var(--signal-warm)",
  research: "var(--ink-mute)",
  planned: "var(--rule)",
};
