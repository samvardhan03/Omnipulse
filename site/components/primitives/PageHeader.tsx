import type { ReactNode } from "react";
import Eyebrow from "./Eyebrow";

export default function PageHeader({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="site-container">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display font-medium text-display mt-5 max-w-[900px]">{title}</h1>
        {description && <p className="text-body-lg mt-5 max-w-[700px] text-[var(--ink-mute)]">{description}</p>}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </header>
  );
}
