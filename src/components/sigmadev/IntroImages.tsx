"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { send } from "@/lib/request";
import { replayArcIntro } from "@/components/arc/ArcIntro";
import { UploadTile } from "@/components/ui/UploadTile";
import { btnGhost, card } from "@/components/ui/styles";

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

  async function upload(slot: string, init: RequestInit) {
    setBusy(slot);
    setError(null);
    const result = await send(`/api/sigmadev/intro-image?slot=${slot}`, init);
    setBusy(null);
    if (result.ok) router.refresh();
    else setError(result.error);
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
        {SLOTS.map(({ slot, title, hint }) => (
          <div key={slot} className="rounded-xl border border-line p-3" data-slot={slot}>
            <UploadTile
              src={images[slot]}
              alt={`${title} image`}
              title={title}
              note={hint}
              emptyNote="Using the built-in drawing. Tap to choose a picture, or drop one here."
              shape="tall"
              fit="contain"
              dark
              imgClassName="grayscale"
              accept="image/png,image/webp,image/jpeg"
              busy={busy === slot}
              blocked={busy !== null && busy !== slot ? "One at a time…" : null}
              inputData={{ "data-intro-input": slot }}
              onPick={(file) => void upload(slot, { method: "POST", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } })}
              onRemove={() => upload(slot, { method: "DELETE" })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
