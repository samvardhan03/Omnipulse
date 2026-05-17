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
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      fontSize: {
        display: ["clamp(56px,7.2vw,112px)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        section: ["clamp(36px,4.4vw,64px)", { lineHeight: "1.05" }],
        eyebrow: ["14px", { lineHeight: "1.4", letterSpacing: "0.18em" }],
        "body-lg": ["19px", { lineHeight: "1.55" }],
        body: ["16px", { lineHeight: "1.6" }],
        mono: ["14px", { lineHeight: "1.55" }],
      },
      maxWidth: { grid: "1280px" },
      spacing: { section: "96px", "section-mobile": "56px" },
      boxShadow: { glow: "var(--glow)" },
    },
  },
  plugins: [],
};

export default config;
