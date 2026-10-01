import "server-only";
import { randomInt } from "node:crypto";
import { execute, queryOne } from "./db";
import { safeEqual } from "./safe-equal";

type Purpose = "register" | "login" | "reset";

export async function generateOTP(email: string, purpose: Purpose = "register"): Promise<string> {
  await execute("UPDATE otp_codes SET used = 1 WHERE email = ? AND purpose = ? AND used = 0", [email, purpose]);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await execute("INSERT INTO otp_codes (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL '10 minutes')", [email, code, purpose]);
  return code;
}

export async function verifyOTP(email: string, code: string, purpose: Purpose = "register"): Promise<boolean> {
  const row = await queryOne<{ id: number; otp_code: string; attempts: number }>(
    "SELECT id, otp_code, attempts FROM otp_codes WHERE email = ? AND purpose = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC, id DESC LIMIT 1",
    [email, purpose],
  );
  if (!row) return false;
  // Five guesses per code. Counting and checking the limit are one statement,
  // so several guesses sent at the same moment can't all slip under it.
  const counted = await execute("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < 5 AND used = 0", [row.id]);
  if (!counted.rowCount) return false;

  // Constant-time comparison, so response timing can't leak the code digit by digit.
  if (!safeEqual(row.otp_code, code.trim())) return false;

  await execute("UPDATE otp_codes SET used = 1 WHERE id = ?", [row.id]);
  return true;
}
