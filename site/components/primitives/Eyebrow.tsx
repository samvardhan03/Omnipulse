import clsx from "clsx";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export default function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <p
      className={clsx(
        "eyebrow font-sans text-eyebrow uppercase",
        className
      )}
      style={{ color: "var(--accent)" }}
    >
      {children}
    </p>
  );
}
