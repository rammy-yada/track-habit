"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { btnGhost, btnPrimary, input, label } from "@/components/ui/styles";
import { SHARE_HASHTAGS } from "@/lib/constants";
import { canShareFiles, downloadPicture, fetchPicture, sharePicture } from "@/lib/share";

type Stats = { day: number; totalDays: number; points: number; streak: number; rank: number };

const tags = SHARE_HASHTAGS.map((tag) => `#${tag}`).join(" ");

/**
 * "Share my progress" on the leaderboard. Shows the picture that will be
 * posted — the member's photo, day, streak, points and rank, all read from the
 * database — with a caption to edit, and hands both to the phone's share
 * menu (Instagram, Facebook, TikTok, WhatsApp…). On a computer, where there
 * is no such menu, the picture is downloaded instead.
 */
export function ShareAchievement({ stats }: { stats: Stats }) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [share, setShare] = useState(false);
  const [working, setWorking] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // the address changes with the numbers, so an old picture is never reused
  const card = `/api/share-card?v=${stats.day}-${stats.points}-${stats.streak}-${stats.rank}`;

  useEffect(() => {
    if (!open) return;
    setNote(null);
    setCaption(`Day ${stats.day} of ${stats.totalDays} of my Winter Arc — ${stats.points.toLocaleString("en-US")} points${stats.streak > 1 ? `, ${stats.streak} days in a row` : ""}. ${tags}`);
    setShare(canShareFiles());
  }, [open, stats]);

  async function post(how: "share" | "download") {
    setWorking(true);
    setNote(null);
    try {
      const file = await fetchPicture(card, `winter-arc-day-${stats.day}.png`);
      if (how === "share") {
        if (await sharePicture(file, caption)) setNote({ ok: true, text: "Shared. The caption is on your clipboard too — paste it in." });
      } else {
        downloadPicture(file);
        await navigator.clipboard?.writeText(caption).catch(() => {});
        setNote({ ok: true, text: "Saved, and the caption is copied. Open the app you like, choose this picture, and paste." });
      }
    } catch {
      setNote({ ok: false, text: how === "share" ? "Sharing didn't open. Download the picture instead and post it from your gallery." : "The picture couldn't be made. Check your connection and try again." });
    } finally {
      setWorking(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(caption);
      setNote({ ok: true, text: "Caption copied." });
    } catch {
      setNote({ ok: false, text: "Select the caption and copy it." });
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-xs font-bold uppercase tracking-[0.16em] text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 15V3m0 0L8 7m4-4l4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
        Share my progress
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Share your progress">
        <div data-true-color className="space-y-4">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[250px] overflow-hidden rounded-2xl border border-line bg-black shadow-xl">
            {!loaded && <div className="skeleton absolute inset-0" aria-hidden />}
            {/* eslint-disable-next-line @next/next/no-img-element -- generated per request, nothing to optimise */}
            <img src={card} alt={`Winter Arc, day ${stats.day}: ${stats.points} points, ${stats.streak}-day streak, rank ${stats.rank}`} onLoad={() => setLoaded(true)} className="h-full w-full object-cover" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [stats.points.toLocaleString("en-US"), "points"],
              [String(stats.streak), "day streak"],
              [`#${stats.rank}`, "rank"],
            ].map(([value, text]) => (
              <div key={text} className="rounded-xl bg-raised py-2">
                <div className="text-base font-bold tabular-nums">{value}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{text}</div>
              </div>
            ))}
          </div>

          <label className="block">
            <span className={label}>Caption</span>
            <textarea className={`${input} min-h-[76px] resize-y`} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={400} />
          </label>

          {share && (
            <button type="button" className={`${btnPrimary} w-full py-3.5`} onClick={() => post("share")} disabled={working} data-autofocus>
              {working ? "Preparing…" : "Share to Instagram, Facebook, TikTok…"}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={share ? btnGhost : btnPrimary} onClick={() => post("download")} disabled={working}>
              Download picture
            </button>
            <button type="button" className={btnGhost} onClick={copy}>
              Copy caption
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted">{share ? "Your phone's share menu opens — pick the app. Instagram and TikTok take the picture but not the text, so the caption is copied for you to paste." : "On a phone this opens the share menu directly. Here, download the picture and post it with the caption."}</p>
          {note && (
            <p role={note.ok ? "status" : "alert"} className={`rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${note.ok ? "bg-raised text-ink" : "bg-bad-soft text-bad"}`}>
              {note.text}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
