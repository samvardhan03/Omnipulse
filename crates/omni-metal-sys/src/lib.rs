// SPDX-License-Identifier: AGPL-3.0-or-later
//! # omni-metal-sys
//!
//! Metal-shading-language WST backend for OmniPulse. Belongs to the
//! WST/cxx FFI family described in `docs/specs/omnipulse_product_and_metal.md`
//! Part C.5. This crate belongs to WST/cxx FFI family 1 only.
//!
//! ## Shader paths (Part J.2 of licensing_and_site_blueprint.md)
//!
//! There are two, chosen at build time by `OMNIPULSE_METAL_SHADERS`:
//!
//! * `source`   — the raw `.metal` files are embedded via `include_str!` and
//!   compiled at runtime by the Metal driver with `newLibraryWithSource:`,
//!   `fastMathEnabled=NO`, `languageVersion=MTLLanguageVersion2_4`. This is
//!   the only path that runs on hosts without the full Xcode toolchain
//!   (Command Line Tools do not ship `xcrun metal`).
//!
//! * `metallib` — `build.rs` compiles the shaders offline with
//!   `xcrun -sdk macosx metal` (MSL 2.4, `-fno-fast-math`,
//!   `-mmacosx-version-min=13.0`) and links them into a `default.metallib`
//!   embedded via `include_bytes!`. Chosen by release builds and CI.
//!
//! Both paths write the SHA-256 of the shader sources into
//! [`SHADER_HASH`] so a metallib can be tied back to the source it was
//! built from. [`DeviceInfo::shader_path`] and [`DeviceInfo::shader_hash`]
//! surface this at runtime.
//!
//! ## Device selection
//!
//! `OMNIPULSE_METAL_DEVICE` picks a GPU. Empty or unset keeps
//! `MTLCreateSystemDefaultDevice()`. Otherwise:
//!
//! * bare integer  — index into `MTLCopyAllDevices()`, or, when out of
//!                   range, a match against `MTLDevice.registryID`
//! * text          — case-insensitive substring match on `MTLDevice.name`
//!
//! A selector that matches nothing raises `MetalError::Unavailable` with the
//! full list of available devices. There is no silent default.
//!
//! ## Fail-loud contract
//!
//! * If the caller asks for a compute op and the backend was not built,
//!   they get [`MetalError::Unavailable`] with a concrete reason. There is
//!   no silent fallback to CPU or to any other backend.
//! * If the caller asks for a length that is not a power of two, they get
//!   [`MetalError::UnsupportedLength`]. No silent padding, no rounding.

#![warn(missing_docs)]

use thiserror::Error;

/// SHA-256 of the embedded shader sources, computed by `build.rs` in a
/// canonical form (file name + null + bytes + null, in a fixed order).
/// Reported by [`device_info`] and printed by the parity test so a downstream
/// log stays attributable to one exact shader revision.
pub const SHADER_HASH: &str = env!("OMNIPULSE_METAL_SHADER_HASH");

/// Which shader-loading path was compiled into this build: "metallib",
/// "source", or "unavailable" (feature off / non-macOS). Chosen at build
/// time by `OMNIPULSE_METAL_SHADERS` and never changes for a given binary.
pub const SHADER_PATH: &str = env!("OMNIPULSE_METAL_SHADER_PATH");

/// Errors surfaced by the Metal backend.
#[derive(Debug, Error)]
pub enum MetalError {
    /// The `metal` feature was not compiled, the target is not macOS,
    /// `MTLCreateSystemDefaultDevice()` returned nil, or a selector picked
    /// no device.
    #[error("metal backend unavailable: {0}")]
    Unavailable(String),
    /// FFT length is not a power of two, or WST signal length is zero.
    #[error("unsupported length: {0}")]
    UnsupportedLength(String),
    /// Slice sizes do not match the transform parameters.
    #[error("input/output size mismatch: {0}")]
    SizeMismatch(String),
    /// A GPU-side call (pipeline compile, dispatch, etc.) failed.
    #[error("metal compute failed: {0}")]
    ComputeFailed(String),
}

