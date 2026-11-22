"use client";

import { useSyncExternalStore } from "react";
import { APPEARANCE_KEYS as KEYS } from "./appearance-script";

/**
 * Appearance preferences live on <html> as data attributes, set before first
 * paint by an inline script in the root layout. These helpers read and write
 * them; React subscribes through a MutationObserver so no hydration mismatch.
 */

export type ThemePref = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-theme-pref", "data-density", "data-rail"] });
  return () => obs.disconnect();
}

function useHtmlAttr(name: string, fallback: string) {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.getAttribute(name) ?? fallback,
    () => fallback,
  );
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: preference lasts for this page only */
  }
}

export function useTheme() {
  const pref = useHtmlAttr("data-theme-pref", "light") as ThemePref;
  const resolved = useHtmlAttr("data-theme", "light") as "light" | "dark";
  const setTheme = (t: ThemePref) => {
    const d = document.documentElement;
    d.dataset.themePref = t;
    d.dataset.theme = t === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
    store(KEYS.theme, t);
  };
  return { pref, resolved, setTheme, toggle: () => setTheme(resolved === "dark" ? "light" : "dark") };
}

export function useDensity() {
  const density = useHtmlAttr("data-density", "comfortable") as Density;
  const setDensity = (v: Density) => {
    document.documentElement.dataset.density = v;
    store(KEYS.density, v);
  };
  return { density, setDensity };
}

export function useRail() {
  const rail = useHtmlAttr("data-rail", "open") as "open" | "collapsed";
  const setRail = (v: "open" | "collapsed") => {
    document.documentElement.dataset.rail = v;
    store(KEYS.rail, v);
  };
  return { collapsed: rail === "collapsed", setRail, toggle: () => setRail(rail === "collapsed" ? "open" : "collapsed") };
}
