export const FOUNDERS = [
  {
    name: "Samvardhan Singh",
    eyebrow: "ARCHITECT — APPLIED AI / MLOPS",
    role: "Automation Engineering & AI/MLOps Research, NielsenIQ",
    focus: "Automation engineering, AI/MLOps pipelines, engineering outcomes.",
    maintains: [
      { label: "omni-wst-core", note: "C++/CUDA DSP engine", href: "https://pypi.org/project/omni-wst-core/" },
      { label: "omni-ffi", note: "cxx zero-copy FFI bridge", href: "https://crates.io/crates/omni-ffi" },
      { label: "omnipulse-agent", note: "Python agentic control plane (PyPI)", href: "https://pypi.org/project/omnipulse-agent/" },
    ],
    portfolio: "https://samvardhan.vercel.app/",
    email: "shekhawatsamvardhan@gmail.com",
    linkedin: undefined as string | undefined,
  },
  {
    name: "Yash Mishra",
    eyebrow: "ARCHITECT — SYSTEMS / OPTIMAL TRANSPORT",
    role: "Senior Software Engineer, Bajaj Finserv",
    focus: "Concurrent systems, optimal transport, real-time indexing logic.",
    maintains: [
      { label: "vector-index", note: "Concurrent HNSW", href: "https://crates.io/crates/vector-index" },
      { label: "sliced-wasserstein", note: "SW₁ distance metric for HNSW", href: "https://crates.io/crates/sliced-wasserstein" },
    ],
    portfolio: undefined as string | undefined,
    linkedin: "https://www.linkedin.com/in/mishra-yash2002/",
    email: "yash01012002@gmail.com",
  },
] as const;

export const COAUTHORED_NOTE = {
  text: "Phase 3 — the Autonomous Agentic Control Plane — is co-authored by Samvardhan and Yash.",
  cite: ["omnipulse-agent", "omnipulse-mcp"],
} as const;
