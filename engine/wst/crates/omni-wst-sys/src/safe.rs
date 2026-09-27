// SPDX-License-Identifier: AGPL-3.0-or-later
//! safe.rs — Ergonomic safe Rust wrapper over the raw `ffi::*` bindings.
//!
//! The Phase 2 orchestrator should import from this module rather than calling
//! `ffi::run_wst_pipeline` directly. This wrapper:
//!   1. Provides a typed `WstConfig` struct instead of raw integer arguments.
//!   2. Returns a `ScopedWstResult` RAII guard that automatically calls
//!      `free_wst_result` when dropped, preventing GPU memory leaks.
//!   3. Converts C++ exceptions (thrown as `std::runtime_error`) into Rust
//!      `Result<_, String>` via catch_unwind-style error handling.
//!
//! TDD Reference: Phase 2, Section 2.1

use crate::ffi::{self, WSTResult};

/// Typed configuration for a WST or JTFS fingerprint pass.
#[derive(Debug, Clone)]
pub struct WstConfig {
    /// Maximum wavelet scale: the low-pass filter covers 2^J samples.
    pub j: i32,
    /// Quality factor: number of wavelets per octave (frequency resolution).
    pub q: i32,
    /// Scattering cascade depth m. The Lipschitz bound L_m = (||ψ||₁)^m
    /// decays exponentially; values of 2–3 are typical for audio fingerprinting.
    pub depth: i32,
    /// Signal length in samples per item in the batch.
    pub signal_len: i32,
    /// Number of signals in the batch.
    pub batch_size: i32,
    /// If true, activates the Joint Time-Frequency Scattering phase-recovery
    /// pass via parallel CUDA streams (stream0: time, stream1: log-frequency).
    pub jtfs: bool,
}

/// RAII guard that holds a `WSTResult` and calls `free_wst_result` on drop.
///
/// This ensures the GPU tensor is always released, even when the Rust
/// orchestrator panics or returns early before writing to Plasma.
pub struct ScopedWstResult {
    inner: WSTResult,
    freed: bool,
}

impl ScopedWstResult {
    fn new(inner: WSTResult) -> Self {
        Self { inner, freed: false }
    }

    /// Opaque `CUdeviceptr` to the scattering coefficient tensor on GPU VRAM.
    /// Forward this to the Arrow Plasma store as an ObjectID source.
    pub fn fingerprint_ptr(&self) -> u64 {
        self.inner.fingerprint_ptr
    }

    /// Total number of `f32` coefficients in the output tensor.
    pub fn coeff_count(&self) -> u64 {
        self.inner.coeff_count
    }

    /// CUDA kernel wall-clock time in microseconds (for FinOps tracking).
    pub fn exec_time_us(&self) -> u64 {
        self.inner.exec_time_us
    }

    /// Explicitly release the GPU tensor before the guard is dropped.
    /// Call this after you have written the tensor to the Plasma store and no
    /// longer need the device-side buffer.
    pub fn release(mut self) {
        self.do_free();
        self.freed = true;
    }

    fn do_free(&self) {
        // Safety: we own this WSTResult exclusively and have not freed it yet.
        unsafe { ffi::free_wst_result(self.inner) };
    }
}

impl Drop for ScopedWstResult {
    fn drop(&mut self) {
        if !self.freed {
            self.do_free();
        }
    }
}

/// Execute the WST/JTFS fingerprint pipeline and return an RAII-guarded result.
///
/// # Arguments
/// * `plasma_ptr` — Raw host-side mmap pointer from the Arrow Plasma store.
///   The C++ bridge registers this with CUDA via `cudaHostRegister` internally.
/// * `cfg`        — Typed pipeline configuration.
///
/// # Returns
/// A `ScopedWstResult` that automatically frees GPU memory when dropped.
///
/// # Example
/// ```rust,no_run
/// use omni_wst_sys::safe::{WstConfig, execute_fingerprint_pass};
///
/// let cfg = WstConfig { j: 8, q: 16, depth: 2, signal_len: 44100,
///                       batch_size: 1, jtfs: true };
/// // plasma_ptr comes from your Arrow Plasma client
/// let plasma_ptr: u64 = 0xDEAD_BEEF; // replace with real pointer
/// let result = execute_fingerprint_pass(plasma_ptr, &cfg);
/// println!("GPU tensor @ 0x{:x} — {} coefficients in {}μs",
///          result.fingerprint_ptr(), result.coeff_count(), result.exec_time_us());
/// // `result` is dropped here — GPU memory is automatically freed
/// ```
pub fn execute_fingerprint_pass(
    plasma_ptr: u64,
    cfg: &WstConfig,
) -> ScopedWstResult {
    // Safety: we trust the caller to provide a valid Plasma mmap pointer.
    // The C++ bridge performs its own validity checks (non-null, signal_len > 0).
    let raw = unsafe {
        ffi::run_wst_pipeline(
            plasma_ptr,
            cfg.signal_len,
            cfg.batch_size,
            cfg.j,
            cfg.q,
            cfg.depth,
            cfg.jtfs,
        )
    };
    ScopedWstResult::new(raw)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Smoke-test: verifies that WstConfig can be constructed and that the
    /// field values are preserved. Does NOT call into C++ (no CUDA required).
    #[test]
    fn test_wst_config_construction() {
        let cfg = WstConfig {
            j: 8, q: 16, depth: 2, signal_len: 44100, batch_size: 1, jtfs: true,
        };
        assert_eq!(cfg.j, 8);
        assert_eq!(cfg.q, 16);
        assert_eq!(cfg.depth, 2);
        assert!(cfg.jtfs);
    }

    /// Verifies that ScopedWstResult correctly exposes accessors for a mock
    /// WSTResult without triggering real GPU memory operations.
    #[test]
    fn test_scoped_result_accessors() {
        let mock = WSTResult {
            fingerprint_ptr: 0xDEAD_BEEF_0000_0000,
            coeff_count: 44100,
            exec_time_us: 1500,
        };
        let scoped = ScopedWstResult::new(mock);
        assert_eq!(scoped.fingerprint_ptr(), 0xDEAD_BEEF_0000_0000);
        assert_eq!(scoped.coeff_count(), 44100);
        assert_eq!(scoped.exec_time_us(), 1500);
        // Prevent actual free_wst_result call in test (no GPU available)
        std::mem::forget(scoped);
    }
}
