// SPDX-License-Identifier: AGPL-3.0-or-later
//! CPU vs Metal parity suite for the WST scattering cascade.
//!
//! Four tests:
//!
//! * `fft_alone_matches_reference` — Metal's Stockham FFT against a naive
//!   Rust DFT. A parity failure has to survive this first before the full
//!   cascade case is even worth debugging.
//! * `wst_cascade_matches_cpu` — full depth-2 cascade against
//!   `omni_backend::CpuBackend`, which delegates to
//!   `engine/wst/cpp/cpu_wst_engine.h` (the correctness oracle).
//! * `select_backend_metal_returns_metal` — sanity check that explicit
//!   metal selection is not silently downgrading to CPU.
//! * `stale_read_guard_on_managed_storage` — only runs on Managed-storage
//!   (discrete-GPU) hosts and only when the `debug-hooks` feature is on.
//!   Uses the bridge sentinel + skip-sync knobs to prove that removing
//!   `synchronizeResource:` on Managed storage fails loudly, then restores.
//!
//! Run standalone:
//!
//! ```
//! cargo test -p omni-backend --features metal \
//!     --test parity_cpu_vs_metal -- --nocapture
//! ```
//!
//! With the stale-read guard:
//!
//! ```
//! cargo test -p omni-backend --features "metal debug-hooks" \
//!     --test parity_cpu_vs_metal -- --nocapture --test-threads=1
//! ```
//!
//! Per-device iteration is handled by `scripts/metal/parity_all_devices.sh`,
//! which sets `OMNIPULSE_METAL_DEVICE` per run.

#![cfg(target_os = "macos")]

#[cfg(not(feature = "metal"))]
#[test]
fn skipped_because_metal_feature_off() {
    eprintln!(
        "parity_cpu_vs_metal: skipped. The `metal` cargo feature is not \
         enabled in this build. Rerun with:\n    \
         cargo test -p omni-backend --features metal \\\n        \
             --test parity_cpu_vs_metal -- --nocapture"
    );
}

#[cfg(feature = "metal")]
mod parity {
    use omni_backend::{
        omni_metal_sys, BackendKind, BackendSelection, CpuBackend, MetalBackend, WstBackend,
        WstParams,
    };
    use std::f32::consts::PI;

    // Tolerance: max relative error under 1e-4 for f32 after depth-2 cascade.
    // Do not loosen. If we cannot reach it, report the actual error achieved
    // and let the reviewer decide (see Part J prompt in
    // docs/specs/licensing_and_site_blueprint.md).
    const REL_TOL: f32 = 1.0e-4;
    // Peak-magnitude floor for the normalising denominator. Only matters
    // when the reference vector's peak magnitude is smaller than this
    // (silence, near-zero output); prevents division by zero without
    // inflating errors on tiny bins the way a per-element floor would.
    const ABS_FLOOR: f32 = 1.0e-6;

    // Signal lengths exercised by the cascade parity case. Powers of two
    // only; the CPU engine and the Metal backend both zero-pad to
    // next_pow2 internally, but the comparison stays honest when
    // signal_len IS a power of two, so we use those directly.
    const LENGTHS: &[usize] = &[128, 256, 512, 1024, 2048];

    fn params(cfg: &str) -> WstParams {
        WstParams { j: 4, q: 4, depth: 2, config_version: cfg.into() }
    }

    // Tiny xorshift+ so we do not pull rand into dev-deps for one test.
    fn seeded_signal(seed: u64, len: usize) -> Vec<f32> {
        let mut s = seed.wrapping_mul(0x9E37_79B9_7F4A_7C15);
        (0..len)
            .map(|_| {
                s ^= s >> 12;
                s ^= s << 25;
                s ^= s >> 27;
                let bits = s.wrapping_mul(0x2545_F491_4F6C_DD1D);
                (bits as u32 as f32 / u32::MAX as f32) * 2.0 - 1.0
            })
            .collect()
    }

    // Naive O(N^2) DFT reference with 1/sqrt(N) unitary normalization,
    // matching engine/wst/cpp/cpu_wst_engine.h. Accumulates in f64 so that
    // reference itself is not the limiting factor at N=1024.
    fn naive_dft(input: &[f32], inverse: bool) -> Vec<f32> {
        let n = input.len() / 2;
        assert!(n.is_power_of_two(), "reference DFT expects power-of-two length");
        let mut out = vec![0.0f32; 2 * n];
        let sign = if inverse { 1.0f64 } else { -1.0f64 };
        let norm = 1.0f64 / (n as f64).sqrt();
        for k in 0..n {
            let mut re = 0.0f64;
            let mut im = 0.0f64;
            for j in 0..n {
                let a = sign * 2.0 * std::f64::consts::PI * (k * j) as f64 / n as f64;
                let (cs, sn) = (a.cos(), a.sin());
                let xr = input[2 * j] as f64;
                let xi = input[2 * j + 1] as f64;
                re += xr * cs - xi * sn;
                im += xr * sn + xi * cs;
            }
            out[2 * k] = (re * norm) as f32;
            out[2 * k + 1] = (im * norm) as f32;
        }
        out
    }

