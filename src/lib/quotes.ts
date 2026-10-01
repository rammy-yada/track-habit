import type { Lang } from "./mail";

// The daily line sent as a morning notification. Original, short, and written
// to be read in two seconds on a lock screen.
const QUOTES: Record<Lang, string[]> = {
  en: [
    "Nobody is coming to do it for you. Good — that means it's yours.",
    "You don't need a good day. You need a done day.",
    "Small today. Unrecognisable by January.",
    "The cold doesn't care how you feel. Go anyway.",
    "Discipline is remembering what you want most.",
    "One tick. Then the next. That's the whole secret.",
    "The version of you in January is built this morning.",
    "Motivation got you started. Routine brings you home.",
    "Tired is a feeling. Done is a fact.",
    "Do it quietly. Let the results be loud.",
    "Miss once and it's a mistake. Don't miss twice.",
    "Winter is when the strong ones are made.",
    "Five minutes of doing beats an hour of planning.",
    "You are one habit away from a different year.",
    "Show up badly rather than not at all.",
    "Earn your evening.",
  ],
  ne: [
    "तपाईंको सट्टा अरू कसैले गरिदिँदैन। ठिकै छ — यो तपाईंकै हो।",
    "राम्रो दिन चाहिँदैन, पूरा गरेको दिन चाहिन्छ।",
    "आज सानो कदम। माघसम्म चिन्नै नसकिने परिवर्तन।",
    "जाडोलाई तपाईंको मुडको मतलब छैन। जसरी पनि जानुहोस्।",
    "अनुशासन भनेको आफूले सबैभन्दा बढी चाहेको कुरा सम्झिनु हो।",
    "एउटा टिक। अनि अर्को। रहस्य यत्ति नै हो।",
    "माघको तपाईं आज बिहानै बन्दै हुनुहुन्छ।",
    "जोसले सुरु गराउँछ, बानीले पुर्‍याउँछ।",
    "थकाइ एउटा अनुभूति हो। पूरा गर्नु एउटा तथ्य हो।",
    "चुपचाप गर्नुहोस्। नतिजालाई बोल्न दिनुहोस्।",
    "एक पटक छुट्नु गल्ती हो। दुई पटक नछुटाउनुहोस्।",
    "बलिया मान्छे जाडोमै बन्छन्।",
    "एक घण्टाको योजनाभन्दा पाँच मिनेटको काम ठूलो।",
    "तपाईं नयाँ वर्षबाट एउटा बानी मात्र टाढा हुनुहुन्छ।",
    "नआउनुभन्दा कमजोर भएरै आउनु राम्रो।",
    "आजको साँझ कमाउनुहोस्।",
  ],
};

/** The same quote for everyone on a given day, a different one each day. */
/** What an admin has written to replace the built-in messages (empty parts fall back to the built-in ones). */
export type CustomMessages = { quotes: string[]; nudges: string[]; comeback: Record<string, { title: string; body: string }> };
export const NO_CUSTOM: CustomMessages = { quotes: [], nudges: [], comeback: {} };

export function quoteFor(lang: Lang, date: string, custom: string[] = []): string {
  const list = custom.length ? custom : QUOTES[lang];
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return list[dayNumber % list.length];
}

