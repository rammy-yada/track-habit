"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { btnGhost, btnPrimary, btnSmall } from "@/components/ui/styles";
import { saveDecor } from "@/lib/actions/site-admin";
import { DECOR_MAX_ITEMS, decorUrl, type Decor, type DecorItem, type DecorScene } from "@/lib/decor-shared";
import { cropPhoto } from "@/lib/crop";
import { send } from "@/lib/request";
import { shrinkImage } from "@/lib/shrink";

type Tab = DecorScene | "logo";
const SCENES: { key: Tab; label: string; where: string }[] = [
  { key: "auth", label: "Sign-in panel", where: "The left side of the sign-in and sign-up screens, on a computer." },
  { key: "arc", label: "Winter Arc page", where: "The poster at the top of the public Winter Arc page." },
  { key: "logo", label: "Logo", where: "The logo beside the name on every page, the browser tab, and the app's icon on a phone." },
];

type Drag = { id: string; mode: "move" | "resize"; startX: number; startY: number; item: DecorItem };

/**
 * Admin → Design. One canvas that looks like the real area; pictures are
 * dropped on it, dragged into place and resized by a corner. Nothing else is
 * on screen until a picture is selected, and nothing goes live until Save.
 */
export function DecorEditor({ initial, logo }: { initial: Decor; logo: number }) {
  const [decor, setDecor] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [tab, setTab] = useState<Tab>("auth");
  const scene: DecorScene = tab === "logo" ? "auth" : tab; // the area the canvas is showing
  const [phone, setPhone] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [saving, startSaving] = useTransition();
  const canvas = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);

  const items = decor[scene];
  const current = items.find((i) => i.id === selected) ?? null;
  const dirty = JSON.stringify(decor) !== saved;
  const full = items.length >= DECOR_MAX_ITEMS;

  // leaving with unsaved work asks first
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (id: string, patch: Partial<DecorItem>) => setDecor((d) => ({ ...d, [scene]: d[scene].map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const remove = (id: string) => {
    setDecor((d) => ({ ...d, [scene]: d[scene].filter((i) => i.id !== id) }));
    setSelected(null);
  };
  const toFront = (id: string) => setDecor((d) => ({ ...d, [scene]: [...d[scene].filter((i) => i.id !== id), ...d[scene].filter((i) => i.id === id)] }));
  const clamp = (n: number, low: number, high: number) => Math.round(Math.min(high, Math.max(low, n)) * 10) / 10;

  async function add(files: FileList | null) {
    if (!files) return;
    setNote(null);
    const room = DECOR_MAX_ITEMS - items.length;
    for (const [n, chosen] of [...files].slice(0, room).entries()) {
      // one picture at a time can be cropped first; several at once go straight up
      const file = files.length === 1 ? await cropPhoto(chosen, { title: "Picture" }) : chosen;
      if (!file) continue;
      setUploading((u) => u + 1);
      // sent as it is when small enough, so a PNG keeps its see-through background in every browser
      const body = file.size > 3_500_000 ? await shrinkImage(file, 1600) : file;
      const result = await send<{ id: string }>("/api/sigmadev/decor-image", { method: "POST", body, retry: false });
      setUploading((u) => u - 1);
      if (!result.ok) {
        setNote({ text: result.error, bad: true });
        continue;
      }
      const id = result.data.id;
      // each new picture lands near the middle, a little off the last, so several don't hide each other
      setDecor((d) => ({ ...d, [scene]: [...d[scene], { id, x: clamp(50 + n * 6, 0, 100), y: clamp(45 + n * 6, 0, 100), w: 30 }] }));
      setSelected(id);
    }
    if (files.length > room) setNote({ text: `Only ${DECOR_MAX_ITEMS} pictures fit on one area.`, bad: true });
    if (picker.current) picker.current.value = "";
  }

  function save() {
    setNote(null);
    startSaving(async () => {
      const result = await saveDecor(decor);
      if (!result.ok) return setNote({ text: result.error, bad: true });
      setDecor(result.decor);
      setSaved(JSON.stringify(result.decor));
      setNote({ text: "Saved. It's live now." });
    });
  }

  function down(e: React.PointerEvent, item: DecorItem, mode: Drag["mode"]) {
    e.stopPropagation();
    e.preventDefault();
    setSelected(item.id);
    canvas.current?.focus({ preventScroll: true });
    drag.current = { id: item.id, mode, startX: e.clientX, startY: e.clientY, item };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    const box = canvas.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = ((e.clientX - d.startX) / box.width) * 100;
    const dy = ((e.clientY - d.startY) / box.height) * 100;
    // the picture grows from its centre, so the corner under the finger moves at half the change in width
    if (d.mode === "move") change(d.id, { x: clamp(d.item.x + dx, 0, 100), y: clamp(d.item.y + dy, 0, 100) });
    else change(d.id, { w: clamp(d.item.w + dx * 2, 4, 100) });
  }
  const up = () => (drag.current = null);

  function keys(e: React.KeyboardEvent) {
    if (!current) return;
    const step = e.shiftKey ? 5 : 1;
    const moves: Record<string, Partial<DecorItem>> = {
      ArrowLeft: { x: clamp(current.x - step, 0, 100) },
      ArrowRight: { x: clamp(current.x + step, 0, 100) },
      ArrowUp: { y: clamp(current.y - step, 0, 100) },
      ArrowDown: { y: clamp(current.y + step, 0, 100) },
    };
    if (moves[e.key]) change(current.id, moves[e.key]);
    else if (e.key === "Delete" || e.key === "Backspace") remove(current.id);
    else if (e.key === "Escape") setSelected(null);
    else return;
    e.preventDefault();
  }

  // the canvas has the proportions of the real area: the tall panel beside the sign-in form, or the poster (wide on a computer; on a phone 1.3 times as tall as it is wide, as on the page)
  const shape = scene === "auth" ? "aspect-[3/4] max-w-md" : phone ? "aspect-[10/13] max-w-[300px]" : "aspect-[768/620] max-w-2xl";

  return (
    <>
      <PageHeader title="Design">
        {dirty && <span className="hidden text-xs font-medium text-muted sm:inline">Unsaved changes</span>}
        <button type="button" className={btnPrimary} onClick={save} disabled={!dirty || saving || uploading > 0} data-save>
          {saving ? "Saving…" : "Save"}
        </button>
      </PageHeader>

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-8 md:py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-line bg-card p-1" role="tablist" aria-label="Area to decorate">
            {SCENES.map((s) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={tab === s.key}
                onClick={() => {
                  setTab(s.key);
                  setSelected(null);
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${tab === s.key ? "bg-brand-solid text-on-brand" : "text-muted hover:text-ink"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {tab === "arc" && (
              <button type="button" className={btnSmall} onClick={() => setPhone((p) => !p)} aria-pressed={phone}>
                {phone ? "Phone view" : "Computer view"}
              </button>
            )}
            {tab !== "logo" && (
              <button type="button" className={btnGhost} onClick={() => picker.current?.click()} disabled={full || uploading > 0}>
                {uploading > 0 ? "Uploading…" : "+ Add picture"}
              </button>
            )}
            <input ref={picker} type="file" accept="image/png,image/webp,image/jpeg" multiple hidden onChange={(e) => void add(e.target.files)} data-decor-file />
          </div>
        </div>

        <p className="text-sm text-muted">{SCENES.find((s) => s.key === tab)!.where}</p>

        {tab === "logo" && <LogoPanel logo={logo} />}

        <div
          hidden={tab === "logo"}
          ref={canvas}
          tabIndex={0}
          onKeyDown={keys}
          onPointerDown={() => setSelected(null)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          data-decor-canvas
          aria-label="Design canvas. Select a picture, then use the arrow keys to move it."
          className={`relative mx-auto w-full touch-none select-none overflow-hidden rounded-2xl border border-line outline-none [&[hidden]]:hidden ${shape} ${scene === "auth" ? "bg-card" : "bg-[linear-gradient(180deg,#f4f4f4_0%,#dcdcdc_30%,#9b9b9b_58%,#3a3a3a_80%,#050505_100%)]"}`}
        >
          {/* a faint sketch of what is really there, so pictures can be placed around it */}
          {scene === "auth" ? (
            <>
              <span className="absolute left-[7%] top-[6%] font-display text-lg font-bold opacity-30">HabitFlow</span>
              <span className="absolute bottom-[7%] left-[7%] max-w-[70%] font-display text-2xl font-bold leading-tight opacity-30">Consistency is the signature of greatness.</span>
            </>
          ) : (
            <span className="absolute inset-x-0 top-[13%] text-center font-[family-name:var(--font-poster)] text-6xl leading-[0.86] text-black opacity-40">
              WINTER
              <br />
              ARC
            </span>
          )}

          {items.map((item) => {
            const on = item.id === selected;
            return (
              <div key={item.id} data-decor-item={item.id} onPointerDown={(e) => down(e, item, "move")} className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move ${on ? "outline outline-2 outline-offset-2 outline-brand" : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-brand/50"}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- served from the database */}
                <img src={decorUrl(item.id)} alt="" draggable={false} className="pointer-events-none block h-auto w-full" />
                {on && <span onPointerDown={(e) => down(e, item, "resize")} data-decor-resize aria-hidden className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-brand-solid shadow" />}
              </div>
            );
          })}

          {items.length === 0 && uploading === 0 && (
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => picker.current?.click()} className="absolute inset-0 grid place-items-center text-sm font-semibold text-muted">
              <span className="rounded-xl border border-dashed border-line bg-bg/80 px-4 py-3">Add a PNG to get started</span>
            </button>
          )}
        </div>

        {/* the only controls: they appear for the selected picture, and say what to do when none is */}
        <div hidden={tab === "logo"} className="mx-auto flex min-h-11 max-w-2xl flex-wrap items-center justify-center gap-3 text-sm [&[hidden]]:hidden" aria-live="polite">
          {current ? (
            <>
              <label className="flex items-center gap-2 text-muted">
                Size
                <input type="range" min={4} max={100} step={1} value={current.w} onChange={(e) => change(current.id, { w: Number(e.target.value) })} className="w-36 accent-[var(--brand-solid)]" />
              </label>
              <button type="button" className={btnSmall} onClick={() => toFront(current.id)}>
                Bring to front
              </button>
              <button type="button" className={`${btnSmall} hover:!border-bad hover:!text-bad`} onClick={() => remove(current.id)} data-decor-remove>
                Remove
              </button>
            </>
          ) : (
            <span className="text-muted">{items.length ? "Tap a picture to select it. Drag to move, pull the blue corner to resize." : "Pictures with a see-through background (PNG) work best."}</span>
          )}
        </div>

        {note && tab !== "logo" && (
          <p role={note.bad ? "alert" : "status"} className={`text-center text-sm font-medium ${note.bad ? "text-bad" : "text-good"}`}>
            {note.text}
          </p>
        )}
      </div>
    </>
  );
}

/** The site's logo: shown as it will look on a light and a dark page, with one button to replace it and one to go back. */
function LogoPanel({ logo }: { logo: number }) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const src = logo ? `/app-icon/logo?s=192&v=${logo}` : "/icons/icon-192.png";

  async function change(task: Promise<{ ok: boolean; error?: string }>, done: string) {
    setBusy(true);
    setNote(null);
    const result = await task;
    setBusy(false);
    if (picker.current) picker.current.value = "";
    if (!result.ok) return setNote({ text: result.error ?? "That didn't work. Please try again.", bad: true });
    setNote({ text: done });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-5" data-logo-panel>
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: "On light", box: "bg-white text-neutral-900 border-neutral-200" },
          { name: "On dark", box: "bg-[#090c13] text-white border-neutral-700" },
        ].map((look) => (
          <div key={look.name} className={`rounded-2xl border p-5 ${look.box}`} data-true-color>
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- the logo itself */}
              <img src={src} alt="" className="h-9 w-9 rounded-lg object-contain" />
              <span className="font-display text-lg font-bold tracking-tight">HabitFlow</span>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-50">{look.name}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => picker.current?.click()}>
          {busy ? "Working…" : logo ? "Replace logo" : "Upload logo"}
        </button>
        {logo > 0 && (
          <button type="button" className={btnGhost} disabled={busy} onClick={() => void change(send("/api/sigmadev/intro-image?slot=icon-logo", { method: "DELETE" }), "Back to the original logo.")} data-logo-reset>
            Use the original
          </button>
        )}
        <input
          ref={picker}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          hidden
          data-logo-file
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void cropPhoto(file, { aspect: 1, title: "Logo" }).then((ready) => ready && change(send("/api/sigmadev/intro-image?slot=icon-logo", { method: "POST", body: ready, retry: false }), "Logo changed."));
          }}
        />
      </div>
      {note && (
        <p role={note.bad ? "alert" : "status"} className={`text-center text-sm font-medium ${note.bad ? "text-bad" : "text-good"}`}>
          {note.text}
        </p>
      )}
      <p className="text-center text-xs leading-relaxed text-muted">A square PNG with a see-through background works best, 512 pixels or larger. It changes on every page straight away. An app already installed on a phone picks up the new icon later: Android in about a day, iPhone only after the app is removed and added again.</p>
    </div>
  );
}
