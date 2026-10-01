"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

/** A plain link to /auth/google. It adds the browser's timezone so a new account starts with the right "today". */
export function GoogleButton({ label }: { label: string }) {
  const [href, setHref] = useState("/auth/google");
  useEffect(() => setHref(`/auth/google?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`), []);

  return (
    <>
      <motion.a href={href} whileTap={{ scale: 0.97 }} className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-card py-3 text-sm font-semibold text-ink transition-colors hover:border-brand">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.600l6.8-6.800C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.200l7.9 6.200C12.4 13.6 17.7 9.5 24 9.500z" />
          <path fill="#4285F4" d="M46.1 24.500c0-1.6-.1-3.1-.4-4.500H24v9h12.400c-.5 2.8-2.1 5.2-4.5 6.800l7.3 5.700c4.3-4 6.9-9.9 6.9-17z" />
          <path fill="#FBBC05" d="M10.5 28.600A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.600l-7.9-6.200A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.800l7.9-6.200z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.800l-7.3-5.700c-2.1 1.4-4.9 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.900l-7.9 6.200C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {label}
      </motion.a>
      <div className="my-5 flex items-center gap-3 text-xs font-medium text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}
