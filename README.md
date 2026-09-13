# OmniPulse

Media provenance infrastructure for creators and rights organizations.

OmniPulse pairs two complementary verification layers on a shared CUDA/Rust/Python substrate:

- **OmniPulse (passive):** deterministic wavelet-scattering fingerprint -- matches any
  derivative without cooperation at creation. Fixed-operator mathematics; no trained model
  on the verify path.
- **OmniLock (active):** cryptographically signed 64-bit LDPC watermark embedded at
  creation. Survives transcoding and compression; the verify path is a linear parity check
  plus an Ed25519 signature check.

Both layers write to the same signed ledger. The verdict is a closed enum:
`Exact | Perceptual(score, margin) | OrphanedMark | IntegrityAlarm | Miss`.

**Live site:** https://omnipulseid.vercel.app

---

## Repositories

| Repo | Visibility | Contents |
|---|---|---|
| [samvardhan03/Omnipulse](https://github.com/samvardhan03/Omnipulse) (this repo) | Public | Marketing site (Next.js), contributing guide, license |
| samvardhan03/omnipulse-engine | Private | Full engine monorepo: all Rust crates, C++/CUDA kernels, Python OmniLock, platform infra |
| [samvardhan03/Module-1.1-omni-ffi](https://github.com/samvardhan03/Module-1.1-omni-ffi) | Public | cxx bridge for WST audio (FFI family 1); canonical copy in engine, exported here |
| [samvardhan03/Module-I-omni-wst-core](https://github.com/samvardhan03/Module-I-omni-wst-core) | Public | C++/CUDA WSTEngine, Morlet bank, Python wheel; canonical copy in engine, exported here |
| [samvardhan03/omnipulse-rs](https://github.com/samvardhan03/omnipulse-rs) | Public | Rust workspace: omnipulse-mcp, vector-index, sliced-wasserstein; canonical copy in engine |

The private engine repo (`omnipulse-engine`) vendors all open-source crates via `git subtree`.
Public repos are one-way exports maintained by `scripts/export_public.sh`.

---

## What is public and what is not

**Rule:** fixed operators are public; trained artifacts and secrets are private.

**Public (open-source repos above):**
- All WST/JTFS kernels, Sliced-Wasserstein distance, HNSW nearest-neighbor
- The cxx bridge (omni-ffi) and the hand-written OmniLock C-ABI v3 (omni-lock-core)
- MCP orchestrator (omnipulse-mcp), Python control plane (omnipulse-agent)
- This marketing site

**Private (omnipulse-engine):**
- Full omni-lock-embed package: embedder, extractor, decoder, Mixer architecture
- Production LDPC parity-check matrix H and the seed-locked generator
- Trained Mixer weights and training pipeline
- Ed25519 issuer key and signed registry rows

The active embed/decode path hard-exits at build and runtime if `OMNIPULSE_ENGINE_DIR`
is unset. The passive fingerprint path has no such gate and builds from the public repos alone.

---

## Status

| Capability | Status | Note |
|---|---|---|
| Passive fingerprint (audio) | Implemented | WSTEngine, Morlet bank, HNSW, SW1 |
| Passive fingerprint (image/video) | Implemented | Same kernel family, different input shape |
| Active embed (OmniLock write path) | Implemented, not production-hardened | Requires engine artifacts; LDPC H seed production-locked in engine repo |
| Active verify (OmniLock read path) | Implemented | Sum-Product decoder, parity check, Ed25519 verify |
| Ed25519 registry ledger | Proposed | Infrastructure wired; issuer key not provisioned |
| LDPC H matrix sync | Blocked | kernel_ldpc.cu (3,6) protograph vs Python (2,4) code mismatch; fix in Phase 5b on CUDA host |
| Platform (auth, billing, dashboard) | In progress | P3-P9 of private platform plan |

---

## Docs

- [How OmniPulse works](docs/how-it-works.md) -- architecture, dual-FFI design, verdict enum, shm seam

---

## License

AGPL-3.0 for open-source and research use. Commercial license for production
deployments that cannot comply with AGPL source-disclosure requirements.
Contact shekhawatsamvardhan@gmail.com for commercial terms.

See LICENSING.md for the dual-licensing model and LICENSE for the full AGPL-3.0 text.

---

## Maintainers

Samvardhan Singh -- systems, signal processing, CUDA substrate.
samvardhan.vercel.app / shekhawatsamvardhan@gmail.com

Yash Mishra -- scattering research and the passive engine.
linkedin.com/in/mishra-yash2002

Shreyansh Jain -- agentic systems and the active layer (OmniLock).
shreyanshjain05.vercel.app / github.com/shreyanshjain05

---

## Contributing

See CONTRIBUTING.md.
