"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

const NavigationContext = createContext<((href: string) => void) | null>(null);

export function NavigationTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const departure = useRef<ReturnType<typeof setTimeout>>();
  const recovery = useRef<ReturnType<typeof setTimeout>>();

  const clearTimers = useCallback(() => {
    clearTimeout(departure.current);
    clearTimeout(recovery.current);
  }, []);

  useEffect(() => {
    clearTimers();
    setPending(false);
  }, [pathname, clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  const navigate = useCallback((href: string) => {
    clearTimers();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPending(false);
      router.push(href);
      return;
    }
    setPending(true);
    departure.current = setTimeout(() => {
      router.push(href);
      // Restore visibility if navigation fails or the destination takes too long.
      recovery.current = setTimeout(() => setPending(false), 2500);
    }, 160);
  }, [router, clearTimers]);

  return (
    <NavigationContext.Provider value={navigate}>
      <div data-route-pending={pending ? "true" : undefined}>{children}</div>
    </NavigationContext.Provider>
  );
}

export function TransitionLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  const navigate = useContext(NavigationContext);
  return (
    <Link {...props} onClick={(event) => {
      onClick?.(event);
      if (!navigate || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (props.target && props.target !== "_self") || event.currentTarget.hasAttribute("download")) return;
      const destination = new URL(event.currentTarget.href, window.location.href);
      // Keep in-page anchors, query-only changes, and external links native.
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      event.preventDefault();
      navigate(`${destination.pathname}${destination.search}${destination.hash}`);
    }} />
  );
}
