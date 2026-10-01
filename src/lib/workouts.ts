// The workout catalogue. It lives in code (not the database) so the server
// decides what a "recommended workout" is — the browser only ever sends an id.

export type WorkoutLevel = "Beginner" | "Intermediate" | "Advanced";

export type Workout = {
  id: string;
  category: string;
  name: string;
  icon: string;
  color: string;
  minutes: number;
  level: WorkoutLevel;
  /** What one session looks like. */
  steps: string[];
};

export const WORKOUT_CATEGORIES = [
  { id: "essentials", label: "Arc essentials", icon: "❄️", blurb: "The daily non-negotiables most Winter Arc plans are built on." },
  { id: "strength", label: "Strength", icon: "🏋️", blurb: "Build muscle with a few compound moves done consistently." },
  { id: "cardio", label: "Cardio", icon: "🏃", blurb: "Heart and lungs. Pick one you'd still do on a cold morning." },
  { id: "core", label: "Core", icon: "🧱", blurb: "Short sessions that make every other lift and run feel steadier." },
  { id: "mobility", label: "Mobility", icon: "🧘", blurb: "Loosen up, recover faster, and undo a day of sitting." },
  { id: "home", label: "No equipment", icon: "🏠", blurb: "Everything here fits in a bedroom with zero gear." },
] as const;

