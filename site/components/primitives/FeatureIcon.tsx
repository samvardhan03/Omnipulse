type FeatureIconProps = { kind: "register" | "detect" | "prove" | "catalogue" | "generation" | "legal" };

export default function FeatureIcon({ kind }: FeatureIconProps) {
  return (
    <span className="feature-icon" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {kind === "register" && <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h5M12 16v4m-2-2h4" /></>}
        {kind === "detect" && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5M8 10.5l2 2 3-4" /></>}
        {kind === "prove" && <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>}
        {kind === "catalogue" && <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 8v8M12 6v12M16 9v6" /></>}
        {kind === "generation" && <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 3v4m-2-2h4" /></>}
        {kind === "legal" && <><path d="M12 3v17M5 6h14M8 21h8M5 6l-3 7h6L5 6Zm14 0-3 7h6l-3-7Z" /></>}
      </svg>
    </span>
  );
}
