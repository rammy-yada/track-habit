"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AboutYou, type Details } from "@/components/AboutYou";
import { LogoutButton } from "@/components/AppNav";
import { AppControls } from "@/components/AppStatus";
import { InstallButton } from "@/components/InstallButton";
import { AppPrefs, type Prefs } from "@/components/AppPrefs";
import { NotificationToggle } from "@/components/NotificationToggle";
import { Alert } from "@/components/ui/Alert";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Modal } from "@/components/ui/Modal";
import { PasswordField } from "@/components/ui/PasswordField";
import { Reveal } from "@/components/ui/Reveal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { btnDanger, btnGhost, btnSmall, card, input, label } from "@/components/ui/styles";
import { changePasswordAction, deleteAccountAction, updateProfileAction } from "@/lib/actions/profile";
import { ThemePicker } from "@/components/ThemePicker";
import { TimezoneOptions } from "@/components/TimezoneOptions";
import { APP_VERSION, AVATAR_COLORS, CREATOR } from "@/lib/constants";
import { clearOfflineData } from "@/lib/offline";
import { ageOn, countryName, flag, genderLabel } from "@/lib/people";
import { openGuide } from "@/lib/pwa";
import { shrinkImage } from "@/lib/shrink";

type Props = {
  user: { id: number; fullName: string; username: string; email: string; color: string; timezone: string; memberSince: string; google: boolean; photo: number; admin: boolean; emailLang: string; reminders: boolean; pushKey: string | null; prefs?: Prefs; arcMember?: boolean; details?: Details };
  stats: { habits: number; checkins: number };
  /** The member's Winter Arc badges, if there are any to show. */
  badges?: React.ReactNode;
  /** How many badges they have earned. */
  badgeCount?: number;
};

