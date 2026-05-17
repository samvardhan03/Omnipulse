import { sha3_256 } from "js-sha3";

export function deriveShmName(audioBytes: Uint8Array): string {
  const hex = sha3_256(audioBytes);
  return hex.slice(0, 28);
}

export function buildJsonRpcEnvelope(
  shmName: string,
  signalLen: number,
  sampleRate: number,
  config: { j: number; q: number; depth: number; jtfs: boolean; dim: number }
): object {
  return {
    jsonrpc: "2.0",
    id: "01J4XXXXXXXXXXXXXXXXXXXXXXXX",
    method: "tools/call",
    params: {
      name: "generate_fingerprint",
      arguments: {
        media_shm_name: shmName,
        signal_len: signalLen,
        sample_rate: sampleRate,
        config,
      },
    },
  };
}
