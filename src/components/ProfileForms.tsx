"use client";

import { useActionState, useState } from "react";
import { motion } from "motion/react";
import { AppControls } from "@/components/AppStatus";
import { Alert } from "@/components/ui/Alert";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { PasswordField } from "@/components/ui/PasswordField";
import { Reveal } from "@/components/ui/Reveal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { card, input, label } from "@/components/ui/styles";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/profile";
import { AVATAR_COLORS, TIMEZONES } from "@/lib/constants";
import { initial } from "@/lib/text";

type Props = {
  user: { fullName: string; username: string; email: string; color: string; timezone: string; memberSince: string };
  stats: { habits: number; checkins: number };
};

export function ProfileForms({ user, stats }: Props) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, null);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, null);
  const [color, setColor] = useState(user.color);
  const palette = AVATAR_COLORS.includes(color) ? AVATAR_COLORS : [color, ...AVATAR_COLORS];
  const zones = TIMEZONES.some((z) => z.value === user.timezone) ? TIMEZONES : [{ value: user.timezone, label: user.timezone }, ...TIMEZONES];

  return (
    <div className="max-w-2xl space-y-5 px-4 py-6 md:px-8 md:py-7">
      <motion.section className={`${card} flex items-center gap-5 p-6 sm:gap-6 sm:p-8`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* the avatar previews the picked colour live, before you save */}
        <motion.div
          className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full text-3xl font-bold text-white"
          initial={{ backgroundColor: color, scale: 0.6, rotate: -20 }}
          animate={{ backgroundColor: color, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          {initial(user.fullName)}
        </motion.div>
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-bold tracking-tight">{user.fullName}</h2>
          <p className="truncate text-sm font-medium text-muted">
            @{user.username} · {user.email}
          </p>
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
            <fieldset>
              <legend className={label}>Avatar color</legend>
              <div className="flex flex-wrap gap-3">
                {palette.map((c) => (
                  <motion.button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} aria-label={`Avatar color ${c}`} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="relative h-7 w-7 rounded-full" style={{ background: c }}>
                    {color === c && <motion.span layoutId="avatar-pick" className="absolute -inset-1 rounded-full border-2 border-ink" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
                  </motion.button>
                ))}
              </div>
              <input type="hidden" name="avatar_color" value={color} />
            </fieldset>
            <label className="block">
              <span className={label}>Timezone</span>
              <select name="timezone" className={input} defaultValue={user.timezone}>
                {zones.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-[11px] text-muted">Habits reset at midnight in your timezone.</span>
            </label>
            <SubmitButton pending={profilePending} pendingLabel="Saving…">
              Save Changes
            </SubmitButton>
          </form>
        </section>
      </Reveal>

      <Reveal>
        <section className={`${card} p-6 sm:p-7`}>
          <h2 className="mb-5 border-b border-line pb-3 text-[15px] font-bold">Change password</h2>
          <Alert kind={passwordState?.error ? "error" : "success"} shakeKey={passwordState}>
            {passwordState?.error ?? passwordState?.message}
          </Alert>
          <form action={passwordAction} className="space-y-5">
            <PasswordField name="current_password" label="Current password" placeholder="Your current password" autoComplete="current-password" />
            <PasswordField name="new_password" label="New password" placeholder="At least 6 characters" autoComplete="new-password" />
            <PasswordField name="confirm_password" label="Confirm new password" placeholder="Repeat new password" autoComplete="new-password" />
            <SubmitButton pending={passwordPending} pendingLabel="Updating…">
              Update Password
            </SubmitButton>
          </form>
        </section>
      </Reveal>

      <Reveal>
        <section className={`${card} p-6 sm:p-7`}>
          <h2 className="mb-1 text-[15px] font-bold">App</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-muted">HabitFlow works offline: ticks you make without a connection are kept on this device and synced when you&apos;re back online.</p>
          <AppControls />
        </section>
      </Reveal>

      <Reveal>
        <section className={`${card} p-6 sm:p-7`}>
          <h2 className="mb-3 text-[15px] font-bold">Account info</h2>
          <p className="text-sm font-medium text-muted">Member since {user.memberSince}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">To delete your account or export data, please contact an administrator.</p>
        </section>
      </Reveal>
    </div>
  );
}
