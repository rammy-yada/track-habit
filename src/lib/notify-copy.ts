import type { Lang } from "./mail";

// The wording of the everyday notifications, built from what is true for
// that person today: which habits are still open, how many are done, how
// long their streak is. Each kind has several titles; which one is used
// moves on every day (see inTurn), so the same words don't come back day
// after day.

/** What is known about one person's day when a notification is written. */
export type DayFacts = {
  total: number;
  done: number;
  left: number;
  /** Habits not yet ticked today, in the order they were added. */
  open: { icon: string; name: string }[];
  /** Days in a row with at least one tick, up to yesterday. */
  streakBefore: number;
  /** Ticks yesterday. */
  yesterday: number;
  /** Every habit there was yesterday was done. */
  perfectYesterday: boolean;
  /** Nothing yesterday, after ticking the day before: the moment a streak usually dies. */
  missedYesterday: boolean;
  /** Ticks in the last seven days (not today), and in the seven before that. */
  week: number;
  lastWeek: number;
  /** The open habit gone longest without a tick (3+ days), if any. */
  neglected: { icon: string; name: string; days: number } | null;
  /** 0 Sunday … 6 Saturday, on the person's own clock. */
  weekday: number;
};

const MILESTONES = [7, 14, 21, 30, 50, 60, 75, 100, 150, 200, 365];

/** Something worth saying about today, when there is one: a milestone, yesterday's result, the start of the week. */
function headline(lang: Lang, name: string, f: DayFacts): string | null {
  const ne = lang === "ne";
  const next = f.streakBefore + 1;
  if (MILESTONES.includes(next)) return ne ? `आज लगातार ${next} दिन पुग्छ, ${name} 🏆` : `Today makes ${next} days in a row, ${name} 🏆`;
  if (f.perfectYesterday) return ne ? `हिजो सबै ${f.total} बानी पूरा, ${name} 🌟` : `Perfect day yesterday — all ${f.total} done, ${name} 🌟`;
  if (f.missedYesterday) return ne ? `हिजो छुट्यो। आज दोब्बर गनिन्छ, ${name} 💪` : `Yesterday slipped. Today counts double, ${name} 💪`;
  if (f.weekday === 1) return ne ? `नयाँ हप्ता, ${name} — राम्रो सुरुवात गरौँ 🗓️` : `New week, ${name} — set the tone today 🗓️`;
  if (f.weekday === 6 || f.weekday === 0) return ne ? `बिदाको दिन, ${name} — एउटा वाचा पूरा गरौँ ☀️` : `Weekend mode, ${name} — keep one promise ☀️`;
  return null;
}

/** One useful observation about their habits, when there is one. */
function insight(lang: Lang, f: DayFacts): string | null {
  const ne = lang === "ne";
  if (f.missedYesterday) return ne ? "💡 कहिल्यै दुई दिन लगातार नछुटाउनुहोस् — आज एउटा टिकले फेरि बाटोमा ल्याउँछ।" : "💡 Never miss twice: one tick today puts you straight back on track.";
  if (f.neglected) return ne ? `💡 ${f.neglected.icon} ${f.neglected.name} ${f.neglected.days} दिनदेखि टिक भएको छैन — आज त्यहीँबाट सुरु?` : `💡 ${f.neglected.icon} ${f.neglected.name} hasn't been ticked in ${f.neglected.days} days — start there today?`;
  // the week's score only now and then (Monday, Thursday, Sunday), so it stays news
  if (![1, 4, 0].includes(f.weekday)) return null;
  const delta = f.week - f.lastWeek;
  if (f.lastWeek > 0 && delta > 0) return ne ? `📈 पछिल्लो ७ दिनमा ${f.week} टिक — अघिल्लो हप्ताभन्दा ${delta} बढी।` : `📈 ${f.week} ticks in the last 7 days — ${delta} more than the week before.`;
  if (f.lastWeek > 0 && delta < 0) return ne ? `📉 पछिल्लो ७ दिनमा ${f.week} टिक, अघिल्लो हप्ता ${f.lastWeek} — आज फर्काउन सकिन्छ।` : `📉 ${f.week} ticks in the last 7 days, ${f.lastWeek} the week before — today can turn it around.`;
  return null;
}

