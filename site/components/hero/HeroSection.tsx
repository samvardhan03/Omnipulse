"use client";

import { motion } from "framer-motion";
import Eyebrow from "@/components/primitives/Eyebrow";
import HairlineRule from "@/components/primitives/HairlineRule";
import HeroEmbedLoop from "@/components/HeroEmbedLoop";
import { primaryCta } from "@/lib/links";

export default function HeroSection() {
  return (
    <section id="hero" className="pt-[128px] pb-[96px]" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 md:col-span-7 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Eyebrow>Media provenance and rights infrastructure</Eyebrow>
            </motion.div>

            <motion.h1
              className="font-serif font-light leading-[1.04] tracking-[-0.02em]"
              style={{ fontSize: "clamp(44px, 5.2vw, 76px)", color: "var(--ink)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            >
              Register once. Find every copy.
            </motion.h1>

            <motion.p
              className="text-[18px] leading-[1.6] max-w-[560px]"
              style={{ color: "var(--ink-mute)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              A signed identifier embedded in your media at creation, a fingerprint that finds
              every derivative after, and a record that belongs to you.
            </motion.p>

            <motion.p
              className="font-mono text-[12px] leading-[1.6] max-w-[560px]"
              style={{ color: "var(--ink-mute)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
            >
              Fingerprinting of audio and images is built and tested. The OmniLock active
              watermark is in research. The platform is in private beta.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-4 pt-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            >
              <a
                href={primaryCta.href}
                className="font-mono text-[13px] uppercase tracking-[0.12em] px-6 py-3 border transition-opacity hover:opacity-70"
                style={{ borderColor: "var(--signal-warm)", backgroundColor: "var(--signal-warm)", color: "var(--bg)" }}
              >
                {primaryCta.label}
              </a>
              <a
                href="/how-it-works"
                className="font-mono text-[13px] uppercase tracking-[0.12em] px-6 py-3 border transition-opacity hover:opacity-70"
                style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
              >
                See how it works
              </a>
            </motion.div>
          </div>

          <motion.div
            className="col-span-12 md:col-span-5 flex flex-col justify-center"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
          >
            <HeroEmbedLoop />
          </motion.div>
        </div>
      </div>
      <HairlineRule className="mt-0" />
    </section>
  );
}
