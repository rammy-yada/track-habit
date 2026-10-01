// What an admin can change about the Winter Arc's opening scene and its
// surprises, with the built-in defaults and the suggestions offered in the
// admin screen. Shared by the server (which stores and checks it) and the
// browser (which plays it).

export const SHAKE_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "soft", label: "Soft" },
  { value: "hard", label: "Hard" },
] as const;
export type Shake = (typeof SHAKE_OPTIONS)[number]["value"];

export const SOUND_OPTIONS = [
  { value: "none", label: "No sound" },
  { value: "impact", label: "Impact — one deep hit at the change" },
  { value: "rise", label: "Rise — builds up, then hits" },
  { value: "heartbeat", label: "Heartbeat — two beats, then the hit" },
  { value: "custom", label: "My own sound (upload below)" },
] as const;
export type Sound = (typeof SOUND_OPTIONS)[number]["value"];

/** The wording shown while the scene plays. `{name}` and `{days}` are filled in. */
export type IntroText = { before: string; after: string; quest: string; tagline: string; button: string };

export const TEXT_FIELDS: { key: keyof IntroText; label: string; hint: string; max: number }[] = [
  { key: "before", label: "First line", hint: "Over the tired character", max: 28 },
  { key: "after", label: "Second line", hint: "At the flash, over the strong character", max: 28 },
  { key: "quest", label: "Above the title", hint: "Small line above WINTER ARC", max: 40 },
  { key: "tagline", label: "Under the title", hint: "{name} = their first name, {days} = days in the season", max: 70 },
  { key: "button", label: "Button", hint: "What they press to begin", max: 22 },
];

export const DEFAULT_TEXT: IntroText = { before: "WHO YOU WERE", after: "WHO YOU BECOME", quest: "New quest unlocked", tagline: "{days} days · Become better, {name}", button: "Press start" };

/** Ready-made wording an admin can drop in with one tap. */
export const TEXT_PRESETS: { name: string; text: IntroText }[] = [
  { name: "Classic", text: DEFAULT_TEXT },
  { name: "Warrior", text: { before: "THE OLD YOU", after: "THE ONE WHO STAYS", quest: "The cold doesn't care. Neither do you.", tagline: "{days} days. No days off, {name}.", button: "Enter the arc" } },
  { name: "Quiet grind", text: { before: "COMFORT", after: "DISCIPLINE", quest: "Nobody is watching. Do it anyway.", tagline: "{name}, disappear for {days} days.", button: "Begin" } },
  { name: "Level up", text: { before: "LEVEL 01", after: "LEVEL MAX", quest: "Main quest: become better", tagline: "{days} days of XP waiting, {name}", button: "Start game" } },
  { name: "नेपाली", text: { before: "हिजोको तिमी", after: "भोलिको तिमी", quest: "नयाँ यात्रा सुरु भयो", tagline: "{days} दिन · अझ राम्रो बन, {name}", button: "सुरु गर" } },
];

export type IntroConfig = { shake: Shake; sound: Sound; text: IntroText };
export const DEFAULT_INTRO: IntroConfig = { shake: "soft", sound: "none", text: DEFAULT_TEXT };

// ── Surprises ────────────────────────────────────────────────────────────────
// Finishing every Winter Arc habit for the day opens a surprise. On milestone
// days it is a badge; on other days, one of these messages.

export const DEFAULT_SURPRISES = [
  "One more day the old you would have skipped.",
  "Nobody clapped. You did it anyway. That's the whole point.",
  "Small days like this are what big changes are made of.",
  "You kept a promise to yourself today. Most people don't.",
  "Winter is long. You're longer.",
  "Today's version of you would beat last month's.",
  "Quiet work. Loud results. Keep going.",
  "आज पनि गर्‍यौ। यही नै जित हो।",
  "Discipline is choosing what you want most over what you want now. You chose.",
  "Bonus: go drink a glass of water. You earned the easy win too.",
];

