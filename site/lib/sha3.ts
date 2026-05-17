import { sha3_256 } from "js-sha3";

/**
 * Derives the 28-char hex shm name from raw audio bytes, mirroring the
 * Python implementation:
 *   hashlib.sha3_256(raw).digest()[:14].hex()
 * The leading "/" is added by shm_open; we return only the 28-char hex.
 */
export function deriveShmName(raw: Uint8Array): string {
  const hex = sha3_256(raw);
  return hex.slice(0, 28);
}

export function float32ArrayToUint8(arr: Float32Array): Uint8Array {
  return new Uint8Array(arr.buffer);
}
