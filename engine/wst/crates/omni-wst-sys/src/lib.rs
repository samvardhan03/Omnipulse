// SPDX-License-Identifier: AGPL-3.0-or-later
//! omni-wst-sys — Zero-copy CXX FFI bindings to the omni-wst-core CUDA pipeline.
//!
//! This crate provides the `#[cxx::bridge]` definitions that mirror the C++
//! `WSTResult` struct and `run_wst_pipeline` function. The cxx crate statically
//! validates ABI alignment between Rust and C++ at compile time, eliminating an
//! entire class of FFI misalignment bugs at zero runtime cost.
//!
//! TDD Reference: Phase 2, Section 2.1 — Zero-Cost cxx FFI Bridge

pub mod safe;

#[cxx::bridge]
pub mod ffi {
    /// Mirror of the C++ `WSTResult` POD struct.
    ///
    /// All fields are `u64` to guarantee identical in-memory representation in
    /// both C++ and Rust (no padding, no alignment surprises). The cxx crate
    /// validates this alignment at compile time.
    #[derive(Debug, Clone, Copy)]
    pub struct WSTResult {
        /// Opaque `CUdeviceptr` cast to `u64`. Points to the scattering
        /// coefficient tensor that lives in GPU VRAM. This pointer is never
        /// dereferenced by Rust — it is forwarded directly to the Arrow Plasma
        /// shared-memory store as an ObjectID source, avoiding any D2H memcpy.
        pub fingerprint_ptr: u64,

        /// Total number of `f32` scattering coefficients in the output tensor.
        /// Allows the orchestrator to size the Plasma allocation correctly
        /// without touching the GPU memory.
        pub coeff_count: u64,

        /// Wall-clock CUDA kernel execution time in microseconds.
        /// Consumed by the FinOps autoscaler (Section 4.2.2) for GPU cost tracking.
        pub exec_time_us: u64,
    }

    unsafe extern "C++" {
        include!("wst_bridge.h");

        /// Execute the WST/JTFS pipeline on a batch of signals provided via an
        /// Apache Arrow Plasma mmap pointer.
        ///
        /// # Safety
        /// - `input_plasma_ptr` must be a valid host-side pointer to a contiguous
        ///   buffer of `signal_len * batch_size` `f32` values.
        /// - The buffer must remain live until this function returns.
        /// - The returned `WSTResult.fingerprint_ptr` must be passed to
        ///   `free_wst_result` when no longer needed to avoid GPU memory leaks.
        fn run_wst_pipeline(
            input_plasma_ptr: u64,
            signal_len: i32,
            batch_size: i32,
            j: i32,
            q: i32,
            depth: i32,
            use_jtfs: bool,
        ) -> WSTResult;

        /// Release the GPU tensor allocated by `run_wst_pipeline`.
        ///
        /// # Safety
        /// - Must be called exactly once per `WSTResult`.
        /// - Must not be called after the Plasma store has taken ownership.
        fn free_wst_result(result: WSTResult);
    }
}

pub use ffi::{free_wst_result, run_wst_pipeline, WSTResult};
