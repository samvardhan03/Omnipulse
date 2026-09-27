// SPDX-License-Identifier: AGPL-3.0-or-later
#include "steerable.cuh"
#include <cuda_runtime.h>
#include <cufft.h>
#include <cmath>
#include <vector>
#include <algorithm>
#include <stdexcept>

// ---------------------------------------------------------------------------
// Shared compile-time constants
// ---------------------------------------------------------------------------
static constexpr float PI_F = 3.14159265358979323846f;

// ---------------------------------------------------------------------------
// 1-D Morlet filter bank
// ---------------------------------------------------------------------------
// Zero-mean analytic Morlet in the frequency domain:
//   ψ_{j,q}(ω) = A * [exp(-½(σ*(ω - ξ))²) − κ*exp(-½(σ*ω)²)]
// where κ = exp(-½*ξ²*σ²) enforces ψ(0)=0 (zero DC, so Σ x → 0 = 0).
// Scales: ξ_{j,q} = π * 2^{-(j + q/Q)},  σ_{j,q} = 0.8 * 2^{j + q/Q}.
//
// Layout of d_out: [J*Q, N] row-major (filter index fast last).

__global__ void build_morlet_1d_kernel(
    float* __restrict__ d_out,
    int J, int Q, int N
) {
    const int lambda = blockIdx.y;    // wavelet index ∈ [0, J*Q)
    const int k      = blockIdx.x * blockDim.x + threadIdx.x;  // frequency bin
    if (lambda >= J * Q || k >= N) return;

    const float ratio = static_cast<float>(lambda) / static_cast<float>(Q);
    const float xi    = PI_F * __powf(2.f, -ratio);
    const float sigma = 0.8f * __powf(2.f,  ratio);

    // Signed frequency ∈ [-π, π)
    float omega = 2.f * PI_F * static_cast<float>(k) / static_cast<float>(N);
    if (omega > PI_F) omega -= 2.f * PI_F;

    const float kappa    = expf(-0.5f * xi * xi * sigma * sigma);  // zero-mean correction
    const float morlet   = expf(-0.5f * (sigma * (omega - xi)) * (sigma * (omega - xi)));
    const float subtract = kappa * expf(-0.5f * (sigma * omega) * (sigma * omega));
    const float val      = morlet - subtract;

    d_out[lambda * N + k] = fmaxf(val, 0.f);  // keep non-negative (analytic support)
}

void build_filter_bank_1d(float* d_out, int J, int Q, int N, cudaStream_t s) {
    dim3 block(256);
    dim3 grid((N + 255) / 256, J * Q);
    build_morlet_1d_kernel<<<grid, block, 0, s>>>(d_out, J, Q, N);

    // Parseval-normalise on CPU (copy out, normalise, copy back)
    const int n_filters = J * Q;
    const size_t bytes  = (size_t)n_filters * N * sizeof(float);
    std::vector<float> h_fb(n_filters * N);
    cudaMemcpyAsync(h_fb.data(), d_out, bytes, cudaMemcpyDeviceToHost, s);
    cudaStreamSynchronize(s);
    parseval_normalize_host(h_fb.data(), n_filters, N, 1e-4f);
    cudaMemcpyAsync(d_out, h_fb.data(), bytes, cudaMemcpyHostToDevice, s);
}

// ---------------------------------------------------------------------------
// 2-D oriented Morlet filter bank (SE(2) — L discrete orientations)
// ---------------------------------------------------------------------------
// For orientation l (θ_l = l·π/L), the filter is a rotated 2-D Morlet:
//   ψ_{j,q,l}(ω_x,ω_y) = ψ_{j,q,0}(ω_x·cos θ_l + ω_y·sin θ_l,
//                                      −ω_x·sin θ_l + ω_y·cos θ_l)
// where ψ_{j,q,0} is the unrotated Morlet:
//   ψ(ω_x,ω_y) = A·exp(-½((σ_x*(ω_x-ξ_x))² + (σ_y*ω_y)²)) − κ·exp(-½(σ_x²*ω_x²+σ_y²*ω_y²))
// σ_x = 0.8*2^{ratio}, σ_y = σ_x * aspect (aspect ~2 for well-oriented wavelets).
//
// Layout of d_out: [J*Q*L, Nx*Ny] — filter f, spatial flat index.

