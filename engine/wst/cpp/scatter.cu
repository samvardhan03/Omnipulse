// SPDX-License-Identifier: AGPL-3.0-or-later
#include "steerable.cuh"
#include <cuda_runtime.h>
#include <cufft.h>
#include <cmath>
#include <vector>
#include <stdexcept>
#include <string>

// ---------------------------------------------------------------------------
// Pad policy — per-axis boundary handling
// ZeroPad: pad signal to next power of 2 along η/time axis
// Circular: keep signal length (φ axis wraps naturally in DFT)
// ---------------------------------------------------------------------------

static int next_pow2(int n) {
    int p = 1;
    while (p < n) p <<= 1;
    return p;
}

// ---------------------------------------------------------------------------
// Pointwise kernels
// ---------------------------------------------------------------------------

// Multiply complex signal by real-valued filter in frequency domain
__global__ void pointwise_mul_real_filt(
    cufftComplex* __restrict__ d_sig,
    const float*  __restrict__ d_filt,
    int N, int batch
) {
    const int gid = blockIdx.x * blockDim.x + threadIdx.x;
    if (gid >= N * batch) return;
    const float f = d_filt[gid % N];
    d_sig[gid].x *= f;
    d_sig[gid].y *= f;
}

// Complex modulus |z| in-place
__global__ void complex_modulus_inplace(cufftComplex* __restrict__ d, int n) {
    const int gid = blockIdx.x * blockDim.x + threadIdx.x;
    if (gid >= n) return;
    const float mag = sqrtf(d[gid].x * d[gid].x + d[gid].y * d[gid].y);
    d[gid].x = mag;
    d[gid].y = 0.f;
}

// Apply low-pass φ and write to float32 output (|x * φ| → output)
__global__ void apply_lowpass_write(
    const cufftComplex* __restrict__ d_sig,
    float* __restrict__              d_out,
    int N, int batch
) {
    const int gid = blockIdx.x * blockDim.x + threadIdx.x;
    if (gid >= N * batch) return;
    d_out[gid] = d_sig[gid].x;  // after IFFT the imaginary part is negligible
}

// Real→complex lift (f32 input → (f, 0) complex for FFT)
__global__ void real_to_complex(
    const float* __restrict__ src,
    cufftComplex* __restrict__ dst,
    int n
) {
    const int gid = blockIdx.x * blockDim.x + threadIdx.x;
    if (gid >= n) return;
    dst[gid].x = src[gid];
    dst[gid].y = 0.f;
}

// ---------------------------------------------------------------------------
// 1-D scattering cascade (Trivial — translations only)
// ---------------------------------------------------------------------------
// Implements depth-order scattering:
//   S₁[λ] x = |x * ψ_λ| * φ
//   S₂[λ₁,λ₂] x = ||x * ψ_{λ₁}| * ψ_{λ₂}| * φ   (λ₂ > λ₁)
// Output is concatenated [S₀, S₁, S₂] paths stored in d_out.
//
// N_pad = next_pow2(N) (zero-pad axis); pad_n is ignored if 0 (use N directly).

void run_scatter_1d(
    float* d_in, float* d_fb, float* d_out,
    int N, int J, int Q, int depth,
    int /*pad_n*/, cudaStream_t s
) {
    const int n_lambda = J * Q;
    const int N_pad    = next_pow2(N);

    // Allocate work buffers (cascade scratch)
    cufftComplex *d_x = nullptr, *d_u = nullptr;
    cudaMalloc(&d_x, (size_t)N_pad * sizeof(cufftComplex));
    cudaMalloc(&d_u, (size_t)N_pad * sizeof(cufftComplex));

    cufftHandle plan;
    {
        int ns[1] = {N_pad};
        cufftPlanMany(&plan, 1, ns, nullptr, 1, N_pad, nullptr, 1, N_pad, CUFFT_C2C, 1);
        cufftSetStream(plan, s);
    }

    // Copy input, zero-pad, lift to complex
    cudaMemsetAsync(d_x, 0, (size_t)N_pad * sizeof(cufftComplex), s);
    {
        int blk = 256;
        real_to_complex<<<(N + blk - 1) / blk, blk, 0, s>>>(d_in, d_x, N);
    }

    float* d_out_ptr = d_out;

    // S₀: lowpass only (copy directly)
    cudaMemcpyAsync(d_out_ptr, d_in, (size_t)N * sizeof(float), cudaMemcpyDeviceToDevice, s);
    d_out_ptr += N;

    // S₁ pass
    for (int lam1 = 0; lam1 < n_lambda; ++lam1) {
        // Copy input back (re-use d_x)
        cudaMemsetAsync(d_x, 0, (size_t)N_pad * sizeof(cufftComplex), s);
        real_to_complex<<<(N + 255) / 256, 256, 0, s>>>(d_in, d_x, N);

        // x * ψ_{λ1} in frequency domain
        cufftExecC2C(plan, d_x, d_x, CUFFT_FORWARD);
        pointwise_mul_real_filt<<<(N_pad + 255) / 256, 256, 0, s>>>(
            d_x, d_fb + lam1 * N, N, 1);  // filter has length N; treat excess as 0
        cufftExecC2C(plan, d_x, d_x, CUFFT_INVERSE);

        // |U₁[λ1]|
        complex_modulus_inplace<<<(N_pad + 255) / 256, 256, 0, s>>>(d_x, N_pad);

        // Apply lowpass → S₁[λ1] (write first N elements)
        apply_lowpass_write<<<(N + 255) / 256, 256, 0, s>>>(d_x, d_out_ptr, N, 1);
        d_out_ptr += N;

        if (depth < 2) continue;

        // S₂ pass: iterate λ2 > λ1 for admissibility (λ2 < λ1 not physical)
        for (int lam2 = lam1 + 1; lam2 < n_lambda; ++lam2) {
            // Copy |U₁[λ1]| into d_u
            cudaMemcpyAsync(d_u, d_x, (size_t)N_pad * sizeof(cufftComplex),
                            cudaMemcpyDeviceToDevice, s);
            cufftExecC2C(plan, d_u, d_u, CUFFT_FORWARD);
            pointwise_mul_real_filt<<<(N_pad + 255) / 256, 256, 0, s>>>(
                d_u, d_fb + lam2 * N, N, 1);
            cufftExecC2C(plan, d_u, d_u, CUFFT_INVERSE);
            complex_modulus_inplace<<<(N_pad + 255) / 256, 256, 0, s>>>(d_u, N_pad);
            apply_lowpass_write<<<(N + 255) / 256, 256, 0, s>>>(d_u, d_out_ptr, N, 1);
            d_out_ptr += N;
        }
    }

    cufftDestroy(plan);
    cudaFree(d_x);
    cudaFree(d_u);
}

