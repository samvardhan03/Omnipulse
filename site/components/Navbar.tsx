"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { GITHUB_URL, primaryCta } from "@/lib/links";

const NAV_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Progress", href: "/progress" },
  { label: "Team", href: "/#team" },
  { label: "Contact", href: "/#contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setTimeout(() => menuBtnRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen, closeMenu]);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          height: 64,
          borderColor: "var(--rule)",
          backgroundColor: "var(--bg)",
        }}
      >
        <div className="flex items-center justify-between h-full max-w-[1280px] mx-auto px-6">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="font-serif text-xl font-light"
              style={{ color: "var(--ink)" }}
            >
              <span style={{ color: "var(--accent)" }}>Ω</span>{" "}
              OmniPulse
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="font-mono text-[13px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
                style={{ color: "var(--ink-mute)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-block font-mono text-[12px] uppercase tracking-[0.12em] px-4 py-2 border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
            >
              GitHub ↗
            </a>
            <a
              href={primaryCta.href}
              className="hidden md:inline-block font-mono text-[12px] uppercase tracking-[0.12em] px-4 py-2 border transition-opacity hover:opacity-70"
              style={{
                borderColor: "var(--signal-warm)",
                backgroundColor: "var(--signal-warm)",
                color: "var(--bg)",
              }}
            >
              {primaryCta.label}
            </a>

            <button
              ref={menuBtnRef}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden flex flex-col justify-center gap-[5px] w-8 h-8 transition-opacity hover:opacity-70"
              style={{ color: "var(--ink)" }}
            >
              <span
                className="block h-px w-full transition-transform origin-center"
                style={{
                  backgroundColor: "var(--ink)",
                  transform: menuOpen ? "rotate(45deg) translate(0,6px)" : "none",
                }}
              />
              <span
                className="block h-px w-full transition-opacity"
                style={{
                  backgroundColor: "var(--ink)",
                  opacity: menuOpen ? 0 : 1,
                }}
              />
              <span
                className="block h-px w-full transition-transform origin-center"
                style={{
                  backgroundColor: "var(--ink)",
                  transform: menuOpen ? "rotate(-45deg) translate(0,-6px)" : "none",
                }}
              />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-40 md:hidden flex flex-col"
          style={{ backgroundColor: "var(--bg)", top: 64 }}
        >
          <nav className="flex flex-col px-6 pt-8 gap-6" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                className="font-mono text-[16px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
                style={{ color: "var(--ink)" }}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-4 pt-4 border-t" style={{ borderColor: "var(--rule)" }}>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[14px] uppercase tracking-[0.12em] transition-opacity hover:opacity-60"
                style={{ color: "var(--ink-mute)" }}
              >
                GitHub ↗
              </a>
              <a
                href={primaryCta.href}
                onClick={closeMenu}
                className="font-mono text-[14px] uppercase tracking-[0.12em] px-6 py-3 border text-center transition-opacity hover:opacity-70"
                style={{
                  borderColor: "var(--signal-warm)",
                  backgroundColor: "var(--signal-warm)",
                  color: "var(--bg)",
                }}
              >
                {primaryCta.label}
              </a>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