    // Max relative error in the L-infinity sense: worst elementwise
    // absolute difference normalised by the reference vector's peak
    // magnitude. Standard measure for FFT / signal-processing accuracy:
    // per-element division by a small floor would turn a bin whose CPU
    // reference is 1e-4 with an f32-noise-level abs error of 3e-7 into a
    // reported "3e-3 relative error", which is misleading. This form
    // reports the accuracy of the whole transform, not the per-bin
    // artefacts of dividing by near-zero.
    fn max_rel_err(reference: &[f32], candidate: &[f32]) -> f32 {
        assert_eq!(reference.len(), candidate.len(), "length mismatch");
        let ref_peak = reference
            .iter()
            .map(|v| v.abs())
            .fold(0.0f32, f32::max)
            .max(ABS_FLOOR);
        reference
            .iter()
            .zip(candidate.iter())
            .map(|(r, c)| (r - c).abs())
            .fold(0.0f32, f32::max)
            / ref_peak
    }

    fn print_header(scope: &str) {
        let info = omni_metal_sys::device_info();
        eprintln!("=== parity_cpu_vs_metal :: {scope} ===");
        eprintln!("target_os        : macos");
        eprintln!("metal_available  : {}", info.is_available);
        eprintln!("unified_memory   : {}", info.has_unified_memory);
        eprintln!("storage_mode     : {}", info.storage_mode);
        eprintln!("shader_path      : {}", info.shader_path);
        eprintln!("shader_hash      : {}", info.shader_hash);
        let sel = std::env::var("OMNIPULSE_METAL_DEVICE").unwrap_or_else(|_| String::from("<default>"));
        eprintln!("device_selector  : {sel}");
        eprintln!("all_devices      :\n{}", indent_lines(&omni_metal_sys::list_devices(), "  "));
        eprintln!("rel_tolerance    : {REL_TOL:e}");
    }

    fn indent_lines(s: &str, prefix: &str) -> String {
        if s.is_empty() {
            return String::from("  <none>");
        }
        s.lines().map(|l| format!("{prefix}{l}")).collect::<Vec<_>>().join("\n")
    }

    #[test]
    fn fft_alone_matches_reference() {
        print_header("fft_alone");
        if !omni_metal_sys::is_available() {
            panic!(
                "Metal device unavailable. This is a hard failure, not a skip: the \
                 backend was selected explicitly by the test. See device_info above."
            );
        }
        let mut worst_forward = 0.0f32;
        let mut worst_inverse = 0.0f32;
        for &n in &[64usize, 128, 256, 512, 1024] {
            let sig = seeded_signal(0x51F_F7_u64.wrapping_mul(n as u64 + 1), 2 * n);

            let mut metal_out = sig.clone();
            omni_metal_sys::fft_forward_inplace(&mut metal_out, n as u32)
                .expect("metal forward fft");
            let ref_out = naive_dft(&sig, false);
            let err = max_rel_err(&ref_out, &metal_out);
            eprintln!("  fft_forward N={n:4}  max_rel_err={err:e}");
            worst_forward = worst_forward.max(err);
            assert!(err < REL_TOL, "forward FFT parity failed at N={n}: {err:e}");

            let mut round = metal_out.clone();
            omni_metal_sys::fft_inverse_inplace(&mut round, n as u32)
                .expect("metal inverse fft");
            let err_round = max_rel_err(&sig, &round);
            eprintln!("  fft_roundtrip N={n:4}  max_rel_err={err_round:e}");
            worst_inverse = worst_inverse.max(err_round);
            assert!(
                err_round < REL_TOL,
                "FFT round-trip parity failed at N={n}: {err_round:e}"
            );
        }
        eprintln!(
            "fft_alone summary: worst_forward={:e} worst_roundtrip={:e}",
            worst_forward, worst_inverse
        );
    }

    fn compare_case(name: &str, signal: &[f32]) -> f32 {
        let p = params("p8m-parity-v1");
        let cpu = CpuBackend::new()
            .fingerprint_audio(signal, 44_100, &p)
            .expect("cpu fingerprint");
        let metal = MetalBackend::new()
            .fingerprint_audio(signal, 44_100, &p)
            .expect("metal fingerprint");
        assert_eq!(cpu.coefficients.len(), metal.coefficients.len(), "{name}: len mismatch");
        let err = max_rel_err(&cpu.coefficients, &metal.coefficients);
        eprintln!(
            "  case={name:<28} len={:5} max_rel_err={err:e}",
            signal.len()
        );
        assert!(err < REL_TOL, "{name}: parity failed with err={err:e}");
        err
    }

