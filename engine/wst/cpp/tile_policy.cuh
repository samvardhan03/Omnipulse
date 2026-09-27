// SPDX-License-Identifier: AGPL-3.0-or-later
#pragma once

// Architecture tags — shared with wst_kernel.cuh; guard against redefinition.
#ifndef SCATTER_ARCH_TAGS_DEFINED
#define SCATTER_ARCH_TAGS_DEFINED
struct DefaultTag  {};
struct AmpereTag   {};  // sm_80  (A100 / A30 / A10)
struct HopperTag   {};  // sm_90  (H100 / H200)
struct BlackwellTag{};  // sm_100 (B100 / B200)
#endif

// TilePolicy<ArchTag> — compile-time tile + warp configuration per GPU generation.
// Used by scatter.cu to pick shared-memory tile sizes and unroll factors.
// Add a new specialisation when a new architecture tag is introduced.

template<typename ArchTag>
struct TilePolicy {
    static constexpr int TILE_M          = 32;
    static constexpr int TILE_N          = 32;
    static constexpr int WARPS_PER_BLOCK = 4;
    static constexpr int UNROLL          = 1;
};

template<>
struct TilePolicy<AmpereTag> {
    static constexpr int TILE_M          = 64;
    static constexpr int TILE_N          = 64;
    static constexpr int WARPS_PER_BLOCK = 8;
    static constexpr int UNROLL          = 2;
};

template<>
struct TilePolicy<HopperTag> {
    static constexpr int TILE_M          = 128;
    static constexpr int TILE_N          = 128;
    static constexpr int WARPS_PER_BLOCK = 16;
    static constexpr int UNROLL          = 4;
};

template<>
struct TilePolicy<BlackwellTag> {
    // B200/B100: 256-wide tiles, 32 warps, 8× software-unroll for the new
    // distributed shared-memory architecture (sm_100 warp-group instructions).
    static constexpr int TILE_M          = 256;
    static constexpr int TILE_N          = 256;
    static constexpr int WARPS_PER_BLOCK = 32;
    static constexpr int UNROLL          = 8;
};
