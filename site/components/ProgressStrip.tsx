import Link from "next/link";
import { STATUS, STATE_LABELS, STATE_ORDER, STATE_COLORS } from "@/content/status";

export default function ProgressStrip() {
  const counts = STATE_ORDER.map((state) => ({
    state,
    label: STATE_LABELS[state],
    count: STATUS.filter((s) => s.state === state).length,
  }));

  const builtItems = STATUS.filter((s) => s.state === "built-and-tested");

  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          <div className="flex flex-col gap-2 md:w-48 shrink-0">
            <p
              className="font-mono text-[11px] uppercase tracking-[0.16em]"
              style={{ color: "var(--ink-mute)" }}
            >
              Platform status
            </p>
            <p className="font-mono text-[11px]" style={{ color: "var(--ink-mute)" }}>
              Private beta
            </p>
            <div className="flex flex-wrap md:flex-col gap-3 mt-2">
              {counts.map(({ state, label, count }) => (
                <div key={state} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATE_COLORS[state] }}
                  />
                  <span className="font-mono text-[11px]" style={{ color: "var(--ink-mute)" }}>
                    {count} {label.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <p
              className="font-mono text-[11px] uppercase tracking-[0.16em] mb-4"
              style={{ color: "var(--ink-mute)" }}
            >
              Built and tested
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {builtItems.map((entry) => (
                <div key={entry.item} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: STATE_COLORS["built-and-tested"] }}
                    />
                    <p className="text-[13px] leading-[1.5]" style={{ color: "var(--ink)" }}>
                      {entry.item}
                    </p>
                  </div>
                  {entry.note && (
                    <p
                      className="font-mono text-[11px] leading-[1.5] pl-4"
                      style={{ color: "var(--ink-mute)" }}
                    >
                      {entry.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--rule)" }}>
          <Link
            href="/progress"
            className="font-mono text-[12px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
            style={{ color: "var(--ink-mute)" }}
          >
            Full progress page
          </Link>
        </div>
      </div>
    </section>
  );
}
