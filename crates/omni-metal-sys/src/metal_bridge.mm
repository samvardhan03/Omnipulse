// SPDX-License-Identifier: AGPL-3.0-or-later
// metal_bridge.mm - Objective-C++ host layer for the Metal WST backend.
//
// Owns one MTLDevice / one MTLCommandQueue / one MTLLibrary per process.
// The device is chosen at init time by the device_selector argument:
//   * empty              -> MTLCreateSystemDefaultDevice()
//   * "N" where N < devs -> MTLCopyAllDevices()[N]
//   * "regid:X" or bare  -> match against MTLDevice.registryID
//   * anything else      -> case-insensitive substring match on MTLDevice.name
// An unmatched selector throws with the list of available devices.
//
// Two shader-loading paths, both routed through the same context: metallib
// bytes (offline compile) and shader source (runtime compile with
// fastMathEnabled=NO, MSL 2.4). The runtime path returns compiler errors
// verbatim so the Rust error carries "program_source:LINE:COL: error: ...".
//
// Storage mode:
//   * device.hasUnifiedMemory -> MTLStorageModeShared. CPU and GPU see the
//     same bytes; no explicit synchronization needed around read/write.
//   * otherwise                -> MTLStorageModeManaged. After every CPU
//     write we call didModifyRange: on the buffer, and before every CPU
//     read we insert a blit encoder synchronizeResource: barrier.

#import <Metal/Metal.h>
#import <Foundation/Foundation.h>

#include "metal_bridge.h"

#include <atomic>
#include <cmath>
#include <cstring>
#include <mutex>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace omni_metal {

