export interface MaintainedPackage {
  label: string;
  href: string;
}

export interface FounderEntry {
  name: string;
  eyebrow: string;
  role: string;
  focus: string;
  maintains: string;
  maintainsLinks: MaintainedPackage[];
  portfolio?: string;
  github?: string;
  linkedin?: string;
}

export const FOUNDERS: FounderEntry[] = [
  {
    name: "Samvardhan Singh",
    eyebrow: "ARCHITECT, APPLIED AI / MLOPS",
    role: "Systems, signal processing, and the CUDA substrate.",
    focus: "Automation engineering, AI/MLOps pipelines, and engineering outcomes.",
    maintains: "omni-wst-core (C++/CUDA DSP engine, PyPI), omni-ffi (zero-copy FFI bridge, crates.io), omnipulse-agent (Python agentic control plane, PyPI).",
    maintainsLinks: [
      { label: "omni-wst-core", href: "https://pypi.org/project/omni-wst-core/" },
      { label: "omni-ffi", href: "https://crates.io/crates/omni-ffi" },
      { label: "omnipulse-agent", href: "https://pypi.org/project/omnipulse-agent/" },
    ],
    portfolio: "https://samvardhan.vercel.app/",
    github: "https://github.com/samvardhan03",
  },
  {
    name: "Yash Mishra",
    eyebrow: "ARCHITECT, SYSTEMS / OPTIMAL TRANSPORT",
    role: "Scattering research and the passive engine.",
    focus: "Concurrent systems, optimal transport, and real-time indexing logic.",
    maintains: "vector-index (concurrent HNSW, crates.io), sliced-wasserstein (SW1 distance metric, crates.io).",
    maintainsLinks: [
      { label: "vector-index", href: "https://crates.io/crates/vector-index" },
      { label: "sliced-wasserstein", href: "https://crates.io/crates/sliced-wasserstein" },
    ],
    linkedin: "https://www.linkedin.com/in/mishra-yash2002/",
  },
  {
    name: "Shreyansh Jain",
    eyebrow: "ENGINEER, AGENTIC SYSTEMS / ACTIVE LAYER",
    role: "Agentic systems and the active layer (OmniLock).",
    focus: "GenAI and agentic-systems engineer; research publications and open-source Python packages.",
    maintains: "omni-lock-core (CUDA inference crate, C-ABI v3), omni-lock-embed (PyTorch embedder).",
    maintainsLinks: [],
    portfolio: "https://shreyanshjain05.vercel.app",
    github: "https://github.com/shreyanshjain05",
    linkedin: "https://www.linkedin.com/in/shreyanshjain05/",
  },
];

export const COAUTHORED_NOTE = {
  text: "Phase 3 (the Autonomous Agentic Control Plane) is co-authored by Samvardhan and Yash.",
  cite: ["omnipulse-agent", "omnipulse-mcp"],
};
