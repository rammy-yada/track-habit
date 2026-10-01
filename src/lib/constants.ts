export const APP_NAME = "HabitFlow";

export const TIMEZONES: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Chicago", label: "Chicago (CST)" },
  { value: "America/Denver", label: "Denver (MST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Karachi", label: "Karachi (PKT)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Kathmandu", label: "Kathmandu (NPT)" },
  { value: "Asia/Dhaka", label: "Dhaka (BST)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
];

export const HABIT_ICONS = ["🏃", "📚", "💧", "🧘", "💪", "🥗", "😴", "✍️", "🎯", "💊", "🧹", "🎸", "💻", "☀️", "🌿"];

export const HABIT_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#84cc16"];

export const AVATAR_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#84cc16", "#ec4899"];

export const MOODS = [
  { value: "great", emoji: "😄", label: "Great" },
  { value: "good", emoji: "😊", label: "Good" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "bad", emoji: "😟", label: "Bad" },
] as const;

export type Mood = (typeof MOODS)[number]["value"];

// Shown on the Privacy and Terms pages. Set CONTACT_EMAIL to a public address
// people can write to; while it is empty the pages point to the creator's page.
export const CONTACT_EMAIL = "";
export const LEGAL_UPDATED = "October 1, 2026";

export const CREATOR = {
  handle: "rammy24d",
  supportUrl: "https://kamaucha.me/rammy24d",
};

export const MOTTOS = [
  "Simplify your journey to excellence.",
  "Consistency is the signature of greatness.",
  "Your habits define your future.",
  "Small steps, better flow.",
  "Master your day, master your life.",
];