    #[test]
    fn wst_cascade_matches_cpu() {
        print_header("wst_cascade");
        if !omni_metal_sys::is_available() {
            panic!(
                "Metal device unavailable. Backend was selected explicitly by the test."
            );
        }

        let mut worst = 0.0f32;

        for i in 0..20u64 {
            let len = LENGTHS[i as usize % LENGTHS.len()];
            let signal = seeded_signal(0xC0FFEE_u64.wrapping_add(i), len);
            worst = worst.max(compare_case(&format!("rand_seed_{i}"), &signal));
        }

        let len = 1024;

        let tone: Vec<f32> = (0..len)
            .map(|k| (2.0 * PI * 0.05 * k as f32).sin())
            .collect();
        worst = worst.max(compare_case("tone_sine_0.05", &tone));

        let mut impulse = vec![0.0f32; len];
        impulse[0] = 1.0;
        worst = worst.max(compare_case("impulse", &impulse));

        let silence = vec![0.0f32; len];
        worst = worst.max(compare_case("silence", &silence));

        let square: Vec<f32> = (0..len)
            .map(|k| if (k / 32) % 2 == 0 { 1.0 } else { -1.0 })
            .collect();
        worst = worst.max(compare_case("square_full_scale", &square));

        eprintln!("wst_cascade summary: worst_max_rel_err={:e}", worst);
    }

    #[test]
    fn select_backend_metal_returns_metal() {
        // When the target machine does not export an unmatched device
        // selector via OMNIPULSE_METAL_DEVICE, this should return a live
        // metal backend. If a suite is deliberately using a bad selector
        // to exercise the fail-loud path (see the *_lists_devices tests
        // in this file), the caller will see BackendUnavailable and this
        // test is not the right assertion. Skip in that case.
        let selector = std::env::var("OMNIPULSE_METAL_DEVICE").unwrap_or_default();
        if !selector.is_empty()
            && omni_metal_sys::unavailable_reason()
                .as_deref()
                .is_some_and(|r| r.contains("OMNIPULSE_METAL_DEVICE="))
        {
            eprintln!(
                "  skipped: OMNIPULSE_METAL_DEVICE={selector:?} deliberately unmatched; \
                 see unknown_device_selector_fails_loudly instead."
            );
            return;
        }
        match omni_backend::select_backend(BackendSelection::Explicit(BackendKind::Metal)) {
            Ok(b) => assert_eq!(b.name(), "metal"),
            Err(e) => panic!("expected metal backend, got {e:?}"),
        }
    }

    // Fail-loud path: an OMNIPULSE_METAL_DEVICE that matches nothing must
    // produce a typed BackendUnavailable whose message names both the bad
    // selector and every device the bridge actually enumerated. Uses a
    // fresh child process so it does not conflict with the sibling tests'
    // process-wide device init (OnceLock cannot be reset in-process).
    #[test]
    fn unknown_device_selector_fails_loudly() {
        // Only meaningful when invoked with OMNIPULSE_METAL_DEVICE set to a
        // pattern that will not match anything on the host.
        let selector = std::env::var("OMNIPULSE_METAL_DEVICE").unwrap_or_default();
        // If we were launched with an empty or matched selector, skip:
        // this test only makes sense when we deliberately gave the bridge
        // a value that resolves to no device.
        if selector.is_empty() || omni_metal_sys::is_available() {
            eprintln!(
                "  skipped: set OMNIPULSE_METAL_DEVICE to something that will not match \
                 any device to exercise the fail-loud path. Currently selector={selector:?}."
            );
            return;
        }
        let reason = omni_metal_sys::unavailable_reason();
        eprintln!(
            "  OMNIPULSE_METAL_DEVICE={selector:?} -> unavailable_reason = {reason:?}"
        );
        let reason = reason.expect("unavailable_reason should be Some for an unmatched selector");
        assert!(
            reason.contains(&selector),
            "reason must name the bad selector, got: {reason}"
        );
        assert!(
            reason.contains("Available devices"),
            "reason must list the devices that DO exist, got: {reason}"
        );
    }

