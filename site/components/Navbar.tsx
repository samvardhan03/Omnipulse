"use client";

import { TransitionLink as Link } from "@/components/NavigationTransition";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ProfileLink from "@/components/primitives/ProfileLink";
import { GITHUB_URL, primaryCta } from "@/lib/links";

const NAV_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Progress", href: "/progress" },
  { label: "Team", href: "/#team" },
  { label: "Contact", href: "/#contact" },
];

const ctaClass = "ui-button border border-[var(--signal-warm)] bg-[var(--signal-warm)] text-[var(--bg)]";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setMenuOpen(false);
    if (restoreFocus) menuBtnRef.current?.focus();
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => { if (desktop.matches) closeMenu(false); };
    desktop.addEventListener("change", onResize);
    onResize();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeMenu(); return; }
      if (event.key !== "Tab") return;
      const controls = menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      const outside = !menuRef.current?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outside)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      desktop.removeEventListener("change", onResize);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen, closeMenu]);

  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 h-16 border-b border-[var(--rule)]">
        <div className="site-container flex h-full items-center justify-between gap-4">
          <Link href="/" onClick={() => closeMenu(false)} aria-label="OmniPulse home" className="font-display text-xl font-medium inline-flex shrink-0 items-center gap-2">
            <span aria-hidden="true" className="text-[var(--signal-warm)]">Ω</span> OmniPulse
          </Link>
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {NAV_LINKS.map((link) => <Link key={link.href} href={link.href} className="nav-link" aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:block"><ProfileLink kind="github" href={GITHUB_URL} name="OmniPulse" /></div>
            <a href={primaryCta.href} className={`${ctaClass} hidden sm:inline-flex`}>{primaryCta.label}<span aria-hidden="true">↗</span></a>
            <button ref={menuBtnRef} aria-expanded={menuOpen} aria-controls={menuOpen ? "mobile-menu" : undefined} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} onClick={() => menuOpen ? closeMenu() : setMenuOpen(true)} className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--rule)] hover:bg-[var(--warm-soft)]">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">{menuOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {menuOpen && <motion.div ref={menuRef} id="mobile-menu" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" className="fixed inset-x-0 top-16 bottom-0 z-40 lg:hidden overflow-y-auto bg-[var(--bg)]" initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }} transition={{ duration: reducedMotion ? 0 : 0.24 }}>
          <div className="site-container py-6">
            <div className="flex items-center justify-between mb-6">
              <p id="mobile-menu-title" className="text-label font-semibold uppercase tracking-label text-[var(--ink-mute)]">Navigation</p>
              <button onClick={() => closeMenu()} aria-label="Close navigation menu" className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--rule)] hover:bg-[var(--warm-soft)]"><span aria-hidden="true" className="text-2xl">×</span></button>
            </div>
            <nav aria-label="Mobile navigation" className="flex flex-col">
              {NAV_LINKS.map((link) => <Link key={link.href} href={link.href} onClick={() => closeMenu(false)} aria-current={pathname === link.href ? "page" : undefined} className="flex items-center justify-between gap-4 py-5 border-b border-[var(--rule)] text-body-lg font-semibold hover:text-[var(--signal-warm)] aria-[current=page]:text-[var(--signal-warm)]">{link.label}<span aria-hidden="true">↗</span></Link>)}
            </nav>
            <div className="flex items-center justify-between flex-wrap gap-4 mt-8">
              <ProfileLink kind="github" href={GITHUB_URL} name="OmniPulse" />
              <a href={primaryCta.href} onClick={() => closeMenu(false)} className={ctaClass}>{primaryCta.label}<span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </motion.div>}
      </AnimatePresence>
    </>
  );
}
