// SPDX-License-Identifier: AGPL-3.0-or-later
#pragma once
#include <cuda_runtime.h>
#include <cmath>

// K-wide steerable filter basis — fused modulus kernels for SE(2) and SO(3).
//
// SE(2): any rotation θ is realised by a pre-computed set of L oriented
//   Morlet filters ψ_{j,l}, l=0…L-1.  The fused kernel reads all L channels
//   from shared memory and collapses them with the ℓ²-over-θ norm in one pass,
//   avoiding L separate kernel launches and L global-memory round-trips.
//
// SO(3): solid-harmonic wavelets ψ_{j,ℓ,m} produce (2ℓ+1) m-channels per
//   (j,ℓ) pair.  The fused kernel collapses them with the ℓ²-over-m norm to
//   yield rotationally invariant coefficients.
//
// Both kernels operate on flat f32 arrays; callers supply the channel stride N
// (number of spatial/frequency samples per channel).

// ---------------------------------------------------------------------------
// SE(2): ℓ²-over-θ norm  — collapse L orientation channels → 1 output
// ---------------------------------------------------------------------------

// Each thread handles one spatial index gid.
// d_ch  : [L × N] float, L orientation channels in row-major order
// d_out : [N]     float, sqrt(Σ_l v_l²)
__global__ void fused_l2_over_orientations(
    const float* __restrict__ d_ch,
    float*       __restrict__ d_out,
    int L, int N
) {
    const int gid = blockIdx.x * blockDim.x + threadIdx.x;
    if (gid >= N) return;

    float acc = 0.f;
    for (int l = 0; l < L; ++l) {
        const float v = d_ch[l * N + gid];
        acc += v * v;
    }
    // ε prevents NaN gradient at acc==0 while not affecting large values
    d_out[gid] = sqrtf(acc + 1e-16f);
}

// ---------------------------------------------------------------------------
// SO(3): ℓ²-over-m norm  — collapse (2ℓ+1) m-channels → 1 output per (j,ℓ)
// ---------------------------------------------------------------------------

// d_ch          : [(2ℓ+1) × N] float, m-channels for a single (j,ℓ) pair
// d_out         : [N]           float, sqrt(Σ_m v_m²)
// two_ell_plus1 : 2ℓ+1 (number of m-channels)
__global__ void fused_l2_over_m(
    const float* __restrict__ d_ch,
    float*       __restrict__ d_out,
    int two_ell_plus1, int N
) {
    const int gid = blockIdx.x * blockDim.x + threadIdx.x;
    if (gid >= N) return;

    float acc = 0.f;
    for (int m = 0; m < two_ell_plus1; ++m) {
        const float v = d_ch[m * N + gid];
        acc += v * v;
    }
    d_out[gid] = sqrtf(acc + 1e-16f);
}

// ---------------------------------------------------------------------------
// Shared-memory tiled variant of fused_l2_over_orientations (L ≤ 16)
// Loads a tile of (BLOCK × L) values into shared memory for cache reuse
// when L is small enough to fit.  Used by ScatteringEngine<AmpereTag,2,SO2>.
// ---------------------------------------------------------------------------
template<int BLOCK, int L_MAX>
__global__ void fused_l2_over_orientations_tiled(
    const float* __restrict__ d_ch,
    float*       __restrict__ d_out,
    int L, int N
) {
    __shared__ float smem[BLOCK * L_MAX];

    const int gid = blockIdx.x * blockDim.x + threadIdx.x;
    const int tid = threadIdx.x;

    // Load this thread's L values into smem
    if (gid < N) {
        for (int l = 0; l < L && l < L_MAX; ++l) {
            smem[tid * L_MAX + l] = d_ch[l * N + gid];
        }
    }
    __syncthreads();

    if (gid >= N) return;

    float acc = 0.f;
    for (int l = 0; l < L && l < L_MAX; ++l) {
        const float v = smem[tid * L_MAX + l];
        acc += v * v;
    }
    d_out[gid] = sqrtf(acc + 1e-16f);
}

// ---------------------------------------------------------------------------
// Host-side Parseval-normalisation helper
// Rescales each filter so that Σ_ω |ψ(ω)|² / N ≤ 1 + tol.
// Called from filter_bank.cu after filter construction.
// ---------------------------------------------------------------------------
inline void parseval_normalize_host(
    float* h_filter,   // [n_filters × N] in-place
    int n_filters, int N,
    float tol = 1e-4f
) {
    for (int f = 0; f < n_filters; ++f) {
        float* psi = h_filter + (long)f * N;
        double energy = 0.0;
        for (int k = 0; k < N; ++k) {
            energy += (double)psi[k] * (double)psi[k];
        }
        energy /= N;
        if (energy > 1.0 + tol) {
            const float scale = 1.0f / sqrtf((float)energy);
            for (int k = 0; k < N; ++k) psi[k] *= scale;
        }
    }
}