/// Info returned by [`device_info`], useful for logging and for the parity
/// test's self-identifying header.
#[derive(Debug, Clone, Copy)]
pub struct DeviceInfo {
    /// `true` when a Metal device and command queue were created.
    pub is_available: bool,
    /// `true` on Apple-silicon-style unified memory; `false` on discrete
    /// GPUs where buffers use `MTLStorageModeManaged`.
    pub has_unified_memory: bool,
    /// Human-readable storage mode: "shared" or "managed".
    pub storage_mode: &'static str,
    /// Which shader path this binary uses: "source", "metallib" or
    /// "unavailable". Matches [`SHADER_PATH`].
    pub shader_path: &'static str,
    /// SHA-256 of the shader sources this binary was built from. Matches
    /// [`SHADER_HASH`].
    pub shader_hash: &'static str,
}

#[cfg(all(target_os = "macos", feature = "metal"))]
mod backend {
    use super::{DeviceInfo, MetalError, SHADER_HASH, SHADER_PATH};

    // Shader payload, one of two paths per build.
    #[cfg(shader_path_metallib)]
    const METALLIB: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/default.metallib"));

    #[cfg(shader_path_source)]
    const SHADER_SOURCE: &str = concat!(
        include_str!("../shaders/fft_stockham.metal"),
        "\n",
        include_str!("../shaders/wst_ops.metal"),
    );

    #[cxx::bridge(namespace = "omni_metal")]
    #[allow(dead_code)]
    mod ffi {
        // Shared POD returned by metal_device_info(). Layout is fixed by cxx.
        struct MetalDeviceInfo {
            is_available: bool,
            has_unified_memory: bool,
            /// 0 == shared, 1 == managed.
            storage_mode: u32,
            /// 0 == source, 1 == metallib, 2 == uninitialised.
            shader_path: u32,
        }

        unsafe extern "C++" {
            include!("metal_bridge.h");

            fn metal_init_with_metallib(
                metallib_bytes: &[u8],
                device_selector: &str,
            ) -> Result<bool>;
            fn metal_init_with_source(
                shader_source: &str,
                device_selector: &str,
            ) -> Result<bool>;

            fn metal_device_info() -> MetalDeviceInfo;
            fn metal_list_devices() -> String;

            fn metal_fft_forward(data: &mut [f32], n: u32) -> Result<()>;
            fn metal_fft_inverse(data: &mut [f32], n: u32) -> Result<()>;

            fn metal_wst_forward(
                input: &[f32],
                output: &mut [f32],
                signal_len: u32,
                j: u32,
                q: u32,
                depth: u32,
            ) -> Result<()>;

            fn metal_debug_set_sentinel(pattern: u32, enabled: bool);
            fn metal_debug_set_skip_sync(skip: bool);
        }
    }

    use std::sync::OnceLock;
    static INIT: OnceLock<Result<(), String>> = OnceLock::new();

    fn env_device_selector() -> String {
        std::env::var("OMNIPULSE_METAL_DEVICE").unwrap_or_default()
    }

    fn init_once() -> Result<(), String> {
        let selector = env_device_selector();
        let outcome: Result<bool, String> = {
            #[cfg(shader_path_metallib)]
            {
                ffi::metal_init_with_metallib(METALLIB, &selector).map_err(|e| e.to_string())
            }
            #[cfg(shader_path_source)]
            {
                ffi::metal_init_with_source(SHADER_SOURCE, &selector).map_err(|e| e.to_string())
            }
        };
        match outcome {
            Ok(true) => Ok(()),
            Ok(false) => Err(format!(
                "no Metal device on host (selector={selector:?}); \
                 available devices:\n{}",
                ffi::metal_list_devices()
            )),
            Err(msg) => Err(msg),
        }
    }

    fn ensure_init() -> Result<(), MetalError> {
        match INIT.get_or_init(init_once) {
            Ok(()) => Ok(()),
            Err(msg) => Err(MetalError::Unavailable(msg.clone())),
        }
    }