namespace {

constexpr float kPI = 3.14159265358979323846f;
constexpr float kPsiPeak = 0.98f;

// Shader-path identifiers exposed in MetalDeviceInfo::shader_path.
constexpr std::uint32_t kShaderPathSource       = 0;
constexpr std::uint32_t kShaderPathMetallib     = 1;
constexpr std::uint32_t kShaderPathUninit       = 2;

struct Ctx {
    id<MTLDevice> device = nil;
    id<MTLCommandQueue> queue = nil;
    id<MTLLibrary> library = nil;
    bool unified_memory = false;
    MTLResourceOptions res_options = 0;
    bool initialized = false;
    std::uint32_t shader_path = kShaderPathUninit;
    NSMutableDictionary<NSString*, id<MTLComputePipelineState>>* pipelines = nil;
    NSMutableDictionary<NSNumber*, id<MTLBuffer>>* twiddles = nil;
    NSMutableDictionary<NSString*, id<MTLBuffer>>* filter_banks = nil;
    std::mutex mu;
};

static Ctx& ctx() {
    static Ctx c;
    return c;
}

// Debug knobs. Read on every dispatch; atomic so tests can flip them from
// Rust without extra locking. Off in every release build.
static std::atomic<std::uint32_t> g_sentinel_bits{0};
static std::atomic<bool>          g_sentinel_enabled{false};
static std::atomic<bool>          g_skip_sync{false};

static bool is_pow2(uint32_t x) { return x != 0u && (x & (x - 1u)) == 0u; }

static uint32_t next_pow2(uint32_t x) {
    uint32_t p = 1u;
    while (p < x) p <<= 1;
    return p;
}

// Copy sentinel_bits into a raw byte buffer as many times as it fits.
static void fill_with_sentinel(void* dst, NSUInteger bytes, std::uint32_t pattern) {
    NSUInteger words = bytes / sizeof(std::uint32_t);
    auto* p = static_cast<std::uint32_t*>(dst);
    for (NSUInteger i = 0; i < words; ++i) p[i] = pattern;
    NSUInteger tail = bytes - (words * sizeof(std::uint32_t));
    if (tail) std::memcpy(static_cast<std::uint8_t*>(dst) + words * sizeof(std::uint32_t),
                          &pattern, tail);
}

static void mark_cpu_write(id<MTLBuffer> b, NSUInteger bytes) {
    if (!ctx().unified_memory) {
        [b didModifyRange:NSMakeRange(0, bytes)];
    }
}

// Managed-storage read barrier. Honours the test-only skip_sync knob so a
// stale-read guard can force the failure mode on purpose.
static void enqueue_gpu_read_barrier(id<MTLCommandBuffer> cb, id<MTLBuffer> b) {
    if (ctx().unified_memory) return;
    if (g_skip_sync.load(std::memory_order_relaxed)) return;
    id<MTLBlitCommandEncoder> blit = [cb blitCommandEncoder];
    [blit synchronizeResource:b];
    [blit endEncoding];
}

// Allocate a MTLBuffer, honouring the sentinel debug knob. When the knob is
// on the returned buffer is pre-filled with the sentinel pattern from CPU
// (and, on Managed storage, didModifyRange:'d so the fill is visible to the
// GPU). That way a missing readback barrier surfaces as a surviving sentinel
// instead of an accidental zero.
static id<MTLBuffer> new_buffer(NSUInteger bytes) {
    id<MTLBuffer> b = [ctx().device newBufferWithLength:bytes options:ctx().res_options];
    if (g_sentinel_enabled.load(std::memory_order_relaxed)) {
        std::uint32_t pat = g_sentinel_bits.load(std::memory_order_relaxed);
        fill_with_sentinel(b.contents, bytes, pat);
        mark_cpu_write(b, bytes);
    }
    return b;
}

static id<MTLComputePipelineState> get_pipeline_locked(NSString* name) {
    id<MTLComputePipelineState> p = ctx().pipelines[name];
    if (p) return p;
    NSError* err = nil;
    id<MTLFunction> fn = [ctx().library newFunctionWithName:name];
    if (!fn) {
        throw std::runtime_error(std::string("metal function not found: ") + name.UTF8String);
    }
    p = [ctx().device newComputePipelineStateWithFunction:fn error:&err];
    if (!p) {
        std::string msg = err ? std::string(err.localizedDescription.UTF8String)
                              : std::string("unknown error");
        throw std::runtime_error(std::string("pipeline compile failed for ")
                                 + name.UTF8String + ": " + msg);
    }
    ctx().pipelines[name] = p;
    return p;
}

// Twiddle table: exp(-2*pi*i*k/N) for k in [0, N). Radix-4 stages need to
// index up to about 3N/4, so we store the full N entries rather than N/2.
static id<MTLBuffer> get_twiddle_buffer_locked(uint32_t N) {
    NSNumber* key = @(N);
    id<MTLBuffer> buf = ctx().twiddles[key];
    if (buf) return buf;
    NSUInteger bytes = (NSUInteger)N * 2 * sizeof(float);
    buf = [ctx().device newBufferWithLength:bytes options:ctx().res_options];
    float* p = static_cast<float*>(buf.contents);
    for (uint32_t k = 0; k < N; ++k) {
        float ang = -2.0f * kPI * static_cast<float>(k) / static_cast<float>(N);
        p[2 * k]     = std::cos(ang);
        p[2 * k + 1] = std::sin(ang);
    }
    mark_cpu_write(buf, bytes);
    ctx().twiddles[key] = buf;
    return buf;
}

// Morlet filter bank matching cpu_wst_engine::build_cpu_morlet_bank exactly.
// Row-major layout: bank[lam * signal_len + k]. Peak-normalized so each row's
// maximum equals kPsiPeak. Computed on the CPU and uploaded once per (J, Q,
// signal_len).
static id<MTLBuffer> get_filter_bank_locked(uint32_t J, uint32_t Q, uint32_t signal_len) {
    NSString* key = [NSString stringWithFormat:@"%u_%u_%u", J, Q, signal_len];
    id<MTLBuffer> buf = ctx().filter_banks[key];
    if (buf) return buf;
    uint32_t n_wavelets = J * Q;
    NSUInteger bytes = (NSUInteger)n_wavelets * signal_len * sizeof(float);
    buf = [ctx().device newBufferWithLength:bytes options:ctx().res_options];
    float* p = static_cast<float*>(buf.contents);
    for (uint32_t lam = 0; lam < n_wavelets; ++lam) {
        float ratio = static_cast<float>(lam) / static_cast<float>(Q);
        float xi = kPI * std::pow(2.0f, -ratio);
        float sigma = 0.8f * std::pow(2.0f, ratio);
        float* row = p + (NSUInteger)lam * signal_len;
        float max_val = 0.0f;
        for (uint32_t k = 0; k < signal_len; ++k) {
            float omega = 2.0f * kPI * static_cast<float>(k) / static_cast<float>(signal_len);
            if (omega > kPI) omega -= 2.0f * kPI;
            float diff = sigma * (omega - xi);
            float val = std::exp(-0.5f * diff * diff);
            row[k] = val;
            if (val > max_val) max_val = val;
        }
        if (max_val > 1e-12f) {
            float scale = kPsiPeak / max_val;
            for (uint32_t k = 0; k < signal_len; ++k) row[k] *= scale;
        }
    }
    mark_cpu_write(buf, bytes);
    ctx().filter_banks[key] = buf;
    return buf;
}

// Dispatch a compute pipeline over `total_threads` linear work items. Uses
// dispatchThreadgroups with sizes taken from the pipeline state; each kernel
// bounds-checks its thread id so overshooting is safe.
static void dispatch1d(id<MTLComputeCommandEncoder> enc,
                       id<MTLComputePipelineState> pso,
                       NSUInteger total_threads)
{
    if (total_threads == 0) return;
    NSUInteger w = pso.threadExecutionWidth;
    NSUInteger cap = pso.maxTotalThreadsPerThreadgroup;
    NSUInteger tg = cap;
    if (tg > w) {
        tg -= (tg % w);
    } else {
        tg = w;
    }
    if (tg == 0) tg = 1;
    NSUInteger groups = (total_threads + tg - 1) / tg;
    [enc dispatchThreadgroups:MTLSizeMake(groups, 1, 1)
        threadsPerThreadgroup:MTLSizeMake(tg, 1, 1)];
}

static void run_scale(id<MTLCommandBuffer> cb,
                      id<MTLBuffer> buf,
                      uint32_t N,
                      float s)
{
    id<MTLComputePipelineState> pso = get_pipeline_locked(@"fft_scale");
    id<MTLComputeCommandEncoder> enc = [cb computeCommandEncoder];
    [enc setComputePipelineState:pso];
    [enc setBuffer:buf offset:0 atIndex:0];
    [enc setBytes:&s length:sizeof(float) atIndex:1];
    [enc setBytes:&N length:sizeof(uint32_t) atIndex:2];
    dispatch1d(enc, pso, N);
    [enc endEncoding];
}

// Run the Stockham autosort FFT stages. `in_buf` initially holds the input;
// `pong_buf` is scratch. Returns whichever buffer holds the final output.
// Radix-4 fuses two radix-2 passes whenever the remaining sub-FFT size can
// grow by 4x; falls back to radix-2 for the final odd stage.
static id<MTLBuffer> run_fft_stages(
    id<MTLCommandBuffer> cb,
    id<MTLBuffer> in_buf,
    id<MTLBuffer> pong_buf,
    id<MTLBuffer> twiddles,
    uint32_t N,
    uint32_t is_inverse)
{
    id<MTLComputePipelineState> r2 = get_pipeline_locked(@"fft_r2_stage");
    id<MTLComputePipelineState> r4 = get_pipeline_locked(@"fft_r4_stage");
    id<MTLBuffer> src = in_buf;
    id<MTLBuffer> dst = pong_buf;
    uint32_t Ns = 1u;
    while (Ns < N) {
        bool use_r4 = (Ns * 4u <= N);
        id<MTLComputePipelineState> pso = use_r4 ? r4 : r2;
        id<MTLComputeCommandEncoder> enc = [cb computeCommandEncoder];
        [enc setComputePipelineState:pso];
        [enc setBuffer:src offset:0 atIndex:0];
        [enc setBuffer:dst offset:0 atIndex:1];
        [enc setBuffer:twiddles offset:0 atIndex:2];
        [enc setBytes:&N length:sizeof(uint32_t) atIndex:3];
        [enc setBytes:&Ns length:sizeof(uint32_t) atIndex:4];
        [enc setBytes:&is_inverse length:sizeof(uint32_t) atIndex:5];
        NSUInteger total = use_r4 ? (N / 4u) : (N / 2u);
        dispatch1d(enc, pso, total);
        [enc endEncoding];
        std::swap(src, dst);
        Ns = use_r4 ? (Ns * 4u) : (Ns * 2u);
    }
    // After the final swap, src holds the latest output.
    return src;
}

// Trim leading/trailing whitespace; used when interpreting device selectors.
static std::string trim(const std::string& s) {
    size_t a = 0, b = s.size();
    while (a < b && std::isspace(static_cast<unsigned char>(s[a]))) ++a;
    while (b > a && std::isspace(static_cast<unsigned char>(s[b - 1]))) --b;
    return s.substr(a, b - a);
}

static bool try_parse_u64(const std::string& s, unsigned long long& out) {
    if (s.empty()) return false;
    try {
        size_t consumed = 0;
        out = std::stoull(s, &consumed);
        return consumed == s.size();
    } catch (...) {
        return false;
    }
}

static NSString* devices_summary(NSArray<id<MTLDevice>>* devs) {
    NSMutableString* out = [NSMutableString string];
    for (NSUInteger i = 0; i < devs.count; ++i) {
        id<MTLDevice> d = devs[i];
        [out appendFormat:@"  [%lu] name=\"%s\" registryID=%llu unified=%s\n",
                          (unsigned long)i, d.name.UTF8String,
                          (unsigned long long)d.registryID,
                          d.hasUnifiedMemory ? "yes" : "no"];
    }
    return out;
}

static id<MTLDevice> resolve_device(const std::string& selector_raw) {
    std::string sel = trim(selector_raw);
    NSArray<id<MTLDevice>>* devs = MTLCopyAllDevices();
    if (devs.count == 0) {
        // Try the system default just in case (e.g., an eGPU-only host).
        id<MTLDevice> sysd = MTLCreateSystemDefaultDevice();
        if (sysd && sel.empty()) return sysd;
        return nil;
    }
    if (sel.empty()) {
        id<MTLDevice> sysd = MTLCreateSystemDefaultDevice();
        if (sysd) return sysd;
        return devs[0];
    }

    // 1. Bare integer index into MTLCopyAllDevices().
    unsigned long long as_u64 = 0;
    if (try_parse_u64(sel, as_u64)) {
        if (as_u64 < devs.count) return devs[(NSUInteger)as_u64];
        // 2. Registry id match (also bare integer).
        for (id<MTLDevice> d in devs) {
            if ((unsigned long long)d.registryID == as_u64) return d;
        }
        std::ostringstream oss;
        oss << "OMNIPULSE_METAL_DEVICE=" << sel
            << " matched neither an index in [0," << devs.count << ") nor any device registryID.\n"
            << "Available devices:\n" << devices_summary(devs).UTF8String;
        throw std::runtime_error(oss.str());
    }

    // 3. Case-insensitive name substring match. Ambiguous matches are
    //    reported as an error so the caller narrows the pattern.
    NSString* needle = [[NSString stringWithUTF8String:sel.c_str()] lowercaseString];
    id<MTLDevice> hit = nil;
    NSMutableArray<NSString*>* hit_names = [NSMutableArray array];
    for (id<MTLDevice> d in devs) {
        NSString* hay = [d.name lowercaseString];
        if ([hay rangeOfString:needle].location != NSNotFound) {
            hit = d;
            [hit_names addObject:d.name];
        }
    }
    if (hit_names.count == 1) return hit;
    std::ostringstream oss;
    if (hit_names.count == 0) {
        oss << "OMNIPULSE_METAL_DEVICE=" << sel << " matched no device.\n";
    } else {
        oss << "OMNIPULSE_METAL_DEVICE=" << sel << " is ambiguous ("
            << hit_names.count << " matches). Narrow the substring.\n";
    }
    oss << "Available devices:\n" << devices_summary(devs).UTF8String;
    throw std::runtime_error(oss.str());
}

static bool init_common_locked(Ctx& c, id<MTLDevice> dev, id<MTLLibrary> lib, std::uint32_t path) {
    id<MTLCommandQueue> q = [dev newCommandQueue];
    if (!q) return false;
    c.device = dev;
    c.queue = q;
    c.library = lib;
    c.unified_memory = dev.hasUnifiedMemory;
    c.res_options = c.unified_memory ? MTLResourceStorageModeShared
                                     : MTLResourceStorageModeManaged;
    c.pipelines = [NSMutableDictionary dictionary];
    c.twiddles = [NSMutableDictionary dictionary];
    c.filter_banks = [NSMutableDictionary dictionary];
    c.shader_path = path;
    c.initialized = true;
    return true;
}

}  // anonymous namespace

