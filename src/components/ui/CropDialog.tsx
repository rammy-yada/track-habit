"use client";

import { useEffect, useRef, useState } from "react";
import { cutOut, setCropHost, type Area, type CropRequest } from "@/lib/crop";
import { Modal } from "./Modal";
import { btnGhost, btnPrimary } from "./styles";

type Corner = "nw" | "ne" | "sw" | "se";
type Drag = { mode: "move" | Corner; startX: number; startY: number; area: Area };
const MIN = 0.08; // the smallest crop, as a fraction of the picture
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

/** The largest centred area of the wanted shape (or nearly the whole picture when any shape will do). */
function startArea(shape: number | null, picture: number): Area {
  if (!shape) return { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
  // `shape` and `picture` are width ÷ height; areas are fractions of the picture, so the two have to be related
  const w = Math.min(1, shape / picture);
  const h = (w * picture) / shape;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/**
 * The one crop dialog for the whole app (see lib/crop.ts). It shows the
 * picture with a frame to drag and four corners to pull. The frame keeps the
 * shape of the place the picture is going to; "Free" lets it be any shape,
 * and "Use whole photo" skips cropping.
 */
export function CropHost() {
  const [request, setRequest] = useState<CropRequest | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [picture, setPicture] = useState(1); // the picture's own width ÷ height
  const [shape, setShape] = useState<number | null>(null);
  const [area, setArea] = useState<Area>({ x: 0, y: 0, w: 1, h: 1 });
  const [busy, setBusy] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    setCropHost((next) => {
      setRequest(next);
      setShape(next.aspect ?? null);
      setSrc(URL.createObjectURL(next.file));
    });
    return () => setCropHost(null);
  }, []);
  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src]);

  function finish(result: File | null) {
    request?.done(result);
    setRequest(null);
    setSrc(null);
    setBusy(false);
  }
  const choose = (next: number | null) => {
    setShape(next);
    setArea(startArea(next, picture));
  };

  function down(e: React.PointerEvent, mode: Drag["mode"]) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, startX: e.clientX, startY: e.clientY, area };
    frame.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    const box = frame.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = (e.clientX - d.startX) / box.width;
    const dy = (e.clientY - d.startY) / box.height;
    const a = d.area;
    if (d.mode === "move") return setArea({ ...a, x: clamp(a.x + dx, 0, 1 - a.w), y: clamp(a.y + dy, 0, 1 - a.h) });
    // a corner is pulled: the opposite corner stays where it is
    const right = d.mode.endsWith("e");
    const bottom = d.mode.startsWith("s");
    const ax = right ? a.x : a.x + a.w;
    const ay = bottom ? a.y : a.y + a.h;
    const roomW = right ? 1 - ax : ax;
    const roomH = bottom ? 1 - ay : ay;
    let w = clamp(right ? a.w + dx : a.w - dx, MIN, roomW);
    let h = clamp(bottom ? a.h + dy : a.h - dy, MIN, roomH);
    if (shape) {
      const k = picture / shape; // height per width, in fractions of the picture
      h = w * k;
      if (h > roomH) {
        h = roomH;
        w = h / k;
      }
    }
    setArea({ x: right ? ax : ax - w, y: bottom ? ay : ay - h, w, h });
  }

  const corners: { key: Corner; at: string; cursor: string }[] = [
    { key: "nw", at: "-left-2 -top-2", cursor: "cursor-nwse-resize" },
    { key: "ne", at: "-right-2 -top-2", cursor: "cursor-nesw-resize" },
    { key: "sw", at: "-bottom-2 -left-2", cursor: "cursor-nesw-resize" },
    { key: "se", at: "-bottom-2 -right-2", cursor: "cursor-nwse-resize" },
  ];
  const shapes: { label: string; value: number | null }[] = [...(request?.aspect ? [{ label: "Best fit", value: request.aspect }] : []), { label: "Free", value: null }, ...(request?.aspect === 1 ? [] : [{ label: "Square", value: 1 }])];

  return (
    <Modal open={request !== null} onClose={() => finish(null)} title={request ? `Crop: ${request.title}` : "Crop"} width="max-w-lg">
      <div data-crop-dialog>
        <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Shape">
          {shapes.map((s) => (
            <button key={s.label} type="button" role="radio" aria-checked={shape === s.value} onClick={() => choose(s.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${shape === s.value ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink"}`}>
              {s.label}
            </button>
          ))}
        </div>
        {/* a chequered backdrop shows where a picture is see-through */}
        <div className="grid place-items-center rounded-xl bg-[repeating-conic-gradient(#8882_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-2">
          <div ref={frame} onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)} className="relative touch-none select-none">
            {src && (
              // eslint-disable-next-line @next/next/no-img-element -- the person's own file, not yet uploaded
              <img
                src={src}
                alt=""
                draggable={false}
                className="block max-h-[52dvh] max-w-full"
                onLoad={(e) => {
                  const ratio = e.currentTarget.naturalWidth / e.currentTarget.naturalHeight;
                  setPicture(ratio);
                  setArea(startArea(request?.aspect ?? null, ratio));
                }}
              />
            )}
            {/* everything outside the frame is dimmed by the frame's own huge shadow */}
            <div data-crop-frame onPointerDown={(e) => down(e, "move")} className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" style={{ left: `${area.x * 100}%`, top: `${area.y * 100}%`, width: `${area.w * 100}%`, height: `${area.h * 100}%` }}>
              {corners.map((c) => (
                <span key={c.key} data-crop-corner={c.key} onPointerDown={(e) => down(e, c.key)} className={`absolute h-5 w-5 rounded-full border-2 border-white bg-brand-solid ${c.at} ${c.cursor}`} />
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Drag the frame to move it. Pull a corner to change its size.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={btnGhost} disabled={busy} onClick={() => request && finish(request.file)} data-crop-skip>
            Use whole photo
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={busy || !src}
            data-crop-apply
            onClick={() => {
              if (!request) return;
              setBusy(true);
              // a picture this browser can't redraw still goes up whole, and the server sizes it
              void cutOut(request.file, area).then(finish, () => finish(request.file));
            }}
          >
            {busy ? "Cropping…" : "Crop & upload"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
