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
import { TimezoneOptions } from "@/components/TimezoneOptions";
import { AVATAR_COLORS, CREATOR } from "@/lib/constants";
import { clearOfflineData } from "@/lib/offline";
import { openGuide } from "@/lib/pwa";

type Props = {
  user: { id: number; fullName: string; username: string; email: string; color: string; timezone: string; memberSince: string; google: boolean; photo: number; admin: boolean; emailLang: string; reminders: boolean; pushKey: string | null; prefs?: Prefs; arcMember?: boolean; details?: Details };
  stats: { habits: number; checkins: number };
  /** The member's Winter Arc badges, if there are any to show. */
  badges?: React.ReactNode;
};

/**
 * Shrinks a photo in the browser before it is uploaded, so a 6 MB camera
 * picture goes up as a few dozen KB. (The server converts it to a 256px WebP
 * regardless — this step only saves the person's data and time.)
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) return file; // a format this browser can't decode: let the server try
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await encode("image/webp", 0.86);
  // Safari can't write WebP from a canvas and quietly returns PNG; use JPEG there
  return (webp?.type === "image/webp" ? webp : await encode("image/jpeg", 0.88)) ?? file;
}

export function ProfileForms({ user, stats, badges }: Props) {
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
    const blob = await shrink(file);
    await photoRequest({ method: "POST", body: blob, headers: { "Content-Type": blob.type || "application/octet-stream" } });
  }

  return (
    <div className="max-w-2xl space-y-5 px-4 py-6 md:px-8 md:py-7">
      <motion.section className={`${card} flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:gap-6 sm:p-8 sm:text-left`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
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
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-bold tracking-tight">{user.fullName}</h2>
          <p className="truncate text-sm font-medium text-muted">
            @{user.username} · {user.email}
          </p>
          {!user.admin && (
            <p className="mt-2 text-sm font-medium text-muted">
              <span className="font-semibold text-ink">
                <AnimatedNumber value={stats.habits} />
              </span>{" "}
              habits ·{" "}
              <span className="font-semibold text-ink">
                <AnimatedNumber value={stats.checkins} />
              </span>{" "}
              check-ins
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <button type="button" className={btnSmall} onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : user.photo ? "Change photo" : "Add photo"}
            </button>
            {user.photo > 0 && (
              <button type="button" className={btnSmall} onClick={() => photoRequest({ method: "DELETE" })} disabled={uploading}>
                Remove photo
              </button>
            )}
          </div>
          {photoError && (
            <p role="alert" className="mt-2 text-xs font-medium text-bad">
              {photoError}
            </p>
          )}
        </div>
      </motion.section>

      <Reveal>
        <section className={`${card} p-6 sm:p-7`}>
          <h2 className="mb-5 border-b border-line pb-3 text-[15px] font-bold">Edit profile</h2>
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
                <span className={label}>Email language</span>
                <select name="email_lang" className={input} defaultValue={user.emailLang}>
                  <option value="">Automatic (नेपाली in Nepal, English elsewhere)</option>
                  <option value="ne">नेपाली</option>
                  <option value="en">English</option>
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
        </section>
      </Reveal>

      {badges && <Reveal>{badges}</Reveal>}

      {user.details && (
        <Reveal>
          <section className={`${card} p-6 sm:p-7`}>
            <h2 className="mb-5 border-b border-line pb-3 text-[15px] font-bold">About you</h2>
            <AboutYou details={user.details} />
          </section>
        </Reveal>
      )}

      <Reveal>
        <section className={`${card} p-6 sm:p-7`}>
          <h2 className="mb-5 border-b border-line pb-3 text-[15px] font-bold">Change password</h2>
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
        </section>
      </Reveal>

      <Reveal>
        <section className={`${card} space-y-4 p-6 sm:p-7`}>
          <div>
            <h2 className="mb-1 text-[15px] font-bold">App</h2>
            <p className="text-[13px] leading-relaxed text-muted">{user.admin ? "Install HabitFlow on this device for one-tap access to the admin area." : "Install HabitFlow on your phone. It works offline: ticks made without a connection are kept on the device and synced when you're back online."}</p>
          </div>
          <InstallButton />
          {!user.admin && <NotificationToggle publicKey={user.pushKey} />}
          {!user.admin && user.prefs && <AppPrefs prefs={user.prefs} arcMember={user.arcMember === true} />}
          <AppControls />
        </section>
      </Reveal>

      {!user.admin && (
        <Reveal>
          <Link href="/support" className={`${card} flex items-center gap-4 p-5 transition-colors hover:border-brand`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-xl text-brand" aria-hidden>
              ♥
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Support {CREATOR.handle}</span>
              <span className="block text-[13px] text-muted">HabitFlow is free. If it helps you, you can leave a tip.</span>
            </span>
            <span aria-hidden className="text-muted">
              →
            </span>
          </Link>
        </Reveal>
      )}

      <Reveal>
        <section className={`${card} p-6 sm:p-7`}>
          <h2 className="mb-1 text-[15px] font-bold">Your data</h2>
          <p className="text-[13px] leading-relaxed text-muted">
            Member since {user.memberSince}. See the{" "}
            <Link href="/privacy" className="font-semibold text-brand hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-brand hover:underline">
              Terms
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {!user.admin && (
              <a href="/api/export" className={btnGhost} download>
                Download my data
              </a>
            )}
            {!user.admin && (
              <button type="button" className={`${btnGhost} hover:!border-bad hover:!text-bad`} onClick={() => setConfirmingDelete(true)}>
                Delete my account
              </button>
            )}
          </div>
          {user.admin && <p className="mt-3 text-[13px] leading-relaxed text-muted">An administrator account can only be removed by another administrator, from Users.</p>}
        </section>
      </Reveal>

      {/* the last things on the screen: the guide, and the way out */}
      <Reveal>
        <section className={`${card} divide-y divide-line overflow-hidden`} aria-label="More">
          {!user.admin && (
            <button type="button" onClick={openGuide} className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-semibold hover:bg-raised" data-open-guide>
              <span aria-hidden className="grid h-[18px] w-[18px] place-items-center text-base leading-none">
                ?
              </span>
              Show the welcome guide again
            </button>
          )}
          <LogoutButton className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-bad hover:bg-bad-soft" />
        </section>
      </Reveal>

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