    pub fn device_info() -> DeviceInfo {
        let _ = ensure_init();
        let raw = ffi::metal_device_info();
        DeviceInfo {
            is_available: raw.is_available,
            has_unified_memory: raw.has_unified_memory,
            storage_mode: if raw.storage_mode == 0 { "shared" } else { "managed" },
            shader_path: SHADER_PATH,
            shader_hash: SHADER_HASH,
        }
    }

    pub fn is_available() -> bool {
        ensure_init().is_ok()
    }

    /// Return the specific reason initialisation failed, so callers can
    /// surface it verbatim in `BackendError::BackendUnavailable::reason`
    /// instead of collapsing everything to a generic "device unavailable".
    pub fn unavailable_reason() -> Option<String> {
        match ensure_init() {
            Ok(()) => None,
            Err(MetalError::Unavailable(m)) => Some(m),
            Err(other) => Some(format!("{other}")),
        }
    }

    pub fn list_devices() -> String {
        ffi::metal_list_devices()
    }

    pub fn fft_forward_inplace(data: &mut [f32], n: u32) -> Result<(), MetalError> {
        validate_fft_len(n, data.len())?;
        ensure_init()?;
        ffi::metal_fft_forward(data, n).map_err(|e| MetalError::ComputeFailed(format!("{e}")))
    }

    pub fn fft_inverse_inplace(data: &mut [f32], n: u32) -> Result<(), MetalError> {
        validate_fft_len(n, data.len())?;
        ensure_init()?;
        ffi::metal_fft_inverse(data, n).map_err(|e| MetalError::ComputeFailed(format!("{e}")))
    }

    pub fn wst_forward(
        input: &[f32],
        output: &mut [f32],
        signal_len: u32,
        j: u32,
        q: u32,
        depth: u32,
    ) -> Result<(), MetalError> {
        if signal_len == 0 {
            return Err(MetalError::UnsupportedLength("signal_len must be > 0".into()));
        }
        if j == 0 || q == 0 || depth == 0 {
            return Err(MetalError::SizeMismatch(format!(
                "j, q, depth must be positive (got j={j}, q={q}, depth={depth})"
            )));
        }
        if input.len() != signal_len as usize {
            return Err(MetalError::SizeMismatch(format!(
                "input length {} != signal_len {}",
                input.len(),
                signal_len
            )));
        }
        if output.len() != signal_len as usize {
            return Err(MetalError::SizeMismatch(format!(
                "output length {} != signal_len {}",
                output.len(),
                signal_len
            )));
        }
        ensure_init()?;
        ffi::metal_wst_forward(input, output, signal_len, j, q, depth)
            .map_err(|e| MetalError::ComputeFailed(format!("{e}")))
    }

    fn validate_fft_len(n: u32, slice_len: usize) -> Result<(), MetalError> {
        if n == 0 || (n & (n - 1)) != 0 {
            return Err(MetalError::UnsupportedLength(format!(
                "FFT length must be a power of two, got {n}"
            )));
        }
        let want = 2usize * n as usize;
        if slice_len != want {
            return Err(MetalError::SizeMismatch(format!(
                "data slice length {slice_len} != 2*N = {want}"
            )));
        }
        Ok(())
    }

    /// Test-only hooks. Enabled only when the `debug-hooks` cargo feature
    /// is on. See the stale-read guard in
    /// `crates/omni-backend/tests/parity_cpu_vs_metal.rs`.
    #[cfg(feature = "debug-hooks")]
    pub mod debug {
        use super::ffi;

        /// Fill every scratch and output buffer with `pattern` before each
        /// dispatch. Off by default. Passing `enabled=false` clears the flag
        /// and returns the bridge to normal operation.
        pub fn set_sentinel(pattern: u32, enabled: bool) {
            ffi::metal_debug_set_sentinel(pattern, enabled);
        }

