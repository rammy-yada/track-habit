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
export const QUOTE_IDEAS = ["Winter is where I'm built.", "Nobody is watching. I'm doing it anyway.", "Small steps. Every day. All winter.", "I don't need a good day. I need a done day.", "Quiet work now. Loud results later.", "यो जाडो मेरो हो।"];
