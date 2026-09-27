// SPDX-License-Identifier: AGPL-3.0-or-later
//! Fingerprint and its parameter set.

use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};

/// Parameters for a single WST scattering pass. The tuple
/// (J, Q, depth, config_version) is what makes two fingerprints comparable.
///
/// A change in any field must bump `config_version`; the platform refuses to
/// mix fingerprints across config versions (rule 11 in `CLAUDE.md`).
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct WstParams {
    /// Number of octaves.
    pub j: u32,
    /// Wavelets per octave.
    pub q: u32,
    /// Scattering depth.
    pub depth: u32,
    /// Opaque version string identifying this parameter regime plus any
    /// downstream reduction. Fingerprints only match across the same value.
    pub config_version: String,
}

impl WstParams {
    /// Default WST parameters used by the reference CPU path.
    pub fn default_v1() -> Self {
        Self {
            j: 6,
            q: 8,
            depth: 2,
            config_version: "op-wst-1".to_string(),
        }
    }
}

/// A scattering-coefficient fingerprint produced by a [`crate::WstBackend`].
///
/// `coefficients` is the raw scattering output for whichever modality it was
/// produced from. `digest` is `SHA3-256(coefficients_le_bytes)`, hex-encoded,
/// and is what the verdict crate compares for `Exact` matches.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Fingerprint {
    /// Raw scattering coefficients (row-major, one point per position).
    pub coefficients: Vec<f32>,
    /// The parameter set used to produce this fingerprint.
    pub params: WstParams,
    /// Hex-encoded SHA3-256 of `coefficients` bytes (little-endian f32).
    pub digest: String,
    /// Which backend produced this fingerprint (for audit and debug).
    pub backend: String,
}

impl Fingerprint {
    /// Compute the SHA3-256 digest of a coefficient vector, hex-encoded.
    pub fn digest_of(coefficients: &[f32]) -> String {
        let mut hasher = Sha3_256::new();
        for c in coefficients {
            hasher.update(c.to_le_bytes());
        }
        hex::encode(hasher.finalize())
    }

    /// Assemble a fingerprint from raw coefficients and metadata. The digest
    /// is computed here so callers cannot forget it.
    pub fn new(coefficients: Vec<f32>, params: WstParams, backend: &'static str) -> Self {
        let digest = Self::digest_of(&coefficients);
        Self {
            coefficients,
            params,
            digest,
            backend: backend.to_string(),
        }
    }

    /// Dimensionality of one coefficient vector. Provided for parity with
    /// the vector index dim() contract.
    pub fn dim(&self) -> usize {
        self.coefficients.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn digest_is_deterministic() {
        let coeffs = vec![1.0f32, 2.0, 3.0, 4.0];
        let a = Fingerprint::digest_of(&coeffs);
        let b = Fingerprint::digest_of(&coeffs);
        assert_eq!(a, b);
    }

    #[test]
    fn digest_changes_with_content() {
        let a = Fingerprint::digest_of(&[1.0f32, 2.0]);
        let b = Fingerprint::digest_of(&[1.0f32, 2.000001]);
        assert_ne!(a, b);
    }

    #[test]
    fn new_computes_digest() {
        let fp = Fingerprint::new(vec![0.0f32, 1.0, 2.0], WstParams::default_v1(), "cpu");
        assert_eq!(fp.digest, Fingerprint::digest_of(&fp.coefficients));
    }
}
