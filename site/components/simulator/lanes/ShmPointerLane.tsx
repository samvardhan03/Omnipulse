"use client";

import { motion } from "framer-motion";

interface ShmPointerLaneProps {
  active: boolean;
  shmName: string;
}

export default function ShmPointerLane({ active, shmName }: ShmPointerLaneProps) {
  const displayName = shmName || "a3f7b2c1d4e5f6a7b8c9d0e1";

  return (
    <div className="flex flex-col gap-2 font-medium">
      <div className="flex items-center gap-2">
        <span className="font-sans font-semibold text-label uppercase tracking-label" style={{ color: "var(--ink)" }}>
          Shared-memory pointer
        </span>
      </div>
      <motion.div
        className="p-4 border"
        style={{ borderColor: "var(--panel-rule)", backgroundColor: "var(--bg-elev)" }}
        animate={{ borderColor: active ? "var(--signal-warm)" : "var(--panel-rule)" }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-code" style={{ color: "var(--ink)" }}>
              /
            </span>
            {displayName.split("").map((c, i) => (
              <motion.span
                key={i}
                className="font-mono text-code font-bold"
                style={{ color: "var(--accent)" }}
                animate={{ color: active ? "var(--signal-warm)" : "var(--ink)" }}
                transition={{ delay: active ? i * 0.02 : 0, duration: 0.1 }}
              >
                {c}
              </motion.span>
            ))}
          </div>
          <p className="font-mono text-code" style={{ color: "var(--ink)" }}>
            SHA3-256(raw).digest()[:14].hex() - 28 chars fits macOS PSHMNAMLEN=31
          </p>
        </div>
      </motion.div>
    </div>
  );
}
