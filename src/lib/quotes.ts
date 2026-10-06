import type { Lang } from "./mail";

// The daily line sent as a morning notification. Original, short, and written
// to be read in two seconds on a lock screen.
const QUOTES: Record<Lang, string[]> = {
  en: [
    "A year from now you'll wish you had started today. So start. One habit, right now, before the day talks you out of it. 🌅",
    "You are not behind. You are exactly one decision away from being someone who shows up. Make it this morning. 💪",
    "Champions aren't made on the big days. They're made on ordinary mornings like this one, when nobody is watching. 🏆",
    "The person you want to become is built from what you do in the next ten minutes. Go and lay one brick. 🧱",
    "Comfort will always be there tomorrow. This morning won't. Spend it on the version of you that you'd be proud of. 🔥",
    "Every tick is a vote for who you are becoming. Cast the first one before breakfast. ✅",
    "Hard now, easy later. Easy now, hard later. You already know which one you want — open your list. ⚡",
    "You've survived every bad day so far and you kept your word on many of them. Today is one more you can win. 🌟",
    "Nobody ever regretted the workout, the page, the early start. They only regret the day they skipped. Don't skip. 🚀",
    "Winter doesn't build weak people. It builds the ones who keep going when it's cold, dark and quiet. That's you. ❄️",
    "Your future self is standing at the finish line, asking only one thing of you today: don't quit. 🎯",
    "Motivation is a spark. Discipline is the fire. You don't need to feel like it — you only need to begin. 🔥",
    "Small steps look like nothing for weeks, and then one day they look like a different life. Take today's step. 🌱",
    "You promised yourself this. Not anyone else — yourself. Keep that promise and watch what it does to your confidence. 🤝",
    "The streak you're building is proof. Proof that you can be trusted by the one person who matters most: you. ⛓️",
    "Do it tired. Do it unsure. Do it badly if you must. Just don't let today be the day you didn't. 👊",
  ],
  ne: [
    "तपाईंको सट्टा अरू कसैले गरिदिँदैन। राम्रो कुरा: यो सबै तपाईंकै हो। सूची खोलेर पहिलो काम सुरु गर्नुहोस्। 💪",
    "राम्रो दिन चाहिँदैन, पूरा गरेको दिन चाहिन्छ। अरू केही गर्नुअघि एउटा बानी टिक लगाउनुहोस्। ✅",
    "आज सानो कदम, माघसम्म चिन्नै नसकिने परिवर्तन। आजको बिहानले भोलिको तपाईं बनाउँछ। ❄️",
    "जाडोलाई तपाईंको मुडको मतलब छैन। जसरी पनि सुरु गर्नुहोस् — सुरु गर्नेबित्तिकै राम्रो लाग्छ। 🧊",
    "अनुशासन भनेको आफूले सबैभन्दा बढी चाहेको कुरा सम्झिनु हो। लेख्नुको कारण थियो। अब पूरा गर्नुहोस्। 🎯",
    "एउटा टिक, अनि अर्को। रहस्य यत्ति नै हो। सबैभन्दा सजिलोबाट अहिले नै सुरु गर्नुहोस्। ⚡",
    "थकाइ एउटा अनुभूति हो, पूरा गर्नु एउटा तथ्य। बेलुका गर्व लाग्ने कुरा रोज्नुहोस्। 🌙",
    "एक पटक छुट्यो भने गल्ती, दुई पटक छुट्यो भने बानी। आज नछुटाउने दिन हो। 🔥",
    "पाँच मिनेटको काम एक घण्टाको योजनाभन्दा राम्रो। एउटा बानी रोजेर पाँच मिनेट दिनुहोस्। ⏱️",
    "नराम्ररी भए पनि उपस्थित हुनुहोस्। सानो टिक पनि गनिन्छ, र स्ट्रिक जोगिन्छ। 👊",
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
    "The day is slipping by, but it isn't gone. Ten focused minutes now and tonight you'll feel like a winner. ⏳",
    "This is the moment that separates people who wish from people who do. Open your list and take one. 🎯",
    "You've come too far to hand today back. One habit — just one — and the momentum is yours again. 🔥",
    "Tonight, when your head hits the pillow, you'll either be proud or making excuses. You still get to choose. 🌙",
    "Your streak is alive and it's counting on you. Give it the next few minutes; it has given you so much already. ⛓️",
    "Don't wait to feel ready. Ready is a feeling that shows up after you start. Start. 🚀",
    "Someone on the leaderboard is ticking theirs right now. Don't let them have the day for free. 📈",
    "The hardest part is the first thirty seconds. After that it's just doing. Go and get the first thirty seconds. ⚡",
    "You don't have to finish everything. You have to start one thing. The rest tends to follow. 💪",
    "Remember why you began. That reason hasn't changed — only the time left today has. Use it. ❤️",
  ],
  ne: [
    "आधा दिन गइसक्यो, बाँकी आधा अझै तपाईंकै हो। सूची खोलेर एउटा अहिले नै पूरा गर्नुहोस्। ⏳",
    "भोलिको तपाईंले आजको तपाईंलाई धन्यवाद दिने काम गर्नुहोस्। 🙌",
    "अहिलेको दश मिनेट, बेलुकाको पछुतोभन्दा धेरै राम्रो। सबैभन्दा सानो बानीबाट सुरु गर्नुहोस्। ⚡",
    "बिहानै निर्णय गरिसक्नुभयो। अब पूरा मात्र गर्नुहोस्। एउटा टिक, सुरु! ✅",
    "सूची आफैँ टिक हुँदैन। तर काम सकिएपछि एक ट्याप मात्र लाग्छ। 📋",
    "एउटा बानी, अहिले नै। त्यसपछि हेर्नुहोस् कस्तो लाग्छ। 💪",
    "पछि सुरु गर्न कहिल्यै सजिलो हुँदैन। आजको सबैभन्दा राम्रो समय यही हो। 🚀",
    "आजको चेन नटुटाउनुहोस्। तपाईंको स्ट्रिक यिनै केही मिनेटमा भर पर्छ। ⛓️",
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
    2: { title: "Your habits miss you 👋", body: "It's been two days. Nothing is lost — one tick today and you're right back on track." },
    4: { title: "Still here when you're ready 🌱", body: "No pressure and no catching up. Do just one habit today, the smallest version counts." },
    7: { title: "A week away 🕊️", body: "We'll go quiet now so we don't nag. Your list is waiting, exactly as you left it, whenever you want it." },
    14: { title: "A fresh start is one tap away ✨", body: "You don't need the old streak. You only need today. Open the app and tick one thing." },
    30: { title: "It's been a month 🌙", body: "Whenever you feel like beginning again, your habits are right where you left them. We'd love to see you back." },
  },
  ne: {
    2: { title: "तपाईंका बानीले सम्झिरहेका छन् 👋", body: "दुई दिन भयो। केही बिग्रिएको छैन — आज एउटा टिक लगाउनुहोस्, फेरि बाटोमा आउनुहुन्छ।" },
    4: { title: "तयार हुँदा हामी यहीँ छौँ 🌱", body: "कुनै दबाब छैन। आज एउटा मात्र बानी पूरा गर्नुहोस्, सानो प्रयास पनि गनिन्छ।" },
    7: { title: "एक हप्ता भयो 🕊️", body: "हामी अब धेरै सम्झाउँदैनौँ। तपाईंको सूची जस्ताको तस्तै पर्खिरहेको छ, जहिले मन लाग्छ आउनुहोस्।" },
    14: { title: "नयाँ सुरुवात एक ट्यापमै छ ✨", body: "पुरानो स्ट्रिक चाहिँदैन। आजको दिन मात्र चाहिन्छ। एप खोलेर एउटा कुरा टिक गर्नुहोस्।" },
    30: { title: "एक महिना भयो 🌙", body: "फेरि सुरु गर्न मन लागे, तपाईंका बानी जहाँ छोड्नुभएको थियो त्यहीँ छन्।" },
  },
};
// for someone who signed up but never ticked anything
const NEVER_STARTED: Record<Lang, Comeback> = {
  en: { title: "You're all set up 🎉", body: "Everything is ready and waiting. Your first tick takes ten seconds — start today and see how it feels." },
  ne: { title: "सबै तयार छ 🎉", body: "पहिलो टिक लगाउन दश सेकेन्ड लाग्छ। आजै सुरु गरेर हेर्नुहोस्।" },
};