const hash = (seed: string) => {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
};

/**
 * One item from `list`, taking turns: as `turn` goes up by one (a day, say),
 * every item comes up once before any comes up again. `seed` gives each
 * person their own starting point, so people don't all get the same one.
 */
export function inTurn<T>(list: readonly T[], seed: string, turn: number): T {
  return list[(hash(seed) + turn) % list.length];
}

/** Days since 1970: a counter that goes up by one each day. */
export const dayTurn = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

/** "📖 Read · 💧 Water · +2 more" */
function openList(f: DayFacts, ne: boolean, max = 3): string {
  const shown = f.open.slice(0, max).map((h) => `${h.icon} ${h.name}`);
  const more = f.open.length - shown.length;
  return shown.join(" · ") + (more > 0 ? (ne ? ` · +${more} थप` : ` · +${more} more`) : "");
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The morning notification: today's plan, the streak, then the day's line of motivation. */
export function morningMessage(lang: Lang, name: string, f: DayFacts, quote: string, seed: string, turn: number) {
  const ne = lang === "ne";
  const titles = ne
    ? [`शुभ प्रभात, ${name}! ☀️`, `${name}, नयाँ दिन सुरु भयो 🌅`, f.streakBefore >= 2 ? `तपाईंको स्ट्रिकको दिन ${f.streakBefore + 1}, ${name} 🔥` : `${name}, आजबाट नयाँ स्ट्रिक 🔥`, `${name}, आजको योजना तयार छ 📋`]
    : [
        `Good morning, ${name} ☀️`,
        `Rise and shine, ${name} 🌅`,
        f.streakBefore >= 2 ? `Day ${f.streakBefore + 1} of your streak, ${name} 🔥` : `A fresh start today, ${name} ✨`,
        `${name}, today's plan is ready 📋`,
        f.yesterday > 0 ? `${plural(f.yesterday, "habit")} done yesterday, ${name} — again? 💪` : `${name}, let's make today count ⚡`,
      ];
  const plan = f.total === 0 ? (ne ? "आजको सूचीमा अझै बानी छैन — एउटा थप्नुहोस्।" : "Your list is empty — add one habit to begin.") : ne ? `आज ${f.total} बानी: ${openList(f, ne)}` : `Today, ${f.total}: ${openList(f, ne)}`;
  const streak = f.streakBefore >= 2 ? (ne ? ` · 🔥 ${f.streakBefore} दिनको स्ट्रिक` : ` · 🔥 ${f.streakBefore}-day streak`) : "";
  const note = insight(lang, f);
  return { title: headline(lang, name, f) ?? inTurn(titles, `${seed}:morning`, turn), body: `${plan}${streak}${note ? `\n${note}` : ""}\n${quote}` };
}

/** Through the day, when habits are still open: what is left and how far along the day is. */
export function nudgeMessage(lang: Lang, name: string, f: DayFacts, line: string, seed: string, turn: number) {
  const ne = lang === "ne";
  const first = f.open[0] ? `${f.open[0].icon} ${f.open[0].name}` : "";
  const titles = ne
    ? [`${name}, आजका ${f.left} बानी बाँकी 🎯`, f.done > 0 ? `${f.total} मध्ये ${f.done} पूरा — जारी राख्नुहोस् 💪` : `${name}, आज अझै केही टिक भएको छैन ⏳`, first ? `छिटो जित: ${first} ⚡` : `${name}, एउटा मात्र बाँकी!`]
    : [
        `${name}, ${f.left} to go 🎯`,
        f.done > 0 ? `${f.done} of ${f.total} done — keep going 💪` : `${name}, nothing ticked yet today ⏳`,
        first ? `Quick win: ${first} ⚡` : `${name}, almost there`,
        f.streakBefore >= 2 && f.done === 0 ? `Your ${f.streakBefore}-day streak is waiting 🔥` : `Still open: ${f.open[0]?.name ?? "your habits"}${f.left > 1 ? ` +${f.left - 1}` : ""}`,
      ];
  const left = ne ? `बाँकी: ${openList(f, ne)}` : `Left: ${openList(f, ne)}`;
  const risk = f.streakBefore >= 2 && f.done === 0 ? (ne ? ` · ${f.streakBefore} दिनको स्ट्रिक जोगाउन एउटा टिक पुग्छ` : ` · one tick keeps your ${f.streakBefore}-day streak`) : "";
  // every other day, a habit that has been left behind gets the spotlight
  const behind = f.neglected && turn % 2 === 0 ? (ne ? `${f.neglected.icon} ${f.neglected.name}: ${f.neglected.days} दिनदेखि बाँकी` : `${f.neglected.icon} ${f.neglected.name}: ${f.neglected.days} days since the last tick`) : null;
  return { title: behind ?? inTurn(titles, `${seed}:nudge`, turn), body: `${left}${risk}\n${line}` };
}

/** At the time someone set for one habit: that habit, its own streak, and the day so far. */
export function habitMessage(lang: Lang, name: string, habit: { icon: string; name: string }, habitStreak: number, f: DayFacts, plannedFor: string | null = null) {
  const ne = lang === "ne";
  const streak = habitStreak >= 1 ? (ne ? `अहिले गर्नुभयो भने लगातार दिन ${habitStreak + 1} हुन्छ 🔥` : `Tick it now for day ${habitStreak + 1} in a row 🔥`) : ne ? `आज गरेर नयाँ स्ट्रिक सुरु गर्नुहोस्।` : "Do it now and start a streak today.";
  const day = f.total > 0 ? (ne ? ` आज ${f.total} मध्ये ${f.done} पूरा।` : ` ${f.done} of ${f.total} done today.`) : "";
  // sent late (the scheduler was slow): say when it was planned instead of pretending it is the moment
  if (plannedFor) {
    const [h, m] = plannedFor.split(":").map(Number);
    const at = `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
    return { title: ne ? `${habit.icon} ${habit.name} — अझै बाँकी, ${name}` : `${habit.icon} ${habit.name} — still to do, ${name}`, body: `${ne ? `${at} को लागि राखिएको थियो। अझै समय छ।` : `You planned it for ${at}. There's still time.`} ${streak}${day}` };
  }
  return { title: ne ? `${habit.icon} ${habit.name} — समय भयो, ${name}` : `${habit.icon} ${habit.name} — it's time, ${name}`, body: `${streak}${day}` };
}

/** Evening, Winter Arc members with habits still open: what is left and the points still to be had. */
export function arcEveningMessage(lang: Lang, name: string, f: DayFacts, arc: { day: number; totalDays: number; pointsLeft: number }, seed: string, turn: number) {
  const ne = lang === "ne";
  const daysLeft = arc.totalDays - arc.day;
  const titles = ne
    ? [`Winter Arc · दिन ${arc.day} ❄️`, `${name}, आजका अङ्क अझै बाँकी ❄️`, `Winter Arc मा ${daysLeft} दिन बाँकी ❄️`]
    : [`Winter Arc · Day ${arc.day} of ${arc.totalDays} ❄️`, `${name}, today's points are still open ❄️`, `${plural(daysLeft, "day")} left in the Winter Arc ❄️`];
  const points = arc.pointsLeft > 0 ? (ne ? ` आज अझै +${arc.pointsLeft} अङ्क पाउन सकिन्छ।` : ` Up to +${arc.pointsLeft} points still to win today.`) : "";
  const streak = f.streakBefore >= 2 && f.done === 0 ? (ne ? `\n${f.streakBefore} दिनको स्ट्रिक नटुटाउनुहोस्।` : `\nDon't let your ${f.streakBefore}-day streak end tonight.`) : "";
  const body = ne ? `बाँकी: ${openList(f, ne)}।${points} मध्यरात अघि पूरा गर्नुहोस्।${streak}` : `Still open: ${openList(f, ne)}.${points} Finish before midnight.${streak}`;
  return { title: inTurn(titles, `${seed}:arc`, turn), body };
}