export function ProfileForms({ user, stats, badges, badgeCount }: Props) {
  // which settings row is open (one at a time, like a phone's settings app)
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((current) => (current === id ? null : id));
  const [editing, setEditing] = useState(false);
  // what the "My details" card lists: [label, value, small note]
  const d = user.details;
  const hidden = (shown: boolean) => (shown ? "Shown on your leaderboard profile" : "Hidden from others");
  const details: [string, string, string?][] = [
    ["Name", user.fullName],
    ["Username", `@${user.username}`],
    ["Email", user.email, "Only you can see this"],
    ...(d
      ? ([
          ["Gender", genderLabel(d.gender), hidden(d.showGender)],
          ["Date of birth", d.birthDate ? `${new Date(`${d.birthDate}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })} · ${ageOn(d.birthDate, new Date().toISOString().slice(0, 10))} years old` : "", d.showAge ? "Others see only your age" : "Hidden from others"],
          ["Country", d.country ? `${flag(d.country)} ${countryName(d.country)}` : "", hidden(d.showCountry)],
        ] as [string, string, string?][])
      : []),
    ["Timezone", user.timezone.replace(/_/g, " ")],
    ["Member since", user.memberSince],
  ];
  const router = useRouter();
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, null);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccountAction, null);
  const [color, setColor] = useState(user.color);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const palette = AVATAR_COLORS.includes(color) ? AVATAR_COLORS : [color, ...AVATAR_COLORS];

  async function photoRequest(init: RequestInit) {
    if (!navigator.onLine) return setPhotoError("You're offline. Changing your photo needs a connection.");
    setUploading(true);
    setPhotoError(null);
    try {
      const response = await fetch("/api/avatar", init);
      if (response.ok) router.refresh();
      else setPhotoError((await response.json().catch(() => null))?.error ?? "That didn't work. Please try again.");
    } catch {
      setPhotoError("That didn't work. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoError("Please choose an image file.");
    const blob = await shrinkImage(file, 640);
    await photoRequest({ method: "POST", body: blob, headers: { "Content-Type": blob.type || "application/octet-stream" } });
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6 md:py-8">
      {/* ── who you are ── */}
      <motion.section className="flex flex-col items-center pt-2 text-center" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative shrink-0">
          <motion.div initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0, opacity: uploading ? 0.5 : 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            {/* with no photo, the circle previews the colour being picked below */}
            <UserAvatar user={{ id: user.id, name: user.fullName, color, version: user.photo }} size={96} />
          </motion.div>
          {uploading && <span className="absolute inset-0 m-auto h-8 w-8 rounded-full border-[3px] border-brand border-t-transparent [animation:spin-slow_0.7s_linear_infinite]" />}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            aria-label={user.photo ? "Change profile photo" : "Add a profile photo"}
            className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-card bg-brand-solid text-on-brand shadow-md transition-transform hover:scale-110 disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={choosePhoto} data-photo-input />
        </div>
        <h2 className="mt-4 max-w-full truncate font-display text-2xl font-bold tracking-tight">{user.fullName}</h2>
        <p className="max-w-full truncate text-sm font-medium text-muted">@{user.username}</p>
        {photoError && (
          <p role="alert" className="mt-2 text-xs font-medium text-bad">
            {photoError}
          </p>
        )}
        {!user.admin && (
          <dl className="mt-5 grid w-full max-w-sm grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-card py-3">
            {[
              [stats.habits, "Habits"],
              [stats.checkins, "Check-ins"],
              [badgeCount ?? 0, "Badges"],
            ].map(([value, text]) => (
              <div key={text}>
                <dd className="text-xl font-bold tabular-nums">
                  <AnimatedNumber value={Number(value)} />
                </dd>
                <dt className="text-[11px] font-medium text-muted">{text}</dt>
              </div>
            ))}
          </dl>
        )}
      </motion.section>

      {/* ── their details: shown plainly, changed after pressing Edit ── */}
      <Reveal>
        <section className={`${card} overflow-hidden`} aria-label="My details" data-my-details>
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-[15px] font-bold">My details</h2>
            <button type="button" className={btnSmall} onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
              {editing ? "Done" : "Edit"}
            </button>
          </div>
          {/* the forms stay mounted while hidden, so a "saved" message or half-typed change isn't lost */}
          <dl hidden={editing} className="divide-y divide-line">
            {details.map(([name, value, hint]) => (
              <div key={name} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
                <dt className="shrink-0 text-muted">{name}</dt>
                <dd className="min-w-0 text-right font-semibold">
                  <span className="block truncate">{value || "—"}</span>
                  {hint && <span className="block text-[11px] font-medium text-muted">{hint}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <div hidden={!editing} className="space-y-6 px-4 py-5">
            <div>
          <Alert kind={profileState?.error ? "error" : "success"} shakeKey={profileState}>
            {profileState?.error ?? profileState?.message}
          </Alert>
          <form action={profileAction} className="space-y-5">
            <label className="block">
              <span className={label}>Full name</span>
              <input name="full_name" className={input} defaultValue={user.fullName} required minLength={2} maxLength={100} />
            </label>
            <fieldset data-true-color>
              <legend className={label}>Avatar colour {user.photo > 0 && <span className="font-normal">(shown if you remove your photo)</span>}</legend>
              <div className="flex flex-wrap gap-3">
                {palette.map((c) => (
                  <motion.button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} aria-label={`Avatar colour ${c}`} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="relative h-8 w-8 rounded-full" style={{ background: c }}>
                    {color === c && <motion.span layoutId="avatar-pick" className="absolute -inset-1 rounded-full border-2 border-ink" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
                  </motion.button>
                ))}
              </div>
              <input type="hidden" name="avatar_color" value={color} />
            </fieldset>
            <label className="block">
              <span className={label}>Timezone</span>
              <select name="timezone" className={input} defaultValue={user.timezone}>
                <TimezoneOptions current={user.timezone} />
              </select>
              {!user.admin && <span className="mt-1.5 block text-[11px] text-muted">Habits reset at midnight in your timezone.</span>}
            </label>
            <fieldset className="space-y-3 border-t border-line pt-5">
              <legend className="sr-only">Email</legend>
              <label className="block">
                <span className={label}>Language for notifications and emails</span>
                <select name="email_lang" className={input} defaultValue={user.emailLang}>
                  <option value="">English</option>
                  <option value="ne">नेपाली (Nepali)</option>
                </select>
              </label>
              {user.admin ? (
                <input type="hidden" name="email_reminders" value={user.reminders ? "on" : ""} />
              ) : (
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" name="email_reminders" defaultChecked={user.reminders} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-solid)]" />
                  <span className="text-[13px] leading-snug">
                    <span className="font-semibold text-ink">Winter Arc reminder emails</span>
                    <span className="block text-muted">One email at 7 PM your time, only on days you still have habits open and only if you&apos;ve joined the arc.</span>
                  </span>
                </label>
              )}
            </fieldset>
            <SubmitButton pending={profilePending} pendingLabel="Saving…">
              Save changes
            </SubmitButton>
          </form>
            </div>
            {user.details && (
              <div className="border-t border-line pt-5">
                <AboutYou details={user.details} />
              </div>
            )}
          </div>
        </section>
      </Reveal>

      {badges && <Reveal>{badges}</Reveal>}

      {/* ── settings, grouped the way a phone's settings app groups them: tap a row to open it ── */}
      <Group title="Account">
        <Row id="photo" icon="📷" title="Profile photo" note={user.photo ? "Change or remove it" : "Add one"} open={open} toggle={toggle}>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSmall} onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : user.photo ? "Change photo" : "Add photo"}
            </button>
            {user.photo > 0 && (
              <button type="button" className={btnSmall} onClick={() => photoRequest({ method: "DELETE" })} disabled={uploading}>
                Remove photo
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">It is cropped to a square and stored as a small, compressed picture.</p>
        </Row>
        <Row id="password" icon="🔒" title="Password" note={user.google ? "You sign in with Google" : "Change it"} open={open} toggle={toggle}>
          <Alert kind={passwordState?.error ? "error" : "success"} shakeKey={passwordState}>
            {passwordState?.error ?? passwordState?.message}
          </Alert>
          {user.google && <p className="text-[13px] leading-relaxed text-muted">You sign in with Google, so this account has no password of its own. There is nothing to change here.</p>}
          <form action={passwordAction} className="space-y-5" hidden={user.google}>
            <PasswordField name="current_password" label="Current password" placeholder="Your current password" autoComplete="current-password" />
            <PasswordField name="new_password" label="New password" placeholder="At least 8 characters" minLength={8} autoComplete="new-password" />
            <PasswordField name="confirm_password" label="Confirm new password" placeholder="Repeat new password" autoComplete="new-password" />
            <SubmitButton pending={passwordPending} pendingLabel="Updating…">
              Update password
            </SubmitButton>
          </form>
        </Row>
      </Group>

      <Group title="App">
        {!user.admin && (
          <Row id="notify" icon="🔔" title="Notifications and app icon" note="Reminders, motivation, the icon on your phone" open={open} toggle={toggle}>
            <div className="space-y-4">
              <NotificationToggle publicKey={user.pushKey} />
              {user.prefs && <AppPrefs prefs={user.prefs} arcMember={user.arcMember === true} />}
            </div>
          </Row>
        )}
        <Row id="theme" icon="🎨" title="Appearance" note="Light, dark or the Winter Arc look" open={open} toggle={toggle}>
          <ThemePicker />
        </Row>
        <Row id="install" icon="📲" title="Install and offline" note="Put HabitFlow on this device, update, sync" open={open} toggle={toggle}>
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-muted">{user.admin ? "Install HabitFlow on this device for one-tap access to the admin area." : "Install HabitFlow on your phone. It works offline: ticks made without a connection are kept on the device and synced when you're back online."}</p>
            <InstallButton />
            <AppControls />
          </div>
        </Row>
        {!user.admin && <Row id="guide" icon="❓" title="Welcome guide" note="See how everything works again" onClick={openGuide} />}
      </Group>

      <Group title="More">
        {!user.admin && <Row id="support" icon="♥" title={`Support ${CREATOR.handle}`} note="HabitFlow is free. If it helps you, you can leave a tip." href="/support" />}
        <Row id="data" icon="🗂️" title="Your data and privacy" note={`Member since ${user.memberSince}`} open={open} toggle={toggle}>
          <p className="text-[13px] leading-relaxed text-muted">
            See the{" "}
            <Link href="/privacy" className="font-semibold text-brand hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-brand hover:underline">
              Terms
            </Link>
            .
          </p>
          {user.admin ? (
            <p className="mt-3 text-[13px] leading-relaxed text-muted">An administrator account can only be removed by another administrator.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2.5">
              <a href="/api/export" className={btnGhost} download>
                Download my data
              </a>
              <button type="button" className={`${btnGhost} hover:!border-bad hover:!text-bad`} onClick={() => setConfirmingDelete(true)}>
                Delete my account
              </button>
            </div>
          )}
        </Row>
      </Group>

      {/* the last thing on the screen: the way out */}
      <section className={`${card} overflow-hidden`} aria-label="Log out">
        <LogoutButton className="flex w-full items-center justify-center gap-2.5 px-5 py-4 text-sm font-bold text-bad hover:bg-bad-soft" />
      </section>
      <p className="pb-2 text-center text-[11px] text-muted">HabitFlow v{APP_VERSION} · made by {CREATOR.handle}</p>

      <Modal open={confirmingDelete} onClose={() => setConfirmingDelete(false)} title="Delete your account?" width="max-w-sm">
        <p className="text-sm leading-relaxed text-muted">This permanently deletes your habits, check-ins, notes, photo and leaderboard entry. It cannot be undone.</p>
        <form action={deleteAction} onSubmit={() => navigator.onLine && clearOfflineData()} className="mt-4 space-y-4">
          <Alert kind="error" shakeKey={deleteState}>
            {deleteState?.error}
          </Alert>
          {user.google ? (
            <label className="block">
              <span className={label}>
                Type your username (<span className="font-mono">{user.username}</span>) to confirm
              </span>
              <input name="confirm" className={input} autoComplete="off" required data-autofocus />
            </label>
          ) : (
            <PasswordField name="confirm" label="Enter your password to confirm" autoComplete="current-password" />
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
            <button type="submit" className={btnDanger} disabled={deletePending}>
              {deletePending ? "Deleting…" : "Delete forever"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section aria-label={title}>
        <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{title}</h2>
        <div className={`${card} divide-y divide-line overflow-hidden`}>{children}</div>
      </section>
    </Reveal>
  );
}

type RowProps = { id: string; icon: string; title: string; note?: string; children?: React.ReactNode; open?: string | null; toggle?: (id: string) => void; href?: string; onClick?: () => void };

/** One line of the settings list. With children it opens in place; with `href` or `onClick` it goes somewhere. */
function Row({ id, icon, title, note, children, open, toggle, href, onClick }: RowProps) {
  const isOpen = open === id;
  const face = (
    <>
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-base">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{title}</span>
        {note && <span className="block truncate text-xs text-muted">{note}</span>}
      </span>
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </>
  );
  const rowClass = "flex min-h-[60px] w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-raised";
  if (href)
    return (
      <Link href={href} className={rowClass} data-row={id}>
        {face}
      </Link>
    );
  return (
    <div data-row={id}>
      <button type="button" className={rowClass} aria-expanded={children ? isOpen : undefined} onClick={onClick ?? (() => toggle?.(id))}>
        {face}
      </button>
      {/* kept mounted while closed, so a half-filled form or a "saved" message isn't lost */}
      {children && (
        <div hidden={!isOpen} className="border-t border-line bg-bg/40 px-4 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
