"use client";

import { useState } from "react";
import { STATUS, STATUS_COUNTS, STATE_LABELS, type ItemState } from "@/content/status";
import StatusBadge from "@/components/primitives/StatusBadge";

export default function StatusExplorer() {
  const [state, setState] = useState<ItemState | "all">("all");
  const [query, setQuery] = useState("");
  const filtered = STATUS.filter((entry) =>
    (state === "all" || entry.state === state) &&
    `${entry.area} ${entry.item} ${entry.note ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="status-explorer">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8" role="group" aria-label="Filter by build status">
        {STATUS_COUNTS.map(({ state: value, count }) => (
          <button key={value} aria-pressed={state === value} onClick={() => setState(state === value ? "all" : value)} className="status-filter text-left p-5">
            <span className="font-mono block text-4xl mb-4">{String(count).padStart(2, "0")}</span>
            <StatusBadge state={value} />
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button className="ui-button border border-[var(--rule)]" aria-pressed={state === "all"} onClick={() => setState("all")}>All capabilities</button>
          <p className="text-small text-[var(--ink-mute)]" role="status">{filtered.length} of {STATUS.length} shown</p>
        </div>
        <label className="status-search">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
          <span className="sr-only">Search capabilities</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search capabilities…" />
        </label>
      </div>
      <div className="status-board">
        <div className="hidden lg:grid grid-cols-[140px_1fr_180px] gap-6 px-6 py-4 border-b border-[var(--rule)] text-label font-semibold uppercase tracking-label text-[var(--ink-mute)]" aria-hidden="true">
          <span>Area</span><span>Capability</span><span>Build status</span>
        </div>
        <ul>
          {filtered.map((entry) => (
            <li key={entry.item} className="status-row grid grid-cols-1 lg:grid-cols-[140px_1fr_180px] gap-3 lg:gap-6 p-6">
              <span className="text-small font-semibold text-[var(--ink-mute)]">{entry.area}</span>
              <div>
                <h2 className="text-body font-semibold">{entry.item}</h2>
                {entry.note && <p className="text-small text-[var(--ink-mute)] mt-2">{entry.note}</p>}
                <p className="font-mono text-label text-[var(--ink-mute)] mt-3">Reviewed <time dateTime={entry.asOf}>{entry.asOf}</time></p>
              </div>
              <div><StatusBadge state={entry.state} /></div>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && <div className="p-10 text-center">
          <h2 className="font-display text-card-title">No matching capabilities.</h2>
          <p className="text-small mt-2 text-[var(--ink-mute)]">Try a different search or build status.</p>
          <button className="ui-button border border-[var(--rule)] mt-5" onClick={() => { setQuery(""); setState("all"); }}>Reset filters</button>
        </div>}
      </div>
      <p className="text-small text-[var(--ink-mute)] mt-5">{state === "all" ? "All build stages" : STATE_LABELS[state]} · Verified snapshots, updated after team review.</p>
    </div>
  );
}
