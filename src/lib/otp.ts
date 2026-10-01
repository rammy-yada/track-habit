import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";
import { execute, queryOne } from "./db";

type Purpose = "register" | "login" | "reset";

export async function generateOTP(email: string, purpose: Purpose = "register"): Promise<string> {
  await execute("UPDATE otp_codes SET used = 1 WHERE email = ? AND purpose = ? AND used = 0", [email, purpose]);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await execute("INSERT INTO otp_codes (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, UTC_TIMESTAMP() + INTERVAL 10 MINUTE)", [email, code, purpose]);
  return code;
}

export async function verifyOTP(email: string, code: string, purpose: Purpose = "register"): Promise<boolean> {
  const row = await queryOne<{ id: number; otp_code: string; attempts: number }>(
    "SELECT id, otp_code, attempts FROM otp_codes WHERE email = ? AND purpose = ? AND used = 0 AND expires_at > UTC_TIMESTAMP() ORDER BY created_at DESC, id DESC LIMIT 1",
    [email, purpose],
  );
  if (!row || row.attempts >= 5) return false;
  await execute("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?", [row.id]);

  // Constant-time comparison, so response timing can't leak the code digit by digit.
  const expected = Buffer.from(row.otp_code);
  const given = Buffer.from(code.trim());
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;

  await execute("UPDATE otp_codes SET used = 1 WHERE id = ?", [row.id]);
  return true;
}
