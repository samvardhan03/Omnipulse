"use client";

import { motion } from "framer-motion";

export default function RustLane({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col gap-2 font-medium">
      <div className="flex items-center gap-2">
        <span className="font-sans font-semibold text-label uppercase tracking-label" style={{ color: "var(--ink)" }}>
          Rust orchestrator
        </span>
      </div>
      <motion.div
        className="code-panel p-4 border font-mono text-code"
        style={{ borderColor: "var(--panel-rule)", backgroundColor: "var(--bg-elev)" }}
        animate={{ borderColor: active ? "var(--signal-warm)" : "var(--panel-rule)" }}
        transition={{ duration: 0.3 }}
      >
        <span style={{ color: "var(--ink)" }}>{"// server.rs:162-211 - generate_fingerprint handler"}</span>
        {"\n"}
        <span style={{ color: "var(--accent)" }}>{"let signal"}</span>
        <span style={{ color: "var(--ink)" }}>{" = shm::read_and_unlink(&req.media_shm_name, n * 4)?;"}</span>
        {"\n"}
        <span style={{ color: "var(--accent)" }}>{"let fp"}</span>
        <span style={{ color: "var(--ink)" }}>{" = tokio::task::spawn_blocking(move || {"}</span>
        {"\n"}
        <span style={{ color: "var(--ink)" }}>{"    kernel.run(&signal, &cfg)"}</span>
        {"\n"}
        <span style={{ color: "var(--ink)" }}>{"}).await??;"}</span>
      </motion.div>
    </div>
  );
}
