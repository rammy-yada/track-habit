"use client";

import { useEffect } from "react";

/**
 * Remembers on this device which app icon the signed-in account uses, in a
 * cookie the install manifest and the icon address read. That way the icon
 * follows the account even on pages that don't know who is signed in (the
 * one the installed app re-checks included).
 */
export function IconCookie({ icon }: { icon: "classic" | "arc" }) {
  useEffect(() => {
    if (!document.cookie.includes(`hf_icon=${icon}`)) document.cookie = `hf_icon=${icon}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    // the manifest link was made before the cookie existed: point it at the fresh answer
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest && !manifest.href.includes(`i=${icon}`)) manifest.href = `/manifest.webmanifest?i=${icon}`;
  }, [icon]);
  return null;
}
