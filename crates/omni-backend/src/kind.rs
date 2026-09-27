// SPDX-License-Identifier: AGPL-3.0-or-later
//! Backend selection: env parsing, kind enum, and the runtime picker.

use crate::{BackendError, BackendResult, CpuBackend, WstBackend};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use std::sync::Arc;

/// Which compute backend a worker is running.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BackendKind {
    /// Real CPU WST — always available.
    Cpu,
    /// CUDA WST — available on Linux hosts with NVIDIA and the `cuda` feature.
    /// Not compiled in this build; explicit selection returns
    /// [`BackendError::BackendUnavailable`].
    Cuda,
    /// Metal WST — available on macOS. Not implemented yet (P8-M); explicit
    /// selection returns [`BackendError::BackendUnavailable`].
    Metal,
}

impl fmt::Display for BackendKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            BackendKind::Cpu => "cpu",
            BackendKind::Cuda => "cuda",
            BackendKind::Metal => "metal",
        })
    }
}

impl FromStr for BackendKind {
    type Err = BackendError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_ascii_lowercase().as_str() {
            "cpu" => Ok(BackendKind::Cpu),
            "cuda" => Ok(BackendKind::Cuda),
            "metal" => Ok(BackendKind::Metal),
            other => Err(BackendError::UnknownBackend(other.to_string())),
        }
    }
}

/// Parsed value of `OMNIPULSE_BACKEND`. `Auto` means the process picks the
/// best available backend at startup and logs which one it chose.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackendSelection {
    /// Pick the best available backend and log the choice.
    Auto,
    /// Use exactly this backend. If unavailable, [`select_backend`] returns
    /// [`BackendError::BackendUnavailable`] and never falls back.
    Explicit(BackendKind),
}

impl BackendSelection {
    /// Read `OMNIPULSE_BACKEND` (or the passed override) into a selection.
    /// Unset or empty → [`BackendSelection::Auto`].
    pub fn from_env_var(value: Option<&str>) -> BackendResult<Self> {
        let raw = value.unwrap_or("").trim();
        if raw.is_empty() || raw.eq_ignore_ascii_case("auto") {
            return Ok(BackendSelection::Auto);
        }
        Ok(BackendSelection::Explicit(BackendKind::from_str(raw)?))
    }
}

/// Read `OMNIPULSE_BACKEND` from the process environment and parse it. Named
/// separately from [`BackendSelection::from_env_var`] so tests can call the
/// pure function without touching env state.
pub fn parse_env_selection() -> BackendResult<BackendSelection> {
    let raw = std::env::var("OMNIPULSE_BACKEND").ok();
    BackendSelection::from_env_var(raw.as_deref())
}

/// Resolve a [`BackendSelection`] to a live [`WstBackend`].
///
/// - `Auto` picks the highest-priority available backend (Metal, then CUDA,
///   then CPU) and logs the choice at INFO.
/// - `Explicit(kind)` returns that backend or [`BackendError::BackendUnavailable`].
///   Never a silent fallback.
pub fn select_backend(selection: BackendSelection) -> BackendResult<Arc<dyn WstBackend>> {
    match selection {
        BackendSelection::Explicit(BackendKind::Cpu) => {
            let b = CpuBackend::new();
            tracing::info!(backend = %BackendKind::Cpu, "explicit backend selected");
            Ok(Arc::new(b))
        }
        BackendSelection::Explicit(BackendKind::Cuda) => Err(BackendError::BackendUnavailable {
            kind: BackendKind::Cuda,
            reason: "cuda backend is declared but not implemented in this build".to_string(),
        }),
        BackendSelection::Explicit(BackendKind::Metal) => select_metal_explicit(),
        BackendSelection::Auto => auto_select(),
    }
}

#[cfg(feature = "metal")]
fn select_metal_explicit() -> BackendResult<Arc<dyn WstBackend>> {
    let b = crate::MetalBackend::new();
    if !b.is_available() {
        // Pass the specific reason through: bad OMNIPULSE_METAL_DEVICE
        // selector, missing driver, metallib load failure. Operators need
        // it verbatim to fix the request.
        let reason = crate::omni_metal_sys::unavailable_reason()
            .unwrap_or_else(|| "unknown metal init failure".to_string());
        return Err(BackendError::BackendUnavailable {
            kind: BackendKind::Metal,
            reason,
        });
    }
    tracing::info!(backend = %BackendKind::Metal, "explicit backend selected");
    Ok(Arc::new(b))
}

