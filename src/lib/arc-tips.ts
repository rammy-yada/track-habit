// The Tips tab of the Winter Arc. Written for this app; short enough to read
// on a phone between two other things.

export type Tip = { title: string; body: string };

export const TIP_GROUPS: { id: string; label: string; icon: string; tips: Tip[] }[] = [
  {
    id: "mindset",
    label: "Mindset",
    icon: "🧠",
    tips: [
      { title: "Decide once", body: "Don't ask yourself every morning whether you feel like it. You already decided on day one. Mornings are for doing." },
      { title: "Never miss twice", body: "One missed day is an accident. Two in a row is the start of a new habit — the wrong one. After a miss, the only job is to show up tomorrow." },
      { title: "Lower the bar on bad days", body: "Ten minutes instead of forty-five still counts. A small tick keeps the chain; a skipped day breaks it." },
      { title: "Compete with last week", body: "The leaderboard is fun, but the only score that matters is whether this week beat the last one." },
    ],
  },
  {
    id: "routine",
    label: "Routine",
    icon: "⏰",
    tips: [
      { title: "Attach it to something you already do", body: "After I brush my teeth, I do push-ups. After dinner, I read. A habit tied to an existing one doesn't need remembering." },
      { title: "Do the hardest one first", body: "Willpower runs down through the day. Put the habit you avoid most before breakfast." },
      { title: "Prepare the night before", body: "Shoes by the door, book on the pillow, bottle filled. Make starting take ten seconds." },
      { title: "Tick it when you do it", body: "Only ticks made on the day earn points. Ticking straight away also gives you the small reward that makes tomorrow easier." },
    ],
  },
  {
    id: "body",
    label: "Body",
    icon: "💪",
    tips: [
      { title: "Sleep is part of the arc", body: "Every other habit gets harder on five hours of sleep. A fixed bedtime is the cheapest upgrade there is." },
      { title: "Cold mornings: move first", body: "Two minutes of jumping jacks before you decide anything. Warm muscles argue less." },
      { title: "Water before anything else", body: "A full glass as soon as you wake up. It's the easiest tick of the day — start with a win." },
      { title: "Rest days are training", body: "Seven hard days a week ends in injury or quitting. Plan one light day; keep the habit, drop the intensity." },
    ],
  },
  {
    id: "slip",
    label: "When you slip",
    icon: "🧊",
    tips: [
      { title: "Look for the reason, not the blame", body: "Wrong time of day? Too big? Depended on something that wasn't there? Fix that one thing and carry on." },
      { title: "Shrink it, don't drop it", body: "If a habit keeps getting skipped, halve it. A habit you actually do beats an impressive one you don't." },
      { title: "Tell someone", body: "Share your day count. Being seen makes it harder to disappear quietly." },
      { title: "The streak was never the point", body: "A counter going back to zero doesn't undo a single workout or page. You're continuing, with a gap in the middle." },
    ],
  },
];

const ALL = TIP_GROUPS.flatMap((group) => group.tips.map((tip) => ({ ...tip, group: group.label, icon: group.icon })));

/** One tip a day, in turn. */
export const tipOfTheDay = (dayNumber: number) => ALL[((dayNumber % ALL.length) + ALL.length) % ALL.length];

/** Lines offered as a starting point on the Quote tab. */
export const QUOTE_IDEAS = [
  "Winter is where I'm built.",
  "Nobody is watching. I'm doing it anyway.",
  "Small steps. Every day. All winter.",
  "I don't need a good day. I need a done day.",
  "Quiet work now. Loud results later.",
  "Cold mornings. Warm results.",
  "Discipline is my favourite kind of freedom.",
  "I promised myself. I'm keeping it.",
  "Not motivated. Committed.",
  "One more day than yesterday.",
  "The comeback starts in winter.",
  "यो जाडो मेरो हो।",
  "सानो कदम, ठूलो परिवर्तन।",
];

// ── Tips picked for the person ───────────────────────────────────────────────
// What their last days look like decides which tips come first on the Tips
// tab (see lib/arc-tip-context.ts for how it is worked out).

export type Situation = "new" | "missed" | "neglect" | "struggling" | "streak" | "strong" | "evening";

/** Why a tip is shown first, in the person's terms. */
export const SITUATION_LABEL: Record<Situation, string> = {
  new: "Because you're just starting",
  missed: "Because yesterday slipped",
  neglect: "Because one habit is being skipped",
  struggling: "Because this week has been hard",
  streak: "Because your streak is growing",
  strong: "Because you're on a roll",
  evening: "Because the day is nearly over",
};

export const TIPS_FOR: Record<Situation, Tip[]> = {
  new: [
    { title: "Make the first week easy", body: "The goal this week isn't to be impressive. It's to show up every day. Do the smallest version of each habit and tick it." },
    { title: "Give each habit a time", body: "\"Sometime today\" never comes. Set a reminder time on each habit so your phone asks at the right moment." },
    { title: "Hook it to your morning", body: "Put your first habit right after something you already do every day — brushing your teeth, your first tea, getting dressed." },
  ],
  missed: [
    { title: "Never miss twice", body: "Yesterday is gone and that's fine. The only rule now: don't let it become two. Do the smallest version of one habit today." },
    { title: "Find the reason, fix that one thing", body: "Too tired? Wrong time of day? No time? Move the habit, shrink it, or prepare it the night before. Don't just try harder." },
    { title: "Restart with the easiest one", body: "Open your list and tick the habit that takes the least effort first. Momentum is the fastest way back." },
  ],
  neglect: [
    { title: "Shrink the one you keep skipping", body: "A habit you skip again and again is too big for now. Halve it this week — five minutes instead of twenty. Done beats perfect." },
    { title: "Move it to a better moment", body: "If a habit keeps losing to the end of the day, do it first thing tomorrow, before anything else can get in the way." },
  ],
  struggling: [
    { title: "Lower the bar, keep the chain", body: "On hard weeks, the smallest version counts. One page. One push-up. One glass. A tiny tick keeps you in the game." },
    { title: "Do the hardest one first", body: "Willpower is strongest in the morning. Put the habit you avoid most before breakfast and the rest of the day gets easier." },
    { title: "Fewer, done well", body: "If the list feels heavy, it's fine to focus on two habits this week. Finishing a few builds more than half-doing many." },
  ],
  streak: [
    { title: "Plan for your worst day", body: "Your streak will meet a bad day — sick, busy, travelling. Decide now what the two-minute version of each habit is." },
    { title: "Protect the morning", body: "Most streaks end in the evening, when energy is gone. Ticking even one habit early keeps the day safe." },
  ],
  strong: [
    { title: "Raise the bar, a little", body: "You're finishing almost everything. Add a little — five more minutes, one more page — but only to one habit at a time." },
    { title: "Bring someone along", body: "Share your day count or your quote picture. People doing it together last longer, and you might be someone's reason to start." },
  ],
  evening: [
    { title: "The night version counts", body: "Out of time? Do the five-minute version now: a short walk, two pages, a quick stretch. A small tick before midnight still counts." },
  ],
};
