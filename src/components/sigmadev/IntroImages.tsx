"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { replayArcIntro } from "@/components/arc/ArcIntro";
import { btnGhost, btnSmall, card } from "@/components/ui/styles";

type Images = { before: string | null; after: string | null };

const SLOTS = [
  { slot: "before", title: "Before", hint: "The tired character, shown first." },
  { slot: "after", title: "After", hint: "The strong character, revealed in the flash." },
] as const;

/** Admin → Winter Arc: the two pictures used in the opening scene. */
export function IntroImages({ images }: { images: Images }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function send(slot: string, init: RequestInit) {
    setBusy(slot);
    setError(null);
    try {
      const response = await fetch(`/api/sigmadev/intro-image?slot=${slot}`, init);
      if (response.ok) router.refresh();
      else setError((await response.json().catch(() => null))?.error ?? "That didn't work. Please try again.");
    } catch {
      setError("That didn't work. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={`${card} p-5`} aria-label="Intro images">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h2 className="text-sm font-bold">Intro images</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The pictures in the opening scene members see the first time they open the Winter Arc. A <b className="text-ink">PNG with a transparent background</b>, taller than wide, works best. They are shown in black and white to match the theme. Only upload artwork you made or have permission to use.
          </p>
        </div>
        <button type="button" className={btnGhost} onClick={replayArcIntro}>
          ▶ Preview intro
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SLOTS.map(({ slot, title, hint }) => {
          const src = images[slot];
          return (
            <div key={slot} className="rounded-xl border border-line p-3" data-slot={slot}>
              <div className="grid h-44 place-items-center overflow-hidden rounded-lg bg-black">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- an uploaded WebP served by our own route
                  <img src={src} alt={`${title} image`} className="h-full w-full object-contain grayscale" />
                ) : (
                  <span className="px-4 text-center text-xs text-white/50">Using the built-in drawing</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="truncate text-xs text-muted">{hint}</div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" className={btnSmall} disabled={busy !== null} onClick={() => inputs.current[slot]?.click()}>
                    {busy === slot ? "Uploading…" : src ? "Replace" : "Upload"}
                  </button>
                  {src && (
                    <button type="button" className={btnSmall} disabled={busy !== null} onClick={() => send(slot, { method: "DELETE" })}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={(el) => {
                  inputs.current[slot] = el;
                }}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                hidden
                data-intro-input={slot}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void send(slot, { method: "POST", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
