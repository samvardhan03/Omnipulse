"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/primitives/PageHeader";
import { CONTACT_EMAIL } from "@/lib/links";

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
      className="ui-button font-sans border"
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
    <main id="main-content" className="pt-16">
      {/* Back nav */}
      <div className="site-container pt-8 pb-4">
        <Link
          href="/how-it-works#platform"
          className="font-sans text-label uppercase tracking-label transition-opacity hover:opacity-60"
          style={{ color: "var(--ink-mute)" }}
        >
          ← All tiers
        </Link>
      </div>

      <PageHeader eyebrow={`${phase === "ENTERPRISE" ? "Enterprise" : `Phase ${phase}`} · ${tierName}`} title={headline} description={sub} />

      {/* Interactive diagram */}
      <div style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="site-container py-12">{diagram}</div>
      </div>

      {/* 3-col info grid */}
      <div style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="site-container py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* What you get */}
            <div className="surface-card p-card flex flex-col gap-4">
              <p className="font-sans text-label uppercase tracking-label" style={{ color: "var(--ink-mute)" }}>
                What you get
              </p>
              <ul className="flex flex-col gap-3">
                {whatYouGet.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-body" style={{ color: "var(--ink)" }}>
                    <span style={{ color: "var(--accent)" }}>→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What it solves */}
            <div className="surface-card p-card flex flex-col gap-4">
              <p className="font-sans text-label uppercase tracking-label" style={{ color: "var(--ink-mute)" }}>
                What it solves
              </p>
              <ul className="flex flex-col gap-3">
                {whatItSolves.map((item, i) => (
                  <li key={i} className="text-body" style={{ color: "var(--ink)" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing */}
            <div className="surface-card p-card flex flex-col gap-4">
              <p className="font-sans text-label uppercase tracking-label" style={{ color: "var(--ink-mute)" }}>
                Pricing
              </p>
              <p className="text-body-lg font-mono" style={{ color: "var(--accent)" }}>
                {pricingNote}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise use cases */}
      <div style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="site-container py-12 flex flex-col gap-6">
          <p className="font-sans text-label uppercase tracking-label" style={{ color: "var(--ink-mute)" }}>
            Enterprise use cases
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {enterpriseUseCases.map((uc, i) => (
              <div key={i} className="flex flex-col gap-2">
                <h3 className="font-display text-card-title" style={{ color: "var(--ink)" }}>
                  {uc.title}
                </h3>
                <p className="text-body" style={{ color: "var(--ink-mute)" }}>
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
          <div className="site-container py-12 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-sans text-label uppercase tracking-label" style={{ color: "var(--ink-mute)" }}>
                Quickstart
              </p>
              <CopyButton code={quickstart} />
            </div>
            <pre
              className="font-mono text-code p-6 overflow-x-auto border"
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
      <div className="site-container py-12 flex flex-wrap gap-4">
        <a
          href={primaryCta.href}
          className="ui-button font-sans border"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          {primaryCta.label}
        </a>
        {secondaryCta && (
          <a
            href={secondaryCta.href}
            className="ui-button font-sans border"
            style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
          >
            {secondaryCta.label}
          </a>
        )}
        {primaryCta.href !== `mailto:${CONTACT_EMAIL}` && secondaryCta?.href !== `mailto:${CONTACT_EMAIL}` && (
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="ui-button font-sans border"
          style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}
        >
          Talk to founders →
        </a>
        )}
      </div>
    </main>
  );
}
