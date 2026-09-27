// SPDX-License-Identifier: AGPL-3.0-or-later
//! Build script for omni-metal-sys.
//!
//! Selects one of two shader paths and passes it to the Objective-C++ bridge
//! via cfg flags and cargo:rustc-env values. Both paths record the same
//! SHA-256 hash of the shader sources so a `.metallib` produced offline can
//! be checked against the sources at runtime.
//!
//! Modes are driven by the `OMNIPULSE_METAL_SHADERS` environment variable:
//!
//! * `metallib` : Compile the shaders offline with `xcrun -sdk macosx metal`,
//!                link them to a `default.metallib` and embed it via
//!                `include_bytes!`. Flags are pinned to MSL 2.4, fast math
//!                off, macOS 13 deployment target. Fails the build loudly
//!                with an actionable message when the toolchain is missing.
//!
//! * `source`   : Embed the raw `.metal` source into the Rust binary via
//!                `include_str!`. The bridge compiles it at runtime with
//!                `newLibraryWithSource:` and MTLCompileOptions set to
//!                fastMathEnabled=NO, languageVersion=MTLLanguageVersion2_4.
//!                Emits a `cargo:warning` naming the path.
//!
//! * `auto`     : Pick `metallib` when `xcrun metal` is available, otherwise
//!                fall back to `source`. This is the default.
//!
//! On any non-macOS target, or when the `metal` feature is off, the build
//! script becomes a no-op: the Rust code compiles as an unavailable stub and
//! Linux CI stays hermetic. The shader hash is still exposed so DeviceInfo
//! carries an identifier on every build.

use sha2::{Digest, Sha256};
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-env-changed=OMNIPULSE_METAL_SHADERS");

    let crate_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let shader_sources: [(&str, PathBuf); 2] = [
        ("fft_stockham.metal", crate_dir.join("shaders/fft_stockham.metal")),
        ("wst_ops.metal",      crate_dir.join("shaders/wst_ops.metal")),
    ];
    for (_, p) in &shader_sources {
        println!("cargo:rerun-if-changed={}", p.display());
    }

    let shader_hash = hash_shader_sources(&shader_sources);
    println!("cargo:rustc-env=OMNIPULSE_METAL_SHADER_HASH={shader_hash}");

    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let metal_feature = env::var("CARGO_FEATURE_METAL").is_ok();

    if target_os != "macos" || !metal_feature {
        println!(
            "cargo:warning=omni-metal-sys: metal backend disabled (target_os={}, metal_feature={})",
            target_os, metal_feature
        );
        println!("cargo:rustc-env=OMNIPULSE_METAL_SHADER_PATH=unavailable");
        return;
    }

    println!("cargo:rerun-if-changed=src/metal_bridge.h");
    println!("cargo:rerun-if-changed=src/metal_bridge.mm");

    let mode_raw = env::var("OMNIPULSE_METAL_SHADERS").unwrap_or_else(|_| "auto".to_string());
    let mode = mode_raw.trim().to_ascii_lowercase();
    let toolchain_ok = xcrun_metal_available();

    let chosen: &str = match mode.as_str() {
        "metallib" => {
            if !toolchain_ok {
                panic!(
                    "{}",
                    missing_toolchain_message("OMNIPULSE_METAL_SHADERS=metallib")
                );
            }
            build_metallib(&crate_dir, &shader_sources);
            "metallib"
        }
        "source" => {
            println!(
                "cargo:warning=omni-metal-sys: OMNIPULSE_METAL_SHADERS=source. \
                 Shaders will be compiled at runtime by the Metal driver with \
                 newLibraryWithSource: (fast math off, MSL 2.4). Source hash: {shader_hash}"
            );
            "source"
        }
        "auto" | "" => {
            if toolchain_ok {
                build_metallib(&crate_dir, &shader_sources);
                "metallib"
            } else {
                println!(
                    "cargo:warning=omni-metal-sys: OMNIPULSE_METAL_SHADERS=auto, no xcrun metal \
                     toolchain on this host. Falling back to runtime source compilation \
                     (fast math off, MSL 2.4). Source hash: {shader_hash}"
                );
                "source"
            }
        }
        other => panic!(
            "OMNIPULSE_METAL_SHADERS: unknown value {other:?}. Valid: auto, source, metallib."
        ),
    };

    println!("cargo:rustc-env=OMNIPULSE_METAL_SHADER_PATH={chosen}");
    println!("cargo:rustc-cfg=shader_path_{chosen}");
    println!("cargo:rustc-check-cfg=cfg(shader_path_metallib)");
    println!("cargo:rustc-check-cfg=cfg(shader_path_source)");

    // Compile the Objective-C++ host layer through cxx-build so it can see
    // the generated `omni-metal-sys/src/lib.rs.h`.
    let mut build = cxx_build::bridge("src/lib.rs");
    build
        .file("src/metal_bridge.mm")
        .include(crate_dir.join("src"))
        .flag("-std=c++17")
        .flag("-fobjc-arc")
        .flag_if_supported("-Wno-unused-parameter")
        .flag_if_supported("-Wno-unused-function");
    build.compile("omni_metal_sys");

    println!("cargo:rustc-link-lib=framework=Metal");
    println!("cargo:rustc-link-lib=framework=Foundation");
}

