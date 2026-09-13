# How OmniPulse works

Status tags: **(implemented)** in the open-source tree, **(reported)** a measured
operating point, **(proposed)** designed but not yet built.

---

## Architecture: one fingerprint plane, two verification modes

OmniPulse is a single shared substrate (CUDA kernels, Rust orchestrator, Python control
plane, zero-copy shared memory) that powers two independent verification layers:

- **OmniPulse passive:** deterministic Morlet wavelet scattering fingerprint. Matches any
  derivative -- transcoded, pitch-shifted, sped up, AI-reproduced -- without cooperation
  at creation. No trained model on the verify path; pure fixed-operator mathematics.

- **OmniLock active:** 64-bit LDPC watermark embedded in the DCT mid-band residual at
  creation. Survives compression and re-encoding. The verify path is a linear parity check
  ($H\hat{x} = 0 \pmod 2$) plus an Ed25519 signature check over a signed registry ledger.

Both layers write to the same Ed25519-signed ledger. The verdict is a closed enum:

```
Exact | Perceptual(score, margin) | OrphanedMark | IntegrityAlarm | Miss
```

The enum keeps the two decision types typed apart: a Sliced-Wasserstein distance is a
soft similarity; a passing LDPC syndrome is a hard linear proof. They are never blended.

---

## Dual FFI architecture

There are exactly two FFI seams. They never merge; they meet only in the Rust orchestrator.

```
                     omnipulse-mcp  (Rust orchestrator)
                     routes by MediaKind, owns both safe wrappers
                ┌──────────────────┴───────────────────┐
                │                                       │
    omni_ffi_kernel.rs                        omni_lock_kernel.rs
    (RAII guard over WSTResult)               (RAII guard over OmniLockBackend)
                │                                       │
    cxx bridge (omni-ffi)             hand-written extern "C" ABI v3 (omni-lock-core)
    unsafe extern "C++"               omnilock_ffi.h, no cxx/bindgen/cc
    raw u64 pinned-host pointers      multi-buffer pinned ring, CUDA Graph capture
                │                                       │
    omni-wst-core (C++/CUDA)          omni-lock-core/cpp (CUDA)
    WST/JTFS scattering kernels       fused DCT + LDPC BP kernels
```

**Why two seams that never unify.** The cxx bridge carries a single contiguous audio buffer.
The OmniLock ABI manages a multi-buffer pinned ring with CUDA Graph capture, where device
pointers are baked into the captured graph and the ring must be re-captured on rotation.
Collapsing them into one FFI surface would either lose the graph semantics or bloat the
audio path with ring machinery it never needs.

---

## Zero-copy control-plane seam

Only four kinds of thing cross the Python/Rust plane boundary:

1. A 28-character SHA3-256 shared-memory name.
2. A newline-terminated JSON-RPC 2.0 message.
3. A raw 64-bit memory pointer (C++/Rust only, never over JSON).
4. A downsampled preview (small image or summary statistics).

No tensor, no protocol-buffer array, no coefficient block ever crosses.

### Why 28 characters for the shm name

`hashlib.sha3_256(buf).digest()[:14].hex()` produces a 28-character hex string. macOS caps
POSIX shared-memory names at `PSHMNAMLEN = 31` bytes including the leading `/`. 28
characters plus the prefix slash uses 29 bytes and fits every macOS and Linux kernel version
without conditional logic. The name is a content digest, not a counter, so two identical
buffers get the same name and the second `shm_open` returns the existing segment without
an extra copy.

### The image/video loop

```
Python (omnipulse-agent)                    Rust (omnipulse-mcp)
─────────────────────────                   ─────────────────────
1. decode media -> (H, W, C) tensor
2. write ONCE into an Arrow Plasma page
3. name = sha3_256(page)[:14].hex()  ─────►  4. receive name over JSON-RPC 2.0
   (28 chars; JSON carries the name only)       (line-delimited, stdio)
                                             5. cudaHostRegister the Plasma page
                                                -> mapped-pinned, UVA device alias
                                             6. DMA out of it directly
                                             7. scatter / embed / extract in place
                                             8. return verdict + downsampled preview
9. receive preview + verdict  ◄─────────────    (never the full coefficient block)
```

---

## Passive path: wavelet scattering + Sliced-Wasserstein matching

The passive layer computes a Morlet wavelet scattering transform (WST) of the input
**(implemented)** and inserts the resulting coefficient vector into a concurrent HNSW
nearest-neighbor index **(implemented)**. A query against the index returns the nearest
registered work by Sliced-Wasserstein (SW1) distance.

**Classification rule.** A query fingerprint is classified a licensed derivative only when:

- SW1(query, nearest) < threshold (absolute, per-modality), AND
- SW1(query, 2nd-nearest) - SW1(query, nearest) > margin

The margin rejects queries that sit nearly equidistant between two registered works.
Both threshold and margin are calibrated per modality against a held-out attack corpus
and published; they are not tuned secrets.

**Verdict.** `Perceptual(score, margin)` when the query matches; `Miss` otherwise.

---

## Active path: LDPC watermark + Ed25519 ledger

The active layer embeds a 64-bit identifier into DCT mid-band coefficients as a signed
LDPC codeword **(implemented, not production-hardened -- see Status table in README)**.

**Verify rule (public, deterministic):**

1. Extract the candidate codeword from the DCT coefficients.
2. Compute the syndrome: $H\hat{x} = \mathbf{0} \pmod 2$?
3. If clean: look up the decoded 64-bit key in the registry.
4. Verify the Ed25519 signature on the registry row.

**Verdict enum for the active path:**

| Verdict | Trigger |
|---|---|
| `Exact` | Syndrome clean + key in registry + signature valid |
| `OrphanedMark` | Syndrome clean + key absent from registry |
| `IntegrityAlarm` | Syndrome clean + key present + signature invalid |
| `Miss` | Syndrome dirty (no watermark, or scrubbed beyond the LDPC correction radius) |

`OrphanedMark` and `IntegrityAlarm` are never silently collapsed to `Miss`.

---

## Seven pattern locks

Each lock is an invariant enforced by CI, a schema, or the compiler -- not a convention.

| # | Locked pattern |
|---|---|
| 1 | Decision rules are fixed-operator: H is a constant table; the filter bank is fixed math |
| 2 | Two FFI families, never unified |
| 3 | The registry is the only join point; engines never call each other |
| 4 | Fail-loud CUDA: no CPU mock, no stubbed kernel |
| 5 | Learned components confined to the write path; the verify path is deterministic |
| 6 | Zero-copy seam: only 28-char names, JSON-RPC 2.0 lines, raw u64 pointers (C++/Rust), downsampled previews cross the plane |
| 7 | Claim hygiene: budgets, reported points, and measurements never conflated |

---

## Open-source modules

| Module | Repo | Description |
|---|---|---|
| omni-wst-core | [Module-I-omni-wst-core](https://github.com/samvardhan03/Module-I-omni-wst-core) | C++/CUDA WST engine, Morlet bank, Python wheel |
| omni-ffi | [Module-1.1-omni-ffi](https://github.com/samvardhan03/Module-1.1-omni-ffi) | cxx zero-copy bridge (FFI family 1) |
| omnipulse-rs | [omnipulse-rs](https://github.com/samvardhan03/omnipulse-rs) | Rust workspace: MCP orchestrator, HNSW, SW1 |
| omnipulse-agent | Part of omnipulse-rs | Python MCP control plane |

The write path (Mixer weights, production H matrix, issuer key) is private. The verify
path is fully open and deterministic: anyone can audit the rule; anyone can reproduce a
verdict given the same input and catalogue snapshot.
