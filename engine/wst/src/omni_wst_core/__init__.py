# SPDX-License-Identifier: AGPL-3.0-or-later
try:
    from ._core import WSTConfig, JTFSConfig, fingerprint, scattering_paths, cuda_available
except ImportError as e:
    raise ImportError(f"omni_wst_core C++ extension not built. Run: pip install -e . — {e}")

__all__ = ["WSTConfig", "JTFSConfig", "fingerprint", "scattering_paths", "cuda_available"]
__version__ = "1.0.4"
