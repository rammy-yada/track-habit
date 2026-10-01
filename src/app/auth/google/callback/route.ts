import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { execute, isDuplicateError, queryOne } from "@/lib/db";
import { googleEnabled, googleProfile, googleRedirectUri, siteOrigin } from "@/lib/google";
import { passwordStamp } from "@/lib/auth";
import { safeEqual } from "@/lib/safe-equal";
import { getSession } from "@/lib/session";
import { clean } from "@/lib/text";

export const dynamic = "force-dynamic";

type Row = { id: number; is_active: number; google_id: string | null; password: string; role?: string };

// Step 3: Google has sent the person back.
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const to = (path: string) => NextResponse.redirect(new URL(path, origin));
  if (!googleEnabled()) return to("/login?error=google_off");

  const session = await getSession();
  const expected = session.oauthState ?? "";
  const timezone = session.oauthTimezone ?? "UTC";
  const joining = session.joinArc === true;
  session.oauthState = undefined; // single use
  session.oauthTimezone = undefined;
  session.joinArc = undefined;

  const state = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code");
  const stateOk = expected.length > 0 && safeEqual(state, expected);
  if (!stateOk || !code) {
    await session.save();
    return to(request.nextUrl.searchParams.get("error") === "access_denied" ? "/login?error=google_cancelled" : "/login?error=google_failed");
  }

  const profile = await googleProfile(code, googleRedirectUri(request));
  if (!profile) {
    await session.save();
    return to("/login?error=google_failed");
  }
  // Only an address Google itself has verified can identify an account.
  if (!profile.emailVerified) {
    await session.save();
    return to("/login?error=google_unverified");
  }

  let user = await queryOne<Row>("SELECT id, is_active, google_id, password, role FROM users WHERE google_id = ?", [profile.id]);
  let isNew = false;

  if (!user) {
    const sameEmail = await queryOne<{ id: number }>("SELECT id FROM users WHERE LOWER(email) = ?", [profile.email]);
    if (sameEmail) {
      // That email already has a password account. Addresses typed at sign-up
      // are never verified, so quietly merging would let someone who registered
      // with another person's email get into that person's Google sign-in.
      await session.save();
      return to("/login?error=email_exists");
    }
    // no password was chosen: store one nobody knows, so password sign-in can't be used
    const password = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
    try {
      const created = await execute<{ id: number }>(
        "INSERT INTO users (username, email, password, full_name, avatar_color, timezone, email_verified, google_id, last_login) VALUES (?, ?, ?, ?, '#2563eb', ?, 1, ?, NOW()) RETURNING id",
        [
          await freeUsername(profile.email),
          profile.email,
          password,
          clean(profile.name, 100) || profile.email.split("@")[0],
          timezone,
          profile.id,
        ],
      );
      user = { id: created.rows[0].id, is_active: 1, google_id: profile.id, password };
      isNew = true;
    } catch (err) {
      if (!isDuplicateError(err)) throw err;
      await session.save();
      return to("/login?error=google_failed"); // two sign-ups raced; trying again will work
    }
  }

  if (!user.is_active) {
    await session.save();
    return to("/login?error=disabled");
  }

  session.userId = user.id;
  session.pw = passwordStamp(user.password);
  session.pendingReg = undefined;
  session.devOtp = undefined;
  await session.save();
  if (!isNew) await execute("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);
  if (user.role === "admin") return to("/sigmadev");
  return to(joining ? "/arc/start" : isNew ? "/dashboard?welcome=1" : "/dashboard");
}

/** "Asha.Gurung+x@gmail.com" → "asha_gurung", then "asha_gurung2"… until one is free. */
async function freeUsername(email: string): Promise<string> {
  const base = (email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 16) || "user").padEnd(3, "_");
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    if (!(await queryOne("SELECT id FROM users WHERE LOWER(username) = ?", [candidate]))) return candidate;
  }
  return `${base.slice(0, 10)}_${randomBytes(3).toString("hex")}`;
}
