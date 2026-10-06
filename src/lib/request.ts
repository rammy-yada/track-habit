// One way to talk to the server from the browser, used for every upload and
// every direct request. It never throws: the caller always gets either the
// data or a sentence that can be shown to the person as it is.
//
// It takes care of the things each call site used to half-handle on its own:
//   - being offline (said straight away, without waiting for a timeout)
//   - a request that hangs (given up on after a while)
//   - a brief failure — the network dropping, the server busy — retried once
//   - turning a status code into words when the server sent none

export type Sent<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

const WORDS: Record<number, string> = {
  401: "You've been signed out. Sign in again and try once more.",
  403: "That isn't allowed from here. Reload the page and try again.",
  404: "That couldn't be found. It may have been removed.",
  413: "That file is too large to upload. Try a smaller one.",
  429: "That's a lot of requests in a short time. Wait a minute and try again.",
  507: "Uploads are paused for the moment: the site's storage is nearly full.",
};

type Options = RequestInit & {
  /** Give up after this many milliseconds (uploads get longer). */
  timeout?: number;
  /** Try again once after a network failure or a 502/503/504. On by default; turn off for anything that must not be sent twice. */
  retry?: boolean;
};

export async function send<T = Record<string, unknown>>(url: string, { timeout, retry = true, ...init }: Options = {}): Promise<Sent<T>> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: false, status: 0, error: "You're offline. This needs a connection — try again when you're back online." };
  const limit = timeout ?? (init.body ? 45_000 : 15_000);

  for (let attempt = 1; ; attempt++) {
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), limit);
    try {
      const response = await fetch(url, { ...init, signal: control.signal });
      const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
      if (response.ok) return { ok: true, data: (data ?? {}) as T };
      if (retry && attempt === 1 && [502, 503, 504].includes(response.status)) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        continue;
      }
      return { ok: false, status: response.status, error: data?.error ?? WORDS[response.status] ?? (response.status >= 500 ? "The server had a problem. Please try again in a moment." : "That didn't work. Please try again.") };
    } catch (err) {
      const timedOut = (err as Error).name === "AbortError";
      if (retry && attempt === 1 && !timedOut) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        continue;
      }
      return { ok: false, status: 0, error: timedOut ? "That took too long. Check your connection and try again." : "The connection dropped. Check your internet and try again." };
    } finally {
      clearTimeout(timer);
    }
  }
}
