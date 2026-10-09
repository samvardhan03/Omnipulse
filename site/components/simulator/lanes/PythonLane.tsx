"use client";

import { motion } from "framer-motion";

interface PythonLaneProps {
  active: boolean;
  shmName: string;
}

export default function PythonLane({ active, shmName }: PythonLaneProps) {
  return (
    <div className="flex flex-col gap-2 font-medium">
      <div className="flex items-center gap-2">
        <span className="font-sans font-semibold text-label uppercase tracking-label" style={{ color: "var(--ink)" }}>
          Python control plane
        </span>
      </div>
      <motion.div
        className="code-panel p-4 border font-mono text-code"
        style={{ borderColor: "var(--panel-rule)", backgroundColor: "var(--bg-elev)" }}
        animate={{ borderColor: active ? "var(--signal-warm)" : "var(--panel-rule)" }}
        transition={{ duration: 0.3 }}
      >
        <span style={{ color: "var(--ink)" }}>{"# SharedMemoryManager.ingest_media_tensor"}</span>
        {"\n"}
        <span style={{ color: "var(--accent)" }}>audio</span>
        <span style={{ color: "var(--ink)" }}>{" = np.array([...], dtype=np.float32)"}</span>
        {"\n"}
        <span style={{ color: "var(--accent)" }}>shm_name</span>
        <span style={{ color: "var(--ink)" }}>{" = shm.ingest_media_tensor(audio)"}</span>
        {"\n"}
        <span style={{ color: "var(--ink)" }}>{`# → "${active ? shmName || "a3f7b2c1d4e5f6a7b8c9d0e1" : "..."}" (28 hex chars)`}</span>
      </motion.div>
    </div>
  );
}
