#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Run the CPU-vs-Metal parity suite once per MTLDevice on this Mac.
# Sets OMNIPULSE_METAL_DEVICE to the device index for each run so the bridge
# picks a specific GPU (the default is MTLCreateSystemDefaultDevice(), which
# only ever tests one device on a multi-GPU Mac).
#
# Usage:
#   scripts/metal/parity_all_devices.sh                       (defaults to source path)
#   OMNIPULSE_METAL_SHADERS=source   scripts/metal/parity_all_devices.sh
#   OMNIPULSE_METAL_SHADERS=metallib scripts/metal/parity_all_devices.sh
#
# Any extra arguments are forwarded to cargo test after the test name.
#
# Exits non-zero if the parity suite fails on any device.

set -u
set -o pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$repo_root"

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "parity_all_devices.sh: only meaningful on macOS." >&2
    exit 2
fi

# Build the device lister on the fly. Needs only Command Line Tools clang.
lister="$(mktemp -t metal-list-devices.XXXXXX)"
trap 'rm -f "$lister"' EXIT

clang++ -std=c++17 -fobjc-arc -O2 \
    scripts/metal/list_devices.mm \
    -framework Metal -framework Foundation \
    -o "$lister"

devs="$("$lister")"
if [[ -z "$devs" ]]; then
    echo "parity_all_devices.sh: no Metal devices reported by MTLCopyAllDevices()." >&2
    echo "GPU tests will not run." >&2
    exit 3
fi

echo "== Devices =="
echo "$devs" | awk -F'\t' '{ printf "  [%s] regid=%s name=%s\n", $1, $2, $3 }'
echo

# Ensure the parity binary is built first so per-device runs do not race on
# the same target directory.
cargo build -p omni-backend --features "metal debug-hooks" --tests

fail=0
while IFS=$'\t' read -r idx regid name; do
    [[ -z "$idx" ]] && continue
    echo "===================================================================="
    echo "== Device [$idx] registryID=$regid  $name"
    echo "===================================================================="
    OMNIPULSE_METAL_DEVICE="$idx" \
        cargo test -p omni-backend --features "metal debug-hooks" \
            --test parity_cpu_vs_metal "$@" -- --nocapture --test-threads=1 \
        || fail=$((fail + 1))
done <<< "$devs"

if (( fail > 0 )); then
    echo
    echo "parity_all_devices.sh: $fail device(s) failed the parity suite." >&2
    exit 1
fi
echo
echo "parity_all_devices.sh: parity passed on all $(echo "$devs" | wc -l | tr -d ' ') device(s)."