export function comebackFor(lang: Lang, daysAway: number, everStarted: boolean, custom: CustomMessages["comeback"] = {}): Comeback {
  const own = custom[String(daysAway)];
  if (own?.title && own.body) return own;
  return !everStarted && daysAway <= 4 ? NEVER_STARTED[lang] : COMEBACK[lang][daysAway];
}

/** The built-in English messages, offered in the admin screen as a starting point. */
export const BUILT_IN = { quotes: QUOTES.en, nudges: NUDGES.en, comeback: COMEBACK.en };

// ── Daily care reminders ─────────────────────────────────────────────────────
// Small, friendly reminders through the day that aren't about any one habit:
// waking up, drinking water, one good thing to do, going to sleep. Each has a
// part of the day it falls in (minutes from midnight); the exact minute is
// different for every person and every day.
type Care = { key: string; /** the picture shown beside the message */ icon: string; from: number; to: number; title: Record<Lang, string>; lines: Record<Lang, string[]> };
export const CARE: Care[] = [
  {
    key: "wake", icon: "/icons/n-sun.png", from: 6 * 60, to: 7 * 60 + 30,
    title: { en: "Good morning ☀️", ne: "शुभ प्रभात ☀️" },
    lines: {
      en: ["Up you get! The day is yours before anyone else wants a piece of it. A glass of water, then your first habit. 🌅", "Feet on the floor — that's the hardest part done. Everything after this is easier. 🚀", "A brand new day and a clean list. Open it up and see what today's you can do. ✨", "Rise first, then decide how you feel. It's always better once you're moving. 💪"],
      ne: ["उठ्ने बेला भयो। आजको दिन तपाईंकै हो।", "खुट्टा भुइँमा राख्नुहोस्। सबैभन्दा गाह्रो काम सकियो।", "नयाँ दिन, नयाँ सुरुवात।"],
    },
  },
  {
    key: "water1", icon: "/icons/n-water.png", from: 10 * 60, to: 12 * 60,
    title: { en: "Water break 💧", ne: "पानी पिउने बेला 💧" },
    lines: {
      en: ["A glass of water, right now. Your head, your skin and your energy will all thank you. 🥤", "Pause for a moment and drink some water before you start the next thing. It takes ten seconds. 🚰", "Feeling thirsty already means you waited too long. Have a full glass now and keep the bottle close. 💦"],
      ne: ["अहिले नै एक गिलास पानी पिउनुहोस्।", "अर्को काम सुरु गर्नुअघि पानी पिउनुहोस्।"],
    },
  },
  {
    key: "good", icon: "/icons/n-heart.png", from: 12 * 60 + 30, to: 14 * 60 + 30,
    title: { en: "One good thing today ✨", ne: "आज एउटा राम्रो काम ✨" },
    lines: {
      en: ["Message someone you haven't spoken to in a while. Two lines is enough to make their day. 💬", "Say thank you to one person today, and really mean it. It costs nothing and people remember it. 🙏", "Tidy one small corner — just one. A clear space makes for a clearer head. 🧹", "Step outside for five minutes and look at the sky. No phone, just air and daylight. 🌤️", "Help someone today without being asked. Small things count: a door, a bag, a kind word. 🤝", "Give one honest compliment today. Tell someone exactly what they did well. 🌟", "Put your phone down for one whole meal today. Taste the food and talk to whoever is there. 🍽️", "Write down one thing that went well today. One line is enough, and it adds up over a winter. 📝", "Call home today. Five minutes will mean more to them than you think. 📞", "Stretch for two minutes, right where you are. Neck, shoulders, back — you'll feel the difference. 🧘"],
      ne: ["धेरै भएको कुरा नगरेको कसैलाई सन्देश पठाउनुहोस्।", "आज कसैलाई मनैदेखि धन्यवाद भन्नुहोस्।", "पाँच मिनेट बाहिर निस्केर आकाश हेर्नुहोस्।", "नभनीकनै कसैलाई सहयोग गर्नुहोस्।", "घरमा फोन गर्नुहोस्।", "आज राम्रो भएको एउटा कुरा लेख्नुहोस्।"],
    },
  },
  {
    key: "water2", icon: "/icons/n-water.png", from: 14 * 60 + 30, to: 16 * 60 + 30,
    title: { en: "Water again 💧", ne: "फेरि पानी 💧" },
    lines: {
      en: ["Afternoon slump? Drink water first, then decide how tired you really are. It works more often than coffee. ⚡", "Time for another glass. Most people are behind on water by now — catch up while it's easy. 🥤", "Refill the bottle now. Future you is going to be thirsty and grateful. 🚰"],
      ne: ["दिउँसो अल्छी लाग्यो? पहिले पानी पिउनुहोस्।", "अर्को गिलास पानी पिउनुहोस्।"],
    },
  },
  {
    key: "sleep", icon: "/icons/n-moon.png", from: 21 * 60 + 30, to: 22 * 60 + 15,
    title: { en: "Time to wind down 🌙", ne: "सुत्ने बेला भयो 🌙" },
    lines: {
      en: ["Tomorrow is built tonight. Put the phone down, dim the lights and give yourself a proper night's sleep. 😴", "Screens off, lights low. You've done enough for today — rest is part of the work. 🛌", "The best thing you can do for tomorrow's habits is to sleep now. Morning-you is counting on it. 🌙", "Time for bed. Tomorrow starts tonight, and you'll thank yourself at 6 AM. ⭐"],
      ne: ["भोलिको दिन आजको निद्राले बनाउँछ। फोन राखेर सुत्नुहोस्।", "आजलाई पुग्यो। अब आराम गर्नुहोस्।", "भोलिका बानीका लागि सबैभन्दा राम्रो काम: अहिले सुत्नु।"],
    },
  },
];
/** How long after its time a care reminder is still worth sending (minutes). */
export const CARE_CATCH_UP = 150;
