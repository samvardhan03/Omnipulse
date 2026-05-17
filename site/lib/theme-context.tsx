"use client";

import { createContext, useContext } from "react";

interface OmniThemeCtx {
  theme: string;
  isDark: boolean;
  accentRgb: string;
}

const ThemeContext = createContext<OmniThemeCtx>({
  theme: "light",
  isDark: false,
  accentRgb: "27,27,31",
});

export function OmniThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: "light", isDark: false, accentRgb: "27,27,31" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useOmniTheme(): OmniThemeCtx {
  return useContext(ThemeContext);
}
