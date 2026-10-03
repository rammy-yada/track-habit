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
    if (document.cookie.includes(`hf_icon=${icon}`)) return;
    document.cookie = `hf_icon=${icon}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    // the page's own icon links were made before the cookie existed: point them at the fresh answer
    for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"], link[rel="icon"], link[rel="apple-touch-icon"]')) {
      const url = new URL(link.href);
      url.searchParams.set("i", icon);
      link.href = url.toString();
    }
  }, [icon]);
  return null;
}
