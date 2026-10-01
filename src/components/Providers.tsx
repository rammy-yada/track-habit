"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { startPwa } from "@/lib/pwa";

/**
 * On a phone the on-screen keyboard takes half the screen. When it opens:
 *   - the box being typed in is scrolled to the middle of what is left;
 *   - <html data-keyboard> is set, which hides the bottom tab bar (see
 *     globals.css) so it doesn't sit between the box and the keyboard;
 *   - --keyboard holds the keyboard's height, for sheets that need to lift
 *     above it on devices that don't shrink the page themselves (iPhone).
 */
function keepInputsVisible() {
  const viewport = window.visualViewport;
  const root = document.documentElement;
  const typing = (el: Element | null): el is HTMLElement => el instanceof HTMLElement && (el.matches("input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), textarea, select") || el.isContentEditable);
  const reveal = () => {
    const el = document.activeElement;
    if (typing(el)) el.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  let full = viewport?.height ?? window.innerHeight; // the tallest the screen has been = no keyboard
  const onResize = () => {
    if (!viewport) return;
    full = Math.max(full, viewport.height);
    const keyboard = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    const open = typing(document.activeElement) && full - viewport.height > 120;
    root.style.setProperty("--keyboard", `${open ? keyboard : 0}px`);
    root.toggleAttribute("data-keyboard", open);
    if (open) reveal();
  };
  // the keyboard takes a moment to slide up: look again once it has
  const onFocus = (e: FocusEvent) => typing(e.target as Element) && window.matchMedia("(pointer: coarse)").matches && setTimeout(reveal, 320);
  const onBlur = () => setTimeout(onResize, 80);
  const onTurn = () => (full = 0);
  viewport?.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onTurn);
  document.addEventListener("focusin", onFocus);
  document.addEventListener("focusout", onBlur);
  return () => {
    viewport?.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onTurn);
    document.removeEventListener("focusin", onFocus);
    document.removeEventListener("focusout", onBlur);
  };
}

// reducedMotion="user": people who ask their OS for less motion get fades
// instead of movement, everywhere, without each component having to check.
export function Providers({ children }: { children: React.ReactNode }) {
  // Registers the service worker and starts listening for the install prompt.
  useEffect(startPwa, []);
  useEffect(keepInputsVisible, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
