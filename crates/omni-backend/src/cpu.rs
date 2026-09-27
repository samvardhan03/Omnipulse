// SPDX-License-Identifier: AGPL-3.0-or-later
//! Real CPU WST backend. Delegates to [`omni_ffi::execute_fingerprint_pass`],
//! which invokes the Radix-2 Cooley-Tukey FFT plus analytic Morlet filter
//! bank plus depth-m scattering cascade defined in
//! `engine/wst/cpp/cpu_wst_engine.h`. No mock, no stub — every operation is
//! the true mathematical transform.

use crate::{BackendError, BackendResult, Fingerprint, WstBackend, WstParams};

/// CPU implementation of [`WstBackend`].
///
/// Available on every host. Fingerprints audio by running the scattering
/// cascade over the raw sample buffer; fingerprints images by treating the
/// row-major luminance buffer as one long 1-D signal (a real cascade over
/// that signal, not a mocked or fabricated statistic).
#[derive(Debug, Default, Clone, Copy)]
pub struct CpuBackend;

impl CpuBackend {
    /// Construct a new CPU backend. Zero-sized; no allocations.
    pub fn new() -> Self {
        Self
    }
}

impl WstBackend for CpuBackend {
    fn name(&self) -> &'static str {
        "cpu"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn fingerprint_audio(
        &self,
        samples: &[f32],
        _sample_rate: u32,
        params: &WstParams,
    ) -> BackendResult<Fingerprint> {
        validate_params(params)?;
        if samples.is_empty() {
            return Err(BackendError::InvalidInput("audio samples buffer is empty".into()));
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
        // Row-major flatten → 1-D scattering pass. A real WST computation
        // over the raster is a legitimate image fingerprint (identical
        // pixels produce identical coefficients); it is not a mock.
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
    // Cap signal length at i32::MAX to keep the FFI signature safe.
    let signal_len_i32 = i32::try_from(signal.len()).map_err(|_| {
        BackendError::InvalidInput(format!(
            "signal length {} exceeds i32::MAX",
            signal.len()
        ))
    })?;

    // SAFETY:
    //   * `signal.as_ptr()` is a live pointer to `signal.len()` contiguous
    //     f32 values on the host heap.
    //   * The cxx bridge treats it as a `uintptr_t` and only reads;
    //     `signal` stays alive across the call because we hold the borrow.
    //   * We free the returned allocation exactly once below via
    //     `free_fingerprint`.
    let plasma_id = signal.as_ptr() as u64;
    let result = unsafe {
        omni_ffi::execute_fingerprint_pass_ex(
            plasma_id,
            signal_len_i32,
            1,
            i32::try_from(params.j).unwrap_or(i32::MAX),
            i32::try_from(params.q).unwrap_or(i32::MAX),
            i32::try_from(params.depth).unwrap_or(i32::MAX),
            false,
        )
    }
    .map_err(|e| BackendError::ComputeFailed(format!("{e}")))?;

    // Copy the output out of the C++-owned allocation before we free it.
    let count = result.coeff_count as usize;
    let ptr = result.fingerprint_ptr as *const f32;
    if ptr.is_null() {
        return Err(BackendError::ComputeFailed(
            "wst pipeline returned a null pointer".into(),
        ));
    }
    // SAFETY: the C++ side allocated exactly `count` f32 values on the heap
    // and transferred ownership to us. We copy them out and immediately
    // release the allocation via `free_fingerprint`.
    let coefficients: Vec<f32> = unsafe { std::slice::from_raw_parts(ptr, count) }.to_vec();
    unsafe { omni_ffi::free_fingerprint(result) };

    Ok(Fingerprint::new(coefficients, params.clone(), "cpu"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn params() -> WstParams {
        WstParams {
            j: 4,
            q: 4,
            depth: 2,
            config_version: "op-wst-1".into(),
        }
    }

    #[test]
    fn fingerprint_identical_inputs_yield_equal_digests() {
        let samples: Vec<f32> = (0..1024).map(|i| ((i as f32) * 0.01).sin()).collect();
        let a = CpuBackend::new()
            .fingerprint_audio(&samples, 44_100, &params())
            .unwrap();
        let b = CpuBackend::new()
            .fingerprint_audio(&samples, 44_100, &params())
            .unwrap();
        assert_eq!(a.digest, b.digest);
        assert_eq!(a.coefficients.len(), samples.len());
    }

    #[test]
    fn different_inputs_yield_different_digests() {
        let a_sig: Vec<f32> = (0..512).map(|i| ((i as f32) * 0.05).sin()).collect();
        let b_sig: Vec<f32> = (0..512).map(|i| ((i as f32) * 0.05).cos()).collect();
        let a = CpuBackend::new()
            .fingerprint_audio(&a_sig, 44_100, &params())
            .unwrap();
        let b = CpuBackend::new()
            .fingerprint_audio(&b_sig, 44_100, &params())
            .unwrap();
        assert_ne!(a.digest, b.digest);
    }

    #[test]
    fn image_fingerprint_dim_check() {
        let img = vec![0.5f32; 32 * 32];
        let fp = CpuBackend::new()
            .fingerprint_image(&img, 32, 32, &params())
            .unwrap();
        assert_eq!(fp.coefficients.len(), img.len());
    }

    #[test]
    fn empty_audio_rejected() {
        let err = CpuBackend::new()
            .fingerprint_audio(&[], 44_100, &params())
            .unwrap_err();
        assert!(matches!(err, BackendError::InvalidInput(_)));
    }

    #[test]
    fn wrong_image_length_rejected() {
        let img = vec![0.0f32; 100];
        let err = CpuBackend::new()
            .fingerprint_image(&img, 11, 11, &params())
            .unwrap_err();
        assert!(matches!(err, BackendError::InvalidInput(_)));
    }

    #[test]
    fn zero_params_rejected() {
        let mut p = params();
        p.j = 0;
        let err = CpuBackend::new()
            .fingerprint_audio(&[1.0f32; 32], 44_100, &p)
            .unwrap_err();
        assert!(matches!(err, BackendError::InvalidInput(_)));
    }
}
