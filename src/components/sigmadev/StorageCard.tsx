"use client";

import { useState, useTransition } from "react";
import { btnSmall, card, input } from "@/components/ui/styles";
import { setStorageLimitAction } from "@/lib/actions/site-admin";
import { whenOnline } from "@/lib/offline";

type Props = {
  used: string;
  limitGb: number;
  share: number;
  state: "ok" | "warn" | "full";
  tables: { name: string; size: string; rows: number }[];
  /** average stored size of one profile photo, e.g. "9 KB" (null: no photos yet) */
  photo: string | null;
};

/**
 * Admin → Overview: how full the database is. The plan's size is typed in
 * here (the site can't ask the database host for it). At 80% the admins are
 * emailed; at 95% uploads are paused so the site itself keeps working.
 */
export function StorageCard({ used, limitGb, share, state, tables, photo }: Props) {
  const [limit, setLimit] = useState(String(limitGb));
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const percent = Math.min(100, Math.round(share * 1000) / 10);
  const tone = state === "full" ? "bg-bad" : state === "warn" ? "bg-[#d97706]" : "bg-brand-solid";

  return (
    <section className={`${card} p-5`} aria-label="Storage" data-storage={state}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">Database storage</h2>
        <span className="text-xs font-semibold text-muted">
          <span className="text-ink">{used}</span> of {limitGb} GB · {percent}%
        </span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line" role="img" aria-label={`${percent}% of the storage is used`}>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(percent, 1)}%` }} />
      </div>
      <p className={`mt-2 text-xs leading-relaxed ${state === "ok" ? "text-muted" : "font-semibold text-bad"}`}>
        {state === "full"
          ? "Storage is full: new photos, pictures and sounds are being refused. Habits and sign-ins keep working. Move to a larger plan or delete what isn't needed."
          : state === "warn"
            ? "Getting full. At 95% uploads are paused so the site itself keeps working."
            : "Plenty of room. You'll be emailed at 80%, and uploads pause at 95% so the site itself never stops."}
      </p>

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await whenOnline(() => setStorageLimitAction(Number(limit)));
            if (!result.ok) setError(result.error);
          });
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Size of your database plan (GB)</span>
          <input className={`${input} w-32`} type="number" name="storage_limit" min={0.01} max={1024} step={0.01} value={limit} onChange={(e) => setLimit(e.target.value)} />
        </label>
        <button type="submit" className={btnSmall} disabled={saving || Number(limit) === limitGb}>
          {saving ? "Saving…" : "Save"}
        </button>
        <span className="basis-full text-[11px] text-muted">Look this up on your database host&apos;s plan page. The site can&apos;t read it for itself.</span>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-bad">
          {error}
        </p>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <h3 className="text-xs font-bold">What is using the space</h3>
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {tables.map((table) => (
            <li key={table.name} className="flex justify-between gap-3">
              <span className="truncate font-mono">{table.name}</span>
              <span className="shrink-0 tabular-nums">
                {table.size} · {table.rows.toLocaleString("en-US")} rows
              </span>
            </li>
          ))}
        </ul>
        {photo && <p className="mt-2 text-[11px] text-muted">A profile photo is stored as a 256px WebP: about {photo} each.</p>}
      </div>
    </section>
  );
}
