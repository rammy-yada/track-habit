"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArcIntro, replayArcIntro } from "@/components/arc/ArcIntro";
import { UploadTile } from "@/components/ui/UploadTile";
import { btnGhost, btnPrimary, btnSmall, card, input, label } from "@/components/ui/styles";
import { saveArcSettingsAction } from "@/lib/actions/arc-admin";
import { DEFAULT_SURPRISES, MAX_SURPRISES, MILESTONES, normalizeIntro, SHAKE_OPTIONS, SOUND_OPTIONS, TEXT_FIELDS, TEXT_PRESETS, type IntroText, type Shake, type Sound } from "@/lib/arc-config";
import type { ArcIntroSetup } from "@/lib/arc-settings";
import { whenOnline } from "@/lib/offline";
import { send } from "@/lib/request";

type Props = {
  intro: ArcIntroSetup;
  /** The admin's own surprise messages (empty: the built-in ones are in use). */
  surprises: string[];
  images: { before: string | null; after: string | null };
  adminName: string;
  totalDays: number;
};

/**
 * Admin → Winter Arc: how the opening scene feels (shake, sound, wording) and
 * what the daily surprise says. "Preview" plays the scene with what is on
 * screen right now, saved or not.
 */
export function IntroSettings({ intro, surprises, images, adminName, totalDays }: Props) {
  const router = useRouter();
  const [shake, setShake] = useState<Shake>(intro.shake);
  const [sound, setSound] = useState<Sound>(intro.sound);
  const [text, setText] = useState<IntroText>(intro.text);
  const [lines, setLines] = useState(surprises.join("\n"));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, startSaving] = useTransition();

  const surpriseList = lines.split("\n").map((line) => line.trim()).filter(Boolean);
  const live = { ...normalizeIntro({ shake, sound, text }), soundUrl: intro.soundUrl };
  const dirty = shake !== intro.shake || sound !== intro.sound || TEXT_FIELDS.some((f) => text[f.key] !== intro.text[f.key]) || surpriseList.join("\n") !== surprises.join("\n");

  function save() {
    setMessage(null);
    startSaving(async () => {
      const result = await whenOnline(() => saveArcSettingsAction({ shake, sound, text }, surpriseList));
      setMessage(result.ok ? { ok: true, text: "Saved. Members see it the next time the intro plays." } : { ok: false, text: result.error });
    });
  }

  async function sendSound(init: RequestInit) {
    setUploading(true);
    setMessage(null);
    const result = await send("/api/sigmadev/intro-image?slot=sound", init);
    setUploading(false);
    if (!result.ok) return setMessage({ ok: false, text: result.error });
    if (init.method === "POST") setSound("custom");
    else if (sound === "custom") setSound("none");
    setMessage({ ok: true, text: init.method === "POST" ? "Sound uploaded. Press Save to use it." : "Sound removed." });
    router.refresh();
  }

  return (
    <section className={`${card} p-5`} aria-label="Intro effects and wording">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h2 className="text-sm font-bold">Intro effects, sound and wording</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">How the opening scene feels. Preview plays it with what is on this screen right now, before you save.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={replayArcIntro}>
            ▶ Preview
          </button>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${message.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* ── shake ── */}
        <fieldset>
          <legend className={label}>Screen shake</legend>
          <div className="flex rounded-xl border border-line p-1" role="radiogroup" aria-label="Screen shake">
            {SHAKE_OPTIONS.map((option) => (
              <button key={option.value} type="button" role="radio" aria-checked={shake === option.value} onClick={() => setShake(option.value)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${shake === option.value ? "bg-brand-solid text-on-brand" : "text-muted hover:text-ink"}`}>
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">The screen jolts at the moment the character changes. Phones that can will buzz too. People who turned on “reduce motion” never see the intro at all.</p>
        </fieldset>

        {/* ── sound ── */}
        <div>
          <label className="block">
            <span className={label}>Sound</span>
            <select className={input} value={sound} onChange={(e) => setSound(e.target.value as Sound)}>
              {SOUND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} disabled={option.value === "custom" && !intro.soundUrl}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3">
            <UploadTile
              kind="sound"
              shape="row"
              src={null}
              preview={intro.soundUrl ? <audio src={intro.soundUrl} controls preload="none" className="h-9 w-full max-w-[260px]" aria-label="Uploaded sound" /> : undefined}
              alt="your own sound"
              title={intro.soundUrl ? "Your sound" : "Your own sound"}
              emptyNote=""
              accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/x-m4a,.mp3,.ogg,.wav,.m4a"
              busy={uploading}
              inputData={{ "data-sound-input": "" }}
              onPick={(chosen) => void sendSound({ method: "POST", body: chosen, headers: { "Content-Type": chosen.type || "application/octet-stream" } })}
              onRemove={() => sendSound({ method: "DELETE" })}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">MP3, OGG, WAV or M4A, 2 MB at most; around 8 seconds fits the scene. Only upload sound you made or may use. Members can switch sound off in the intro, and a browser stays silent until the person has tapped the page once.</p>
        </div>
      </div>

      {/* ── wording ── */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold">Text shown while it plays</h3>
          <span className="text-xs text-muted">Suggestions:</span>
          {TEXT_PRESETS.map((preset) => (
            <button key={preset.name} type="button" className={btnSmall} onClick={() => setText(preset.text)} data-preset={preset.name}>
              {preset.name}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {TEXT_FIELDS.map((field) => (
            <label key={field.key} className={field.key === "tagline" ? "block sm:col-span-2" : "block"}>
              <span className={label}>
                {field.label} <span className="font-normal">· {field.hint}</span>
              </span>
              <input className={input} name={`intro_${field.key}`} value={text[field.key]} maxLength={field.max} onChange={(e) => setText({ ...text, [field.key]: e.target.value })} />
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">A line left empty goes back to the built-in wording. The big title “WINTER ARC” always stays.</p>
      </div>

      {/* ── surprises ── */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold">Daily surprises</h3>
          <button type="button" className={btnSmall} onClick={() => setLines([...new Set([...surpriseList, ...DEFAULT_SURPRISES])].slice(0, MAX_SURPRISES).join("\n"))}>
            Add suggestions
          </button>
          {surpriseList.length > 0 && (
            <button type="button" className={btnSmall} onClick={() => setLines("")}>
              Clear
            </button>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          When a member finishes every habit in their Winter Arc pack for the day, a gift opens with one of these messages — one per line, up to {MAX_SURPRISES}. Leave it empty to use the built-in ones. On milestone days ({MILESTONES.map((m) => m.days).join(", ")} perfect days) they get a badge instead.
        </p>
        <textarea aria-label="Surprise messages, one per line" className={`${input} mt-2 min-h-[140px] font-mono text-[13px]`} name="surprises" value={lines} onChange={(e) => setLines(e.target.value)} placeholder={DEFAULT_SURPRISES.slice(0, 3).join("\n")} />
        <p className="mt-1 text-xs text-muted">{surpriseList.length ? `${Math.min(surpriseList.length, MAX_SURPRISES)} of your own` : `Using the ${DEFAULT_SURPRISES.length} built-in messages`}</p>
      </div>

      {/* what "Preview" plays */}
      <ArcIntro firstName={adminName} images={images} totalDays={totalDays} auto={false} config={live} />
    </section>
  );
}
