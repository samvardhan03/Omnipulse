// SPDX-License-Identifier: AGPL-3.0-or-later
// wst_ops.metal - pointwise ops and helpers for the WST scattering cascade.
//
// Ported from engine/wst/cpp/wst_kernel.cuh, with the CPU engine
// (engine/wst/cpp/cpu_wst_engine.h) as the correctness oracle. Two documented
// disagreements with the CUDA source are resolved in favour of the CPU engine:
//
//   1. The CUDA pointwise_multiply_modulus kernel indexes the filter as
//      d_filter[t] with the base pointer of the concatenated filter bank,
//      meaning it always uses wavelet 0. The CPU engine cycles the wavelet
//      per depth d via lam = ((d + 1) * n_wavelets) / (depth + 1). We follow
//      the CPU engine and let the host pass the correct psi slice per depth.
//
//   2. The CUDA build_wavelet_filter_bank_kernel does not peak-normalize each
//      wavelet. The CPU engine scales each wavelet so max|psi_lambda(omega)|
//      equals psi_peak = 0.98. We follow the CPU engine and generate the bank
//      on the host so the peak reduction is trivial to express.

#include <metal_stdlib>
using namespace metal;

// Real -> complex load with zero padding out to N.
kernel void real_to_complex(
    device const float*  src         [[buffer(0)]],
    device       float2* dst         [[buffer(1)]],
    constant     uint&   signal_len  [[buffer(2)]],
    constant     uint&   N           [[buffer(3)]],
    uint tid [[thread_position_in_grid]])
{
    if (tid >= N) return;
    dst[tid] = (tid < signal_len) ? float2(src[tid], 0.0f) : float2(0.0f, 0.0f);
}

// Extract real parts of the first `signal_len` samples into a real buffer.
kernel void complex_to_real(
    device const float2* src         [[buffer(0)]],
    device       float*  dst         [[buffer(1)]],
    constant     uint&   signal_len  [[buffer(2)]],
    uint tid [[thread_position_in_grid]])
{
    if (tid >= signal_len) return;
    dst[tid] = src[tid].x;
}

// Pointwise multiply the frequency-domain signal by a real psi filter.
// For k >= signal_len the filter is treated as zero (matches the CPU engine
// which zero-pads the filter above the physical signal length).
kernel void pointwise_mul_psi(
    device       float2* data        [[buffer(0)]],
    device const float*  psi         [[buffer(1)]],
    constant     uint&   N           [[buffer(2)]],
    constant     uint&   signal_len  [[buffer(3)]],
    uint tid [[thread_position_in_grid]])
{
    if (tid >= N) return;
    float filt = (tid < signal_len) ? psi[tid] : 0.0f;
    data[tid] *= filt;
}

// Take the complex modulus in place: (re, im) -> (sqrt(re^2 + im^2), 0).
// Matches the CPU engine's cascade step 4.
kernel void modulus_inplace(
    device float2* data [[buffer(0)]],
    constant uint& N    [[buffer(1)]],
    uint tid [[thread_position_in_grid]])
{
    if (tid >= N) return;
    float2 z = data[tid];
    float mag = sqrt(z.x * z.x + z.y * z.y);
    data[tid] = float2(mag, 0.0f);
}
