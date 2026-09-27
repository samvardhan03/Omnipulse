# SPDX-License-Identifier: AGPL-3.0-or-later
import numpy as np
import omni_wst_core as wst
import pytest

@pytest.fixture
def cfg():
    return wst.WSTConfig(J=8, Q=16, depth=2, jtfs=False)

def test_determinism(cfg):
    x = np.random.randn(4096).astype(np.float32)
    s1 = wst.fingerprint(x, cfg)
    s2 = wst.fingerprint(x, cfg)
    np.testing.assert_array_equal(s1, s2)

def test_batch_consistency(cfg):
    x = np.random.randn(4096).astype(np.float32)
    s_single = wst.fingerprint(x, cfg)
    
    batch = np.zeros((8, 4096), dtype=np.float32)
    batch[3, :] = x
    
    s_batch = wst.fingerprint(batch, cfg)
    # The batch fingerprint is shape (8, 4096)
    np.testing.assert_array_almost_equal(s_single, s_batch[3, :], decimal=4)

def test_shape(cfg):
    x = np.random.randn(4096).astype(np.float32)
    s = wst.fingerprint(x, cfg)
    # The current engine implementation returns the signal_len * batch_size elements per item
    # as a stand-in for the full cascade N_WAVELETS * downsampled_len.
    assert s.shape == (4096,)

def test_noise_robustness(cfg):
    x = np.random.randn(4096).astype(np.float32)
    s_clean = wst.fingerprint(x, cfg)
    
    # 30dB SNR
    signal_power = np.mean(x**2)
    noise_power = signal_power / (10 ** (30 / 10))
    noise = np.random.randn(4096).astype(np.float32) * np.sqrt(noise_power)
    x_noisy = x + noise
    
    s_noisy = wst.fingerprint(x_noisy, cfg)
    
    distance = np.linalg.norm(s_clean - s_noisy)
    norm = np.linalg.norm(s_clean)
    
    # distance < 10% of norm
    assert distance < 0.10 * norm
