"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { UploadTile } from "@/components/ui/UploadTile";
import { btnPrimary, btnSmall, card, input, label } from "@/components/ui/styles";
import { saveMessagesAction } from "@/lib/actions/site-admin";
import { whenOnline } from "@/lib/offline";
import { COMEBACK_DAYS, type CustomMessages } from "@/lib/quotes";

type Props = {
  messages: CustomMessages;
  icons: { arc: number; away: number };
  builtIn: { quotes: string[]; nudges: string[]; comeback: Record<number, { title: string; body: string }> };
  ready: boolean;
  devices: number;
  people: number;
};

const ICONS = [
  { slot: "icon-arc", kind: "arc", title: "Winter Arc app icon", note: "The app's icon for people in the Winter Arc (and anyone who picks it in Profile)." },
  { slot: "icon-away", kind: "away", title: "“Come back” icon", note: "The picture on the notification sent to someone who has stopped ticking." },
] as const;

const toLines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);

/**
 * Admin → Notifications: the words people are sent — the morning quote, the
 * through-the-day motivation, the "come back" messages — and the two icons
 * that go with them. Anything left empty uses the built-in wording (which
 * comes in English and Nepali; your own text is sent to everyone as written).
 */
export function AdminMessages({ messages, icons, builtIn, ready, devices, people }: Props) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(messages.quotes.join("\n"));
  const [nudges, setNudges] = useState(messages.nudges.join("\n"));
  const [comeback, setComeback] = useState<Record<string, { title: string; body: string }>>(() => Object.fromEntries(COMEBACK_DAYS.map((day) => [day, messages.comeback[day] ?? { title: "", body: "" }])));
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  function save() {
    setNote(null);
    startTransition(async () => {
      const result = await whenOnline(() => saveMessagesAction({ quotes: toLines(quotes), nudges: toLines(nudges), comeback }));
      setNote(result.ok ? { ok: true, text: "Saved. The next notifications use this wording." } : { ok: false, text: result.error });
    });
  }

  async function sendIcon(slot: string, init: RequestInit) {
    setUploading(slot);
    setNote(null);
    try {
      const response = await fetch(`/api/sigmadev/intro-image?slot=${slot}`, init);
      if (response.ok) router.refresh();
      else setNote({ ok: false, text: (await response.json().catch(() => null))?.error ?? "That didn't work. Please try again." });
    } catch {
      setNote({ ok: false, text: "That didn't work. Check your connection and try again." });
    } finally {
      setUploading(null);
    }
  }

  return (
    <>
      <PageHeader title="Notifications">
        <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save wording"}
        </button>
      </PageHeader>

      <div className="space-y-5 px-4 py-6 md:px-8 md:py-7" data-admin-messages>
        <p className={`rounded-xl px-4 py-3 text-sm ${ready ? "bg-raised text-muted" : "bg-bad-soft font-medium text-bad"}`}>
          {ready ? (
            <>
              <span className="font-bold text-ink">{people}</span> {people === 1 ? "person has" : "people have"} notifications on, across <span className="font-bold text-ink">{devices}</span> {devices === 1 ? "device" : "devices"}. Each person chooses how many they get in their Profile.
            </>
          ) : (
            "Notifications aren't switched on for this site yet: the VAPID keys are missing from the server's settings, so nothing here is sent."
          )}
        </p>
        {note && (
          <p role={note.ok ? "status" : "alert"} className={`rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${note.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            {note.text}
          </p>
        )}

        {/* ── icons ── */}
        <section className={`${card} p-5`} aria-label="Icons">
          <h2 className="text-sm font-bold">Icons</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">A square PNG works best (512×512 or larger). Only upload artwork you made or may use. An installed app's icon is fixed when it is installed: Android and computers pick up a new one within a day or so, an iPhone only when the app is re-added — so a website can't swap its home-screen icon day by day. The “come back” notification is where a different picture shows up straight away.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ICONS.map((icon) => (
              <div key={icon.slot} className="rounded-xl border border-line p-3.5" data-icon-slot={icon.kind} data-true-color>
                <UploadTile
                  shape="row"
                  src={`/app-icon/${icon.kind}?s=144&v=${icons[icon.kind]}`}
                  alt={icon.title}
                  title={icon.title}
                  note={icon.note}
                  emptyNote=""
                  fit="cover"
                  imgClassName="rounded-[14px]"
                  accept="image/png,image/jpeg,image/webp"
                  busy={uploading === icon.slot}
                  blocked={uploading !== null && uploading !== icon.slot ? "One at a time…" : null}
                  inputData={{ "data-icon-input": icon.kind }}
                  onPick={(file) => void sendIcon(icon.slot, { method: "POST", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } })}
                  // "remove" here means going back to the built-in one, and only makes sense once one has been uploaded
                  onRemove={icons[icon.kind] > 0 ? () => sendIcon(icon.slot, { method: "DELETE" }) : undefined}
                  removeLabel="Use built-in"
                  actionLabel={icons[icon.kind] > 0 ? "Replace" : "Upload my own"}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── wording ── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <ListEditor title="Morning quotes" note="One is sent at 8 AM each day, in turn." name="quotes" value={quotes} onChange={setQuotes} builtIn={builtIn.quotes} />
          <ListEditor title="Motivation through the day" note="Sent in the afternoon to people who still have habits open." name="nudges" value={nudges} onChange={setNudges} builtIn={builtIn.nudges} />
        </div>

        <section className={`${card} p-5`} aria-label="Come-back messages">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold">“Come back” messages</h2>
            <button type="button" className={btnSmall} onClick={() => setComeback(Object.fromEntries(COMEBACK_DAYS.map((day) => [day, builtIn.comeback[day]])))}>
              Fill in the built-in ones
            </button>
            <button type="button" className={btnSmall} onClick={() => setComeback(Object.fromEntries(COMEBACK_DAYS.map((day) => [day, { title: "", body: "" }])))}>
              Clear
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">Sent to someone who joined and then stopped — once at each of these points after their last tick, then never again. A row left empty uses the built-in message.</p>
          <div className="mt-4 space-y-3">
            {COMEBACK_DAYS.map((day) => (
              <div key={day} className="grid gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1.6fr)] sm:items-center">
                <span className="text-xs font-bold">After {day} days</span>
                <input className={input} name={`back_title_${day}`} value={comeback[day]?.title ?? ""} maxLength={60} placeholder={builtIn.comeback[day].title} onChange={(e) => setComeback({ ...comeback, [day]: { ...comeback[day], title: e.target.value } })} aria-label={`Title after ${day} days`} />
                <input className={input} name={`back_body_${day}`} value={comeback[day]?.body ?? ""} maxLength={160} placeholder={builtIn.comeback[day].body} onChange={(e) => setComeback({ ...comeback, [day]: { ...comeback[day], body: e.target.value } })} aria-label={`Message after ${day} days`} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function ListEditor({ title, note, name, value, onChange, builtIn }: { title: string; note: string; name: string; value: string; onChange: (text: string) => void; builtIn: string[] }) {
  const count = toLines(value).length;
  return (
    <section className={`${card} p-5`} aria-label={title}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        <button type="button" className={btnSmall} onClick={() => onChange([...new Set([...toLines(value), ...builtIn])].join("\n"))}>
          Add the built-in ones
        </button>
        {count > 0 && (
          <button type="button" className={btnSmall} onClick={() => onChange("")}>
            Clear
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">{note} One per line, up to 60.</p>
      <label className="mt-3 block">
        <span className={`${label} sr-only`}>{title}</span>
        <textarea className={`${input} min-h-[220px] font-mono text-[13px]`} name={name} value={value} onChange={(e) => onChange(e.target.value)} placeholder={builtIn.slice(0, 3).join("\n")} />
      </label>
      <p className="mt-1 text-xs text-muted">{count ? `${count} of your own` : `Using the ${builtIn.length} built-in ones (English and Nepali)`}</p>
    </section>
  );
}
