// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Metal environment probe. Answers, for every GPU on this Mac: can Metal shader
// source be compiled at runtime without Xcode, which storage mode applies, what a
// missing synchronize does to a Managed buffer, and what fast math costs in accuracy.
// Needs only Command Line Tools. Takes about ten seconds.
//
//   clang++ -std=c++17 -fobjc-arc -O2 scripts/metal/probe.mm \
//       -framework Metal -framework Foundation -o /tmp/metal-probe && /tmp/metal-probe
//
// Reading the output:
//   unified=0 storage=Managed   discrete GPU; every buffer needs didModifyRange: after a
//                               CPU write and a blit synchronizeResource: before a CPU read
//   unified=1 storage=Shared    integrated GPU or Apple silicon; no synchronization step
//   "NO synchronize" line       deliberately skips the synchronize on a Managed GPU; stale
//                               values there are expected and show what the bug looks like
//   twiddle fastMath lines      accuracy of cos and sin with fast math off and on
//
// First recorded on 2026-09-24, MacBook Pro 2017, macOS 13.7.8, Command Line Tools only:
// see Part J.1 of docs/specs/licensing_and_site_blueprint.md.
#import <Foundation/Foundation.h>
#import <Metal/Metal.h>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <vector>

static const char* kSrc = R"MSL(
#include <metal_stdlib>
using namespace metal;

kernel void cmul(device const float2* a [[buffer(0)]],
                 device const float2* b [[buffer(1)]],
                 device float2* out     [[buffer(2)]],
                 uint i [[thread_position_in_grid]]) {
    float2 x = a[i], y = b[i];
    out[i] = float2(x.x * y.x - x.y * y.y, x.x * y.y + x.y * y.x);
}

kernel void twiddle(device float2* out [[buffer(0)]],
                    constant uint& n   [[buffer(1)]],
                    uint i [[thread_position_in_grid]]) {
    float ang = -2.0f * M_PI_F * float(i) / float(n);
    out[i] = float2(cos(ang), sin(ang));
}
)MSL";

static const char* kBroken = R"MSL(
#include <metal_stdlib>
using namespace metal;
kernel void bad(device float* x [[buffer(0)]]) { x[0] = undeclared_name; }
)MSL";

static id<MTLLibrary> compile(id<MTLDevice> dev, const char* src, bool fast,
                              MTLLanguageVersion lv, double* ms, NSString** err) {
    MTLCompileOptions* o = [MTLCompileOptions new];
    o.fastMathEnabled = fast;
    o.languageVersion = lv;
    NSError* e = nil;
    auto t0 = std::chrono::steady_clock::now();
    id<MTLLibrary> lib = [dev newLibraryWithSource:[NSString stringWithUTF8String:src]
                                           options:o error:&e];
    auto t1 = std::chrono::steady_clock::now();
    if (ms) *ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    if (err) *err = e ? e.localizedDescription : nil;
    return lib;
}

// Upload honouring the storage mode: Managed buffers need didModifyRange.
static id<MTLBuffer> buf(id<MTLDevice> dev, const void* bytes, size_t len, MTLResourceOptions opt) {
    id<MTLBuffer> b = [dev newBufferWithLength:len options:opt];
    if (bytes) memcpy(b.contents, bytes, len);
    else memset(b.contents, 0, len);
    if (opt & MTLResourceStorageModeManaged) [b didModifyRange:NSMakeRange(0, len)];
    return b;
}

static void run1d(id<MTLDevice> dev, id<MTLComputePipelineState> ps, NSArray* bufs,
                  const void* constBytes, size_t constLen, NSUInteger n,
                  id<MTLBuffer> readback, bool sync) {
    id<MTLCommandQueue> q = [dev newCommandQueue];
    id<MTLCommandBuffer> cb = [q commandBuffer];
    id<MTLComputeCommandEncoder> enc = [cb computeCommandEncoder];
    [enc setComputePipelineState:ps];
    for (NSUInteger i = 0; i < bufs.count; i++) [enc setBuffer:bufs[i] offset:0 atIndex:i];
    if (constBytes) [enc setBytes:constBytes length:constLen atIndex:bufs.count];
    NSUInteger tg = MIN(ps.maxTotalThreadsPerThreadgroup, (NSUInteger)256);
    [enc dispatchThreads:MTLSizeMake(n, 1, 1) threadsPerThreadgroup:MTLSizeMake(tg, 1, 1)];
    [enc endEncoding];
    if (sync) {
        id<MTLBlitCommandEncoder> blit = [cb blitCommandEncoder];
        [blit synchronizeResource:readback];
        [blit endEncoding];
    }
    [cb commit];
    [cb waitUntilCompleted];
}

