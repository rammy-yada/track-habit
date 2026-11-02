"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { todayIn } from "./dates";

const ASK_AGAIN_MS = 5 * 60_000;

/**
 * Today's date on the person's own clock, kept current while a screen stays
 * open: an installed app can sit in memory overnight, and a tick made next
 * morning must not land on the date the page was loaded on.
 *
 * Online, the server decides: when the device's clock says a new day, the page
 * is fetched again, and a phone whose clock is simply wrong stays on the
 * server's day. Offline, the device's clock is all there is, and it is believed
 * as long as it moves forward.
 */
export function useLiveDay(serverDay: string, timezone: string): string {
  const router = useRouter();
  const [day, setDay] = useState(serverDay);
  const asked = useRef(0);
  useEffect(() => {
    const check = () => {
      const now = todayIn(timezone);
      if (now <= serverDay) return setDay(serverDay);
      if (!navigator.onLine) return setDay(now);
      setDay(serverDay);
      if (Date.now() - asked.current > ASK_AGAIN_MS) {
        asked.current = Date.now();
        router.refresh();
      }
    };
    check();
    const timer = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [serverDay, timezone, router]);
  return day;
}
