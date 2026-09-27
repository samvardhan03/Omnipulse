// SPDX-License-Identifier: AGPL-3.0-or-later
//! CPU-vs-Metal timing helper for docs/measurements/metal_vs_cpu.md.
//!
//! Iterates through a fixed set of signal lengths, times `fingerprint_audio`
//! on both backends, and prints one markdown table row per length plus a
//! "first / warm" split for the runtime shader compile latency. Meant to be
//! invoked by hand once per (machine, GPU, shader path) combination.
//!
//! Run:
//!
//! ```
//! # Use the target GPU:
//! OMNIPULSE_METAL_DEVICE=0 OMNIPULSE_METAL_SHADERS=source \
//!     cargo run -p omni-backend --release --features metal \
//!         --example bench_cpu_vs_metal
//! ```
//!
//! Copy the printed table rows into docs/measurements/metal_vs_cpu.md. The
//! script does not touch the docs file itself: measurement authorship stays
//! with a human.

use omni_backend::{
    omni_metal_sys, CpuBackend, MetalBackend, WstBackend, WstParams,
};
use std::time::Instant;

fn main() {
    let params = WstParams {
        j: 4,
        q: 4,
        depth: 2,
        config_version: "p8m-bench-v1".into(),
    };
    let info = omni_metal_sys::device_info();
    eprintln!("# bench_cpu_vs_metal");
    eprintln!("metal_available   : {}", info.is_available);
    eprintln!("has_unified_memory: {}", info.has_unified_memory);
    eprintln!("storage_mode      : {}", info.storage_mode);
    eprintln!("shader_path       : {}", info.shader_path);
    eprintln!("shader_hash       : {}", info.shader_hash);
    eprintln!("all_devices:\n{}", omni_metal_sys::list_devices());
    if !info.is_available {
        eprintln!("Metal is unavailable on this build; nothing to time. Exiting.");
        return;
    }

    let cpu = CpuBackend::new();
    let metal = MetalBackend::new();

    // First-use warm-up on a tiny length. Reports the first / warm split for
    // the runtime shader-compile latency (source path only; metallib has no
    // per-run compile cost past init).
    let warmup_sig = seeded_signal(0xF00D, 256);
    let t = Instant::now();
    let _ = metal.fingerprint_audio(&warmup_sig, 44_100, &params).expect("warmup");
    let first_ms = t.elapsed().as_secs_f64() * 1000.0;
    let t = Instant::now();
    let _ = metal.fingerprint_audio(&warmup_sig, 44_100, &params).expect("warm");
    let warm_ms = t.elapsed().as_secs_f64() * 1000.0;
    eprintln!("first_call_ms     : {first_ms:.2}");
    eprintln!("warm_call_ms      : {warm_ms:.2}");
    eprintln!();

    // Markdown table header. Copy from here down into
    // docs/measurements/metal_vs_cpu.md as one row per length.
    println!("| Signal len | Iters | CPU mean (ms) | Metal mean (ms) | GPU faster? |");
    println!("|---|---|---|---|---|");
    for &(len, iters) in &[
        (256usize, 200usize),
        (1024, 200),
        (4096, 100),
        (16384, 50),
        (65536, 20),
    ] {
        let sig = seeded_signal(0xC0FFEE ^ len as u64, len);

        let t = Instant::now();
        for _ in 0..iters {
            let _ = cpu.fingerprint_audio(&sig, 44_100, &params).expect("cpu");
        }
        let cpu_ms = t.elapsed().as_secs_f64() * 1000.0 / iters as f64;

        let t = Instant::now();
        for _ in 0..iters {
            let _ = metal.fingerprint_audio(&sig, 44_100, &params).expect("metal");
        }
        let metal_ms = t.elapsed().as_secs_f64() * 1000.0 / iters as f64;

        let faster = if metal_ms < cpu_ms { "metal" } else { "cpu" };
        println!(
            "| {:>6} | {:>4} | {:>10.3} | {:>10.3} | {} |",
            len, iters, cpu_ms, metal_ms, faster
        );
    }
}

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