// ── Through-the-day motivation ───────────────────────────────────────────────
// Sent at midday / late afternoon to people who still have habits open.
const NUDGES: Record<Lang, string[]> = {
  en: [
    "Half the day is gone. The other half is still yours.",
    "Future you is watching. Give them something to thank you for.",
    "Ten minutes now beats an hour of guilt tonight.",
    "You already decided this morning. Now just follow through.",
    "The list isn't going to tick itself.",
    "One habit. Right now. Then see how you feel.",
    "It never gets easier to start later.",
    "Tonight you'll be glad you did, or wish you had.",
    "Momentum is one small tick away.",
    "Don't break the chain today.",
  ],
  ne: [
    "आधा दिन गइसक्यो। बाँकी आधा अझै तपाईंकै हो।",
    "भोलिको तपाईंले आजको तपाईंलाई धन्यवाद दिने काम गर्नुहोस्।",
    "अहिलेको दश मिनेट, बेलुकाको पछुतोभन्दा धेरै राम्रो।",
    "बिहानै निर्णय गरिसक्नुभयो। अब पूरा मात्र गर्नुहोस्।",
    "सूची आफैँ टिक हुँदैन।",
    "एउटा बानी। अहिले नै। त्यसपछि हेर्नुहोस् कस्तो लाग्छ।",
    "पछि सुरु गर्न कहिल्यै सजिलो हुँदैन।",
    "आजको चेन नटुटाउनुहोस्।",
  ],
};

export function nudgeFor(lang: Lang, seed: string, custom: string[] = []): string {
  const list = custom.length ? custom : NUDGES[lang];
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return list[hash % list.length];
}

// ── Coming back ──────────────────────────────────────────────────────────────
// For people who joined and then stopped. Spaced further and further apart —
// 2, 4, 7, 14 and 30 days — and kind rather than guilt-tripping. After a week
// the daily messages stop as well, so nobody is nagged by an app they left.
export const COMEBACK_DAYS = [2, 4, 7, 14, 30] as const;
/** Days away after which the everyday notifications (quote, nudges) go quiet. */
export const QUIET_AFTER_DAYS = 7;

type Comeback = { title: string; body: string };
const COMEBACK: Record<Lang, Record<number, Comeback>> = {
  en: {
    2: { title: "Your habits miss you", body: "Two days away. One tick today and you're back on track." },
    4: { title: "Still here when you're ready", body: "The smallest version counts. Do just one habit today." },
    7: { title: "A week away", body: "We'll go quiet so we don't nag. Your list is waiting whenever you are." },
    14: { title: "A fresh start is one tap away", body: "No streak needed. Just today." },
    30: { title: "It's been a month", body: "Whenever you want to begin again, your habits are right where you left them." },
  },
  ne: {
    2: { title: "तपाईंका बानीले तपाईंलाई सम्झिरहेका छन्", body: "दुई दिन भयो। आज एउटा टिक लगाउनुहोस्, फेरि बाटोमा आउनुहुन्छ।" },
    4: { title: "तयार हुँदा हामी यहीँ छौँ", body: "सानो प्रयास पनि गनिन्छ। आज एउटा मात्र बानी पूरा गर्नुहोस्।" },
    7: { title: "एक हप्ता भयो", body: "हामी अब धेरै सम्झाउँदैनौँ। तपाईंको सूची जहिले पनि पर्खिरहेको छ।" },
    14: { title: "नयाँ सुरुवात एक ट्यापमै छ", body: "स्ट्रिक चाहिँदैन। आजको दिन मात्र।" },
    30: { title: "एक महिना भयो", body: "फेरि सुरु गर्न मन लागे, तपाईंका बानी जहाँ छोड्नुभएको थियो त्यहीँ छन्।" },
  },
};
// for someone who signed up but never ticked anything
const NEVER_STARTED: Record<Lang, Comeback> = {
  en: { title: "You're all set up", body: "Your first tick takes ten seconds. Start today." },
  ne: { title: "सबै तयार छ", body: "पहिलो टिक लगाउन दश सेकेन्ड लाग्छ। आजै सुरु गर्नुहोस्।" },
};

export function comebackFor(lang: Lang, daysAway: number, everStarted: boolean, custom: CustomMessages["comeback"] = {}): Comeback {
  const own = custom[String(daysAway)];
  if (own?.title && own.body) return own;
  return !everStarted && daysAway <= 4 ? NEVER_STARTED[lang] : COMEBACK[lang][daysAway];
}

/** The built-in English messages, offered in the admin screen as a starting point. */
export const BUILT_IN = { quotes: QUOTES.en, nudges: NUDGES.en, comeback: COMEBACK.en };