__global__ void build_morlet_2d_kernel(
    float* __restrict__ d_out,
    int J, int Q, int L, int Nx, int Ny
) {
    // blockIdx.z encodes (j*Q+q)*L + l
    const int filt_idx = blockIdx.z;
    const int n_filt   = J * Q * L;
    if (filt_idx >= n_filt) return;

    const int lambda = filt_idx / L;
    const int l      = filt_idx % L;

    const int ix = blockIdx.x * blockDim.x + threadIdx.x;
    const int iy = blockIdx.y * blockDim.y + threadIdx.y;
    if (ix >= Nx || iy >= Ny) return;

    const float ratio = static_cast<float>(lambda) / static_cast<float>(Q);
    const float xi    = PI_F * __powf(2.f, -ratio);
    const float sigma_x = 0.8f * __powf(2.f,  ratio);
    const float sigma_y = sigma_x * 2.0f;  // elongated in orientation direction

    const float theta = static_cast<float>(l) * PI_F / static_cast<float>(L);
    const float cos_t = cosf(theta), sin_t = sinf(theta);

    // Signed frequency components ∈ [-π,π)
    float wx = 2.f * PI_F * static_cast<float>(ix) / static_cast<float>(Nx);
    float wy = 2.f * PI_F * static_cast<float>(iy) / static_cast<float>(Ny);
    if (wx > PI_F) wx -= 2.f * PI_F;
    if (wy > PI_F) wy -= 2.f * PI_F;

    // Rotate into the wavelet frame
    const float wx_r = wx * cos_t + wy * sin_t;
    const float wy_r = -wx * sin_t + wy * cos_t;

    const float kappa = expf(-0.5f * (sigma_x * xi) * (sigma_x * xi));
    const float ex    = sigma_x * (wx_r - xi);
    const float ey    = sigma_y * wy_r;
    const float morlet   = expf(-0.5f * (ex * ex + ey * ey));
    const float subtract = kappa * expf(-0.5f * ((sigma_x * wx_r) * (sigma_x * wx_r)
                                                  + (sigma_y * wy_r) * (sigma_y * wy_r)));
    const float val = morlet - subtract;

    d_out[(long)filt_idx * Nx * Ny + iy * Nx + ix] = fmaxf(val, 0.f);
}

void build_filter_bank_2d(float* d_out, int J, int Q, int L,
                           int Nx, int Ny, cudaStream_t s) {
    const int n_filt = J * Q * L;
    dim3 block(16, 16);
    dim3 grid((Nx + 15) / 16, (Ny + 15) / 16, n_filt);
    build_morlet_2d_kernel<<<grid, block, 0, s>>>(d_out, J, Q, L, Nx, Ny);

    const size_t bytes = (size_t)n_filt * Nx * Ny * sizeof(float);
    std::vector<float> h_fb(n_filt * Nx * Ny);
    cudaMemcpyAsync(h_fb.data(), d_out, bytes, cudaMemcpyDeviceToHost, s);
    cudaStreamSynchronize(s);
    parseval_normalize_host(h_fb.data(), n_filt, Nx * Ny, 1e-4f);
    cudaMemcpyAsync(d_out, h_fb.data(), bytes, cudaMemcpyHostToDevice, s);
}

// ---------------------------------------------------------------------------
// 3-D solid-harmonic filter bank (SO(3))
// ---------------------------------------------------------------------------
// Solid-harmonic wavelets: ψ_{j,ℓ,m}(ω) = φ_j(|ω|) · Yℓ^m(ω̂)
// where φ_j is a radial profile (Morlet in |ω|) and Yℓ^m are real spherical harmonics.
// We generate ℓ ∈ [0, l_max], m ∈ [-ℓ, ℓ] → (2ℓ+1) channels per (j,ℓ) pair.
//
// Real spherical harmonics Y_ℓ^m are evaluated at ω̂ = (ω_x,ω_y,ω_z)/|ω|.
// We use the standard Condon–Shortley phase convention.
//
// Layout: [J*Q * n_channels, Nx*Ny*Nz] where
//         n_channels = Σ_{ℓ=0}^{l_max} (2ℓ+1)

// Real spherical harmonic Y_ℓ^m at unit vector (x,y,z)
// Implemented for ℓ = 0,1,2 (the common case); higher ℓ use a recursion.
__device__ float real_sph_harm(int ell, int m, float x, float y, float z) {
    // ℓ=0
    if (ell == 0) return 0.28209479177387814f;  // 1/sqrt(4π)

    // ℓ=1
    if (ell == 1) {
        if (m == -1) return  0.48860251190292f * y;
        if (m ==  0) return  0.48860251190292f * z;
        if (m ==  1) return  0.48860251190292f * x;
    }

    // ℓ=2
    if (ell == 2) {
        if (m == -2) return  1.09254843059208f * x * y;
        if (m == -1) return  1.09254843059208f * y * z;
        if (m ==  0) return  0.31539156525252f * (3.f * z * z - 1.f);
        if (m ==  1) return  1.09254843059208f * x * z;
        if (m ==  2) return  0.54627421529604f * (x * x - y * y);
    }

    // ℓ=3 (commonly used in 3-D scattering)
    if (ell == 3) {
        if (m == -3) return  0.59004358992664f * y * (3.f * x * x - y * y);
        if (m == -2) return  2.89061144264055f * x * y * z;
        if (m == -1) return  0.45704579946446f * y * (4.f * z * z - x * x - y * y);
        if (m ==  0) return  0.37317633259011f * z * (2.f * z * z - 3.f * x * x - 3.f * y * y);
        if (m ==  1) return  0.45704579946446f * x * (4.f * z * z - x * x - y * y);
        if (m ==  2) return  1.44530572132028f * z * (x * x - y * y);
        if (m ==  3) return  0.59004358992664f * x * (x * x - 3.f * y * y);
    }

    return 0.f;  // higher ℓ: zero (extend as needed)
}