bool metal_init_with_metallib(
    ::rust::Slice<const std::uint8_t> metallib_bytes,
    ::rust::Str                       device_selector)
{
    Ctx& c = ctx();
    std::lock_guard<std::mutex> lock(c.mu);
    if (c.initialized) return true;

    std::string sel(device_selector.data(), device_selector.size());
    id<MTLDevice> dev = resolve_device(sel);
    if (!dev) return false;

    dispatch_data_t data = dispatch_data_create(
        metallib_bytes.data(),
        metallib_bytes.size(),
        NULL,
        DISPATCH_DATA_DESTRUCTOR_DEFAULT);
    NSError* err = nil;
    id<MTLLibrary> lib = [dev newLibraryWithData:data error:&err];
    if (!lib) {
        std::string msg = err ? std::string(err.localizedDescription.UTF8String)
                              : std::string("unknown error");
        throw std::runtime_error(std::string("failed to load default.metallib: ") + msg);
    }
    return init_common_locked(c, dev, lib, kShaderPathMetallib);
}

bool metal_init_with_source(::rust::Str shader_source, ::rust::Str device_selector) {
    Ctx& c = ctx();
    std::lock_guard<std::mutex> lock(c.mu);
    if (c.initialized) return true;

    std::string sel(device_selector.data(), device_selector.size());
    id<MTLDevice> dev = resolve_device(sel);
    if (!dev) return false;

    NSString* src = [[NSString alloc] initWithBytes:shader_source.data()
                                             length:shader_source.size()
                                           encoding:NSUTF8StringEncoding];
    if (!src) throw std::runtime_error("metal_init_with_source: shader source is not valid UTF-8");

    MTLCompileOptions* opts = [MTLCompileOptions new];
    opts.fastMathEnabled = NO;
    opts.languageVersion = MTLLanguageVersion2_4;

    NSError* err = nil;
    id<MTLLibrary> lib = [dev newLibraryWithSource:src options:opts error:&err];
    if (!lib) {
        std::string msg = err ? std::string(err.localizedDescription.UTF8String)
                              : std::string("unknown error");
        throw std::runtime_error(std::string("metal shader compile failed:\n") + msg);
    }
    return init_common_locked(c, dev, lib, kShaderPathSource);
}

