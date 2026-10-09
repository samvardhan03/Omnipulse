import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Manrope, IBM_Plex_Mono } from "next/font/google";
import { NavigationTransitionProvider } from "@/components/NavigationTransition";
import MotionProvider from "@/components/MotionProvider";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://omnipulseid.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OmniPulse",
    template: "%s | OmniPulse",
  },
  description:
    "Wavelet-scattering fingerprint for audio and images. Register media, find copies, prove ownership. Ed25519-signed attestations. Private beta.",
  openGraph: {
    type: "website",
    siteName: "OmniPulse",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF1E6" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1B1F" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <MotionProvider><NavigationTransitionProvider>{children}</NavigationTransitionProvider></MotionProvider>
      </body>
    </html>
  );
}