export const WORKOUTS: Workout[] = [
  // ── Arc essentials ──
  { id: "steps-10k", category: "essentials", name: "Walk 10,000 steps", icon: "👟", color: "#14b8a6", minutes: 60, level: "Beginner", steps: ["Split it up: a walk after each meal covers most of it", "Take calls and voice notes on foot", "Check the count before dinner and top up if short"] },
  { id: "wake-early", category: "essentials", name: "Up by 6:00 AM", icon: "⏰", color: "#f59e0b", minutes: 5, level: "Intermediate", steps: ["Alarm across the room, not beside the bed", "Feet on the floor before you touch your phone", "Daylight or a bright lamp within ten minutes"] },
  { id: "water-3l", category: "essentials", name: "Drink 3L water", icon: "💧", color: "#3b82f6", minutes: 5, level: "Beginner", steps: ["Fill a 1-litre bottle in the morning", "Finish one by lunch, one by evening, one by bed", "A glass first thing counts toward the first litre"] },
  { id: "cold-shower", category: "essentials", name: "Cold shower finish", icon: "🚿", color: "#6366f1", minutes: 3, level: "Intermediate", steps: ["Shower as usual", "Turn it cold for the last 30 seconds", "Add 15 seconds each week, up to 2 minutes"] },
  { id: "sleep-11", category: "essentials", name: "In bed by 11 PM", icon: "😴", color: "#8b5cf6", minutes: 5, level: "Beginner", steps: ["Screens off 30 minutes before", "Set out tomorrow's workout clothes", "Lights out by 11 — the early alarm depends on it"] },

  // ── Strength ──
  { id: "pushup-ladder", category: "strength", name: "Push-up ladder", icon: "💪", color: "#ef4444", minutes: 12, level: "Beginner", steps: ["1 push-up, rest 10s, 2 push-ups, rest 10s… climb to 8", "Then come back down: 7, 6, 5… to 1", "Knees down is fine — keep a straight line from head to knees"] },
  { id: "dumbbell-full", category: "strength", name: "Full-body dumbbells", icon: "🏋️", color: "#f97316", minutes: 35, level: "Intermediate", steps: ["Goblet squat 3 × 10", "Dumbbell row 3 × 10 each side", "Overhead press 3 × 8", "Romanian deadlift 3 × 10"] },
  { id: "leg-day", category: "strength", name: "Leg day basics", icon: "🦵", color: "#ec4899", minutes: 30, level: "Beginner", steps: ["Bodyweight squat 3 × 15", "Reverse lunge 3 × 10 each leg", "Glute bridge 3 × 15", "Calf raise 3 × 20"] },
  { id: "pull-day", category: "strength", name: "Pull day", icon: "🧗", color: "#84cc16", minutes: 30, level: "Advanced", steps: ["Pull-ups 4 × as many as clean", "Inverted or dumbbell row 3 × 10", "Dead hang 3 × 30s", "Biceps curl 3 × 12"] },

  // ── Cardio ──
  { id: "brisk-walk", category: "cardio", name: "Brisk 30-minute walk", icon: "🚶", color: "#10b981", minutes: 30, level: "Beginner", steps: ["Fast enough that talking takes a little effort", "Outside if you can — daylight helps the early wake-up", "No stops for the first 20 minutes"] },
  { id: "run-intervals", category: "cardio", name: "Run / walk intervals", icon: "🏃", color: "#3b82f6", minutes: 25, level: "Intermediate", steps: ["5-minute easy jog to warm up", "8 rounds: 1 minute hard, 1 minute walk", "5-minute walk to cool down"] },
  { id: "jump-rope", category: "cardio", name: "Skipping rope", icon: "🪢", color: "#f59e0b", minutes: 15, level: "Intermediate", steps: ["10 rounds: 45 seconds skipping, 45 seconds rest", "Small jumps, wrists do the turning", "No rope? Do the same jumps without one"] },
  { id: "stairs", category: "cardio", name: "Stair climb", icon: "🪜", color: "#14b8a6", minutes: 15, level: "Beginner", steps: ["Walk up at a steady pace, walk down to recover", "Repeat for 15 minutes", "Hold the rail on the way down"] },

  // ── Core ──
  { id: "plank-circuit", category: "core", name: "Plank circuit", icon: "🧱", color: "#6366f1", minutes: 8, level: "Beginner", steps: ["Front plank 30s", "Side plank 20s each side", "Rest 30s — repeat 3 rounds"] },
  { id: "dead-bug", category: "core", name: "Dead bugs & bird dogs", icon: "🐞", color: "#10b981", minutes: 10, level: "Beginner", steps: ["Dead bug 3 × 8 each side, lower back pressed to the floor", "Bird dog 3 × 8 each side, slow", "Move slowly — control is the whole point"] },
  { id: "hollow-hold", category: "core", name: "Hollow hold", icon: "🥣", color: "#ef4444", minutes: 8, level: "Advanced", steps: ["Hollow hold 5 × 20s, 20s rest", "Hollow rocks 3 × 10", "Bend the knees to make it easier"] },

  // ── Mobility ──
  { id: "morning-stretch", category: "mobility", name: "10-minute morning stretch", icon: "🌅", color: "#f59e0b", minutes: 10, level: "Beginner", steps: ["Cat-cow × 10", "World's greatest stretch × 5 each side", "Forward fold 60s", "Chest opener against a wall 30s each side"] },
  { id: "hip-flow", category: "mobility", name: "Hip opener flow", icon: "🧘", color: "#8b5cf6", minutes: 12, level: "Beginner", steps: ["90/90 hip switches × 10", "Couch stretch 60s each side", "Deep squat hold 3 × 30s"] },
  { id: "sun-salutation", category: "mobility", name: "Sun salutations", icon: "☀️", color: "#f97316", minutes: 10, level: "Intermediate", steps: ["5 slow rounds of Sun Salutation A", "One breath per movement", "Finish with 1 minute in child's pose"] },

  // ── No equipment ──
  { id: "seven-minute", category: "home", name: "7-minute circuit", icon: "⏱️", color: "#ec4899", minutes: 7, level: "Beginner", steps: ["30s each, 10s rest: jumping jacks, wall sit, push-ups, crunches", "Then: step-ups, squats, triceps dips, plank", "Then: high knees, lunges, push-up rotations, side plank"] },
  { id: "squats-100", category: "home", name: "100 squats", icon: "🔥", color: "#ef4444", minutes: 10, level: "Intermediate", steps: ["10 sets of 10 through the day, or 4 × 25 in one go", "Hips back, knees track over toes", "Add a 3-second pause at the bottom when it gets easy"] },
  { id: "burpees", category: "home", name: "Burpee countdown", icon: "🤸", color: "#84cc16", minutes: 10, level: "Advanced", steps: ["10 burpees, rest 30s, 9 burpees, rest 30s… down to 1", "Step back instead of jumping to go easier", "55 in total — time it and beat it next week"] },
];

export const workoutById = (id: string) => WORKOUTS.find((w) => w.id === id);
