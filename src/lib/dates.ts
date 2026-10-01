// Calendar dates are handled as "YYYY-MM-DD" strings end to end. Arithmetic
// goes through UTC so it never depends on the server's own timezone.

const DAY_MS = 86_400_000;

function toUTC(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** Today's date in the user's timezone — habits reset at their midnight. */
export function todayIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function addDays(date: string, days: number): string {
  return new Date(toUTC(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(toUTC(date));
}

/** Formats a MySQL TIMESTAMP string ("2026-10-01 09:30:00") for display. */
export function formatTimestamp(timestamp: string, withTime = false): string {
  const date = new Date(timestamp.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUTC(value).getTime());
}

/** "07:30:00" → "7:30 AM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