    // -------------------------------------------------------------------
    // Stale-read guard. Only compiled when `debug-hooks` is on.
    // -------------------------------------------------------------------
    //
    // The bridge normally CPU-fills output buffers with whatever
    // MTLBuffer's default init leaves (zeros), so a missing
    // synchronizeResource: barrier on Managed storage returns zeros that
    // are often close enough to look right. This test forces the failure
    // mode on purpose: fill every scratch and output buffer with a
    // recognisable sentinel bit pattern before dispatch. With the
    // synchronize present, the sentinel is overwritten by the GPU-side
    // FFT output and the CPU read sees real data. With it skipped, the
    // sentinel survives in the CPU-visible view of the Managed buffer.
    //
    // Runs only on Managed-storage hosts. On unified-memory devices (Apple
    // silicon, Intel iGPU) the sync branch is a no-op and the test is
    // skipped with an explicit message rather than passing silently.

    #[cfg(feature = "debug-hooks")]
    #[test]
    fn stale_read_guard_on_managed_storage() {
        print_header("stale_read_guard");
        if !omni_metal_sys::is_available() {
            panic!("Metal device unavailable; the stale-read guard needs a live device.");
        }
        let info = omni_metal_sys::device_info();
        if info.has_unified_memory {
            eprintln!(
                "  skipped: this device has unified memory ({}); \
                 synchronizeResource: is a no-op here and there is no failure mode to prove.",
                info.storage_mode
            );
            return;
        }

        // Recognisable pattern: repeating 0xDEAD_BEEF u32s. Interpreted as
        // f32 this is a signalling-NaN or a large finite number depending on
        // masking, so any survivor is obvious against a real FFT output.
        const PATTERN: u32 = 0xDEAD_BEEF;
        // Length chosen so run_fft_stages ends with an ODD number of
        // ping/pong swaps, i.e. the buffer that the caller's memcpy is read
        // out of (the "pong" scratch in the bridge) is the one new_buffer
        // pre-filled with sentinel and never touched by CPU input. For
        // N=64 this is three radix-4 stages -> result=pong. See the swap
        // walk in metal_bridge.mm :: run_fft_stages.
        const N: u32 = 64;

        let baseline_sig = seeded_signal(0xB1A5, (2 * N) as usize);

        // Guarantee we restore the debug flags no matter how the test exits.
        struct Restore;
        impl Drop for Restore {
            fn drop(&mut self) {
                omni_metal_sys::debug::set_sentinel(0, false);
                omni_metal_sys::debug::set_skip_sync(false);
            }
        }
        let _restore = Restore;

        // Step 1: with synchronize present. Sentinel-fill every buffer,
        // run the FFT, expect the sentinel to be gone from the output.
        omni_metal_sys::debug::set_sentinel(PATTERN, true);
        omni_metal_sys::debug::set_skip_sync(false);
        let mut with_sync = baseline_sig.clone();
        omni_metal_sys::fft_forward_inplace(&mut with_sync, N).expect("fft with sync");
        let survivors_ok = count_sentinel_survivors(&with_sync, PATTERN);
        eprintln!(
            "  with synchronize: sentinel survivors = {survivors_ok} / {}",
            with_sync.len()
        );
        assert_eq!(
            survivors_ok, 0,
            "with synchronize, no sentinel value should survive the FFT readback"
        );

        // Step 2: force-skip synchronize. On Managed storage, the CPU-side
        // memory image never absorbs the GPU writes, so the sentinel-filled
        // buffer survives verbatim in the caller's slice.
        omni_metal_sys::debug::set_sentinel(PATTERN, true);
        omni_metal_sys::debug::set_skip_sync(true);
        let mut no_sync = baseline_sig.clone();
        omni_metal_sys::fft_forward_inplace(&mut no_sync, N).expect("fft without sync");
        let survivors_bad = count_sentinel_survivors(&no_sync, PATTERN);
        eprintln!(
            "  without synchronize: sentinel survivors = {survivors_bad} / {} (expect > 0 on Managed)",
            no_sync.len()
        );
        assert!(
            survivors_bad > 0,
            "guard is broken: even with synchronize skipped on Managed storage, \
             no sentinel survivors were found. Either the sentinel isn't being \
             written, or Metal is doing an implicit sync we did not account for."
        );

        // Step 3: restore normal operation and confirm we're back to good.
        omni_metal_sys::debug::set_sentinel(0, false);
        omni_metal_sys::debug::set_skip_sync(false);
        let mut restored = baseline_sig.clone();
        omni_metal_sys::fft_forward_inplace(&mut restored, N).expect("fft restored");
        let survivors_after = count_sentinel_survivors(&restored, PATTERN);
        eprintln!(
            "  after restore    : sentinel survivors = {survivors_after} / {}",
            restored.len()
        );
        assert_eq!(
            survivors_after, 0,
            "after restore, no sentinel should survive"
        );
    }

    #[cfg(feature = "debug-hooks")]
    fn count_sentinel_survivors(data: &[f32], pattern: u32) -> usize {
        data.iter().filter(|f| f.to_bits() == pattern).count()
    }
}
