#!/usr/bin/env bash
# check_no_secrets.sh -- CI gate: fail if private artifacts appear in the public tree.
#
# Checks:
#   1. No ML weight files (.safetensors, .pt, .ckpt, .pth)
#   2. No key or certificate files (.pem, .key, .key.enc)
#   3. No generated LDPC H artifacts (ldpc_h_tables.h, ldpc_h_tables.npy)
#   4. omnipulse-engine/ must not be tracked in the git index
#   5. "omni lock/" must not be tracked in the git index
#   6. claude/ must not be tracked in the git index
#   7. .claude/*.md files must not be tracked in the git index
#
# Exit status: 0 = clean, 1 = at least one violation found.
# Run from the repo root.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

PRUNE_ARGS=(
    -path "$ROOT/site/node_modules" -prune -o
    -path "$ROOT/.git" -prune -o
    -path "$ROOT/.claude" -prune -o
    -path "$ROOT/Ethics-and-AI" -prune -o
)

echo "--- check 1: no ML weight files in public tree"
WEIGHT_FILES=$(find "$ROOT" "${PRUNE_ARGS[@]}" \
    \( -name "*.safetensors" -o -name "*.pt" -o -name "*.ckpt" -o -name "*.pth" \) \
    -print 2>/dev/null) || true
if [ -n "$WEIGHT_FILES" ]; then
    echo "FAIL: ML weight files found in public tree:"
    echo "$WEIGHT_FILES"
    FAIL=1
else
    echo "OK"
fi

echo "--- check 2: no key or certificate files"
KEY_FILES=$(find "$ROOT" "${PRUNE_ARGS[@]}" \
    \( -name "*.pem" -o -name "*.key" -o -name "*.key.enc" \) \
    -print 2>/dev/null) || true
if [ -n "$KEY_FILES" ]; then
    echo "FAIL: key/certificate files found in public tree:"
    echo "$KEY_FILES"
    FAIL=1
else
    echo "OK"
fi

echo "--- check 3: no generated LDPC H artifacts"
H_FILES=$(find "$ROOT" "${PRUNE_ARGS[@]}" \
    \( -name "ldpc_h_tables.h" -o -name "ldpc_h_tables.npy" -o -name "ldpc_digest.txt" \) \
    -print 2>/dev/null) || true
if [ -n "$H_FILES" ]; then
    echo "FAIL: LDPC H artifacts found in public tree (must be signed release assets only):"
    echo "$H_FILES"
    FAIL=1
else
    echo "OK"
fi

echo "--- check 4: omnipulse-engine/ must not be tracked in the git index"
ENGINE_IN_INDEX=$(git -C "$ROOT" ls-files -- "omnipulse-engine/" 2>/dev/null) || true
if [ -n "$ENGINE_IN_INDEX" ]; then
    echo "FAIL: omnipulse-engine/ files tracked in git index:"
    echo "$ENGINE_IN_INDEX"
    FAIL=1
else
    echo "OK"
fi

echo "--- check 5: 'omni lock/' must not be tracked in the git index"
OMNI_LOCK_IN_INDEX=$(git -C "$ROOT" ls-files -- "omni lock/" 2>/dev/null) || true
if [ -n "$OMNI_LOCK_IN_INDEX" ]; then
    echo "FAIL: 'omni lock/' files tracked in git index:"
    echo "$OMNI_LOCK_IN_INDEX"
    FAIL=1
else
    echo "OK"
fi

echo "--- check 6: claude/ must not be tracked in the git index"
CLAUDE_IN_INDEX=$(git -C "$ROOT" ls-files -- "claude/" 2>/dev/null) || true
if [ -n "$CLAUDE_IN_INDEX" ]; then
    echo "FAIL: claude/ files tracked in git index:"
    echo "$CLAUDE_IN_INDEX"
    FAIL=1
else
    echo "OK"
fi

echo "--- check 7: .claude/*.md must not be tracked in the git index"
CLAUDE_MD_IN_INDEX=$(git -C "$ROOT" ls-files -- ".claude/*.md" 2>/dev/null) || true
if [ -n "$CLAUDE_MD_IN_INDEX" ]; then
    echo "FAIL: .claude/*.md files tracked in git index:"
    echo "$CLAUDE_MD_IN_INDEX"
    FAIL=1
else
    echo "OK"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
    echo "check_no_secrets: all 7 checks passed"
else
    echo "check_no_secrets: FAILED (see above)"
    exit 1
fi