MetalDeviceInfo metal_device_info() {
    Ctx& c = ctx();
    std::lock_guard<std::mutex> lock(c.mu);
    MetalDeviceInfo info{};
    info.is_available = c.initialized;
    info.has_unified_memory = c.unified_memory;
    info.storage_mode = c.unified_memory ? 0u : 1u;
    info.shader_path = c.shader_path;
    return info;
}

::rust::String metal_list_devices() {
    NSArray<id<MTLDevice>>* devs = MTLCopyAllDevices();
    std::string out;
    for (NSUInteger i = 0; i < devs.count; ++i) {
        id<MTLDevice> d = devs[i];
        out += std::to_string((unsigned long long)i);
        out += '\t';
        out += std::to_string((unsigned long long)d.registryID);
        out += '\t';
        out += d.name.UTF8String;
        out += '\n';
    }
    return ::rust::String(out);
}

void metal_debug_set_sentinel(std::uint32_t pattern, bool enabled) {
    g_sentinel_bits.store(pattern, std::memory_order_relaxed);
    g_sentinel_enabled.store(enabled, std::memory_order_relaxed);
}

void metal_debug_set_skip_sync(bool skip) {
    g_skip_sync.store(skip, std::memory_order_relaxed);
}

static void ensure_available_locked(const Ctx& c) {
    if (!c.initialized) {
        throw std::runtime_error("metal backend is not initialized; call metal_init_with_* first");
    }
}

