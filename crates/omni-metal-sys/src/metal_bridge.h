// SPDX-License-Identifier: AGPL-3.0-or-later
#pragma once

// The cxx-generated header pulls in rust::Slice, rust::Str and the shared
// struct declarations. It lives at include path "omni-metal-sys/src/lib.rs.h".
#include "omni-metal-sys/src/lib.rs.h"

#include <cstdint>

namespace omni_metal {

// Initialise the Metal context from a compiled .metallib byte blob. `selector`
// picks the MTLDevice: an empty string keeps the system default, otherwise
// see resolve_device() in metal_bridge.mm for the selection rules (index,
// registry id, or name substring).
//
// Returns false if no Metal device is available on this host or if the
// selector matches no device. Other failures (malformed metallib, driver
// error) are surfaced as a thrown std::runtime_error which cxx converts to
// Err on the Rust side. The thrown message names the failing step and the
// underlying NSError description verbatim.
bool metal_init_with_metallib(
    ::rust::Slice<const std::uint8_t> metallib_bytes,
    ::rust::Str                       device_selector);

// Initialise the Metal context by compiling shader source at runtime with
// newLibraryWithSource: and MTLCompileOptions set to fastMathEnabled=NO,
// languageVersion=MTLLanguageVersion2_4. Same device-selection rules as the
// metallib variant. Compiler errors are re-thrown verbatim so the Rust error
// type surfaces "program_source:LINE:COL: error: ..." to the caller.
bool metal_init_with_source(
    ::rust::Str shader_source,
    ::rust::Str device_selector);

// Fill in the device information struct. Safe to call before init; unavailable
// devices return is_available == false and default zeroes. shader_path is 0
// for source, 1 for metallib, 2 for uninitialised.
MetalDeviceInfo metal_device_info();

// Enumerate all MTLDevices on the host. Returns a newline-separated list of
// "index\tregistry_id\tname" rows, one per device. Empty when Metal is
// entirely absent. Never throws.
::rust::String metal_list_devices();

// In-place forward or inverse FFT of a complex signal encoded as interleaved
// float pairs (real, imag). Length is N complex samples; `data` therefore has
// length 2 * N. N must be a power of two; anything else throws.
// Normalization is unitary: 1/sqrt(N) applied on both directions.
void metal_fft_forward(::rust::Slice<float> data, std::uint32_t N);
void metal_fft_inverse(::rust::Slice<float> data, std::uint32_t N);

// Full WST scattering cascade over a real signal. Produces `signal_len` real
// coefficients in `output`. Padded internally to next_power_of_2(signal_len).
// Matches engine/wst/cpp/cpu_wst_engine.h's cpu_wst_forward numerically.
void metal_wst_forward(
    ::rust::Slice<const float> input,
    ::rust::Slice<float>       output,
    std::uint32_t signal_len,
    std::uint32_t J,
    std::uint32_t Q,
    std::uint32_t depth);

// Test-only knobs. Off by default. When set, every scratch/output buffer is
// CPU-filled with `pattern` (as a raw u32 bit pattern) before dispatch, and
// (on Managed storage only) the read-back synchronizeResource: barrier is
// omitted when `skip_sync` is true. Together they make a missing
// synchronize fail loudly instead of returning zeros that may accidentally
// look right. See parity_cpu_vs_metal.rs :: stale_read_guard.
void metal_debug_set_sentinel(std::uint32_t pattern, bool enabled);
void metal_debug_set_skip_sync(bool skip);

}  // namespace omni_metal
