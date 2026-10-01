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
export function quoteFor(lang: Lang, date: string): string {
  const list = QUOTES[lang];
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return list[dayNumber % list.length];
}
