// SPDX-License-Identifier: AGPL-3.0-or-later
// scatter_bridge.cpp — runtime (dim, group) → compiled ScatteringEngine<> dispatch.
//
// Each if-branch instantiates a different template combination.  Compiled
// instances are only those explicitly listed here; any other (dim,group) pair
// throws an explicit error rather than silently producing garbage.
//
// Build flags (passed by CMakeLists.txt):
//   nvcc -gencode arch=compute_80,code=sm_80   (Ampere  — A100)
//        -gencode arch=compute_90,code=sm_90   (Hopper  — H100/H200)
//        -gencode arch=compute_100,code=sm_100 (Blackwell — B200)
//        -std=c++17 -O3 --use_fast_math
//   SO(3) extras: --maxrregcount=128 -Xptxas -dlcm=ca

#include "scatter_engine.cuh"
#include <stdexcept>
#include <string>

// ---------------------------------------------------------------------------
// Group integer codes — keep in sync with types_scatter.rs and Python bindings
// ---------------------------------------------------------------------------
static constexpr int TRIVIAL = 0;
static constexpr int SO2_G   = 1;
static constexpr int SO3_G   = 2;

// ---------------------------------------------------------------------------
// Template helper: configure, run, return result
// ---------------------------------------------------------------------------
template<typename ArchTag, int Dim, class Group>
static ScatterResult run(uint64_t ptr, int numel,
                         int J, int Q, int L, int depth, int N_axis) {
    ScatteringEngine<ArchTag, Dim, Group> eng;
    eng.configure(J, Q, L, depth, N_axis);
    ScatterResult r = eng.forward_pass(ptr, numel);
    eng.destroy();
    return r;
}

// ---------------------------------------------------------------------------
// Public C-linkage entry point — called from Rust (omni-ffi-ext / scattering.rs)
// ---------------------------------------------------------------------------
extern "C" {

ScatterResult run_scattering(
    uint64_t host_ptr,
    int      numel,
    int      dim,
    int      group,
    int      J,
    int      Q,
    int      L,
    int      depth,
    int      N_axis
) {
    // Dispatch over the compiled (Dim, Group) instances.
    // Add a new branch here to enable a new symmetry group.
    if (dim == 1 && group == TRIVIAL) {
        return run<AmpereTag, 1, Trivial>(host_ptr, numel, J, Q, L, depth, N_axis);
    }
    if (dim == 2 && group == SO2_G) {
        return run<AmpereTag, 2, SO2>(host_ptr, numel, J, Q, L, depth, N_axis);
    }
    if (dim == 3 && group == SO3_G) {
        return run<AmpereTag, 3, SO3>(host_ptr, numel, J, Q, L, depth, N_axis);
    }
    throw std::runtime_error(
        std::string("unsupported (dim=") + std::to_string(dim) +
        ", group=" + std::to_string(group) + "); not compiled");
}

// Companion: free the host buffer returned in ScatterResult.coeff_ptr
void free_scatter_result(ScatterResult r) {
    if (r.coeff_ptr) std::free(reinterpret_cast<void*>(r.coeff_ptr));
}

}  // extern "C"
