"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { btnGhost, btnPrimary, card, eyebrow, input } from "@/components/ui/styles";
import { saveArcQuote } from "@/lib/actions/arc";
import { QUOTE_IDEAS } from "@/lib/arc-tips";
import { SHARE_HASHTAGS } from "@/lib/constants";
import { whenOnline } from "@/lib/offline";
import { canShareFiles, downloadPicture, fetchPicture, sharePicture } from "@/lib/share";

const tags = SHARE_HASHTAGS.map((tag) => `#${tag}`).join(" ");
const MAX = 160;

type Props = { member: boolean; saved: string; day: number; totalDays: number; live: boolean; photoVersion: number };

/**
 * The Quote tab: write a line of your own, and it is put on a picture with
 * your name, photo and day of the arc — ready to post to Instagram, Facebook
 * or TikTok through the phone's share menu.
 */
export function ArcQuote({ member, saved, day, totalDays, live, photoVersion }: Props) {
  const [text, setText] = useState(saved);
  const [current, setCurrent] = useState(saved);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [share, setShare] = useState(false);
  const [working, setWorking] = useState(false);
  const [saving, startTransition] = useTransition();
  useEffect(() => setShare(canShareFiles()), []);

  if (!member)
    return (
      <div className={`${card} p-7 text-center`}>
        <p className="text-4xl" aria-hidden>
          ✍️
        </p>
        <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Your words, your picture</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">Members write their own quote and share it as a picture with their name and photo. Join the Winter Arc to make yours.</p>
        <Link href="/arc/start" className={`${btnPrimary} mt-5`}>
          Join the Winter Arc
        </Link>
      </div>
    );

  const dirty = text.trim() !== current;
  // the address changes with the quote, photo and day, so an old picture is never reused
  const picture = `/api/share-card?kind=quote&v=${encodeURIComponent(`${current.length}-${hash(current)}-${photoVersion}-${day}`)}`;
  const caption = `${current ? `“${current}” — ` : ""}${live ? `Day ${day} of ${totalDays} of my Winter Arc. ` : "My Winter Arc. "}${tags}`;

  function save() {
    setNote(null);
    const next = text.trim();
    startTransition(async () => {
      const result = await whenOnline(() => saveArcQuote(next));
      if (result.ok) setCurrent(next);
      else setNote({ ok: false, text: result.error });
    });
  }

  async function post(how: "share" | "download") {
    setWorking(true);
    setNote(null);
    try {
      const file = await fetchPicture(picture, `winter-arc-quote-day-${day}.png`);
      if (how === "share") {
        if (await sharePicture(file, caption)) setNote({ ok: true, text: "Shared. The caption is on your clipboard too — paste it in." });
      } else {
        downloadPicture(file);
        await navigator.clipboard?.writeText(caption).catch(() => {});
        setNote({ ok: true, text: "Saved, and the caption is copied. Open Instagram, Facebook or TikTok, choose this picture, and paste." });
      }
    } catch {
      setNote({ ok: false, text: how === "share" ? "Sharing didn't open. Download the picture instead and post it from your gallery." : "The picture couldn't be made. Check your connection and try again." });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_minmax(0,300px)] md:items-start" data-arc-quote>
      <section className={`${card} p-5`} aria-label="Write your quote">
        <p className={eyebrow}>Your words</p>
        <h2 className="font-display text-lg font-bold tracking-tight">Write your quote</h2>
        <p className="mt-1 text-[13px] text-muted">One line that says why you&apos;re doing this. It goes on a picture with your name and profile photo.</p>
        <textarea className={`${input} mt-3 min-h-[110px] text-base`} name="arc_quote" value={text} maxLength={MAX} placeholder="Winter is where I'm built." onChange={(e) => setText(e.target.value)} aria-label="Your quote" />
        <div className="mt-1 flex items-center justify-between text-xs text-muted">
          <span>Short lines look best: under 70 characters gets the biggest letters.</span>
          <span className="tabular-nums">
            {text.length}/{MAX}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="py-1 text-xs text-muted">Ideas:</span>
          {QUOTE_IDEAS.map((idea) => (
            <button key={idea} type="button" onClick={() => setText(idea)} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-brand">
              {idea}
            </button>
          ))}
        </div>
        <button type="button" className={`${btnPrimary} mt-4 w-full sm:w-auto`} onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : dirty ? "Save and update the picture" : "Saved"}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          The picture shows your full name, username and photo. Change the photo in{" "}
          <Link href="/profile" className="font-semibold text-brand hover:underline">
            Profile
          </Link>
          . Keep it your own words, or credit whoever said it.
        </p>
      </section>

      <section className={`${card} p-4`} aria-label="Your picture" data-true-color>
        {/* eslint-disable-next-line @next/next/no-img-element -- generated per request, nothing to optimise */}
        <img src={picture} alt={current ? `Your quote: ${current}` : "Your quote picture"} width={1080} height={1350} loading="lazy" decoding="async" className="aspect-[4/5] w-full rounded-xl border border-line bg-black object-cover" data-quote-picture />
        <div className="mt-3 space-y-2">
          {share && (
            <button type="button" className={`${btnPrimary} w-full py-3`} onClick={() => post("share")} disabled={working || dirty}>
              {working ? "Preparing…" : "Share to Instagram, Facebook, TikTok…"}
            </button>
          )}
          <button type="button" className={`${share ? btnGhost : btnPrimary} w-full`} onClick={() => post("download")} disabled={working || dirty}>
            Download picture
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{dirty ? "Save your quote first to update the picture." : share ? "Your phone's share menu opens — pick the app. The caption with the hashtags is copied for you to paste." : "On a phone this opens the share menu directly. Here, download the picture and upload it to the app you like; the caption is copied for you."}</p>
        {note && (
          <p role={note.ok ? "status" : "alert"} className={`mt-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${note.ok ? "bg-raised text-ink" : "bg-bad-soft text-bad"}`}>
            {note.text}
          </p>
        )}
      </section>
    </div>
  );
}

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
