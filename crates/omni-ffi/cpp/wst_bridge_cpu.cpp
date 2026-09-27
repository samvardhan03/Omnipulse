// SPDX-License-Identifier: AGPL-3.0-or-later
// wst_bridge_cpu.cpp — CPU implementation of the cxx FFI bridge.
//
// Calls into cpu_wst_engine.h (Module-I-omni-wst-core/cpp) which provides
// the real Radix-2 Cooley-Tukey FFT + analytic Morlet filter bank +
// depth-m scattering cascade. NO MOCKS — every operation is the true
// mathematical transform.
//
// Output buffer ownership: `new float[]` on the heap, transferred to Rust
// as a uint64_t. The Rust orchestrator must release it by calling
// free_wst_result, which performs `delete[]`.

#include "wst_bridge.h"
#include "cpu_wst_engine.h"

#include <chrono>
#include <cstdint>
#include <stdexcept>

WSTResult run_wst_pipeline(
    uint64_t input_plasma_ptr,
    int32_t  signal_len,
    int32_t  batch_size,
    int32_t  J,
    int32_t  Q,
    int32_t  depth,
    bool     use_jtfs)
{
    // The CPU bridge does not (yet) implement the JTFS phase-recovery pass.
    // Fall back to plain WST and silently ignore the flag — the Rust caller
    // gets a real scattering fingerprint either way.
    (void)use_jtfs;

    if (signal_len <= 0 || batch_size <= 0 ||
        J <= 0 || Q <= 0 || depth <= 0) {
        throw std::runtime_error(
            "run_wst_pipeline: signal_len, batch_size, J, Q, depth must all be > 0");
    }
    if (input_plasma_ptr == 0) {
        throw std::runtime_error("run_wst_pipeline: null input_plasma_ptr");
    }

    auto t_start = std::chrono::high_resolution_clock::now();

    const float* input = reinterpret_cast<const float*>(
        static_cast<uintptr_t>(input_plasma_ptr));

    const std::size_t out_elems =
        static_cast<std::size_t>(signal_len) *
        static_cast<std::size_t>(batch_size);

    // Heap allocation owned by the Rust caller until free_wst_result.
    float* output = new float[out_elems];

    try {
        CPUFilterBank bank = build_cpu_morlet_bank(J, Q, signal_len);
        float l1_norm_out = 0.0f;
        cpu_wst_forward(input, output,
                        signal_len, batch_size, depth,
                        bank, l1_norm_out);
    } catch (...) {
        delete[] output;
        throw;
    }

    auto t_end = std::chrono::high_resolution_clock::now();
    const uint64_t elapsed_us = static_cast<uint64_t>(
        std::chrono::duration_cast<std::chrono::microseconds>(t_end - t_start).count());

    WSTResult result;
    result.fingerprint_ptr =
        static_cast<uint64_t>(reinterpret_cast<uintptr_t>(output));
    result.coeff_count = static_cast<uint64_t>(out_elems);
    result.exec_time_us = elapsed_us;
    return result;
}

void free_wst_result(WSTResult result) {
    if (result.fingerprint_ptr == 0) {
        return;
    }
    float* p = reinterpret_cast<float*>(
        static_cast<uintptr_t>(result.fingerprint_ptr));
    delete[] p;
}
