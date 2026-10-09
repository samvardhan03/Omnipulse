"use client";

import { motion } from "framer-motion";

interface KernelLaneProps {
  active: boolean;
  useGpu: boolean;
  onToggle: () => void;
}

export default function KernelLane({ active, useGpu, onToggle }: KernelLaneProps) {
  return (
    <div className="flex flex-col gap-2 font-medium">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="font-sans font-semibold text-label uppercase tracking-label" style={{ color: "var(--ink)" }}>
            C++/CUDA kernel
          </span>
        </div>
        <button
          onClick={onToggle}
          className="ui-button font-sans border"
          style={{
            borderColor: "var(--rule)",
            color: useGpu ? "var(--accent)" : "var(--ink)",
            backgroundColor: "var(--bg-elev)",
          }}
        >
          {useGpu ? "CUDA Hopper" : "CPU Morlet"}
        </button>
      </div>
      <motion.div
        className="code-panel p-4 border font-mono text-code"
        style={{ borderColor: "var(--panel-rule)", backgroundColor: "var(--bg-elev)" }}
        animate={{ borderColor: active ? "var(--signal-warm)" : "var(--panel-rule)" }}
        transition={{ duration: 0.3 }}
      >
        {useGpu ? (
          <>
            <span style={{ color: "var(--ink)" }}>{"// CUDA Hopper - wst_bridge_cuda.cpp"}</span>
            {"\n"}
            <span style={{ color: "var(--accent)" }}>{"WSTEngine"}</span>
            <span style={{ color: "var(--ink)" }}>{"<HopperTag, /*J=*/8, /*Q=*/16> engine;"}</span>
            {"\n"}
            <span style={{ color: "var(--ink)" }}>{"engine.forward(ptr, len);  // GPU kernel launch"}</span>
          </>
        ) : (
          <>
            <span style={{ color: "var(--ink)" }}>{"// CPU Morlet fallback - wst_bridge_cpu.cpp"}</span>
            {"\n"}
            <span style={{ color: "var(--accent)" }}>{"AnalyticMorletBank"}</span>
            <span style={{ color: "var(--ink)" }}>{"<8, 16> bank;"}</span>
            {"\n"}
            <span style={{ color: "var(--ink)" }}>{"bank.scatter_radix2(ptr, len);  // Radix-2 FFT"}</span>
          </>
        )}
        {"\n"}
        <span style={{ color: "var(--ink)" }}>
          {`# build: cargo build -p omnipulse-mcp --features ${useGpu ? "cuda --release" : "omni-ffi"}`}
        </span>
      </motion.div>
    </div>
  );
}
