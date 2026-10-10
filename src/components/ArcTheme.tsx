"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { btnGhost, btnPrimary } from "@/components/ui/styles";

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

const ASKED_KEY = "arc-theme-asked";

/**
 * Winter Arc members are asked once whether they want the Winter Arc look;
 * it is never switched on by itself. Whatever they answer can be changed in
 * Profile → Appearance. Everyone else, and the public pages, keep their theme.
 */
export function ArcTheme({ member }: { member: boolean }) {
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let chosen: string | null = null;
    let auto = false;
    let asked = false;
    try {
      chosen = localStorage.getItem("theme");
      auto = localStorage.getItem("arc-auto") === "1";
      asked = localStorage.getItem(ASKED_KEY) === "1";
      localStorage.removeItem("arc-auto"); // from when the look switched on by itself
    } catch {
      return;
    }
    const explicit = chosen !== null && EXPLICIT.has(chosen);
    if (!member) {
      if (!explicit && document.documentElement.dataset.theme === "arc") applyThemeSlowly(systemTheme());
      return;
    }
    if (explicit || asked) return;
    if (auto) {
      // already living in the Winter Arc look from before: keep it, as their own choice now
      try {
        localStorage.setItem("theme", "arc");
        localStorage.setItem(ASKED_KEY, "1");
      } catch {}
      return;
    }
    // wait until the opening scene is off the screen before asking
    const timer = setInterval(() => {
      if (document.querySelector(".arc-intro")) return;
      clearInterval(timer);
      setAsking(true);
    }, 600);
    return () => clearInterval(timer);
  }, [member]);

  function answer(useArc: boolean) {
    setAsking(false);
    try {
      localStorage.setItem(ASKED_KEY, "1");
      if (useArc) localStorage.setItem("theme", "arc");
    } catch {}
    if (useArc) applyThemeSlowly("arc");
  }

  return (
    <Modal open={asking} onClose={() => answer(false)} title="Switch to the Winter Arc look?" width="max-w-sm">
      <div data-arc-theme-ask>
        <p className="text-sm leading-relaxed text-muted">You&apos;re in the Winter Arc ❄️ — want the whole app in its black-and-white look? You can change it any time in Profile → Appearance.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={btnGhost} onClick={() => answer(false)}>
            Keep my theme
          </button>
          <button type="button" className={btnPrimary} onClick={() => answer(true)} data-autofocus>
            Use Winter Arc look
          </button>
        </div>
      </div>
    </Modal>
  );
}