#[cfg(not(feature = "metal"))]
fn select_metal_explicit() -> BackendResult<Arc<dyn WstBackend>> {
    Err(BackendError::BackendUnavailable {
        kind: BackendKind::Metal,
        reason: "metal cargo feature was not enabled in this build".to_string(),
    })
}

fn auto_select() -> BackendResult<Arc<dyn WstBackend>> {
    // Priority order: Metal > CUDA > CPU. On explicitly unavailable backends
    // we log why we skipped them so operators can tell an intentional CPU
    // fallback from a silent one.
    #[cfg(feature = "metal")]
    {
        let metal = crate::MetalBackend::new();
        if metal.is_available() {
            tracing::info!(backend = %BackendKind::Metal, "auto selected backend");
            return Ok(Arc::new(metal));
        }
        tracing::info!("auto: metal feature compiled but device unavailable");
    }
    let cpu = CpuBackend::new();
    if cpu.is_available() {
        tracing::info!(backend = %BackendKind::Cpu, "auto selected backend");
        return Ok(Arc::new(cpu));
    }
    Err(BackendError::BackendUnavailable {
        kind: BackendKind::Cpu,
        reason: "no backend advertised availability during auto selection".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_env_values() {
        assert_eq!(
            BackendSelection::from_env_var(Some("cpu")).unwrap(),
            BackendSelection::Explicit(BackendKind::Cpu)
        );
        assert_eq!(
            BackendSelection::from_env_var(Some("CUDA")).unwrap(),
            BackendSelection::Explicit(BackendKind::Cuda)
        );
        assert_eq!(
            BackendSelection::from_env_var(Some("metal")).unwrap(),
            BackendSelection::Explicit(BackendKind::Metal)
        );
        assert_eq!(
            BackendSelection::from_env_var(Some("auto")).unwrap(),
            BackendSelection::Auto
        );
        assert_eq!(
            BackendSelection::from_env_var(None).unwrap(),
            BackendSelection::Auto
        );
        assert_eq!(
            BackendSelection::from_env_var(Some("")).unwrap(),
            BackendSelection::Auto
        );
    }

    #[test]
    fn rejects_unknown_backend() {
        let err = BackendSelection::from_env_var(Some("wgpu")).unwrap_err();
        assert!(matches!(err, BackendError::UnknownBackend(_)));
    }

    #[test]
    fn kind_display_roundtrips_from_str() {
        for k in [BackendKind::Cpu, BackendKind::Cuda, BackendKind::Metal] {
            let s = k.to_string();
            assert_eq!(BackendKind::from_str(&s).unwrap(), k);
        }
    }

    #[test]
    fn explicit_cuda_is_unavailable() {
        match select_backend(BackendSelection::Explicit(BackendKind::Cuda)) {
            Err(BackendError::BackendUnavailable { kind, .. }) => {
                assert_eq!(kind, BackendKind::Cuda)
            }
            Err(other) => panic!("expected BackendUnavailable, got {other:?}"),
            Ok(_) => panic!("expected BackendUnavailable, got a backend"),
        }
    }

    #[cfg(not(feature = "metal"))]
    #[test]
    fn explicit_metal_is_unavailable_without_feature() {
        match select_backend(BackendSelection::Explicit(BackendKind::Metal)) {
            Err(BackendError::BackendUnavailable { kind, .. }) => {
                assert_eq!(kind, BackendKind::Metal)
            }
            Err(other) => panic!("expected BackendUnavailable, got {other:?}"),
            Ok(_) => panic!("expected BackendUnavailable, got a backend"),
        }
    }

    #[cfg(feature = "metal")]
    #[test]
    fn explicit_metal_with_feature_needs_device() {
        // When the feature is compiled in, either we get a live MetalBackend
        // on a Mac with an actual device, or a typed BackendUnavailable. In
        // no case do we get a silent fallback to CPU.
        match select_backend(BackendSelection::Explicit(BackendKind::Metal)) {
            Ok(b) => assert_eq!(b.name(), "metal"),
            Err(BackendError::BackendUnavailable { kind, .. }) => {
                assert_eq!(kind, BackendKind::Metal)
            }
            Err(other) => panic!("expected metal backend or BackendUnavailable, got {other:?}"),
        }
    }

    #[test]
    fn auto_picks_cpu_in_this_build() {
        let b = select_backend(BackendSelection::Auto).expect("auto must pick cpu");
        assert_eq!(b.name(), "cpu");
    }

    #[test]
    fn explicit_cpu_works() {
        let b = select_backend(BackendSelection::Explicit(BackendKind::Cpu))
            .expect("explicit cpu must succeed");
        assert_eq!(b.name(), "cpu");
        assert!(b.is_available());
    }
}
