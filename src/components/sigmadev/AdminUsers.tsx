"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { btnGhost, btnPrimary, btnSmall, card, input, label } from "@/components/ui/styles";
import { addUserAction, changeRole, deleteUser, removeUserPhoto, resetUserPassword, toggleUser } from "@/lib/actions/admin";
import type { AdminUserRow } from "@/lib/admin-data";
import { whenOnline } from "@/lib/offline";

const PAGE = 20;

type Props = { users: AdminUserRow[]; selfId: number; search: string; dates: Record<number, { joined: string; seen: string }> };

export function AdminUsers({ users, selfId, search, dates }: Props) {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null);
  const [resetting, setResetting] = useState<AdminUserRow | null>(null);
  // changes that take effect at once and are easy to tap by mistake: asked about first
  const [asking, setAsking] = useState<{ title: string; body: string; label: string; task: () => Promise<{ ok: true } | { ok: false; error: string }> } | null>(null);
  const [newPassword, setNewPassword] = useState<{ user: AdminUserRow; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [busy, startTransition] = useTransition();

  function run(task: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(task);
      if (!result.ok) setError(result.error);
    });
  }

  function reset(user: AdminUserRow) {
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(() => resetUserPassword(user.id));
      if (result.ok && "password" in result) setNewPassword({ user, password: result.password });
      else if (!result.ok) setError(result.error);
    });
  }

  const closeAdd = useCallback(() => setAdding(false), []);
  const closeDelete = useCallback(() => setDeleting(null), []);
  const closeReset = useCallback(() => setResetting(null), []);
  const closeAsking = useCallback(() => setAsking(null), []);
  const closeNew = useCallback(() => setNewPassword(null), []);

  return (
    <>
      <PageHeader title="Users">
        <motion.button type="button" className={btnPrimary} onClick={() => setAdding(true)} whileTap={{ scale: 0.95 }}>
          <span className="text-base leading-none">+</span> Add user
        </motion.button>
      </PageHeader>

      <div className="space-y-4 px-4 py-6 md:px-8 md:py-7">
        <form method="GET" className="flex flex-wrap gap-2.5" role="search">
          <input type="search" name="search" defaultValue={search} placeholder="Search name, username or email…" aria-label="Search users" className={`${input} min-w-0 flex-1 sm:max-w-sm`} />
          <button type="submit" className={btnGhost}>
            Search
          </button>
          {search && (
            <Link href="/sigmadev/users" className={btnGhost}>
              Clear
            </Link>
          )}
        </form>

        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
            {error}
          </p>
        )}

        <p className="text-xs font-medium text-muted">
          {users.length} {users.length === 1 ? "account" : "accounts"}
          {search && ` matching “${search}”`}
        </p>

        {/* One card per person: reads the same on a phone and a desktop, no sideways scrolling. */}
        <ul className={`space-y-2.5 transition-opacity ${busy ? "opacity-70" : ""}`}>
          <AnimatePresence initial={false}>
            {users.slice(0, shown).map((u) => {
              const self = u.id === selfId;
              return (
                <motion.li key={u.id} layout exit={{ opacity: 0, x: -30 }} className={`${card} p-4 ${u.is_active ? "" : "opacity-60"}`} data-user={u.username}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                      <UserAvatar user={{ id: u.id, name: u.full_name, color: u.avatar_color, version: u.avatar_version }} size={42} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">{u.full_name}</span>
                          {u.role === "admin" && <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg">Admin</span>}
                          {!u.is_active && <span className="rounded-md bg-bad-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bad">Disabled</span>}
                          {u.google && <span className="rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">Google</span>}
                          {self && <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">You</span>}
                        </div>
                        <div className="truncate text-xs text-muted">
                          @{u.username} · {u.email}
                        </div>
                      </div>
                    </div>

                    <dl className="flex gap-5 text-xs text-muted">
                      <div>
                        <dt>Habits</dt>
                        <dd className="text-sm font-bold tabular-nums text-ink">{u.habit_count}</dd>
                      </div>
                      <div>
                        <dt>Check-ins</dt>
                        <dd className="text-sm font-bold tabular-nums text-ink">{u.checkin_count}</dd>
                      </div>
                      <div>
                        <dt>Joined</dt>
                        <dd className="whitespace-nowrap text-sm font-semibold text-ink">{dates[u.id]?.joined}</dd>
                      </div>
                      <div className="hidden sm:block">
                        <dt>Last seen</dt>
                        <dd className="whitespace-nowrap text-sm font-semibold text-ink">{dates[u.id]?.seen}</dd>
                      </div>
                    </dl>
                  </div>

                  {!self && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
                      <label className="flex items-center gap-2 text-xs font-medium text-muted">
                        Role
                        <select aria-label={`Role for ${u.full_name}`} value={u.role} disabled={busy} onChange={(e) => {
                            const role = e.target.value;
                            setAsking(
                              role === "admin"
                                ? { title: "Make this person an administrator?", body: `${u.full_name} will be able to see every account, reset passwords, delete users and change the site. Their habit tracker is replaced by the admin area.`, label: "Make administrator", task: () => changeRole(u.id, role) }
                                : { title: "Remove administrator access?", body: `${u.full_name} will go back to being an ordinary member and lose access to the admin area straight away.`, label: "Remove access", task: () => changeRole(u.id, role) },
                            );
                          }} className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-semibold text-ink">
                          <option value="user">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <span className="flex-1" />
                      {!u.google && (
                        <button type="button" className={btnSmall} disabled={busy} onClick={() => setResetting(u)}>
                          Reset password
                        </button>
                      )}
                      {u.avatar_version > 0 && (
                        <button type="button" className={btnSmall} disabled={busy} onClick={() => setAsking({ title: "Remove this photo?", body: `${u.full_name}'s profile photo will be deleted. They can upload another one.`, label: "Remove photo", task: () => removeUserPhoto(u.id) })}>
                          Remove photo
                        </button>
                      )}
                      <button type="button" className={btnSmall} disabled={busy} onClick={() => (u.is_active ? setAsking({ title: "Disable this account?", body: `${u.full_name} will be signed out everywhere and won't be able to sign in until you enable the account again. Nothing is deleted.`, label: "Disable account", task: () => toggleUser(u.id) }) : run(() => toggleUser(u.id)))}>
                        {u.is_active ? "Disable" : "Enable"}
                      </button>
                      <button type="button" className={`${btnSmall} hover:!border-bad hover:!text-bad`} disabled={busy} onClick={() => setDeleting(u)}>
                        Delete
                      </button>
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {users.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No users match “{search}”.</p>}
        {users.length > shown && (
          <button type="button" className={`${btnGhost} w-full`} onClick={() => setShown((n) => n + PAGE)}>
            Show {Math.min(PAGE, users.length - shown)} more
          </button>
        )}
      </div>

      <Modal open={adding} onClose={closeAdd} title="New user account">
        <AddUserForm onDone={closeAdd} />
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this user?"
        body={`${deleting?.full_name ?? ""} and all of their habits and check-ins will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete user"
        onConfirm={() => deleting && run(() => deleteUser(deleting.id))}
        onClose={closeDelete}
      />
      <ConfirmDialog open={asking !== null} title={asking?.title ?? ""} body={asking?.body ?? ""} confirmLabel={asking?.label ?? "Confirm"} onConfirm={() => asking && run(asking.task)} onClose={closeAsking} />
      <ConfirmDialog
        open={resetting !== null}
        title="Reset this password?"
        body={`${resetting?.full_name ?? ""}'s current password will stop working and they will be signed out on every device. You'll be shown a new one to pass on to them.`}
        confirmLabel="Reset password"
        onConfirm={() => resetting && reset(resetting)}
        onClose={closeReset}
      />
      <Modal open={newPassword !== null} onClose={closeNew} title="New password" width="max-w-sm">
        {newPassword && (
          <div>
            <p className="text-sm leading-relaxed text-muted">
              Give this to <span className="font-semibold text-ink">{newPassword.user.full_name}</span>. It is shown only once — it isn&apos;t stored anywhere readable.
            </p>
            <p className="my-4 select-all rounded-xl border border-dashed border-brand bg-brand-soft px-4 py-3 text-center font-mono text-lg font-bold tracking-wider text-brand" data-new-password>
              {newPassword.password}
            </p>
            <p className="text-xs leading-relaxed text-muted">Ask them to change it from Profile after signing in.</p>
            <button type="button" className={`${btnPrimary} mt-5 w-full`} onClick={closeNew} data-autofocus>
              Done
            </button>
          </div>
        )}
      </Modal>
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
      <PasswordField name="password" label="Initial password" placeholder="Minimum 8 characters" minLength={8} autoComplete="new-password" />
      <label className="block">
        <span className={label}>Account type</span>
        <select name="role" className={input} defaultValue="user">
          <option value="user">Member — tracks habits</option>
          <option value="admin">Administrator — manages the site</option>
        </select>
      </label>
      <SubmitButton pending={pending} pendingLabel="Creating…">
        Create account
      </SubmitButton>
    </form>
  );
}
