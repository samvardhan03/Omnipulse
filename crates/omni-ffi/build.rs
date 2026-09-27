// SPDX-License-Identifier: AGPL-3.0-or-later
use std::env;
use std::path::PathBuf;

fn main() {
    let crate_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    // Primary env var: OMNIPULSE_WST_CPP.
    // Defaults to ../../engine/wst/cpp relative to this crate (i.e. the
    // engine/wst/cpp directory inside the monorepo).
    // OMNI_WST_CORE_CPP is kept as a deprecated alias for backward
    // compatibility; it triggers a cargo warning if used.
    let engine_cpp = if let Ok(v) = env::var("OMNIPULSE_WST_CPP") {
        PathBuf::from(v)
    } else if let Ok(v) = env::var("OMNI_WST_CORE_CPP") {
        println!(
            "cargo:warning=OMNI_WST_CORE_CPP is deprecated; \
             use OMNIPULSE_WST_CPP instead"
        );
        PathBuf::from(v)
    } else {
        crate_dir.join("../../engine/wst/cpp")
    };

    let cuda_enabled = env::var_os("CARGO_FEATURE_CUDA").is_some();

    let mut build = cxx_build::bridge("src/lib.rs");
    build
        .include(crate_dir.join("cpp"))
        .include(&engine_cpp)
        .flag_if_supported("-std=c++17")
        .flag_if_supported("-Wno-unused-function")
        .flag_if_supported("-Wno-unused-parameter");

    if cuda_enabled {
        // The CUDA bridge translation unit does not exist yet.
        // See docs/consolidation_report.md: this path is not implemented.
        // Build will fail here with a clear message rather than silently
        // linking a stub. The GPU WST path is available through engine/wst
        // (omni-wst-sys and the pybind wheel) without this feature.
        compile_error_cuda_not_implemented();
        // The lines below are unreachable but kept so the build system
        // records the expected link flags for Phase 4:
        // build.file("cpp/wst_bridge_cuda.cpp");
        // println!("cargo:rustc-link-lib=cudart");
        // println!("cargo:rustc-link-lib=cufft");
    } else {
        // CPU-only path. Calls the real Radix-2 FFT + Morlet cascade in
        // cpu_wst_engine.h. No CUDA libraries are linked.
        build.file("cpp/wst_bridge_cpu.cpp");
        println!("cargo:rerun-if-changed=cpp/wst_bridge_cpu.cpp");
    }

    build.compile("omni_wst_bridge");

    println!("cargo:rerun-if-changed=src/lib.rs");
    println!("cargo:rerun-if-changed=cpp/wst_bridge.h");
    println!("cargo:rerun-if-env-changed=OMNIPULSE_WST_CPP");
    println!("cargo:rerun-if-env-changed=OMNI_WST_CORE_CPP");
}

fn compile_error_cuda_not_implemented() -> ! {
    panic!(
        "\n\
        \n\
        ERROR: omni-ffi cuda feature is enabled but cpp/wst_bridge_cuda.cpp \
        does not exist.\n\
        The CUDA WST bridge translation unit is not yet implemented in this \
        crate.\n\
        GPU WST is available through engine/wst (omni-wst-sys and the \
        Python pybind wheel) without this feature.\n\
        This path will be closed in Phase 4. See docs/consolidation_report.md.\n\
        \n"
    );
}
