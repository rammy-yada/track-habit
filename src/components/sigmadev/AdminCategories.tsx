"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { btnPrimary, btnSmall, card, input, label } from "@/components/ui/styles";
import { addCategoryAction, deleteCategory, updateCategory } from "@/lib/actions/admin";
import type { getAdminCategories } from "@/lib/admin-data";
import { whenOnline } from "@/lib/offline";

type Category = Awaited<ReturnType<typeof getAdminCategories>>[number];

export function AdminCategories({ categories }: { categories: Category[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const closeAdd = useCallback(() => setAdding(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const run = (task: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(task);
      if (result.ok) done?.();
      else setError(result.error);
    });
  };

  return (
    <>
      <PageHeader title="Categories">
        <motion.button type="button" className={btnPrimary} onClick={() => setAdding(true)} whileTap={{ scale: 0.95 }}>
          <span className="text-base leading-none">+</span> New category
        </motion.button>
      </PageHeader>

      <div className="max-w-2xl space-y-4 px-4 py-6 md:px-8 md:py-7">
        <p className="text-sm text-muted">Members pick one of these when they add a habit.</p>
        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
            {error}
          </p>
        )}
        <ul className={`${card} divide-y divide-line ${busy ? "opacity-70" : ""}`}>
          <AnimatePresence initial={false}>
            {categories.map((c) => (
              <motion.li key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} className="flex items-center gap-3 px-4 py-3" data-category={c.name}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-raised text-xl" aria-hidden>
                  {c.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className="block text-xs text-muted">
                    {c.habits} active {c.habits === 1 ? "habit" : "habits"}
                  </span>
                </span>
                <button type="button" className={btnSmall} onClick={() => setEditing(c)}>
                  Edit
                </button>
                <button type="button" className={`${btnSmall} hover:!border-bad hover:!text-bad`} onClick={() => setDeleting(c)}>
                  Delete
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <Modal open={adding} onClose={closeAdd} title="New category" width="max-w-sm">
        <AddForm onDone={closeAdd} />
      </Modal>
      <Modal open={editing !== null} onClose={closeEdit} title="Edit category" width="max-w-sm">
        {editing && <EditForm category={editing} busy={busy} onSave={(name, icon) => run(() => updateCategory(editing.id, name, icon), closeEdit)} error={error} />}
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this category?"
        body={deleting?.habits ? `${deleting.habits} habit${deleting.habits === 1 ? "" : "s"} in “${deleting.name}” will move to “General”. No habits are deleted.` : `“${deleting?.name ?? ""}” isn't used by any habit.`}
        confirmLabel="Delete category"
        onConfirm={() => deleting && run(() => deleteCategory(deleting.id))}
        onClose={closeDelete}
      />
    </>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(addCategoryAction, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      <Alert kind="error" shakeKey={state}>
        {state?.error}
      </Alert>
      <label className="block">
        <span className={label}>Name</span>
        <input name="cat_name" className={input} required minLength={2} maxLength={50} data-autofocus />
      </label>
      <label className="block">
        <span className={label}>Icon (an emoji)</span>
        <input name="cat_icon" className={input} defaultValue="📋" maxLength={10} />
      </label>
      <SubmitButton pending={pending} pendingLabel="Adding…">
        Add category
      </SubmitButton>
    </form>
  );
}

function EditForm({ category, busy, onSave, error }: { category: Category; busy: boolean; onSave: (name: string, icon: string) => void; error: string | null }) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(name, icon);
      }}
    >
      <Alert kind="error" shakeKey={error}>
        {error}
      </Alert>
      <label className="block">
        <span className={label}>Name</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={50} data-autofocus />
      </label>
      <label className="block">
        <span className={label}>Icon (an emoji)</span>
        <input className={input} value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={10} />
      </label>
      {category.habits > 0 && <p className="text-xs text-muted">Renaming also updates the {category.habits} habit{category.habits === 1 ? "" : "s"} using it.</p>}
      <SubmitButton pending={busy} pendingLabel="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}
