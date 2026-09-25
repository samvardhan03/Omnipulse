import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/footer/SiteFooter";
import Eyebrow from "@/components/primitives/Eyebrow";
import { STATUS, STATE_LABELS, STATE_ORDER, STATE_COLORS, type ItemState } from "@/content/status";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Progress · OmniPulse",
  description: "Current build status of the OmniPulse platform. Private beta.",
};

function StateSection({ state }: { state: ItemState }) {
  const items = STATUS.filter((s) => s.state === state);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: STATE_COLORS[state] }}
        />
        <p
          className="font-mono text-[11px] uppercase tracking-[0.16em]"
          style={{ color: "var(--ink-mute)" }}
        >
          {STATE_LABELS[state]}
        </p>
      </div>
      <div className="flex flex-col gap-3 pl-5 border-l" style={{ borderColor: "var(--rule)" }}>
        {items.map((entry) => (
          <div key={entry.item} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-3">
              <p className="text-[15px] leading-[1.5]" style={{ color: "var(--ink)" }}>
                {entry.item}
              </p>
              <span
                className="font-mono text-[10px] uppercase tracking-[0.12em] shrink-0"
                style={{ color: "var(--ink-mute)" }}
              >
                {entry.area}
              </span>
            </div>
            {entry.note && (
              <p
                className="font-mono text-[12px] leading-[1.5]"
                style={{ color: "var(--ink-mute)" }}
              >
                Note: {entry.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <>
      <Navbar />
      <main className="pt-[64px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-16 pb-16">
          <div className="flex flex-col gap-3 mb-12">
            <Eyebrow>Platform status</Eyebrow>
            <h1
              className="font-serif font-light leading-[1.04] tracking-[-0.02em]"
              style={{ fontSize: "clamp(36px,4.8vw,72px)", color: "var(--ink)" }}
            >
              Progress.
            </h1>
            <p
              className="text-[18px] leading-[1.6] max-w-[640px]"
              style={{ color: "var(--ink-mute)" }}
            >
              OmniPulse is in private beta. This page reflects the state of the
              platform as of the date shown. States are not upgraded without the
              team verifying the claim.
            </p>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 border w-fit"
              style={{ borderColor: "var(--signal-warm)", color: "var(--signal-warm)" }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "var(--signal-warm)" }}
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                Private beta
              </span>
            </div>
          </div>

          <div
            className="mb-8 p-6 border"
            style={{ borderColor: "var(--rule)" }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] mb-3" style={{ color: "var(--ink-mute)" }}>
              Status key
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATE_ORDER.map((state) => (
                <div key={state} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATE_COLORS[state] }}
                  />
                  <span className="font-mono text-[12px]" style={{ color: "var(--ink-mute)" }}>
                    {STATE_LABELS[state]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-12">
            {STATE_ORDER.map((state) => (
              <StateSection key={state} state={state} />
            ))}
          </div>

          <div
            className="mt-12 pt-8 border-t"
            style={{ borderColor: "var(--rule)" }}
          >
            <p className="font-mono text-[12px]" style={{ color: "var(--ink-mute)" }}>
              Last reviewed: 2026-09-23. To report an inaccuracy, email{" "}
              <a
                href="mailto:shekhawatsamvardhan@gmail.com"
                className="transition-opacity hover:opacity-60"
                style={{ color: "var(--ink)" }}
              >
                shekhawatsamvardhan@gmail.com
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