static void fft_impl(::rust::Slice<float> data, std::uint32_t N, std::uint32_t is_inverse) {
    if (!is_pow2(N)) throw std::runtime_error("Metal FFT: length must be a power of two");
    if (data.size() != (size_t)2 * N) {
        throw std::runtime_error("Metal FFT: data slice must have length 2*N (complex interleaved)");
    }

    Ctx& c = ctx();
    std::lock_guard<std::mutex> lock(c.mu);
    ensure_available_locked(c);

    NSUInteger bytes = (NSUInteger)2 * N * sizeof(float);
    id<MTLBuffer> ping = new_buffer(bytes);
    id<MTLBuffer> pong = new_buffer(bytes);
    id<MTLBuffer> twiddles = get_twiddle_buffer_locked(N);

    std::memcpy(ping.contents, data.data(), bytes);
    mark_cpu_write(ping, bytes);

    id<MTLCommandBuffer> cb = [c.queue commandBuffer];
    id<MTLBuffer> result = run_fft_stages(cb, ping, pong, twiddles, N, is_inverse);
    float scale = 1.0f / std::sqrt(static_cast<float>(N));
    run_scale(cb, result, N, scale);
    enqueue_gpu_read_barrier(cb, result);
    [cb commit];
    [cb waitUntilCompleted];

    std::memcpy(data.data(), result.contents, bytes);
}