int main() {
    @autoreleasepool {
        const NSUInteger N = 4096;
        NSArray<id<MTLDevice>>* devs = MTLCopyAllDevices();
        printf("devices: %lu\n", (unsigned long)devs.count);
        for (id<MTLDevice> dev in devs) {
            bool unified = dev.hasUnifiedMemory;
            MTLResourceOptions opt = unified ? MTLResourceStorageModeShared : MTLResourceStorageModeManaged;
            printf("\n== %s\n   unified=%d lowPower=%d removable=%d metal3=%d storage=%s\n",
                   dev.name.UTF8String, unified, dev.isLowPower, dev.isRemovable,
                   [dev supportsFamily:MTLGPUFamilyMetal3], unified ? "Shared" : "Managed");

            for (MTLLanguageVersion lv : {MTLLanguageVersion2_4, MTLLanguageVersion3_0}) {
                double ms = 0; NSString* err = nil;
                id<MTLLibrary> lib = compile(dev, kSrc, false, lv, &ms, &err);
                printf("   runtime compile, MSL %s, fastMath=off: %s in %.1f ms\n",
                       lv == MTLLanguageVersion2_4 ? "2.4" : "3.0", lib ? "OK" : "FAILED", ms);
                if (!lib) printf("     %s\n", err.UTF8String);
            }

            // Complex multiply against a CPU reference, with and without the Managed sync.
            std::vector<float> a(2 * N), b(2 * N), ref(2 * N);
            for (NSUInteger i = 0; i < N; i++) {
                a[2*i] = std::sin(0.01f * i); a[2*i+1] = std::cos(0.02f * i);
                b[2*i] = 0.5f + 0.001f * i;   b[2*i+1] = -0.25f;
                ref[2*i]   = a[2*i]*b[2*i]   - a[2*i+1]*b[2*i+1];
                ref[2*i+1] = a[2*i]*b[2*i+1] + a[2*i+1]*b[2*i];
            }
            id<MTLLibrary> lib = compile(dev, kSrc, false, MTLLanguageVersion2_4, nullptr, nullptr);
            NSError* pe = nil;
            id<MTLComputePipelineState> cmul =
                [dev newComputePipelineStateWithFunction:[lib newFunctionWithName:@"cmul"] error:&pe];
            for (bool sync : {true, false}) {
                if (unified && !sync) continue;  // no sync step exists for Shared memory
                id<MTLBuffer> ba = buf(dev, a.data(), a.size() * 4, opt);
                id<MTLBuffer> bb = buf(dev, b.data(), b.size() * 4, opt);
                id<MTLBuffer> bo = buf(dev, nullptr, a.size() * 4, opt);
                run1d(dev, cmul, @[ba, bb, bo], nullptr, 0, N, bo, sync);
                const float* o = (const float*)bo.contents;
                double maxErr = 0; size_t zeros = 0;
                for (size_t i = 0; i < ref.size(); i++) {
                    maxErr = std::fmax(maxErr, std::fabs((double)o[i] - ref[i]));
                    if (o[i] == 0.0f && ref[i] != 0.0f) zeros++;
                }
                printf("   cmul %s: max_abs_err=%.3e stale_zero_values=%zu/%zu\n",
                       unified ? "(Shared)" : (sync ? "(Managed, synchronized)" : "(Managed, NO synchronize)"),
                       maxErr, zeros, ref.size());
            }

            // Twiddles: exact math versus fast math against a double-precision reference.
            for (bool fast : {false, true}) {
                id<MTLLibrary> l = compile(dev, kSrc, fast, MTLLanguageVersion2_4, nullptr, nullptr);
                id<MTLComputePipelineState> tw =
                    [dev newComputePipelineStateWithFunction:[l newFunctionWithName:@"twiddle"] error:&pe];
                id<MTLBuffer> bo = buf(dev, nullptr, 2 * N * 4, opt);
                uint32_t n32 = (uint32_t)N;
                run1d(dev, tw, @[bo], &n32, sizeof n32, N, bo, !unified);
                const float* o = (const float*)bo.contents;
                double maxErr = 0;
                for (NSUInteger i = 0; i < N; i++) {
                    double ang = -2.0 * M_PI * (double)i / (double)N;
                    maxErr = std::fmax(maxErr, std::fabs(o[2*i] - std::cos(ang)));
                    maxErr = std::fmax(maxErr, std::fabs(o[2*i+1] - std::sin(ang)));
                }
                printf("   twiddle fastMath=%s: max_abs_err vs double=%.3e\n", fast ? "on " : "off", maxErr);
            }
        }

        // Diagnostics: does a broken shader report a usable compiler error?
        NSString* err = nil;
        id<MTLLibrary> bad = compile(devs.firstObject, kBroken, false, MTLLanguageVersion2_4, nullptr, &err);
        printf("\nbroken shader rejected: %s\n", bad ? "NO (unexpected)" : "yes");
        if (err) printf("compiler said: %s\n", [[err componentsSeparatedByString:@"\n"].firstObject UTF8String]);
    }
    return 0;
}
