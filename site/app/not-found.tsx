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
        <div className="site-container py-24 flex flex-col gap-8">
          <p
            className="font-sans text-label uppercase tracking-label"
            style={{ color: "var(--ink-mute)" }}
          >
            404
          </p>
          <h1
            className="font-display font-medium text-display"
            style={{ color: "var(--ink)" }}
          >
            Page not found.
          </h1>
          <p
            className="text-body-lg max-w-[480px]"
            style={{ color: "var(--ink-mute)" }}
          >
            The page you are looking for does not exist or has moved.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
              className="ui-button font-sans border"
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
              className="ui-button font-sans border"
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