void metal_fft_forward(::rust::Slice<float> data, std::uint32_t N) {
    fft_impl(data, N, 0u);
}

void metal_fft_inverse(::rust::Slice<float> data, std::uint32_t N) {
    fft_impl(data, N, 1u);
}

void metal_wst_forward(
    ::rust::Slice<const float> input,
    ::rust::Slice<float>       output,
    std::uint32_t signal_len,
    std::uint32_t J,
    std::uint32_t Q,
    std::uint32_t depth)
{
    if (signal_len == 0) throw std::runtime_error("Metal WST: signal_len must be positive");
    if (input.size() != signal_len)
        throw std::runtime_error("Metal WST: input length must equal signal_len");
    if (output.size() != signal_len)
        throw std::runtime_error("Metal WST: output length must equal signal_len");
    if (J == 0 || Q == 0 || depth == 0)
        throw std::runtime_error("Metal WST: J, Q, depth must all be positive");

    uint32_t N = next_pow2(signal_len);

    Ctx& c = ctx();
    std::lock_guard<std::mutex> lock(c.mu);
    ensure_available_locked(c);

    id<MTLBuffer> twiddles = get_twiddle_buffer_locked(N);
    id<MTLBuffer> bank = get_filter_bank_locked(J, Q, signal_len);

    NSUInteger real_bytes = (NSUInteger)signal_len * sizeof(float);
    NSUInteger complex_bytes = (NSUInteger)2 * N * sizeof(float);
    id<MTLBuffer> in_real  = new_buffer(real_bytes);
    id<MTLBuffer> out_real = new_buffer(real_bytes);
    id<MTLBuffer> ping     = new_buffer(complex_bytes);
    id<MTLBuffer> pong     = new_buffer(complex_bytes);

    std::memcpy(in_real.contents, input.data(), real_bytes);
    mark_cpu_write(in_real, real_bytes);

    uint32_t n_wavelets = J * Q;
    float scale = 1.0f / std::sqrt(static_cast<float>(N));

    id<MTLCommandBuffer> cb = [c.queue commandBuffer];

    // Real -> complex load with zero padding out to N.
    {
        id<MTLComputePipelineState> pso = get_pipeline_locked(@"real_to_complex");
        id<MTLComputeCommandEncoder> enc = [cb computeCommandEncoder];
        [enc setComputePipelineState:pso];
        [enc setBuffer:in_real offset:0 atIndex:0];
        [enc setBuffer:ping offset:0 atIndex:1];
        [enc setBytes:&signal_len length:sizeof(uint32_t) atIndex:2];
        [enc setBytes:&N length:sizeof(uint32_t) atIndex:3];
        dispatch1d(enc, pso, N);
        [enc endEncoding];
    }

    id<MTLBuffer> data_buf = ping;
    id<MTLBuffer> other_buf = pong;

    for (uint32_t d = 0; d < depth; ++d) {
        // Wavelet selection matches cpu_wst_engine::cpu_wst_forward exactly.
        uint32_t lam = ((d + 1) * n_wavelets) / (depth + 1);
        if (lam >= n_wavelets) lam = n_wavelets - 1;
        NSUInteger psi_offset = (NSUInteger)lam * signal_len * sizeof(float);

        // Forward FFT.
        id<MTLBuffer> after = run_fft_stages(cb, data_buf, other_buf, twiddles, N, 0u);
        run_scale(cb, after, N, scale);
        other_buf = (after == data_buf) ? other_buf : data_buf;
        data_buf = after;

        // Pointwise multiply by real psi (offset into the concatenated bank).
        {
            id<MTLComputePipelineState> pso = get_pipeline_locked(@"pointwise_mul_psi");
            id<MTLComputeCommandEncoder> enc = [cb computeCommandEncoder];
            [enc setComputePipelineState:pso];
            [enc setBuffer:data_buf offset:0 atIndex:0];
            [enc setBuffer:bank offset:psi_offset atIndex:1];
            [enc setBytes:&N length:sizeof(uint32_t) atIndex:2];
            [enc setBytes:&signal_len length:sizeof(uint32_t) atIndex:3];
            dispatch1d(enc, pso, N);
            [enc endEncoding];
        }

        // Inverse FFT.
        after = run_fft_stages(cb, data_buf, other_buf, twiddles, N, 1u);
        run_scale(cb, after, N, scale);
        other_buf = (after == data_buf) ? other_buf : data_buf;
        data_buf = after;

        // Complex modulus.
        {
            id<MTLComputePipelineState> pso = get_pipeline_locked(@"modulus_inplace");
            id<MTLComputeCommandEncoder> enc = [cb computeCommandEncoder];
            [enc setComputePipelineState:pso];
            [enc setBuffer:data_buf offset:0 atIndex:0];
            [enc setBytes:&N length:sizeof(uint32_t) atIndex:1];
            dispatch1d(enc, pso, N);
            [enc endEncoding];
        }
    }

    // Extract the first signal_len real parts.
    {
        id<MTLComputePipelineState> pso = get_pipeline_locked(@"complex_to_real");
        id<MTLComputeCommandEncoder> enc = [cb computeCommandEncoder];
        [enc setComputePipelineState:pso];
        [enc setBuffer:data_buf offset:0 atIndex:0];
        [enc setBuffer:out_real offset:0 atIndex:1];
        [enc setBytes:&signal_len length:sizeof(uint32_t) atIndex:2];
        dispatch1d(enc, pso, signal_len);
        [enc endEncoding];
    }

    enqueue_gpu_read_barrier(cb, out_real);
    [cb commit];
    [cb waitUntilCompleted];

    std::memcpy(output.data(), out_real.contents, real_bytes);
}

}  // namespace omni_metal
