import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        ink: "var(--ink)",
        "ink-mute": "var(--ink-mute)",
        accent: "var(--accent)",
        "signal-warm": "var(--signal-warm)",
        "accent-cyan": "var(--accent-cyan)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      fontSize: {
        display: ["clamp(2.5rem, 5vw, 4.5rem)", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
        section: ["clamp(2rem, 3.5vw, 3rem)", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "card-title": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "body-lg": ["1.125rem", { lineHeight: "1.65" }],
        body: ["1rem", { lineHeight: "1.65" }],
        small: ["0.875rem", { lineHeight: "1.6" }],
        code: ["0.8125rem", { lineHeight: "1.6" }],
        label: ["0.75rem", { lineHeight: "1.5" }],
        eyebrow: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.1em" }],
      },
      letterSpacing: { label: "0.1em" },
      transitionDuration: { DEFAULT: "240ms" },
      transitionTimingFunction: { DEFAULT: "cubic-bezier(0.22, 1, 0.36, 1)" },
      maxWidth: { grid: "1280px" },
      spacing: { section: "var(--section-space)", card: "var(--card-space)", "section-mobile": "56px" },
      boxShadow: { glow: "var(--glow)" },
    },
  },
  plugins: [],
};

export default config;
