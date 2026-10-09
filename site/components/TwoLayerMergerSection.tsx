"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Eyebrow from "@/components/primitives/Eyebrow";
import TwoLayerDctExplorer from "./TwoLayerDctExplorer";
import TwoLayerAttackToggle from "./TwoLayerAttackToggle";

function MathExpander({
  formula,
  plain,
  accent,
}: {
  formula: string;
  plain: string;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  return (
    <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 12, marginTop: 4 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-sans text-label uppercase tracking-label flex items-center gap-2 transition-opacity hover:opacity-70"
        style={{ color: accent }}
        aria-expanded={open}
      >
        <span
          style={{
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          &rsaquo;
        </span>
        The math, in one line
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.24 }}
          >
            <div className="pt-3 flex flex-col gap-3">
              <code
                className="font-mono text-code block p-3"
                style={{
                  backgroundColor: "rgba(27,27,31,0.05)",
                  color: "var(--ink)",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {formula}
              </code>
              <p className="text-body" style={{ color: "var(--ink-mute)" }}>
                {plain}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SharedSubstrate() {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const items = [
    "Polyglot C++/CUDA + Rust + Python",
    "Zero-copy pinned memory",
    "MCP control plane",
    "One HNSW index",
    "Ed25519 tokens on IPFS",
  ];
  return (
    <div
      className="mt-6 border"
      style={{ borderColor: "var(--rule)" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 transition-opacity hover:opacity-70"
        aria-expanded={open}
      >
        <span
          className="font-sans text-label uppercase tracking-label"
          style={{ color: "var(--ink-mute)" }}
        >
          Shared substrate
        </span>
        <span
          className="font-mono text-code"
          style={{
            color: "var(--ink-mute)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          v
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.24 }}
          >
            <div
              className="px-4 pb-4 flex flex-wrap gap-3"
              style={{ borderTop: "1px solid var(--rule)" }}
            >
              {items.map((item) => (
                <span
                  key={item}
                  className="font-sans text-small px-3 py-1.5 border"
                  style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TwoLayerMergerSection() {
  return (
    <section
      id="interactive"
      style={{ borderBottom: "1px solid var(--rule)" }}
    >
      <div className="site-container">
        <div className="mb-8 flex flex-col gap-3">
          <Eyebrow>One record, two ways to reach it</Eyebrow>
          <h2
            className="font-display font-medium text-section"
            style={{ color: "var(--ink)" }}
          >
            Two engines. One registry. One signed token.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left panel: OmniLock (active) */}
          <div
            className="surface-card flex flex-col gap-5 p-card"
            style={{ borderColor: "var(--signal-warm)" }}
          >
            <div className="flex flex-col gap-1">
              <p
                className="font-sans text-label uppercase tracking-label"
                style={{ color: "var(--signal-warm)" }}
              >
                Active layer
              </p>
              <h3
                className="font-display font-medium text-card-title"
                style={{ color: "var(--ink)" }}
              >
                OmniLock
              </h3>
            </div>

            <p className="text-body" style={{ color: "var(--ink-mute)" }}>
              At creation, we embed a 64-bit signed identifier into the
              video&apos;s motion-compensated residual, in the frequency band a
              modern codec preserves and the eye ignores. Verification recovers
              your identifier exactly, or reports that it cannot. No
              probabilities.
            </p>

            <div
              className="p-4 border"
              style={{ borderColor: "rgba(194,70,31,0.25)", backgroundColor: "rgba(194,70,31,0.04)" }}
            >
              <TwoLayerDctExplorer />
            </div>

            <MathExpander
              formula={"X_wm = X_pred + (residual + alpha * mask)\nwith mask confined to DCT band 2 <= u+v <= 6"}
              plain="The mark rides exactly where the codec spends its bits, so removing it means visibly ruining the video."
              accent="var(--signal-warm)"
            />
          </div>

          {/* Right panel: OmniPulse (passive) */}
          <div
            className="surface-card flex flex-col gap-5 p-card"
            style={{ borderColor: "var(--accent-teal)" }}
          >
            <div className="flex flex-col gap-1">
              <p
                className="font-sans text-label uppercase tracking-label"
                style={{ color: "var(--accent-teal)" }}
              >
                Passive layer
              </p>
              <h3
                className="font-display font-medium text-card-title"
                style={{ color: "var(--ink)" }}
              >
                OmniPulse
              </h3>
            </div>

            <p className="text-body" style={{ color: "var(--ink-mute)" }}>
              When there was no cooperation at creation, there is nothing to
              extract. We compute a deterministic wavelet-scattering fingerprint
              and match it against your catalogue. Same registry, same signed
              token, different physics.
            </p>

            <div
              className="p-4 border"
              style={{ borderColor: "rgba(42,157,143,0.25)", backgroundColor: "rgba(42,157,143,0.04)" }}
            >
              <TwoLayerAttackToggle />
            </div>

            <MathExpander
              formula={"S[p]x = | ... |x * psi_1| * psi_2| ... | * phi_J"}
              plain="Fixed mathematical filters, no trained weights: nothing for an attacker to optimize against, and every verifier gets bit-identical results."
              accent="var(--accent-teal)"
            />
          </div>
        </div>

        <SharedSubstrate />

        <div className="mt-6 text-right">
          <a
            href="/#contact"
            className="font-sans text-label uppercase tracking-label transition-opacity hover:opacity-60"
            style={{ color: "var(--ink-mute)" }}
          >
            Talk to us
          </a>
        </div>
      </div>
    </section>
  );
}
