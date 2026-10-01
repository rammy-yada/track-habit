"use client";

import { useCallback, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { btnDanger, btnGhost, btnPrimary, btnSmall, card, input, label } from "@/components/ui/styles";
import { addPackHabit, deletePack, removePackHabit, savePack, togglePack } from "@/lib/actions/arc-admin";
import { PACK_HABIT_SUGGESTIONS } from "@/lib/arc-config";
import type { Pack } from "@/lib/arc-packs";
import { whenOnline } from "@/lib/offline";

type Result = { ok: true; note?: string } | { ok: false; error: string };
type Draft = { id: number | null; name: string; icon: string; tagline: string; kind: "arc" | "open" };

const KINDS = [
  { value: "arc", label: "Winter Arc", hint: "Members choose it when they join the Winter Arc. One pack each; finishing it opens the daily surprise." },
  { value: "open", label: "Everyone", hint: "Any member can add it from their Today screen, any time of year, alongside other packs." },
] as const;

/**
 * Admin → Winter Arc: habit packs. A member picks one pack when joining and
 * its habits are created for them. Add a habit here later and it appears for
 * everyone already on that pack.
 */
export function ArcPacks({ packs }: { packs: Pack[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Pack | null>(null);
  const [removing, setRemoving] = useState<{ pack: Pack; habit: Pack["habits"][number] } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, startTransition] = useTransition();

  function run(task: () => Promise<Result>, done?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const result = await whenOnline(task);
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      if (result.note) setMessage({ ok: true, text: result.note });
      done?.();
    });
  }

  const closeDraft = useCallback(() => setDraft(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);
  const closeRemove = useCallback(() => setRemoving(null), []);

  return (
    <section aria-label="Habit packs">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="font-display text-lg font-bold tracking-tight">Habit packs</h2>
          <p className="mt-1 text-sm text-muted">A pack is a ready-made set of habits. Make one for the Winter Arc (chosen when joining) or for everyone (added from the Today screen). Either way its habits are created for the member in a section of their own — and a habit you add later is created for everyone already on the pack.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setDraft({ id: null, name: "", icon: "📦", tagline: "", kind: "open" })}>
          <span className="text-base leading-none">+</span> New pack
        </button>
      </div>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${message.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
          {message.text}
        </p>
      )}

      {packs.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No packs yet. Without a Winter Arc pack, members pick their own habits when they join.</p>
      ) : (
        <div className={`mt-4 grid gap-3 lg:grid-cols-2 ${busy ? "opacity-70" : ""}`}>
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} busy={busy} run={run} onEdit={() => setDraft({ id: pack.id, name: pack.name, icon: pack.icon, tagline: pack.tagline, kind: pack.kind })} onDelete={() => setDeleting(pack)} onRemoveHabit={(habit) => setRemoving({ pack, habit })} />
          ))}
        </div>
      )}

      <Modal open={draft !== null} onClose={closeDraft} title={draft?.id ? "Edit pack" : "New pack"}>
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => savePack(draft.id, draft.name, draft.icon, draft.tagline, draft.kind), closeDraft);
            }}
          >
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <label className="block">
                <span className={label}>Icon</span>
                <input className={`${input} text-center`} value={draft.icon} maxLength={4} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} aria-label="Pack icon (an emoji)" />
              </label>
              <label className="block">
                <span className={label}>Name</span>
                <input className={input} name="pack_name" value={draft.name} maxLength={60} required placeholder="e.g. Discipline" onChange={(e) => setDraft({ ...draft, name: e.target.value })} data-autofocus />
              </label>
            </div>
            <label className="block">
              <span className={label}>One line about it</span>
              <input className={input} name="pack_tagline" value={draft.tagline} maxLength={160} placeholder="Who is this pack for?" onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
            </label>
            {draft.id === null && (
              <fieldset>
                <legend className={label}>Who is it for?</legend>
                <div className="space-y-2">
                  {KINDS.map((kind) => (
                    <label key={kind.value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${draft.kind === kind.value ? "border-brand bg-brand-soft" : "border-line"}`}>
                      <input type="radio" name="pack_kind" value={kind.value} checked={draft.kind === kind.value} onChange={() => setDraft({ ...draft, kind: kind.value })} className="mt-1" />
                      <span>
                        <span className="block text-sm font-semibold">{kind.label}</span>
                        <span className="block text-xs text-muted">{kind.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={closeDraft}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary} disabled={busy}>
                {draft.id ? "Save" : "Create pack"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this pack?"
        body={`"${deleting?.name ?? ""}" will no longer be offered. ${deleting?.members ? `The ${deleting.members} member${deleting.members === 1 ? "" : "s"} on it keep the habits it gave them.` : "Nobody is on it yet."}`}
        confirmLabel="Delete pack"
        onConfirm={() => deleting && run(() => deletePack(deleting.id))}
        onClose={closeDelete}
      />

      <Modal open={removing !== null} onClose={closeRemove} title="Remove this habit?" width="max-w-sm">
        {removing && (
          <div>
            <p className="text-sm leading-relaxed text-muted">
              <span className="font-semibold text-ink">
                {removing.habit.icon} {removing.habit.name}
              </span>{" "}
              will leave the “{removing.pack.name}” pack. {removing.pack.members > 0 ? `${removing.pack.members} member${removing.pack.members === 1 ? " has" : "s have"} it on their checklist.` : ""}
            </p>
            <div className="mt-5 space-y-2">
              <button type="button" className={`${btnGhost} w-full`} onClick={() => run(() => removePackHabit(removing.habit.id, false), closeRemove)} data-autofocus>
                Remove from the pack only
              </button>
              {removing.pack.members > 0 && (
                <button type="button" className={`${btnDanger} w-full`} onClick={() => run(() => removePackHabit(removing.habit.id, true), closeRemove)}>
                  Remove from members&apos; checklists too
                </button>
              )}
              <button type="button" className="w-full py-2 text-sm font-semibold text-muted hover:text-ink" onClick={closeRemove}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

function PackCard({ pack, busy, run, onEdit, onDelete, onRemoveHabit }: { pack: Pack; busy: boolean; run: (task: () => Promise<Result>, done?: () => void) => void; onEdit: () => void; onDelete: () => void; onRemoveHabit: (habit: Pack["habits"][number]) => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✅");
  const [suggesting, setSuggesting] = useState(false);
  const have = new Set(pack.habits.map((h) => h.name.toLowerCase()));
  const suggestions = PACK_HABIT_SUGGESTIONS.filter((s) => !have.has(s.name.toLowerCase()));
  const full = pack.habits.length >= 10;

  return (
    <div className={`${card} p-4 ${pack.active ? "" : "opacity-70"}`} data-pack={pack.name}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-raised text-xl" aria-hidden>
          {pack.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-bold">{pack.name}</h3>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pack.kind === "arc" ? "bg-ink text-bg" : "bg-brand-soft text-brand"}`}>{pack.kind === "arc" ? "Winter Arc" : "Everyone"}</span>
            {!pack.active && <span className="rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">Hidden</span>}
          </div>
          <p className="text-xs text-muted">
            {pack.members} member{pack.members === 1 ? "" : "s"} · {pack.habits.length} habit{pack.habits.length === 1 ? "" : "s"}
            {pack.tagline && ` · ${pack.tagline}`}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {pack.habits.map((habit) => (
          <li key={habit.id} className="flex items-center gap-2 rounded-lg bg-raised px-3 py-2 text-sm">
            <span aria-hidden>{habit.icon}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{habit.name}</span>
            <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad" disabled={busy} onClick={() => onRemoveHabit(habit)} aria-label={`Remove ${habit.name}`}>
              ✕
            </button>
          </li>
        ))}
        {pack.habits.length === 0 && <li className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-xs text-muted">No habits yet — an empty pack isn&apos;t shown to members.</li>}
      </ul>

      {!full && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addPackHabit(pack.id, name, icon), () => setName(""));
          }}
        >
          <input className={`${input} w-14 px-1 text-center`} value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} aria-label="Habit icon (an emoji)" />
          <input className={`${input} min-w-0 flex-1`} value={name} maxLength={100} placeholder="Add a habit…" onChange={(e) => setName(e.target.value)} aria-label={`New habit for ${pack.name}`} />
          <button type="submit" className={btnGhost} disabled={busy || name.trim().length < 2}>
            Add
          </button>
        </form>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {!full && suggestions.length > 0 && (
          <button type="button" className={btnSmall} onClick={() => setSuggesting((v) => !v)} aria-expanded={suggesting}>
            {suggesting ? "Hide suggestions" : "Suggest habits"}
          </button>
        )}
        <span className="flex-1" />
        <button type="button" className={btnSmall} disabled={busy} onClick={onEdit}>
          Edit
        </button>
        <button type="button" className={btnSmall} disabled={busy} onClick={() => run(() => togglePack(pack.id))}>
          {pack.active ? "Hide" : "Show"}
        </button>
        <button type="button" className={`${btnSmall} hover:!border-bad hover:!text-bad`} disabled={busy} onClick={onDelete}>
          Delete
        </button>
      </div>
      {suggesting && !full && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s.name} type="button" disabled={busy} onClick={() => run(() => addPackHabit(pack.id, s.name, s.icon))} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-brand">
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
