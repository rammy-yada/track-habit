"use client";

import { useRef, useState } from "react";
import { btnSmall } from "./styles";

type Props = {
  /** The picture as it is now (null: nothing uploaded yet). */
  src: string | null;
  alt: string;
  /** What the empty box says. */
  emptyNote: string;
  accept: string;
  busy: boolean;
  /** Why nothing can be uploaded right now, if so (the box is greyed out and says this). */
  blocked?: string | null;
  onPick: (file: File) => void;
  onRemove?: () => void;
  removeLabel?: string;
  /** The shape of the preview. "row" puts a small square beside the text instead of a big box above it. */
  shape?: "wide" | "tall" | "row";
  /** contain: show the whole picture (cut-outs, icons). cover: fill the box (photos). */
  fit?: "cover" | "contain";
  /** A black backdrop, for cut-out pictures meant for a dark scene. */
  dark?: boolean;
  imgClassName?: string;
  /** data-* attributes for the hidden file input. */
  inputData?: Record<string, string>;
  title?: string;
  note?: string;
  /** Shown instead of a picture (a sound's player, say). */
  preview?: React.ReactNode;
  kind?: "picture" | "sound";
  /** What the main button says, when "Upload" / "Replace" isn't right. */
  actionLabel?: string;
};

/**
 * One way to upload a file, used everywhere a picture (or sound) is chosen:
 * a box that shows what is there now, that can be tapped or have a file
 * dropped on it, with the same Replace / Remove buttons and the same
 * "uploading" state each time.
 */
export function UploadTile({ src, alt, emptyNote, accept, busy, blocked = null, onPick, onRemove, removeLabel = "Remove", shape = "wide", fit = "cover", dark = false, imgClassName = "", inputData = {}, title, note, preview, kind = "picture", actionLabel }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const has = src !== null || Boolean(preview);
  const off = busy || blocked !== null;
  const open = () => !off && input.current?.click();
  const row = shape === "row";
  const noun = kind === "sound" ? "sound" : "picture";

  const box = (
    <button
      type="button"
      onClick={open}
      disabled={off}
      aria-label={has ? `Replace: ${alt}` : `Upload: ${alt}`}
      onDragOver={(e) => {
        if (off) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && !off) onPick(file);
      }}
      className={`group relative grid place-items-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${over ? "border-brand bg-brand-soft" : has ? "border-transparent" : "border-line hover:border-brand"} ${dark ? "bg-black" : "bg-raised"} ${row ? "h-[72px] w-[72px] shrink-0" : shape === "tall" ? "h-44 w-full" : "aspect-[1200/630] w-full"} ${off ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- an uploaded file served by our own route
        <img src={src} alt={alt} className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${busy ? "opacity-40" : ""} ${imgClassName}`} />
      ) : (
        <span className={`flex flex-col items-center gap-1.5 px-3 text-center ${dark ? "text-white/55" : "text-muted"}`}>
          <svg width={row ? 20 : 26} height={row ? 20 : 26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 16V4m0 0L8 8m4-4l4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
          {!row && <span className="text-xs leading-snug">{blocked ?? emptyNote}</span>}
        </span>
      )}
      {/* on a computer: a hint appears when the pointer is over a picture that can be replaced */}
      {src && !off && <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/55 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{over ? "Drop to replace" : row ? "Replace" : `Tap or drop a ${noun} to replace`}</span>}
      {busy && <span aria-hidden className="absolute h-7 w-7 rounded-full border-[3px] border-brand border-t-transparent [animation:spin-slow_0.7s_linear_infinite]" />}
    </button>
  );

  const buttons = (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className={btnSmall} disabled={off} onClick={open}>
        {busy ? "Uploading…" : (actionLabel ?? (has ? "Replace" : kind === "sound" ? "Upload a sound" : "Upload"))}
      </button>
      {has && onRemove && (
        <button type="button" className={btnSmall} disabled={busy} onClick={onRemove}>
          {removeLabel}
        </button>
      )}
    </div>
  );

  return (
    <div className={row ? "flex items-center gap-4" : ""} data-upload-tile>
      {!row && preview ? <div className="mb-2">{preview}</div> : null}
      {!(preview && !row) && box}
      <div className={row ? "min-w-0 flex-1" : "mt-3"}>
        {title && <div className="text-sm font-semibold">{title}</div>}
        {note && <p className={`text-xs leading-snug text-muted ${row ? "" : "mb-2"}`}>{note}</p>}
        <div className={row || title || note ? "mt-2" : ""}>{buttons}</div>
        {row && blocked && <p className="mt-1 text-xs text-muted">{blocked}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        {...inputData}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}
