"use client";

import { useEffect } from "react";

const EXPLICIT = new Set(["light", "dark", "arc"]);
const systemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/**
 * Turns the page into the Winter Arc look over about a second and a half —
 * a slow dissolve rather than a switch.
 */
export function applyThemeSlowly(theme: "arc" | "light" | "dark") {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  const apply = () => (root.dataset.theme = theme);
  if (!("startViewTransition" in document) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return void apply();
  const transition = document.startViewTransition(apply);
  transition.ready
    .then(() => {
      root.animate({ opacity: [0, 1] }, { duration: 1600, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" });
      root.animate({ opacity: [1, 1] }, { duration: 1600, pseudoElement: "::view-transition-old(root)" });
    })
    .catch(() => {});
}

/**
 * The Winter Arc look belongs to accounts that have joined the arc. Everyone
 * else — and the public pages — keep the normal theme. A theme the person
 * picked themselves with the theme button always wins.
 */
export function ArcTheme({ member }: { member: boolean }) {
  useEffect(() => {
    let chosen: string | null = null;
    try {
      chosen = localStorage.getItem("theme");
      // remembered so the next visit starts in the right look from its first paint
      if (member) localStorage.setItem("arc-auto", "1");
      else localStorage.removeItem("arc-auto");
    } catch {}
    if (chosen && EXPLICIT.has(chosen)) return;
    const current = document.documentElement.dataset.theme;
    if (member && current !== "arc") applyThemeSlowly("arc");
    if (!member && current === "arc") applyThemeSlowly(systemTheme());
  }, [member]);
  return null;
}
