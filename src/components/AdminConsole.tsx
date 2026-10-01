"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { PasswordField } from "@/components/ui/PasswordField";
import { Reveal } from "@/components/ui/Reveal";
import { Spotlight } from "@/components/ui/Spotlight";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { BarList } from "@/components/charts/BarList";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { EmptyChart } from "@/components/charts/shared";
import { btnGhost, btnPrimary, btnSmall, card, eyebrow, input, label } from "@/components/ui/styles";
import { addCategoryAction, addUserAction, changeRole, deleteUser, toggleUser } from "@/lib/actions/admin";
import type { getAdminOverview } from "@/lib/data";
import { initial } from "@/lib/text";

type Overview = Awaited<ReturnType<typeof getAdminOverview>>;
type Props = { data: Overview; selfId: number; search: string; motto: string; joined: Record<number, string> };

export function AdminConsole({ data, selfId, search, motto, joined }: Props) {
  const [addingUser, setAddingUser] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [deleting, setDeleting] = useState<Overview["users"][number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const { stats } = data;

  function run(task: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error);
    });
  }

  const closeUser = useCallback(() => setAddingUser(false), []);
  const closeCategory = useCallback(() => setAddingCategory(false), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const tiles: { label: string; value: number; format?: (n: number) => string }[] = [
    { label: "Total registered", value: stats.totalUsers },
    { label: "Active users", value: stats.activeUsers },
    { label: "New today", value: stats.newToday },
    { label: "Health score", value: Math.round((stats.activeUsers / Math.max(1, stats.totalUsers)) * 100), format: (n) => `${Math.round(n)}%` },
  ];

  return (
    <>
      <PageHeader title="Management Console">
        <motion.button type="button" className={btnPrimary} onClick={() => setAddingUser(true)} whileTap={{ scale: 0.95 }}>
          <span className="text-base leading-none">+</span> Add User
        </motion.button>
      </PageHeader>

      <div className="space-y-6 px-4 py-6 md:px-8 md:py-7">
        <motion.p className="text-sm italic text-brand" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          “{motto}”
        </motion.p>

        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
            {error}
          </p>
        )}

        <motion.div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.06 } } }}>
          {tiles.map((t, i) => (
            <motion.div key={i} variants={{ hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0 } }}>
              <Spotlight className={`${card} h-full p-5`}>
                <div className="text-2xl font-semibold tracking-tight">
                  <AnimatedNumber value={t.value} format={t.format} />
                </div>
                <div className={`${eyebrow} mt-1`}>{t.label}</div>
              </Spotlight>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Reveal>
            <section className={`${card} h-full p-5`}>
              <h2 className="text-sm font-bold">System activity</h2>
              <p className="mb-3 text-xs text-muted">Check-ins across all users, last 7 days</p>
              <ColumnChart data={data.activity} unit="check-ins" caption="Check-ins across all users over the last 7 days" height={190} />
            </section>
          </Reveal>
          <Reveal delay={0.06}>
            <section className={`${card} h-full p-5`}>
              <h2 className="text-sm font-bold">Popular categories</h2>
              <p className="mb-4 text-xs text-muted">Active habits per category</p>
              {data.popular.length ? <BarList data={data.popular} unit="habits" caption="Active habits per category" /> : <EmptyChart>No habits yet.</EmptyChart>}
            </section>
          </Reveal>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <section aria-label="User directory">
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">User directory</h2>
            <form method="GET" className="mb-4 flex flex-wrap gap-2.5">
              <input type="search" name="search" defaultValue={search} placeholder="Search users…" aria-label="Search users" className={`${input} max-w-xs`} />
              <button type="submit" className={btnGhost}>
                Search
              </button>
              {search && (
                <Link href="/admin" className={btnGhost}>
                  Clear
                </Link>
              )}
            </form>
            <div className={`${card} overflow-x-auto ${busy ? "opacity-70" : ""} transition-opacity`}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-raised text-left text-[11px] uppercase tracking-wider text-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">User</th>
                    <th scope="col" className="px-3 py-3 text-center font-semibold">Role</th>
                    <th scope="col" className="px-3 py-3 text-center font-semibold">Habits</th>
                    <th scope="col" className="px-3 py-3 text-center font-semibold">Check-ins</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Joined</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {data.users.map((u) => (
                      <motion.tr key={u.id} layout exit={{ opacity: 0, x: -30 }} className={`border-b border-line last:border-0 ${u.is_active ? "" : "opacity-55"}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: u.avatar_color }}>
                              {initial(u.full_name)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{u.full_name}</div>
                              <div className="truncate text-xs text-muted">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {u.id === selfId ? (
                            <span className="rounded-full bg-bad-soft px-2.5 py-1 text-[11px] font-bold text-bad">ADMIN</span>
                          ) : (
                            <select
                              aria-label={`Role for ${u.full_name}`}
                              value={u.role}
                              disabled={busy}
                              onChange={(e) => run(() => changeRole(u.id, e.target.value))}
                              className="rounded-full border border-line bg-raised px-2.5 py-1 text-[11px] font-bold"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-bold tabular-nums">{u.habit_count}</td>
                        <td className="px-3 py-3 text-center font-bold tabular-nums">{u.checkin_count}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">{joined[u.id]}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {u.id === selfId ? (
                            <span className="text-xs font-semibold text-muted">You</span>
                          ) : (
                            <span className="inline-flex gap-1.5">
                              <button type="button" className={btnSmall} disabled={busy} onClick={() => run(() => toggleUser(u.id))}>
                                {u.is_active ? "Disable" : "Enable"}
                              </button>
                              <button type="button" className={`${btnSmall} hover:!border-bad hover:!text-bad`} disabled={busy} onClick={() => setDeleting(u)}>
                                Delete
                              </button>
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {data.users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted">
                        No users match “{search}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="Categories">
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Categories</h2>
            <div className={`${card} p-5`}>
              <ul>
                <AnimatePresence initial={false}>
                  {data.categories.map((c) => (
                    <motion.li key={c.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex items-center gap-2.5 border-b border-line py-2.5 text-sm font-semibold last:border-0">
                      <span aria-hidden>{c.icon}</span>
                      {c.name}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <button type="button" className={`${btnPrimary} mt-4 w-full`} onClick={() => setAddingCategory(true)}>
                + New Category
              </button>
            </div>
          </section>
        </div>
      </div>

      <Modal open={addingUser} onClose={closeUser} title="New User Account">
        <AddUserForm onDone={closeUser} />
      </Modal>
      <Modal open={addingCategory} onClose={closeCategory} title="New Category" width="max-w-xs">
        <AddCategoryForm onDone={closeCategory} />
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this user?"
        body={`${deleting?.full_name ?? ""} and all of their habits and check-ins will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete user"
        onConfirm={() => deleting && run(() => deleteUser(deleting.id))}
        onClose={closeDelete}
      />
    </>
  );
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(addUserAction, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      <Alert kind="error" shakeKey={state}>
        {state?.error}
      </Alert>
      <label className="block">
        <span className={label}>Full name</span>
        <input name="full_name" className={input} placeholder="Enter full name" required data-autofocus />
      </label>
      <label className="block">
        <span className={label}>Username</span>
        <input name="username" className={input} placeholder="Choose a username" required />
      </label>
      <label className="block">
        <span className={label}>Email address</span>
        <input type="email" name="email" className={input} placeholder="user@example.com" required />
      </label>
      <PasswordField name="password" label="Initial password" placeholder="Minimum 6 characters" autoComplete="new-password" />
      <label className="block">
        <span className={label}>Account role</span>
        <select name="role" className={input} defaultValue="user">
          <option value="user">Standard User</option>
          <option value="admin">Administrator</option>
        </select>
      </label>
      <SubmitButton pending={pending} pendingLabel="Creating…">
        Create Account
      </SubmitButton>
    </form>
  );
}

function AddCategoryForm({ onDone }: { onDone: () => void }) {
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
        <span className={label}>Icon</span>
        <input name="cat_icon" className={input} defaultValue="📋" maxLength={10} />
      </label>
      <SubmitButton pending={pending} pendingLabel="Adding…">
        Add Category
      </SubmitButton>
    </form>
  );
}