        /// Force the bridge to skip `synchronizeResource:` on Managed
        /// storage, so a missing sync path can be verified to fail loudly.
        /// Off by default.
        pub fn set_skip_sync(skip: bool) {
            ffi::metal_debug_set_skip_sync(skip);
        }
    }
}

#[cfg(not(all(target_os = "macos", feature = "metal")))]
mod backend {
    use super::{DeviceInfo, MetalError, SHADER_HASH, SHADER_PATH};

    const REASON: &str =
        "omni-metal-sys was compiled without the metal feature or on a non-macOS target";

    pub fn device_info() -> DeviceInfo {
        DeviceInfo {
            is_available: false,
            has_unified_memory: false,
            storage_mode: "n/a",
            shader_path: SHADER_PATH,
            shader_hash: SHADER_HASH,
        }
    }
    pub fn is_available() -> bool {
        false
    }
    pub fn unavailable_reason() -> Option<String> {
        Some(REASON.into())
    }
    pub fn list_devices() -> String {
        String::new()
    }
    pub fn fft_forward_inplace(_data: &mut [f32], _n: u32) -> Result<(), MetalError> {
        Err(MetalError::Unavailable(REASON.into()))
    }
    pub fn fft_inverse_inplace(_data: &mut [f32], _n: u32) -> Result<(), MetalError> {
        Err(MetalError::Unavailable(REASON.into()))
    }
    pub fn wst_forward(
        _input: &[f32],
        _output: &mut [f32],
        _signal_len: u32,
        _j: u32,
        _q: u32,
        _depth: u32,
    ) -> Result<(), MetalError> {
        Err(MetalError::Unavailable(REASON.into()))
    }

    #[cfg(feature = "debug-hooks")]
    pub mod debug {
        pub fn set_sentinel(_pattern: u32, _enabled: bool) {}
        pub fn set_skip_sync(_skip: bool) {}
    }
}

/// Query whether the Metal backend was compiled in and a device could be
/// created. Never panics; safe to call in probe paths.
pub fn is_available() -> bool {
    backend::is_available()
}

/// Return a static device descriptor. The parity test prints this at the
/// top of its output so any log copied off the machine is self-identifying.
pub fn device_info() -> DeviceInfo {
    backend::device_info()
}

/// Enumerate all MTLDevices on the host. Returns a newline-separated list of
/// `"index\tregistry_id\tname"` rows. Empty on non-macOS builds.
pub fn list_devices() -> String {
    backend::list_devices()
}

/// If Metal is not available, return the specific reason. Some backends
/// upstream forward this into `BackendError::BackendUnavailable::reason` so
/// operators see the actual failure (bad selector, missing driver, etc.)
/// instead of a generic message.
pub fn unavailable_reason() -> Option<String> {
    backend::unavailable_reason()
}

/// Run an in-place forward FFT of a complex signal encoded as interleaved
/// `[re, im, re, im, ...]` floats. `data.len()` must be exactly `2 * n`,
/// and `n` must be a power of two. Normalization is unitary: 1/sqrt(N).
pub fn fft_forward_inplace(data: &mut [f32], n: u32) -> Result<(), MetalError> {
    backend::fft_forward_inplace(data, n)
}

/// In-place inverse FFT with matching 1/sqrt(N) normalization.
pub fn fft_inverse_inplace(data: &mut [f32], n: u32) -> Result<(), MetalError> {
    backend::fft_inverse_inplace(data, n)
}

/// Full depth-`depth` WST scattering cascade over a real signal. Output
/// carries the real-valued scattering coefficients of length `signal_len`.
/// Numerically matches `engine/wst/cpp/cpu_wst_engine.h`'s `cpu_wst_forward`.
pub fn wst_forward(
    input: &[f32],
    output: &mut [f32],
    signal_len: u32,
    j: u32,
    q: u32,
    depth: u32,
) -> Result<(), MetalError> {
    backend::wst_forward(input, output, signal_len, j, q, depth)
}

/// Test-only knobs exposed under the `debug-hooks` cargo feature.
#[cfg(feature = "debug-hooks")]
pub use backend::debug;