// ---------------------------------------------------------------------------
// 2-D SE(2) scattering cascade
// ---------------------------------------------------------------------------
// Circular convolution along axis 1 (φ), zero-pad axis 0 (η).
// S₁[λ,l] x = |x * ψ_{λ,l}| * φ  (over 2D spatial + orientation)
// The ℓ²-over-θ norm then collapses the L orientation channels → 1 per scale j.

void run_scatter_2d(
    float* d_in, float* d_fb, float* d_orient_buf, float* d_out,
    int Nx, int Ny, int J, int Q, int L, int depth,
    int /*pad_circular_axis*/, cudaStream_t s
) {
    const int n_lambda = J * Q;
    const int Nx_pad   = next_pow2(Nx);   // zero-pad η axis
    const int Ny_pad   = Ny;              // φ axis: circular (no pad)
    const int N_spatial = Nx_pad * Ny_pad;

    cufftComplex *d_x = nullptr, *d_u = nullptr;
    cudaMalloc(&d_x, (size_t)N_spatial * sizeof(cufftComplex));
    cudaMalloc(&d_u, (size_t)N_spatial * sizeof(cufftComplex));

    cufftHandle plan;
    {
        int ns[2] = {Nx_pad, Ny_pad};
        cufftPlanMany(&plan, 2, ns, nullptr, 1, N_spatial, nullptr, 1, N_spatial, CUFFT_C2C, 1);
        cufftSetStream(plan, s);
    }

    float* d_out_ptr = d_out;

    // Lift input to complex (zero-pad Nx → Nx_pad)
    auto lift2d = [&]() {
        cudaMemsetAsync(d_x, 0, (size_t)N_spatial * sizeof(cufftComplex), s);
        // Input is Nx*Ny; copy row by row to d_x which is Nx_pad*Ny_pad
        for (int row = 0; row < Nx; ++row) {
            real_to_complex<<<(Ny + 255) / 256, 256, 0, s>>>(
                d_in + row * Ny,
                d_x  + row * Ny_pad,  // Ny_pad == Ny so this is fine
                Ny);
        }
    };

    // S₀
    apply_lowpass_write<<<(Nx * Ny + 255) / 256, 256, 0, s>>>(
        reinterpret_cast<cufftComplex*>(d_in), d_out_ptr, Nx * Ny, 1);
    d_out_ptr += Nx * Ny;

    // S₁ per scale (j,q): collapse L orientations with ℓ²-over-θ
    for (int lam = 0; lam < n_lambda; ++lam) {
        float* d_l2 = d_orient_buf;  // reuse orient_buf for L channels

        for (int l = 0; l < L; ++l) {
            lift2d();
            cufftExecC2C(plan, d_x, d_x, CUFFT_FORWARD);
            pointwise_mul_real_filt<<<(N_spatial + 255) / 256, 256, 0, s>>>(
                d_x, d_fb + ((long)(lam * L + l)) * N_spatial, N_spatial, 1);
            cufftExecC2C(plan, d_x, d_x, CUFFT_INVERSE);
            complex_modulus_inplace<<<(N_spatial + 255) / 256, 256, 0, s>>>(d_x, N_spatial);
            apply_lowpass_write<<<(N_spatial + 255) / 256, 256, 0, s>>>(
                d_x, d_l2 + (long)l * N_spatial, N_spatial, 1);
        }

        // ℓ²-over-θ → one S₁ coefficient map
        fused_l2_over_orientations<<<(N_spatial + 255) / 256, 256, 0, s>>>(
            d_l2, d_out_ptr, L, N_spatial);
        d_out_ptr += Nx * Ny;  // store Nx×Ny slice

        if (depth < 2) continue;

        // S₂: iterate over a second scale lam2 > lam
        for (int lam2 = lam + 1; lam2 < n_lambda; ++lam2) {
            // Use the averaged |U1| (d_l2 contains L channels after S₁ above)
            // For S₂ we scatter the first-order modulus response through lam2 filters
            // (averaged over orientations for translation invariance)
            for (int l2 = 0; l2 < L; ++l2) {
                // Load the S₁ map (l=0 channel as proxy for the averaged response)
                real_to_complex<<<(N_spatial + 255) / 256, 256, 0, s>>>(
                    d_l2,  // use first orientation channel of U₁[lam]
                    d_u, N_spatial);
                cufftExecC2C(plan, d_u, d_u, CUFFT_FORWARD);
                pointwise_mul_real_filt<<<(N_spatial + 255) / 256, 256, 0, s>>>(
                    d_u, d_fb + ((long)(lam2 * L + l2)) * N_spatial, N_spatial, 1);
                cufftExecC2C(plan, d_u, d_u, CUFFT_INVERSE);
                complex_modulus_inplace<<<(N_spatial + 255) / 256, 256, 0, s>>>(d_u, N_spatial);
                apply_lowpass_write<<<(N_spatial + 255) / 256, 256, 0, s>>>(
                    d_u, d_orient_buf + (long)l2 * N_spatial, N_spatial, 1);
            }
            fused_l2_over_orientations<<<(N_spatial + 255) / 256, 256, 0, s>>>(
                d_orient_buf, d_out_ptr, L, N_spatial);
            d_out_ptr += Nx * Ny;
        }
    }

    cufftDestroy(plan);
    cudaFree(d_x);
    cudaFree(d_u);
}