export const MILESTONES = [
  { days: 1, title: "First Step", icon: "🌱", line: "Day one is the hardest. It's behind you." },
  { days: 3, title: "Momentum", icon: "🔥", line: "Three perfect days. It's starting to stick." },
  { days: 7, title: "One Week Warrior", icon: "⚔️", line: "A full week without missing one." },
  { days: 14, title: "Two Weeks Deep", icon: "🧊", line: "Past the point where most people quit." },
  { days: 21, title: "Habit Formed", icon: "🧠", line: "21 perfect days. This is who you are now." },
  { days: 30, title: "Iron Month", icon: "🛡️", line: "Thirty perfect days. Unreasonable. Respect." },
  { days: 50, title: "Half Century", icon: "🏔️", line: "Fifty. The view is different from up here." },
  { days: 75, title: "Unbreakable", icon: "💎", line: "Seventy-five perfect days." },
  { days: 100, title: "Century", icon: "👑", line: "One hundred perfect days. Almost nobody gets here." },
  { days: 123, title: "Arc Complete", icon: "🏆", line: "Every single day of the Winter Arc. Legendary." },
] as const;

/** Habits an admin can add to a pack with one tap. */
export const PACK_HABIT_SUGGESTIONS: { name: string; icon: string }[] = [
  { name: "Wake up before 6 AM", icon: "⏰" },
  { name: "Cold shower", icon: "🚿" },
  { name: "Workout 45 minutes", icon: "💪" },
  { name: "10,000 steps", icon: "👟" },
  { name: "Drink 3 litres of water", icon: "💧" },
  { name: "No sugar or junk food", icon: "🚫" },
  { name: "Read 10 pages", icon: "📖" },
  { name: "Meditate 10 minutes", icon: "🧘" },
  { name: "Write in a journal", icon: "✍️" },
  { name: "No social media before noon", icon: "📵" },
  { name: "Sleep by 11 PM", icon: "😴" },
  { name: "Study 1 hour", icon: "🎓" },
  { name: "Stretch 10 minutes", icon: "🤸" },
  { name: "Eat enough protein", icon: "🍳" },
];

const cleanLine = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Turns whatever was stored or submitted into a safe, complete configuration. */
export function normalizeIntro(raw: unknown): IntroConfig {
  const r = (raw ?? {}) as { shake?: unknown; sound?: unknown; text?: Record<string, unknown> };
  const text = { ...DEFAULT_TEXT };
  for (const field of TEXT_FIELDS) text[field.key] = cleanLine(r.text?.[field.key], field.max) || DEFAULT_TEXT[field.key];
  return {
    shake: SHAKE_OPTIONS.some((o) => o.value === r.shake) ? (r.shake as Shake) : DEFAULT_INTRO.shake,
    sound: SOUND_OPTIONS.some((o) => o.value === r.sound) ? (r.sound as Sound) : DEFAULT_INTRO.sound,
    text,
  };
}

export const MAX_SURPRISES = 30;

export function normalizeSurprises(raw: unknown): string[] {
  const lines = Array.isArray(raw) ? raw.map((line) => cleanLine(line, 160)).filter(Boolean) : [];
  return [...new Set(lines)].slice(0, MAX_SURPRISES);
}

// ── Badges an admin creates ──────────────────────────────────────────────────
export const BADGE_RULES = [
  { value: "perfect", label: "Perfect days", unit: "perfect days", hint: "Days on which every habit of the pack was done" },
  { value: "streak", label: "Day streak", unit: "days in a row", hint: "Scoring days in a row during the arc" },
  { value: "points", label: "Points", unit: "points", hint: "Winter Arc points this season" },
  { value: "manual", label: "Given by hand", unit: "", hint: "You choose who gets it" },
] as const;
export type BadgeRule = (typeof BADGE_RULES)[number]["value"];

/** Badges an admin can add with one tap. */
export const BADGE_SUGGESTIONS: { name: string; icon: string; description: string; rule: BadgeRule; threshold: number }[] = [
  { name: "Early Bird", icon: "🌅", description: "A full week of perfect days.", rule: "perfect", threshold: 7 },
  { name: "On Fire", icon: "🔥", description: "Ten scoring days in a row.", rule: "streak", threshold: 10 },
  { name: "Thousand Club", icon: "💯", description: "1,000 Winter Arc points.", rule: "points", threshold: 1000 },
  { name: "Iron Will", icon: "🛡️", description: "Thirty perfect days.", rule: "perfect", threshold: 30 },
  { name: "Community Hero", icon: "🤝", description: "For helping others stay on track.", rule: "manual", threshold: 0 },
  { name: "Founding Member", icon: "⭐", description: "Here from the very first season.", rule: "manual", threshold: 0 },
];
