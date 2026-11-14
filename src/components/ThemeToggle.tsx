"use client";

import { useEffect, useState } from "react";
import { THEME_COLOR, THEME_COOKIE, parseTheme, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./Icons";

/** Switches dark ↔ light instantly (no reload) and remembers it in a cookie for server rendering. */
export function ThemeToggle({ initial, className = "icon-btn", withLabel = false, tabIndex }: { initial: Theme; className?: string; withLabel?: boolean; tabIndex?: number }) {
  const [theme, setTheme] = useState<Theme>(initial); // server-rendered value: correct icon on first paint
  // Stay in sync if another toggle on the page (desktop / mobile menu) changes it.
  useEffect(() => {
    const html = document.documentElement;
    const obs = new MutationObserver(() => setTheme(parseTheme(html.dataset.theme)));
    obs.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const html = document.documentElement;
    // Switch all colours in one frame (no staggered hover/colour transitions).
    html.classList.add("theme-switching");
    html.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[next]);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
    requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove("theme-switching")));
  };

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} tabIndex={tabIndex} className={className}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      {withLabel && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
