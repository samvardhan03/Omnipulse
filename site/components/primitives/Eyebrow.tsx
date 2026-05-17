import clsx from "clsx";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export default function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <p
      className={clsx(
        "font-mono text-[14px] uppercase tracking-[0.18em] leading-[1.4]",
        className
      )}
      style={{ color: "var(--accent)" }}
    >
      {children}
    </p>
  );
}