__global__ void build_solid_harmonic_3d_kernel(
    float* __restrict__ d_out,
    int J, int Q, int l_max,
    int Nx, int Ny, int Nz
) {
    // Total m-channels: n_ch = Σ (2ℓ+1)
    // blockIdx.w not available; encode as blockIdx.z over n_filt = J*Q*n_ch
    const int filt_idx = blockIdx.z;

    // Determine (j,q,ℓ,m) from flat filter index
    int n_ch_total = 0;
    for (int el = 0; el <= l_max; ++el) n_ch_total += 2 * el + 1;
    const int n_jq_ch = J * Q * n_ch_total;
    if (filt_idx >= n_jq_ch) return;

    const int lambda  = filt_idx / n_ch_total;
    const int ch_flat = filt_idx % n_ch_total;

    // Decode ℓ,m from ch_flat
    int ell = 0, m_idx = 0;
    int acc = 0;
    for (int el = 0; el <= l_max; ++el) {
        if (ch_flat < acc + 2 * el + 1) {
            ell   = el;
            m_idx = ch_flat - acc;  // 0-indexed within this ℓ block
            break;
        }
        acc += 2 * el + 1;
    }
    const int m = m_idx - ell;  // m ∈ [-ℓ, ℓ]

    const int ix = blockIdx.x * blockDim.x + threadIdx.x;
    const int iy = blockIdx.y * blockDim.y + threadIdx.y;
    if (ix >= Nx || iy >= Ny) return;

    const float ratio   = static_cast<float>(lambda) / static_cast<float>(Q);
    const float xi      = PI_F * __powf(2.f, -ratio);
    const float sigma   = 0.8f * __powf(2.f,  ratio);

    for (int iz = 0; iz < Nz; ++iz) {
        float wx = 2.f * PI_F * static_cast<float>(ix) / static_cast<float>(Nx);
        float wy = 2.f * PI_F * static_cast<float>(iy) / static_cast<float>(Ny);
        float wz = 2.f * PI_F * static_cast<float>(iz) / static_cast<float>(Nz);
        if (wx > PI_F) wx -= 2.f * PI_F;
        if (wy > PI_F) wy -= 2.f * PI_F;
        if (wz > PI_F) wz -= 2.f * PI_F;

        const float r = sqrtf(wx*wx + wy*wy + wz*wz) + 1e-12f;
        const float radial = expf(-0.5f * (sigma * (r - xi)) * (sigma * (r - xi)));
        const float angular = real_sph_harm(ell, m, wx / r, wy / r, wz / r);

        const long out_idx = (long)filt_idx * Nx * Ny * Nz
                             + (long)iz * Ny * Nx + iy * Nx + ix;
        d_out[out_idx] = radial * angular;
    }
}

void build_filter_bank_3d(float* d_out, int J, int Q, int l_max,
                           int Nx, int Ny, int Nz, cudaStream_t s) {
    int n_ch_total = 0;
    for (int el = 0; el <= l_max; ++el) n_ch_total += 2 * el + 1;
    const int n_filt = J * Q * n_ch_total;

    dim3 block(8, 8);
    dim3 grid((Nx + 7) / 8, (Ny + 7) / 8, n_filt);
    build_solid_harmonic_3d_kernel<<<grid, block, 0, s>>>(d_out, J, Q, l_max, Nx, Ny, Nz);

    const size_t bytes = (size_t)n_filt * Nx * Ny * Nz * sizeof(float);
    std::vector<float> h_fb((size_t)n_filt * Nx * Ny * Nz);
    cudaMemcpyAsync(h_fb.data(), d_out, bytes, cudaMemcpyDeviceToHost, s);
    cudaStreamSynchronize(s);
    parseval_normalize_host(h_fb.data(), n_filt, Nx * Ny * Nz, 1e-4f);
    cudaMemcpyAsync(d_out, h_fb.data(), bytes, cudaMemcpyHostToDevice, s);
}
