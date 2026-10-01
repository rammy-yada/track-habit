export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export const PASSWORD_MIN = 8;

/** What is wrong with a newly chosen password, or null if it is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > 72) return "Password must be 72 characters or fewer."; // bcrypt ignores anything past 72 bytes
  return null;
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Server actions are public endpoints — ids arrive as untrusted input. */
export function toId(value: unknown): number | null {
  const id = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
