// SPDX-License-Identifier: AGPL-3.0-or-later
// fft_stockham.metal - Stockham autosort FFT for the WST scattering cascade.
//
// One radix-2 stage kernel and one radix-4 stage kernel. The host code dispatches
// log2(N) radix-2 stages, or fuses pairs into radix-4 stages when the remaining
// stage count is at least two. Twiddles come from a precomputed buffer of length
// N/2 storing exp(-2*pi*i*k/N) for k in [0, N/2); each stage strides into it.
//
// Normalization is 1/sqrt(N) on both forward and inverse, matching
// engine/wst/cpp/cpu_wst_engine.h exactly.

#include <metal_stdlib>
using namespace metal;

inline float2 cmul(float2 a, float2 b) {
    return float2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// Twiddle lookup: table stores forward twiddles exp(-2*pi*i*k/N).
// stride = N / (2*Ns). For inverse, conjugate.
inline float2 twiddle(device const float2* table, uint stride, uint j, uint is_inverse) {
    float2 w = table[j * stride];
    if (is_inverse != 0u) {
        w.y = -w.y;
    }
    return w;
}

// One Stockham autosort radix-2 DIT stage.
//
// N   : total transform length (power of two)
// Ns  : current sub-FFT length at this stage's input; doubles each stage,
//       starting from 1. After this stage the sub-FFT length is 2*Ns.
kernel void fft_r2_stage(
    device const float2* src        [[buffer(0)]],
    device       float2* dst        [[buffer(1)]],
    device const float2* twiddles   [[buffer(2)]],
    constant     uint&   N          [[buffer(3)]],
    constant     uint&   Ns         [[buffer(4)]],
    constant     uint&   is_inverse [[buffer(5)]],
    uint tid [[thread_position_in_grid]])
{
    uint half_n = N / 2u;
    if (tid >= half_n) return;

    uint j = tid % Ns;              // twiddle index in [0, Ns)
    uint b = tid / Ns;              // block/group index

    uint stride = N / (2u * Ns);
    float2 w = twiddle(twiddles, stride, j, is_inverse);

    uint in_a = b * Ns + j;
    uint in_b = in_a + half_n;
    float2 a  = src[in_a];
    float2 bv = cmul(src[in_b], w);

    uint out_a = 2u * b * Ns + j;
    dst[out_a]      = a + bv;
    dst[out_a + Ns] = a - bv;
}

// One Stockham autosort radix-4 DIT stage. Combines two radix-2 stages.
// After this stage the sub-FFT length grows by 4x (Ns -> 4*Ns).
kernel void fft_r4_stage(
    device const float2* src        [[buffer(0)]],
    device       float2* dst        [[buffer(1)]],
    device const float2* twiddles   [[buffer(2)]],
    constant     uint&   N          [[buffer(3)]],
    constant     uint&   Ns         [[buffer(4)]],
    constant     uint&   is_inverse [[buffer(5)]],
    uint tid [[thread_position_in_grid]])
{
    uint quarter_n = N / 4u;
    if (tid >= quarter_n) return;

    uint j = tid % Ns;
    uint b = tid / Ns;

    // Twiddles at stride matching the 4*Ns output sub-FFT.
    uint stride = N / (4u * Ns);
    float2 w1 = twiddle(twiddles, stride, j,       is_inverse);
    float2 w2 = twiddle(twiddles, stride, j * 2u,  is_inverse);
    float2 w3 = twiddle(twiddles, stride, j * 3u,  is_inverse);

    // Read four samples separated by N/4.
    uint in_a = b * Ns + j;
    float2 x0 = src[in_a];
    float2 x1 = cmul(src[in_a + quarter_n],       w1);
    float2 x2 = cmul(src[in_a + 2u * quarter_n],  w2);
    float2 x3 = cmul(src[in_a + 3u * quarter_n],  w3);

    // 4-point DFT. Forward multiplier for k=1 is -i, for k=3 is +i;
    // inverse flips those signs.
    float sign = (is_inverse != 0u) ? 1.0f : -1.0f;
    float2 rot_i    = float2(0.0f,  sign);           // i for inverse, -i for forward
    float2 rot_neg  = float2(0.0f, -sign);           // conjugate

    float2 y0 =  x0 + x1 + x2 + x3;
    float2 y1 =  x0 + cmul(rot_i, x1) - x2 + cmul(rot_neg, x3);
    float2 y2 =  x0 - x1 + x2 - x3;
    float2 y3 =  x0 + cmul(rot_neg, x1) - x2 + cmul(rot_i, x3);

    // Write with output stride Ns; new block size is 4*Ns.
    uint out_a = 4u * b * Ns + j;
    dst[out_a]           = y0;
    dst[out_a + Ns]      = y1;
    dst[out_a + 2u * Ns] = y2;
    dst[out_a + 3u * Ns] = y3;
}

// Multiply every element by a scalar. Used for the 1/sqrt(N) unitary
// normalization at the end of forward and inverse FFTs.
kernel void fft_scale(
    device float2* data  [[buffer(0)]],
    constant float& s    [[buffer(1)]],
    constant uint&  N    [[buffer(2)]],
    uint tid [[thread_position_in_grid]])
{
    if (tid >= N) return;
    data[tid] *= s;
}
