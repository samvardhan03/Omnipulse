"use client";

import { motion } from "framer-motion";
import Eyebrow from "@/components/primitives/Eyebrow";
import HairlineRule from "@/components/primitives/HairlineRule";

const modules = [
  { name: "omni-wst-core", version: "0.1", channel: "PyPI" },
  { name: "omni-ffi", version: "0.1", channel: "crate" },
  { name: "omni-hnsw", version: "0.1", channel: "crate" },
  { name: "omni-sw", version: "0.1", channel: "crate" },
  { name: "omnipulse-agent", version: "0.1", channel: "PyPI" },
];

export default function HeroSection() {
  return (
    <section id="hero" className="pt-[128px] pb-[96px]" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: 8-col editorial block */}
          <div className="col-span-12 md:col-span-8 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Eyebrow>
                Compliance &amp; IP infrastructure for the generative media era
              </Eyebrow>
            </motion.div>

            <motion.h1
              className="font-serif font-light leading-[1.02] tracking-[-0.02em]"
              style={{
                fontSize: "clamp(48px, 6.4vw, 100px)",
                color: "var(--ink)",
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            >
              Generative media moved faster than provenance.{" "}
              <span style={{ color: "var(--ink-mute)", fontStyle: "italic" }}>
                We rebuilt the substrate.
              </span>
            </motion.h1>

            <motion.p
              className="text-[19px] leading-[1.55] max-w-[640px]"
              style={{ color: "var(--ink-mute)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              OmniPulse is a wavelet-scattering fingerprint plane that
              identifies, attributes, and licenses synthetic and human-authored
              media in under 40 ms — on-prem, GPU-accelerated, MCP-native.
            </motion.p>
          </div>

          {/* Right: 4-col spec card */}
          <motion.div
            className="col-span-12 md:col-span-4 flex flex-col justify-center"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
          >
            <div
              className="border p-6 flex flex-col gap-4"
              style={{ borderColor: "var(--rule)" }}
            >
              <p
                className="font-mono text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--ink-mute)" }}
              >
                Module stack
              </p>
              <div className="flex flex-col gap-3">
                {modules.map((m) => (
                  <div key={m.name} className="flex items-baseline justify-between gap-4">
                    <code
                      className="font-mono text-[13px]"
                      style={{ color: "var(--ink)" }}
                    >
                      {m.name}
                    </code>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[12px]"
                        style={{ color: "var(--ink-mute)" }}
                      >
                        {m.version}
                      </span>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 border"
                        style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}
                      >
                        {m.channel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <HairlineRule className="mt-0" />
    </section>
  );
}
