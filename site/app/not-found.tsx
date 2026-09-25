import Link from "next/link";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/footer/SiteFooter";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main
        id="main-content"
        className="pt-[64px] min-h-screen flex flex-col"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-24 flex flex-col gap-8">
          <p
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "var(--ink-mute)" }}
          >
            404
          </p>
          <h1
            className="font-serif font-light leading-[1.04] tracking-[-0.02em]"
            style={{ fontSize: "clamp(36px,4.8vw,72px)", color: "var(--ink)" }}
          >
            Page not found.
          </h1>
          <p
            className="text-[18px] leading-[1.6] max-w-[480px]"
            style={{ color: "var(--ink-mute)" }}
          >
            The page you are looking for does not exist or has moved.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
              className="font-mono text-[13px] uppercase tracking-[0.12em] px-6 py-3 border transition-opacity hover:opacity-70"
              style={{
                borderColor: "var(--signal-warm)",
                backgroundColor: "var(--signal-warm)",
                color: "var(--bg)",
              }}
            >
              Go home
            </Link>
            <Link
              href="/how-it-works"
              className="font-mono text-[13px] uppercase tracking-[0.12em] px-6 py-3 border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
            >
              How it works
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
