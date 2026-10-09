"use client";

import { motion } from "framer-motion";

export default function FfiBridgeLane({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col gap-2 font-medium">
      <div className="flex items-center gap-2">
        <span className="font-sans font-semibold text-label uppercase tracking-label" style={{ color: "var(--ink)" }}>
          cxx FFI bridge
        </span>
      </div>
      <motion.div
        className="code-panel p-4 border font-mono text-code"
        style={{ borderColor: "var(--panel-rule)", backgroundColor: "var(--bg-elev)" }}
        animate={{ borderColor: active ? "var(--signal-warm)" : "var(--panel-rule)" }}
        transition={{ duration: 0.3 }}
      >
        <span style={{ color: "var(--ink)" }}>{"// omni_ffi_kernel.rs:90-97"}</span>
        {"\n"}
        <span style={{ color: "var(--accent)" }}>{"unsafe fn"}</span>
        <span style={{ color: "var(--ink)" }}>{" run_wst_pipeline("}</span>
        {"\n"}
        <span style={{ color: "var(--ink)" }}>{"    ptr: u64, len: u32,"}</span>
        {"\n"}
        <span style={{ color: "var(--ink)" }}>{"    j: u32, q: u32, depth: u32"}</span>
        {"\n"}
        <span style={{ color: "var(--ink)" }}>{") → WSTResult"}</span>
        {"\n"}
        <span style={{ color: "var(--ink)" }}>{"// → omni_ffi::execute_fingerprint_pass(...)"}</span>
      </motion.div>
    </div>
  );
}
