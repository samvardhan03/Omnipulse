"use client";

import { motion } from "framer-motion";
import Eyebrow from "@/components/primitives/Eyebrow";
import HeroEmbedLoop from "@/components/HeroEmbedLoop";
import { primaryCta } from "@/lib/links";

export default function HeroSection() {
  return (
    <section id="hero" className="hero-section" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="site-container">
        <div className="grid grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="mb-4 status-pill">Private beta</div>
              <Eyebrow>Media provenance and rights infrastructure</Eyebrow>
            </motion.div>

            <motion.h1
              className="font-display font-medium hero-title"
              style={{ color: "var(--ink)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            >
              Register once.<br />
              <span style={{ color: "var(--signal-warm)" }}>Find every copy.</span>
            </motion.h1>

            <motion.p
              className="text-body-lg max-w-[560px]"
              style={{ color: "var(--ink-mute)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              A signed identifier embedded in your media at creation, a fingerprint that finds
              every derivative after, and a record that belongs to you.
            </motion.p>

            <motion.p
              className="font-sans text-small max-w-[560px]"
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
                className="ui-button font-sans border"
                style={{ borderColor: "var(--signal-warm)", backgroundColor: "var(--signal-warm)", color: "var(--bg)" }}
              >
                {primaryCta.label}
                <span aria-hidden="true">↗</span>
              </a>
              <a
                href="/how-it-works"
                className="ui-button font-sans border"
                style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
              >
                Explore the technology
                <span aria-hidden="true">→</span>
              </a>
            </motion.div>
          </div>

          <motion.div
            className="col-span-12 lg:col-span-6 flex flex-col justify-center"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
          >
            <div className="hero-demo">
              <div className="hero-demo-header">
                <span>OmniLock · Concept preview</span>
                <span className="hero-demo-tag">In research</span>
              </div>
              <HeroEmbedLoop />

            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