// Canonical SHA-256 over the shader sources. File names are folded into the
// hash so renaming a file also changes the hash, and each field is
// zero-delimited so concatenation ambiguity cannot forge a match.
fn hash_shader_sources(sources: &[(&str, PathBuf)]) -> String {
    let mut h = Sha256::new();
    for (name, path) in sources {
        let bytes = std::fs::read(path)
            .unwrap_or_else(|e| panic!("cannot read shader source {}: {e}", path.display()));
        h.update(name.as_bytes());
        h.update([0u8]);
        h.update(&bytes);
        h.update([0u8]);
    }
    hex::encode(h.finalize())
}

fn xcrun_metal_available() -> bool {
    match Command::new("xcrun").args(["-sdk", "macosx", "-f", "metal"]).output() {
        Ok(o) if o.status.success() => (),
        _ => return false,
    }
    match Command::new("xcrun").args(["-sdk", "macosx", "-f", "metallib"]).output() {
        Ok(o) => o.status.success(),
        Err(_) => false,
    }
}

fn build_metallib(crate_dir: &Path, sources: &[(&str, PathBuf)]) {
    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR"));
    let mut air_files = Vec::new();
    for (name, src) in sources {
        let air = out_dir.join(format!(
            "{}.air",
            Path::new(name).file_stem().and_then(|s| s.to_str()).unwrap_or("shader")
        ));
        // MSL versions before 3.0 carry a platform prefix: "macos-metal2.4", not
        // "metal2.4", which the compiler rejects. Must stay in step with the
        // runtime path's MTLLanguageVersion2_4 so both paths compile the same
        // language with fast math off.
        let status = Command::new("xcrun")
            .args(["-sdk", "macosx", "metal", "-c"])
            .args(["-std=macos-metal2.4", "-fno-fast-math", "-mmacosx-version-min=13.0"])
            .arg(src)
            .arg("-o")
            .arg(&air)
            .status()
            .unwrap_or_else(|e| panic!("failed to invoke xcrun metal: {e}"));
        if !status.success() {
            panic!(
                "xcrun -sdk macosx metal -c failed for {}. See errors above.",
                src.display()
            );
        }
        air_files.push(air);
    }

    let metallib_path = out_dir.join("default.metallib");
    let status = Command::new("xcrun")
        .args(["-sdk", "macosx", "metallib"])
        .args(&air_files)
        .arg("-o")
        .arg(&metallib_path)
        .status()
        .unwrap_or_else(|e| panic!("failed to invoke xcrun metallib: {e}"));
    if !status.success() {
        panic!("xcrun -sdk macosx metallib failed. See errors above.");
    }
    let _ = crate_dir; // reserved for future re-use; keeps signature honest
}

fn missing_toolchain_message(source_of_request: &str) -> String {
    format!(
        "\n\n\
        ERROR: {source_of_request} but the Xcode Metal shader toolchain\n\
        (`metal` and `metallib` under `xcrun -sdk macosx`) is not on this host.\n\
        \n\
        These binaries do NOT ship with the standalone Command Line Tools;\n\
        they are only in the full Xcode.app.\n\
        \n\
        Fix (release builds and CI):\n\
        \n\
        \t1. Install Xcode from the Mac App Store, then\n\
        \t2. sudo xcode-select -s /Applications/Xcode.app/Contents/Developer\n\
        \t3. sudo xcodebuild -license accept\n\
        \n\
        Or, for a development machine without Xcode, use the runtime source\n\
        path: set OMNIPULSE_METAL_SHADERS=source (or leave it unset for auto)\n\
        and the bridge will compile the shaders at runtime with\n\
        newLibraryWithSource:.\n\n"
    )
}