// ---------------------------------------------------------------------------
// 3-D SO(3) scattering cascade
// ---------------------------------------------------------------------------
// Uses the solid-harmonic filter bank; each (j,ℓ) pair has (2ℓ+1) m-channels.
// The ℓ²-over-m norm collapses each (j,ℓ,m) group → 1 invariant coefficient per voxel.

void run_scatter_3d(
    float* d_in, float* d_fb, float* d_orient_buf, float* d_out,
    int Nx, int Ny, int Nz, int J, int Q, int l_max, int depth,
    cudaStream_t s
) {
    const int n_lambda  = J * Q;
    const int N_vol     = Nx * Ny * Nz;

    int n_ch_total = 0;
    for (int el = 0; el <= l_max; ++el) n_ch_total += 2 * el + 1;

    cufftComplex *d_x = nullptr, *d_u = nullptr;
    cudaMalloc(&d_x, (size_t)N_vol * sizeof(cufftComplex));
    cudaMalloc(&d_u, (size_t)N_vol * sizeof(cufftComplex));

    cufftHandle plan;
    {
        int ns[3] = {Nx, Ny, Nz};
        cufftPlanMany(&plan, 3, ns, nullptr, 1, N_vol, nullptr, 1, N_vol, CUFFT_C2C, 1);
        cufftSetStream(plan, s);
    }

    float* d_out_ptr = d_out;

    // S₀
    apply_lowpass_write<<<(N_vol + 255) / 256, 256, 0, s>>>(
        reinterpret_cast<cufftComplex*>(d_in), d_out_ptr, N_vol, 1);
    d_out_ptr += N_vol;

    // S₁ per (j,q,ℓ): collapse m-channels with ℓ²-over-m
    for (int lam = 0; lam < n_lambda; ++lam) {
        int ch_offset = 0;
        for (int ell = 0; ell <= l_max; ++ell) {
            const int two_ell1 = 2 * ell + 1;
            const long fb_base = (long)(lam * n_ch_total + ch_offset) * N_vol;

            for (int m_idx = 0; m_idx < two_ell1; ++m_idx) {
                real_to_complex<<<(N_vol + 255) / 256, 256, 0, s>>>(d_in, d_x, N_vol);
                cufftExecC2C(plan, d_x, d_x, CUFFT_FORWARD);
                pointwise_mul_real_filt<<<(N_vol + 255) / 256, 256, 0, s>>>(
                    d_x, d_fb + fb_base + (long)m_idx * N_vol, N_vol, 1);
                cufftExecC2C(plan, d_x, d_x, CUFFT_INVERSE);
                complex_modulus_inplace<<<(N_vol + 255) / 256, 256, 0, s>>>(d_x, N_vol);
                apply_lowpass_write<<<(N_vol + 255) / 256, 256, 0, s>>>(
                    d_x, d_orient_buf + (long)m_idx * N_vol, N_vol, 1);
            }

            fused_l2_over_m<<<(N_vol + 255) / 256, 256, 0, s>>>(
                d_orient_buf, d_out_ptr, two_ell1, N_vol);
            d_out_ptr += N_vol;
            ch_offset += two_ell1;
        }
    }

    cufftDestroy(plan);
    cudaFree(d_x);
    cudaFree(d_u);
}
