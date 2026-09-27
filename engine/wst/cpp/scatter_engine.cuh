// SPDX-License-Identifier: AGPL-3.0-or-later
#pragma once
#include "tile_policy.cuh"
#include "steerable.cuh"
#include <cuda_runtime.h>
#include <cufft.h>
#include <stdexcept>
#include <string>
#include <cstdint>
#include <cstring>
#include <vector>
#include <chrono>

// Group type tags — compile-time symmetry selectors
struct Trivial {};   // 1-D translation invariance only
struct SO2    {};   // 2-D SE(2): translations + L discrete rotations
struct SO3    {};   // 3-D SO(3): solid-harmonic scattering

// ---------------------------------------------------------------------------
// ScatterResult — D2H-staged coefficient block + timing
//
// coeff_ptr is a host-side malloc buffer.  The caller (scatter_bridge.cpp /
// shm_write.rs) owns it and must free it after writing to shared memory.
// No CUdeviceptr ever leaves this compilation unit.
// ---------------------------------------------------------------------------
struct ScatterResult {
    uint64_t coeff_ptr;     // host pointer to float32 coefficient array
    uint64_t coeff_count;   // number of float32 elements
    uint64_t exec_time_us;  // wall-clock μs of GPU scattering cascade
};

// Forward declarations of CUDA-side routines defined in filter_bank.cu / scatter.cu
void build_filter_bank_1d(
    float* d_out, int J, int Q, int N, cudaStream_t s);

void build_filter_bank_2d(
    float* d_out, int J, int Q, int L, int Nx, int Ny, cudaStream_t s);

void build_filter_bank_3d(
    float* d_out, int J, int Q, int l_max, int Nx, int Ny, int Nz, cudaStream_t s);

void run_scatter_1d(
    float* d_in, float* d_fb, float* d_out,
    int N, int J, int Q, int depth,
    int pad_n, cudaStream_t s);

void run_scatter_2d(
    float* d_in, float* d_fb, float* d_orient_buf, float* d_out,
    int Nx, int Ny, int J, int Q, int L, int depth,
    int pad_circular_axis, cudaStream_t s);

void run_scatter_3d(
    float* d_in, float* d_fb, float* d_orient_buf, float* d_out,
    int Nx, int Ny, int Nz, int J, int Q, int l_max, int depth,
    cudaStream_t s);

// ---------------------------------------------------------------------------
// ScatteringEngine<ArchTag, Dim, Group>
//
// Dim and Group are compile-time; J, Q, L, depth are runtime (set in configure).
// No cudaMalloc happens inside forward_pass — all allocations are done in
// configure() so that repeated calls amortise allocation cost.
// ---------------------------------------------------------------------------
template<typename ArchTag, int Dim, class Group>
class ScatteringEngine {
    int J_{0}, Q_{0}, L_{0}, depth_{0};
    int N_axis_{0};    // samples per axis (assumed equal for all Dim axes)

    // Lazily-allocated device buffers (null until configure())
    float*        d_input_f32{nullptr};
    float*        d_filter_bank{nullptr};
    float*        d_orient_buf{nullptr};
    float*        d_output_f32{nullptr};

    cudaStream_t  stream_{};
    bool          configured_{false};

    // Derived sizes
    int n_fb_elements_{0};
    int output_count_{0};
    int orient_buf_count_{0};

    void guard_J() const {
        int N = N_axis_;
        // compile + runtime guard: 2^J must fit within the padded axis
        int padded = N;
        // For zero-pad axis: pad to next pow-2, so check against that
        for (int p = 1; p < 32; p <<= 1) if (p >= N) { padded = p; break; }
        if ((1 << J_) > padded / 2) {
            throw std::runtime_error(
                std::string("2^J > padded_N/2: J=") + std::to_string(J_) +
                " exceeds axis length " + std::to_string(N));
        }
    }

    int coeff_count_for_config() const {
        // S0 + S1 + S2 paths: (1 + J*Q + (J*Q)^2 / 2) * N_axis^Dim
        int n_spatial = 1;
        for (int d = 0; d < Dim; ++d) n_spatial *= N_axis_;
        int n_paths = 1 + J_ * Q_ + (J_ * Q_) * (J_ * Q_ - 1) / 2;
        return n_paths * n_spatial;
    }

    int orient_count() const {
        if constexpr (std::is_same_v<Group, SO2>) {
            return L_ * N_axis_ * N_axis_;
        } else if constexpr (std::is_same_v<Group, SO3>) {
            // max 2ℓ+1 channels for ℓ up to l_max = L_ - 1
            int total = 0;
            for (int ell = 0; ell < L_; ++ell) total += 2 * ell + 1;
            return total * N_axis_ * N_axis_ * N_axis_;
        }
        return 0;
    }

