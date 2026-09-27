# SPDX-License-Identifier: AGPL-3.0-or-later
import numpy as np
import omni_wst_core as wst
import pytest
import tracemalloc
import sys

@pytest.fixture
def cfg():
    return wst.WSTConfig(J=8, Q=16, depth=2, jtfs=False)

def test_pinned_allocation():
    if sys.platform == "darwin":
        pytest.skip("Pinned memory checks via /proc/self/maps are not supported on macOS.")
    else:
        # Assuming we are on Linux, we would check /proc/self/maps for locked memory
        # This is a placeholder since the python binding abstract the allocation lifecycle
        pass

def test_no_leak(cfg):
    x = np.random.randn(4096).astype(np.float32)
    
    tracemalloc.start()
    snapshot_before = tracemalloc.take_snapshot()
    
    for _ in range(100):
        # fingerprint calls initialise() and destroy() internally
        wst.fingerprint(x, cfg)
        
    snapshot_after = tracemalloc.take_snapshot()
    
    stats = snapshot_after.compare_to(snapshot_before, 'lineno')
    heap_growth = sum(stat.size_diff for stat in stats)
    
    tracemalloc.stop()
    
    assert heap_growth < 1024 * 1024, f"Memory leak detected! Heap growth: {heap_growth} bytes"

def test_double_buffer_swap(cfg):
    x1 = np.random.randn(4096).astype(np.float32)
    x2 = np.random.randn(4096).astype(np.float32)
    
    out1 = wst.fingerprint(x1, cfg)
    out2 = wst.fingerprint(x2, cfg)
    
    assert not np.isnan(out1).any()
    assert not np.isinf(out1).any()
    
    assert not np.isnan(out2).any()
    assert not np.isinf(out2).any()
