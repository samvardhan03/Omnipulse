"use client";

import { useState } from "react";
import Link from "next/link";
import HairlineRule from "@/components/primitives/HairlineRule";

type TierContent = {
  phase: "I" | "II" | "III" | "ENTERPRISE";
  tierName: string;
  headline: string;
  sub: string;
  diagram: React.ReactNode;
  whatYouGet: string[];
  whatItSolves: string[];
  pricingNote: string;
  enterpriseUseCases: { title: string; body: string }[];
  quickstart: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="font-mono text-[11px] uppercase tracking-[0.1em] px-3 py-1 border transition-opacity hover:opacity-70"
      style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export default function TierPageShell({
  phase,
  tierName,
  headline,
  sub,
  diagram,
  whatYouGet,
  whatItSolves,
  pricingNote,
  enterpriseUseCases,
  quickstart,
  primaryCta,
  secondaryCta,
}: TierContent) {
  return (
    <div className="pt-20">
      {/* Back nav */}
      <div className="max-w-[1280px] mx-auto px-6 pt-8 pb-4">
        <Link
          href="/#platform"
          className="font-mono text-[12px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
          style={{ color: "var(--ink-mute)" }}
        >
          ← All tiers
        </Link>
      </div>

      {/* Header */}
      <div
        className="py-12"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-4">
          <p
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "var(--accent)" }}
          >
            Phase {phase} · {tierName}
          </p>
          <h1
            className="font-serif font-light"
            style={{ fontSize: "clamp(32px,4.8vw,72px)", color: "var(--ink)", lineHeight: 1.04 }}
          >
            {headline}
          </h1>
          <p
            className="text-[19px] leading-[1.55] max-w-[640px]"
            style={{ color: "var(--ink-mute)" }}
          >
            {sub}
          </p>
        </div>
      </div>

      {/* Interactive diagram */}
      <div style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="max-w-[1280px] mx-auto px-6 py-12">{diagram}</div>
      </div>

      {/* 3-col info grid */}
      <div style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ border: "1px solid var(--rule)" }}>
            {/* What you get */}
            <div className="p-8 flex flex-col gap-4" style={{ backgroundColor: "var(--bg-elev)" }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-mute)" }}>
                What you get
              </p>
              <ul className="flex flex-col gap-3">
                {whatYouGet.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] leading-[1.55]" style={{ color: "var(--ink)" }}>
                    <span style={{ color: "var(--accent)" }}>→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What it solves */}
            <div className="p-8 flex flex-col gap-4" style={{ backgroundColor: "var(--bg-elev)" }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-mute)" }}>
                What it solves
              </p>
              <ul className="flex flex-col gap-3">
                {whatItSolves.map((item, i) => (
                  <li key={i} className="text-[15px] leading-[1.55]" style={{ color: "var(--ink)" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing */}
            <div className="p-8 flex flex-col gap-4" style={{ backgroundColor: "var(--bg-elev)" }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-mute)" }}>
                Pricing
              </p>
              <p className="text-[18px] font-mono" style={{ color: "var(--accent)" }}>
                {pricingNote}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise use cases */}
      <div style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--ink-mute)" }}>
            Enterprise use cases
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {enterpriseUseCases.map((uc, i) => (
              <div key={i} className="flex flex-col gap-2">
                <h3 className="font-mono text-[14px]" style={{ color: "var(--ink)" }}>
                  {uc.title}
                </h3>
                <p className="text-[14px] leading-[1.6]" style={{ color: "var(--ink-mute)" }}>
                  {uc.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quickstart */}
      {quickstart && (
        <div style={{ borderBottom: "1px solid var(--rule)" }}>
          <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--ink-mute)" }}>
                Quickstart
              </p>
              <CopyButton code={quickstart} />
            </div>
            <pre
              className="font-mono text-[13px] leading-[1.8] p-6 overflow-x-auto border"
              style={{
                borderColor: "var(--rule)",
                backgroundColor: "var(--bg-elev)",
                color: "var(--ink)",
              }}
            >
              {quickstart}
            </pre>
          </div>
        </div>
      )}

      {/* CTA row */}
      <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-wrap gap-4">
        <a
          href={primaryCta.href}
          className="font-mono text-[13px] uppercase tracking-[0.12em] px-6 py-3 border transition-opacity hover:opacity-70"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          {primaryCta.label}
        </a>
        {secondaryCta && (
          <a
            href={secondaryCta.href}
            className="font-mono text-[13px] uppercase tracking-[0.12em] px-6 py-3 border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
          >
            {secondaryCta.label}
          </a>
        )}
        <a
          href="mailto:shekhawatsamvardhan@gmail.com"
          className="font-mono text-[13px] uppercase tracking-[0.12em] px-6 py-3 border transition-opacity hover:opacity-70"
          style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}
        >
          Talk to founders →
        </a>
      </div>
    </div>
  );
}
