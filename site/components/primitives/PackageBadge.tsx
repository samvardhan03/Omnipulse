"use client";

import { useState } from "react";
import clsx from "clsx";

interface PackageBadgeProps {
  command: string;
  className?: string;
}

export default function PackageBadge({ command, className }: PackageBadgeProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      className={clsx(
        "group flex items-center gap-3 px-4 py-2 border text-left transition-opacity hover:opacity-70",
        className
      )}
      style={{ borderColor: "var(--rule)", backgroundColor: "var(--bg-elev)" }}
    >
      <code
        className="font-mono text-[13px]"
        style={{ color: "var(--ink)" }}
      >
        {command}
      </code>
      <span
        className="font-mono text-[11px] uppercase tracking-[0.1em] ml-auto shrink-0"
        style={{ color: "var(--ink-mute)" }}
      >
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
