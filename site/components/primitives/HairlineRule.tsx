import clsx from "clsx";

export default function HairlineRule({ className }: { className?: string }) {
  return (
    <hr
      className={clsx("border-0 border-t", className)}
      style={{ borderColor: "var(--rule)" }}
    />
  );
}
