"use client";

import { motion } from "framer-motion";

interface JsonRpcLaneProps {
  active: boolean;
  envelope: object | null;
}

export default function JsonRpcLane({ active, envelope }: JsonRpcLaneProps) {
  const text = envelope
    ? JSON.stringify(envelope, null, 2)
    : `{
  "jsonrpc": "2.0",
  "id": "01J4...",
  "method": "tools/call",
  "params": {
    "name": "generate_fingerprint",
    "arguments": { ... }
  }
}`;

  return (
    <div className="flex flex-col gap-2 font-medium">
      <div className="flex items-center gap-2">
        <span className="font-sans font-semibold text-label uppercase tracking-label" style={{ color: "var(--ink)" }}>
          Stdio JSON-RPC envelope
        </span>
      </div>
      <motion.div
        className="p-4 border overflow-auto max-h-[180px]"
        style={{ borderColor: "var(--panel-rule)", backgroundColor: "var(--bg-elev)" }}
        animate={{ borderColor: active ? "var(--signal-warm)" : "var(--panel-rule)" }}
        transition={{ duration: 0.3 }}
      >
        <pre className="font-mono text-code whitespace-pre-wrap" style={{ color: "var(--ink)" }}>
          {text}
        </pre>
      </motion.div>
    </div>
  );
}
