# Metal vs CPU WST timings

Recorded per rule 7 (claim hygiene): every row is either an actual run on
the named machine, or explicitly marked "not measured". No budgets or
expectations in this file.

The workload is a single-batch audio fingerprint through a depth-2 WST
scattering cascade (J=4, Q=4, `config_version="p8m-bench-v1"`), driven by
`crates/omni-backend/examples/bench_cpu_vs_metal.rs`. Iteration count is
the number of back-to-back `fingerprint_audio` calls averaged. The mean is
wall-clock, `Instant::now()`, single-threaded.

## Devices and shader path

| Machine | macOS | Xcode | Toolchain | Shader path used | Source SHA-256 |
|---|---|---|---|---|---|
| Intel MacBook Pro 2017 (dev laptop) | 13.7.8 | not installed | Command Line Tools only | `source` (runtime `newLibraryWithSource:`, MSL 2.4, fast math off) | `f85e393048e56800bde35490f17012f191b59fe44d42d9bcfc2d55112530cb9b` |
| Intel MacBook Pro 2017 (owner's laptop) | 13.7.8 | 15.2 (Build 15C500b) | Xcode + Command Line Tools | `metallib` (offline `xcrun metal`/`metallib`, `-std=macos-metal2.4`, fast math off, macOS 13 target) and `source` | `f85e393048e56800bde35490f17012f191b59fe44d42d9bcfc2d55112530cb9b` |
| Apple silicon Mac mini (friend's validation host) | not measured | not measured | not measured | not measured | not measured |

## Runtime compile latency (source path only)

First-call cost includes `newLibraryWithSource:` plus lazy pipeline
compilation for every kernel the first cascade touches; the "warm" number
is a second call in the same process. Measured on the dev laptop:

| Device | First call (ms) | Warm call (ms) |
|---|---|---|
| AMD Radeon Pro 555 (discrete, Managed) | 6.20 | 1.52 |
| Intel HD Graphics 630 (integrated, Shared) | 8.55 | 9.50 |
| Apple silicon Mac mini | not measured | not measured |

The Intel iGPU's warm call is close to its first call because the runtime
compile is fast (probe shows 0.1 ms per shader) and the second call is
dominated by dispatch overhead on the low-end integrated GPU. The AMD
discrete GPU has a ~880 ms cold compile per kernel on first process invoke
per the probe; the warm number here reflects the OS shader cache absorbing
subsequent calls in the same process.

## Rows

Command used for every dev-laptop row below:

```
OMNIPULSE_METAL_SHADERS=source OMNIPULSE_METAL_DEVICE=<index> \
    cargo run -p omni-backend --release --features metal \
        --example bench_cpu_vs_metal
```

### AMD Radeon Pro 555 (discrete, MTLStorageModeManaged), shader_path=source

| Signal len (samples) | Iterations | CPU mean (ms) | Metal mean (ms) | GPU faster? |
|---|---|---|---|---|
| 256   | 200 |  0.102 |  1.521 | cpu   |
| 1024  | 200 |  0.408 |  1.844 | cpu   |
| 4096  | 100 |  1.724 |  2.644 | cpu   |
| 16384 |  50 |  7.492 |  3.794 | metal |
| 65536 |  20 | 31.806 | 10.509 | metal |

### Intel HD Graphics 630 (integrated, MTLStorageModeShared), shader_path=source

| Signal len (samples) | Iterations | CPU mean (ms) | Metal mean (ms) | GPU faster? |
|---|---|---|---|---|
| 256   | 200 |  0.099 |  1.837 | cpu   |
| 1024  | 200 |  0.402 |  1.963 | cpu   |
| 4096  | 100 |  1.790 |  2.514 | cpu   |
| 16384 |  50 |  7.487 |  4.012 | metal |
| 65536 |  20 | 31.128 |  9.783 | metal |

### Apple silicon Mac mini, shader_path=metallib and source

Not measured. To be filled in when the friend runs Prompt M2 (Part J.3 of
`docs/specs/licensing_and_site_blueprint.md`). Command:

```
OMNIPULSE_METAL_SHADERS=metallib cargo run -p omni-backend --release --features metal --example bench_cpu_vs_metal
OMNIPULSE_METAL_SHADERS=source   cargo run -p omni-backend --release --features metal --example bench_cpu_vs_metal
```

### Offline `metallib` shader path

Not measured on the dev laptop (Command Line Tools only). CI
(`.github/workflows/macos.yml`) exercises both shader paths on a
`macos-latest` runner. When both paths run there, the workflow prints the
largest per-element difference between the two paths' outputs.

Measured on the owner's Intel MacBook Pro 2017 (macOS 13.7.8, Xcode 15.2)
on 2026-09-27. The offline `metallib` was built with `xcrun -sdk macosx
metal -std=macos-metal2.4 -ffast-math=false -mmacosx-version-min=13.0` and
`xcrun -sdk macosx metallib`; the same source hash
(`f85e393048e56800bde35490f17012f191b59fe44d42d9bcfc2d55112530cb9b`) is
reported by both paths. Parity: `5 passed` on both GPUs on both paths;
per-GPU `fft_alone` and `wst_cascade` summary numbers matched bit-for-bit
between the two paths (Intel iGPU: worst_forward=2.5889838e-7,
worst_roundtrip=3.8772717e-7, wst worst_max_rel_err=1.1189588e-5; AMD
Radeon: worst_forward=2.8766488e-7, worst_roundtrip=4.1755231e-7, wst
worst_max_rel_err=1.1189588e-5). Stale-read guard on the Radeon (Managed)
failed with the synchronize removed (128/128 sentinel survivors) and
passed with it restored (0/128), on both paths.

Command used for every metallib row below:

```
OMNIPULSE_METAL_SHADERS=metallib OMNIPULSE_METAL_DEVICE=<index> \
    cargo run -p omni-backend --release --features metal \
        --example bench_cpu_vs_metal
```

#### AMD Radeon Pro 555 (discrete, MTLStorageModeManaged), shader_path=metallib

first_call_ms = 8.57, warm_call_ms = 1.55.

| Signal len (samples) | Iterations | CPU mean (ms) | Metal mean (ms) | GPU faster? |
|---|---|---|---|---|
| 256   | 200 |  0.075 |  1.428 | cpu   |
| 1024  | 200 |  0.310 |  1.716 | cpu   |
| 4096  | 100 |  1.282 |  2.462 | cpu   |
| 16384 |  50 |  6.490 |  3.428 | metal |
| 65536 |  20 | 25.263 |  9.905 | metal |

#### Intel HD Graphics 630 (integrated, MTLStorageModeShared), shader_path=metallib

first_call_ms = 13.48, warm_call_ms = 1.54.

| Signal len (samples) | Iterations | CPU mean (ms) | Metal mean (ms) | GPU faster? |
|---|---|---|---|---|
| 256   | 200 |  0.077 |  1.549 | cpu   |
| 1024  | 200 |  0.308 |  2.162 | cpu   |
| 4096  | 100 |  1.516 |  2.396 | cpu   |
| 16384 |  50 |  6.066 |  3.940 | metal |
| 65536 |  20 | 25.221 |  9.393 | metal |

## Honest expectations

For small transforms (`signal_len` up to a few thousand) the Metal backend
loses to CPU on this laptop. The measurements above show the crossover
around 4096 samples on the AMD discrete GPU and slightly earlier on the
Intel iGPU — the CPU cascade is small and cache-hot, and dispatch overhead
plus buffer sync dominates. That is normal for GPU-accelerated FFTs of
short signals; it is not a Metal-path defect. Metal earns its keep on
longer signals (64k samples: ~3x faster on AMD, ~3.2x faster on Intel here)
and later on batched cascades and image work.

## How to add a row

1. Build and run `bench_cpu_vs_metal` with the target device pinned:

   ```
   OMNIPULSE_METAL_DEVICE=<index> OMNIPULSE_METAL_SHADERS=<source|metallib> \
       cargo run -p omni-backend --release --features metal \
           --example bench_cpu_vs_metal
   ```

2. Copy the self-identifying header (macOS version, storage mode,
   unified-memory flag, shader path, source hash) and the printed
   markdown table into a new section here.

3. Do not fold two machines or two shader paths into one row. Every row
   carries its own device and shader-path metadata so the numbers stay
   attributable.
