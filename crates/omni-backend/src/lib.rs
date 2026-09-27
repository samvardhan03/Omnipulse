// SPDX-License-Identifier: AGPL-3.0-or-later
//! # omni-backend
//!
//! The single compute seam for OmniPulse. Everything that fingerprints media
//! flows through [`WstBackend`]. There are three declared kinds
//! ([`BackendKind`]) and one real implementation in this session
//! ([`CpuBackend`]); the CUDA and Metal variants are declared so that later
//! phases (P8-C, P8-M) can drop in without shape churn.
//!
//! Fail-loud rules from `CLAUDE.md`:
//! - Explicitly requesting an unavailable backend is a typed error.
//!   [`select_backend`] does not silently fall back.
//! - `auto` is allowed and logs which backend it picked.
//! - No stub math for CUDA or Metal here. The Rust variants return
//!   [`BackendError::BackendUnavailable`] until real implementations exist.

#![warn(missing_docs)]

mod cpu;
mod fingerprint;
mod kind;
#[cfg(feature = "metal")]
mod metal;

pub use cpu::CpuBackend;
pub use fingerprint::{Fingerprint, WstParams};
pub use kind::{parse_env_selection, select_backend, BackendKind, BackendSelection};
#[cfg(feature = "metal")]
pub use metal::MetalBackend;

/// Re-export of the raw Metal-sys crate. Exposed under the `metal` feature so
/// tests and diagnostic tools can query device info and call the FFT layer
/// directly without depending on omni-metal-sys as a separate dev-dependency.
#[cfg(feature = "metal")]
pub use omni_metal_sys;

use thiserror::Error;

/// Errors returned by any [`WstBackend`] implementation.
#[derive(Debug, Error)]
pub enum BackendError {
    /// The backend the caller asked for is not compiled in on this build,
    /// or the runtime device probe failed. Never a silent fallback.
    #[error("backend {kind} is not available on this build: {reason}")]
    BackendUnavailable {
        /// Which backend was requested.
        kind: BackendKind,
        /// Human-readable reason (e.g. "CUDA feature not enabled").
        reason: String,
    },
    /// Input parameters failed validation (empty samples, zero-sized image,
    /// non-positive J/Q/depth, etc.).
    #[error("invalid input: {0}")]
    InvalidInput(String),
    /// The underlying compute call raised an error (C++ exception, driver
    /// failure). The message is passed through verbatim.
    #[error("backend compute failed: {0}")]
    ComputeFailed(String),
    /// The caller provided an unknown backend name.
    #[error("unknown backend name: {0}")]
    UnknownBackend(String),
}

/// Result type for backend calls.
pub type BackendResult<T> = std::result::Result<T, BackendError>;

/// The compute seam. Every fingerprint produced by the platform is produced
/// through this trait. Two modalities, one backend selection per process.
pub trait WstBackend: Send + Sync {
    /// The short name used in logs and returned as `Fingerprint::backend`.
    fn name(&self) -> &'static str;

    /// True when the backend can actually run on this build and host.
    /// [`select_backend`] uses this to reject explicit requests that would
    /// otherwise silently fall through to a stub.
    fn is_available(&self) -> bool;

    /// Fingerprint an audio buffer.
    ///
    /// `samples` is a monaural, contiguous f32 buffer. The backend runs a
    /// depth-`params.depth` scattering cascade and returns the coefficient
    /// vector plus a SHA3-256 digest of it.
    fn fingerprint_audio(
        &self,
        samples: &[f32],
        sample_rate: u32,
        params: &WstParams,
    ) -> BackendResult<Fingerprint>;

    /// Fingerprint an image. `pixels` is a monochrome f32 luminance buffer
    /// of length `w * h`. Colour inputs should be reduced to luminance
    /// before calling.
    fn fingerprint_image(
        &self,
        pixels: &[f32],
        w: u32,
        h: u32,
        params: &WstParams,
    ) -> BackendResult<Fingerprint>;
}
