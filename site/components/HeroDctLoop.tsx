"use client";

import { memo } from "react";
import { usePreviewCycle } from "@/lib/usePreviewCycle";
import { motion, AnimatePresence } from "framer-motion";

const BASE = "rgba(194,70,31,0.22)";
const PEAK = "rgba(194,70,31,0.78)";
const MID = "rgba(194,70,31,0.38)";
const BITS = "10110010 11001011 01101100 10110010";

/* ---------- DCT grid ---------- */

const CELLS = Array.from({ length: 64 }, (_, i) => {
  const u = Math.floor(i / 8);
  const v = i % 8;
  const s = u + v;
  return { i, isMid: s >= 2 && s <= 6 };
});

// Every colour state starts and ends at BASE, so looping never snaps.
// Opacity is never animated on the cells (that was dimming the borders too).
const PULSE_KEYFRAMES = [BASE, PEAK, MID, PEAK, BASE];

// Slightly stronger tint while the ID is "embedded" (beats 1-2), so the
// band stays visibly marked instead of looking like an empty grid.
const HELD = "rgba(194,70,31,0.34)";

const Cell = memo(function Cell({
  i,
  isMid,
  pulse,
  held,
}: {
  i: number;
  isMid: boolean;
  pulse: boolean;
  held: boolean;
}) {
  return (
    <motion.div
      style={{
        border: "0.5px solid rgba(27,27,31,0.22)",
        backgroundColor: isMid ? BASE : "transparent",
      }}
      animate={
        isMid
          ? {
              backgroundColor: pulse
                ? PULSE_KEYFRAMES
                : held
                ? HELD
                : BASE,
            }
          : undefined
      }
      transition={
        pulse
          ? { duration: 1.1, ease: "easeInOut", delay: i * 0.008 }
          : { duration: 0.4, ease: "easeOut" }
      }
    />
  );
});

function DctGrid({ pulse, held }: { pulse: boolean; held: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gap: 1,
        position: "absolute",
        inset: 0,
      }}
    >
      {CELLS.map((c) => (
        <Cell key={c.i} i={c.i} isMid={c.isMid} pulse={pulse} held={held} />
      ))}
    </div>
  );
}

/* ---------- Overlays ---------- */

function BitsSlide() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        position: "absolute",
        bottom: 20,
        left: 12,
        right: 12,
        backgroundColor: "rgba(27,27,31,0.82)",
        padding: "8px 10px",
        borderRadius: 2,
      }}
    >
      <p
        className="font-mono text-label"
        style={{ color: "#F7BB87", letterSpacing: "0.08em" }}
      >
        {BITS}
      </p>
      <p
        className="font-mono text-label"
        style={{ color: "rgba(255,255,255,0.85)", marginTop: 3 }}
      >
        signed ID
      </p>
    </motion.div>
  );
}

// The wrapper owns enter/exit, so the whole layer fades out together
// instead of the caption and wash vanishing instantly.
function Shimmer() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {/* No mixBlendMode: blend modes force a full repaint every frame */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0, 0.25, 0] }}
        transition={{ duration: 1.6, times: [0, 0.2, 0.45, 0.7, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(255,255,255,0.6)",
          willChange: "opacity",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        style={{
          position: "absolute",
          bottom: 12,
          left: 10,
          right: 10,
          backgroundColor: "rgba(27,27,31,0.75)",
          padding: "6px 8px",
          borderRadius: 2,
        }}
      >
        <p
          className="font-mono text-label"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          re-encoded, cropped, re-uploaded
        </p>
      </motion.div>
    </motion.div>
  );
}

function VerdictChip() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      // Framer owns `transform`, so a raw translateX(-50%) in style gets
      // overwritten. Centre through the `x` motion value instead.
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        x: "-50%",
        backgroundColor: "rgba(42,157,143,0.12)",
        border: "1px solid var(--accent-teal)",
        padding: "6px 14px",
        borderRadius: 2,
        whiteSpace: "nowrap",
      }}
    >
      <span
        className="font-mono text-label"
        style={{ color: "var(--accent-teal)", letterSpacing: "0.1em" }}
      >
        Verified: Exact
      </span>
    </motion.div>
  );
}

/* ---------- Main ---------- */

export default function HeroDctLoop() {
  const { stage: beat, playing, reduced, togglePlaying } = usePreviewCycle(
    4,
    2000
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/10",
          backgroundColor: "var(--bg-elev)",
          border: "1px solid var(--rule)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(194,70,31,0.06) 0%, rgba(42,157,143,0.06) 100%)",
          }}
        />

        {/* Grid is always mounted and always fully visible; only the
            mid-band tint changes between beats. */}
        <div style={{ position: "absolute", inset: 0 }}>
          <DctGrid
            pulse={!reduced && beat === 0}
            held={beat === 1 || beat === 2}
          />
        </div>

        <AnimatePresence>
          {beat === 1 && <BitsSlide key="bits" />}
        </AnimatePresence>

        <AnimatePresence>
          {beat === 2 && <Shimmer key="shimmer" />}
        </AnimatePresence>

        <AnimatePresence>
          {beat === 3 && <VerdictChip key="verdict" />}
        </AnimatePresence>

        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            gap: 4,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor:
                  i === beat ? "var(--signal-warm)" : "rgba(27,27,31,0.2)",
                transition: "background-color 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      <p
        className="font-mono text-small text-center"
        style={{ color: "var(--ink-mute)" }}
      >
        The identifier survives what the internet does to media.
      </p>

      {/* Always rendered (just hidden) so it can't cause layout shift when
          `reduced` resolves after hydration. */}
      <button
        onClick={togglePlaying}
        className="preview-play text-small self-center"
        aria-label={playing ? "Pause grid preview" : "Play grid preview"}
        style={{ visibility: reduced ? "hidden" : "visible" }}
        tabIndex={reduced ? -1 : 0}
      >
        {playing ? "Pause Ⅱ" : "Play ▷"}
      </button>
    </div>
  );
}