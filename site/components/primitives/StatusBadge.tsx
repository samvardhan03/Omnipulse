import { STATE_COLORS, STATE_LABELS, type ItemState } from "@/content/status";

export default function StatusBadge({ state }: { state: ItemState }) {
  return (
    <span className="inline-flex items-center gap-2 text-small font-semibold">
      <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: STATE_COLORS[state] }} />
      {STATE_LABELS[state]}
    </span>
  );
}