    int fb_count() const {
        if constexpr (std::is_same_v<Group, Trivial>) {
            return J_ * Q_ * N_axis_;
        } else if constexpr (std::is_same_v<Group, SO2>) {
            return J_ * Q_ * L_ * N_axis_ * N_axis_;
        } else { // SO3
            int n_channels = 0;
            for (int ell = 0; ell < L_; ++ell) n_channels += 2 * ell + 1;
            return J_ * Q_ * n_channels * N_axis_ * N_axis_ * N_axis_;
        }
    }

public:
    void configure(int J, int Q, int L, int depth, int N_axis) {
        if (configured_) destroy();

        J_ = J; Q_ = Q; L_ = L; depth_ = depth; N_axis_ = N_axis;
        guard_J();

        cudaStreamCreate(&stream_);

        int n_in = 1;
        for (int d = 0; d < Dim; ++d) n_in *= N_axis_;

        n_fb_elements_   = fb_count();
        output_count_    = coeff_count_for_config();
        orient_buf_count_= orient_count();

        cudaMalloc(&d_input_f32,   (size_t)n_in          * sizeof(float));
        cudaMalloc(&d_filter_bank, (size_t)n_fb_elements_* sizeof(float));
        cudaMalloc(&d_output_f32,  (size_t)output_count_ * sizeof(float));
        if (orient_buf_count_ > 0)
            cudaMalloc(&d_orient_buf, (size_t)orient_buf_count_ * sizeof(float));

        // Build filter bank on GPU
        if constexpr (std::is_same_v<Group, Trivial>) {
            build_filter_bank_1d(d_filter_bank, J_, Q_, N_axis_, stream_);
        } else if constexpr (std::is_same_v<Group, SO2>) {
            build_filter_bank_2d(d_filter_bank, J_, Q_, L_, N_axis_, N_axis_, stream_);
        } else {
            build_filter_bank_3d(d_filter_bank, J_, Q_, L_ - 1, N_axis_, N_axis_, N_axis_, stream_);
        }
        cudaStreamSynchronize(stream_);
        configured_ = true;
    }

    // forward_pass — no cudaMalloc; all GPU buffers are pre-allocated in configure().
    // host_ptr:  pointer to a float32 C-contiguous array of length `numel`
    // Returns:   ScatterResult with malloc'd host buffer (caller frees coeff_ptr)
    ScatterResult forward_pass(uint64_t host_ptr, int numel) {
        if (!configured_) throw std::runtime_error("ScatteringEngine: call configure() before forward_pass()");

        auto t0 = std::chrono::steady_clock::now();

        // H2D copy
        cudaMemcpyAsync(d_input_f32, reinterpret_cast<const void*>(host_ptr),
                        (size_t)numel * sizeof(float), cudaMemcpyHostToDevice, stream_);

        // Run scattering cascade (dispatch on Dim/Group at compile time)
        if constexpr (std::is_same_v<Group, Trivial>) {
            run_scatter_1d(d_input_f32, d_filter_bank, d_output_f32,
                           N_axis_, J_, Q_, depth_, /*pad_n=*/0, stream_);
        } else if constexpr (std::is_same_v<Group, SO2>) {
            run_scatter_2d(d_input_f32, d_filter_bank, d_orient_buf, d_output_f32,
                           N_axis_, N_axis_, J_, Q_, L_, depth_,
                           /*pad_circular_axis=*/1, stream_);
        } else {
            run_scatter_3d(d_input_f32, d_filter_bank, d_orient_buf, d_output_f32,
                           N_axis_, N_axis_, N_axis_, J_, Q_, L_ - 1, depth_, stream_);
        }

        // D2H copy into malloc'd host buffer
        size_t out_bytes = (size_t)output_count_ * sizeof(float);
        float* h_out = static_cast<float*>(std::malloc(out_bytes));
        if (!h_out) throw std::runtime_error("ScatteringEngine: host malloc failed");

        cudaMemcpyAsync(h_out, d_output_f32, out_bytes, cudaMemcpyDeviceToHost, stream_);
        cudaStreamSynchronize(stream_);

        auto t1 = std::chrono::steady_clock::now();
        uint64_t us = static_cast<uint64_t>(
            std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count());

        return ScatterResult{
            reinterpret_cast<uint64_t>(h_out),
            static_cast<uint64_t>(output_count_),
            us
        };
    }

    void destroy() {
        if (!configured_) return;
        cudaStreamSynchronize(stream_);
        if (d_input_f32)   { cudaFree(d_input_f32);   d_input_f32   = nullptr; }
        if (d_filter_bank) { cudaFree(d_filter_bank); d_filter_bank = nullptr; }
        if (d_output_f32)  { cudaFree(d_output_f32);  d_output_f32  = nullptr; }
        if (d_orient_buf)  { cudaFree(d_orient_buf);  d_orient_buf  = nullptr; }
        cudaStreamDestroy(stream_);
        configured_ = false;
    }

    ~ScatteringEngine() { destroy(); }
};
