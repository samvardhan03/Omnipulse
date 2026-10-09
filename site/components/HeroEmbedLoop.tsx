"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePreviewCycle } from "@/lib/usePreviewCycle";

const STAGES = [
  { label: "Original", title: "A record starts with your media.", body: "An original asset enters the registration pipeline." },
  { label: "Embed", title: "An identifier woven into the signal.", body: "OmniLock explores embedding an ID into mid-band DCT coefficients." },
  { label: "Transform", title: "The file changes. The question stays.", body: "Re-encoding and cropping are attacks the research aims to withstand." },
  { label: "Recover", title: "Recover the ID. Verify the record.", body: "The goal: connect a recovered identifier to a signed registration." },
];

export default function HeroEmbedLoop() {
  const { stage, playing, reduced, togglePlaying } = usePreviewCycle(STAGES.length);

  return (
    <div>
      <div className="provenance-stage" aria-hidden="true">
        <div className="absolute top-5 left-5 right-5 flex justify-between font-mono text-label text-[#E9E0D6]">
          <span>OMNI / SIGNAL STUDY</span><span>0{stage + 1} — 04</span>
        </div>
        <svg viewBox="0 0 480 300" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="signal-spectrum" x1="0" y1="0" x2="480" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#F7BB87"/><stop offset="1" stopColor="#8CD8C1"/></linearGradient>
          </defs>
          {[70, 110, 150, 190, 230].map((y) => <path key={y} d={`M24 ${y}H456`} stroke="#FFFFFF" strokeOpacity="0.08" />)}
          {Array.from({ length: 53 }, (_, i) => {
            const envelope = Math.sin((i / 52) * Math.PI);
            const height = 12 + envelope * (35 + Math.abs(Math.sin(i * 1.73)) * 106);
            return <motion.rect key={i} x={29 + i * 8} y={150 - height / 2} width="3" rx="1.5" fill="url(#signal-spectrum)"
              animate={{ height: stage === 2 ? height * 0.65 : height, y: 150 - (stage === 2 ? height * 0.65 : height) / 2, opacity: stage === 1 && i % 3 === 0 ? 0.35 : 1 }}
              transition={{ duration: reduced ? 0 : 0.65, delay: reduced ? 0 : i * 0.004 }} />;
          })}
          {stage === 1 && <g stroke="#F7BB87" strokeWidth="1"><rect x="102" y="66" width="276" height="168" rx="6" strokeDasharray="4 5"/><path d="M92 150H388M240 56V244" strokeOpacity="0.3"/></g>}
          {stage === 2 && <g stroke="#E9E0D6" strokeWidth="2"><path d="M112 92V72H132M348 72H368V92M112 208V228H132M348 228H368V208"/><rect x="113" y="73" width="254" height="154" strokeOpacity="0.2"/></g>}
          {stage === 3 && <g><circle cx="240" cy="150" r="34" fill="#163B34" stroke="#8CD8C1"/><path d="m225 150 10 10 20-22" stroke="#8CD8C1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></g>}
        </svg>
        <div className="absolute bottom-5 left-5 right-5 flex justify-between gap-3 text-label font-mono text-[#E9E0D6]">
          <span>{stage === 2 ? "TRANSFORMED SIGNAL" : stage === 3 ? "RECOVERY GOAL" : "MEDIA → IDENTITY"}</span><span>ILLUSTRATION</span>
        </div>
      </div>
      <div className="preview-controls" role="list" aria-label="Concept preview stages">
        {STAGES.map((item, i) => <div key={item.label} role="listitem" aria-current={stage === i ? "step" : undefined} className="preview-step"><span className="font-mono text-label">0{i + 1}</span>{item.label}</div>)}
      </div>
      <div className="min-h-[130px] pt-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.15 }}>
            <p className="font-semibold text-body">{STAGES[stage].title}</p>
            <p className="text-small text-[var(--ink-mute)] mt-2">{STAGES[stage].body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--rule)]">
        <Link href="/how-it-works#omnilock-embed" className="text-small font-semibold">Open interactive demo <span aria-hidden="true">↗</span></Link>
        {!reduced && <button onClick={togglePlaying} className="preview-play text-small" aria-label={playing ? "Pause concept preview" : "Play concept preview"}>{playing ? "Pause Ⅱ" : "Play ▷"}</button>}
      </div>
    </div>
  );
}
