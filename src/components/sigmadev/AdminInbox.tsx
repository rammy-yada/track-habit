"use client";

import { useCallback, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { btnSmall, card } from "@/components/ui/styles";
import { deleteInquiry, setInquiryStatus } from "@/lib/actions/site-admin";
import { INQUIRY_KINDS } from "@/lib/inquiries";
import { whenOnline } from "@/lib/offline";

type Inquiry = { id: number; kind: "collab" | "brand"; name: string; email: string; company: string; website: string; topic: string; budget: string; message: string; status: "new" | "read"; sent: string };
type Filter = "all" | "new" | "collab" | "brand";

/** Admin → Inbox: what people sent through the Collaborate and Brand deals forms. */
export function AdminInbox({ inquiries }: { inquiries: Inquiry[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<Inquiry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const closeDelete = useCallback(() => setDeleting(null), []);
  const fresh = inquiries.filter((i) => i.status === "new").length;
  const shown = inquiries.filter((i) => filter === "all" || (filter === "new" ? i.status === "new" : i.kind === filter));

  function run(task: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(task);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <PageHeader title="Inbox">
        <span className="text-[13px] font-medium text-muted">{fresh ? `${fresh} new` : "Nothing new"}</span>
      </PageHeader>

      <div className="space-y-4 px-4 py-6 md:px-8 md:py-7">
        <p className="max-w-2xl text-sm text-muted">Messages from the public Collaborate and Brand deals pages. Reply opens your email app with their address filled in. What people write here is shown exactly as typed — treat links from strangers with care.</p>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter messages">
          {(
            [
              ["all", `All (${inquiries.length})`],
              ["new", `New (${fresh})`],
              ["collab", "Collaboration"],
              ["brand", "Brand deals"],
            ] as const
          ).map(([value, text]) => (
            <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${filter === value ? "border-brand bg-brand-solid text-on-brand" : "border-line text-muted hover:text-ink"}`}>
              {text}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
            {error}
          </p>
        )}

        {shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">{inquiries.length === 0 ? "No messages yet. They will appear here when someone fills in a form." : "Nothing in this view."}</p>
        ) : (
          <ul className={`space-y-3 ${busy ? "opacity-70" : ""}`}>
            <AnimatePresence initial={false}>
              {shown.map((inquiry) => (
                <motion.li key={inquiry.id} layout exit={{ opacity: 0, x: -30 }} className={`${card} p-4 sm:p-5 ${inquiry.status === "new" ? "border-brand" : ""}`} data-inquiry={inquiry.email}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${inquiry.kind === "brand" ? "bg-ink text-bg" : "bg-brand-soft text-brand"}`}>{INQUIRY_KINDS[inquiry.kind].label}</span>
                    {inquiry.status === "new" && <span className="rounded-md bg-good-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-good">New</span>}
                    <span className="text-sm font-bold">{inquiry.name}</span>
                    {inquiry.company && <span className="text-sm text-muted">· {inquiry.company}</span>}
                    <span className="flex-1" />
                    <span className="text-xs text-muted">{inquiry.sent}</span>
                  </div>
                  <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                    <div className="flex gap-1.5">
                      <dt>Email</dt>
                      <dd className="font-semibold text-ink">{inquiry.email}</dd>
                    </div>
                    {inquiry.topic && (
                      <div className="flex gap-1.5">
                        <dt>About</dt>
                        <dd className="font-semibold text-ink">{inquiry.topic}</dd>
                      </div>
                    )}
                    {inquiry.budget && (
                      <div className="flex gap-1.5">
                        <dt>Budget</dt>
                        <dd className="font-semibold text-ink">{inquiry.budget}</dd>
                      </div>
                    )}
                    {inquiry.website && (
                      <div className="flex min-w-0 gap-1.5">
                        <dt>Link</dt>
                        <dd className="min-w-0 truncate font-semibold">
                          <a href={inquiry.website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand hover:underline">
                            {inquiry.website}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                  <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-raised px-4 py-3 text-sm leading-relaxed">{inquiry.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: your message to HabitFlow`)}`} className={`${btnSmall} !border-brand !text-brand`} onClick={() => inquiry.status === "new" && run(() => setInquiryStatus(inquiry.id, "read"))}>
                      Reply by email
                    </a>
                    <button type="button" className={btnSmall} disabled={busy} onClick={() => run(() => setInquiryStatus(inquiry.id, inquiry.status === "new" ? "read" : "new"))}>
                      {inquiry.status === "new" ? "Mark as read" : "Mark as new"}
                    </button>
                    <button type="button" className={`${btnSmall} hover:!border-bad hover:!text-bad`} disabled={busy} onClick={() => setDeleting(inquiry)}>
                      Delete
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <ConfirmDialog open={deleting !== null} title="Delete this message?" body={`The message from ${deleting?.name ?? ""} will be removed for good.`} confirmLabel="Delete" onConfirm={() => deleting && run(() => deleteInquiry(deleting.id))} onClose={closeDelete} />
    </>
  );
}
