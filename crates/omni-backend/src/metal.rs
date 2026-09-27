// SPDX-License-Identifier: AGPL-3.0-or-later
//! Metal WST backend adaptor.
//!
//! Only compiled when the `metal` feature is on. Delegates to
//! `omni-metal-sys::wst_forward`, which drives the Stockham FFT and the WST
//! ops kernels through the Metal cxx bridge. Every operation is real: no
//! stub, no silent CPU fallback. On device probe failure we return
//! [`BackendError::BackendUnavailable`] instead of quietly downgrading.

use crate::{BackendError, BackendResult, Fingerprint, WstBackend, WstParams};

/// Real Metal implementation of [`WstBackend`].
#[derive(Debug, Default, Clone, Copy)]
pub struct MetalBackend;

impl MetalBackend {
    /// Construct a new Metal backend adapter. Runtime device init happens
    /// lazily inside `omni-metal-sys`; use [`WstBackend::is_available`] to
    /// probe before calling into it.
    pub fn new() -> Self {
        Self
    }
}

impl WstBackend for MetalBackend {
    fn name(&self) -> &'static str {
        "metal"
    }

    fn is_available(&self) -> bool {
        omni_metal_sys::is_available()
    }

    fn fingerprint_audio(
        &self,
        samples: &[f32],
        _sample_rate: u32,
        params: &WstParams,
    ) -> BackendResult<Fingerprint> {
        validate_params(params)?;
        if samples.is_empty() {
            return Err(BackendError::InvalidInput(
                "audio samples buffer is empty".into(),
            ));
        }
        run_cascade(samples, params)
    }

    fn fingerprint_image(
        &self,
        pixels: &[f32],
        w: u32,
        h: u32,
        params: &WstParams,
    ) -> BackendResult<Fingerprint> {
        validate_params(params)?;
        if w == 0 || h == 0 {
            return Err(BackendError::InvalidInput(format!(
                "image dimensions must be non-zero (got {w}x{h})"
            )));
        }
        let expected = (w as usize)
            .checked_mul(h as usize)
            .ok_or_else(|| BackendError::InvalidInput("image dim overflow".into()))?;
        if pixels.len() != expected {
            return Err(BackendError::InvalidInput(format!(
                "image buffer length {} does not match {w}x{h} = {expected}",
                pixels.len()
            )));
        }
        // Same treatment as CpuBackend: run the 1-D scattering cascade over
        // the row-major luminance buffer. This is a legitimate fingerprint,
        // not a mock (identical pixels produce identical coefficients).
        run_cascade(pixels, params)
    }
}

fn validate_params(params: &WstParams) -> BackendResult<()> {
    if params.j == 0 || params.q == 0 || params.depth == 0 {
        return Err(BackendError::InvalidInput(format!(
            "j, q and depth must be positive (got j={}, q={}, depth={})",
            params.j, params.q, params.depth
        )));
    }
    if params.config_version.is_empty() {
        return Err(BackendError::InvalidInput(
            "config_version must not be empty".into(),
        ));
    }
    Ok(())
}

fn run_cascade(signal: &[f32], params: &WstParams) -> BackendResult<Fingerprint> {
    let signal_len = u32::try_from(signal.len()).map_err(|_| {
        BackendError::InvalidInput(format!(
            "signal length {} exceeds u32::MAX",
            signal.len()
        ))
    })?;
    let mut output = vec![0.0f32; signal.len()];
    omni_metal_sys::wst_forward(
        signal,
        &mut output,
        signal_len,
        params.j,
        params.q,
        params.depth,
    )
    .map_err(map_metal_err)?;
    Ok(Fingerprint::new(output, params.clone(), "metal"))
}

fn map_metal_err(e: omni_metal_sys::MetalError) -> BackendError {
    use omni_metal_sys::MetalError as M;
    match e {
        M::Unavailable(msg) => BackendError::BackendUnavailable {
            kind: crate::BackendKind::Metal,
            reason: msg,
        },
        M::UnsupportedLength(msg) | M::SizeMismatch(msg) => BackendError::InvalidInput(msg),
        M::ComputeFailed(msg) => BackendError::ComputeFailed(msg),
    }
}
