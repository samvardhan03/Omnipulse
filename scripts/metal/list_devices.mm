// SPDX-License-Identifier: AGPL-3.0-or-later
//
// List every MTLDevice on this Mac. Prints one row per device:
//     index<TAB>registry_id<TAB>name
// Used by scripts/metal/parity_all_devices.sh to iterate the parity suite
// once per GPU with OMNIPULSE_METAL_DEVICE set.
//
// Build and run (Command Line Tools clang is enough; needs no Xcode):
//
//   clang++ -std=c++17 -fobjc-arc -O2 scripts/metal/list_devices.mm \
//       -framework Metal -framework Foundation -o /tmp/metal-list-devices
//   /tmp/metal-list-devices

#import <Foundation/Foundation.h>
#import <Metal/Metal.h>
#include <cstdio>

int main() {
    @autoreleasepool {
        NSArray<id<MTLDevice>>* devs = MTLCopyAllDevices();
        for (NSUInteger i = 0; i < devs.count; ++i) {
            id<MTLDevice> d = devs[i];
            printf("%lu\t%llu\t%s\n",
                   (unsigned long)i,
                   (unsigned long long)d.registryID,
                   d.name.UTF8String);
        }
    }
    return 0;
}
