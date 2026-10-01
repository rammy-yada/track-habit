"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { btnGhost, btnPrimary, input, label } from "@/components/ui/styles";
import { SHARE_HASHTAGS } from "@/lib/constants";

type Stats = { day: number; totalDays: number; points: number; streak: number; rank: number };

const tags = SHARE_HASHTAGS.map((tag) => `#${tag}`).join(" ");

/**
 * "Share" on the arc screen. Builds a picture of the member's real numbers and
 * a caption with the hashtags, then hands both to the phone's share sheet —
 * which is how a web page posts to Instagram, Facebook, WhatsApp and the rest.
 * On a computer (no share sheet) it offers the picture to download instead.
 */
export function ShareAchievement({ stats }: { stats: Stats }) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  // the address changes with the numbers, so an old picture is never reused
  const card = `/api/share-card?v=${stats.day}-${stats.points}-${stats.streak}-${stats.rank}`;

  useEffect(() => {
    if (!open) return;
    setNote(null);
    setCaption(`Day ${stats.day} of ${stats.totalDays} of my Winter Arc — ${stats.points} points${stats.streak > 1 ? `, ${stats.streak}-day streak` : ""}. ${tags}`);
    setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] }));
  }, [open, stats]);

  const picture = async () => new File([await (await fetch(card)).blob()], `winter-arc-day-${stats.day}.png`, { type: "image/png" });

  async function share() {
    setNote(null);
    try {
      // Instagram takes the picture but drops the text, so the caption is also put on the clipboard to paste
      await navigator.clipboard?.writeText(caption).catch(() => {});
      await navigator.share({ files: [await picture()], text: caption });
    } catch (err) {
      if ((err as Error).name !== "AbortError") setNote("Sharing didn't open. Download the picture instead and post it from your gallery.");
    }
  }

  async function download() {
    const file = await picture();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
    setNote("Saved. Open Instagram or Facebook, choose this picture, and paste the caption.");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(caption);
      setNote("Caption copied.");
    } catch {
      setNote("Select the caption and copy it.");
    }
  }

  const facebook = () => {
    const url = new URL("https://www.facebook.com/sharer/sharer.php");
    url.searchParams.set("u", window.location.origin);
    url.searchParams.set("hashtag", `#${SHARE_HASHTAGS[0]}`);
    url.searchParams.set("quote", caption);
    window.open(url, "_blank", "noopener,noreferrer,width=640,height=640");
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 15V3m0 0L8 7m4-4l4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
        Share my progress
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Share your progress">
        <div data-true-color className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated per request, nothing to optimise */}
          <img src={card} alt={`Winter Arc, day ${stats.day}: ${stats.points} points, ${stats.streak}-day streak, rank ${stats.rank}`} className="mx-auto aspect-[4/5] w-full max-w-[260px] rounded-xl border border-line bg-black object-cover" />
          <label className="block">
            <span className={label}>Caption</span>
            <textarea className={`${input} min-h-[84px] resize-y`} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={400} />
          </label>
          {canShareFiles ? (
            <>
              <button type="button" className={`${btnPrimary} w-full py-3`} onClick={share} data-autofocus>
                Share to Instagram, Facebook…
              </button>
              <p className="text-xs leading-relaxed text-muted">Your phone&apos;s share menu opens — pick the app. The caption is copied too, because Instagram only takes the picture: paste it in.</p>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-muted">On a phone this opens the share menu directly. Here, download the picture and post it with the caption.</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className={`${btnGhost} px-2 text-[13px]`} onClick={download}>
              Download
            </button>
            <button type="button" className={`${btnGhost} px-2 text-[13px]`} onClick={copy}>
              Copy caption
            </button>
            <button type="button" className={`${btnGhost} px-2 text-[13px]`} onClick={facebook}>
              Facebook
            </button>
          </div>
          {note && (
            <p role="status" className="rounded-xl bg-raised px-3.5 py-2.5 text-[13px] font-medium text-ink">
              {note}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
