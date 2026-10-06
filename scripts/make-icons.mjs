// Draws the extra app icons (run once; the PNGs it writes are committed):
//
//   node scripts/make-icons.mjs
//
//   arc-*.png      the Winter Arc app icon: a white snowflake on black
//   away-192.png   the icon on "come back" notifications (unless an admin uploads one)
//   badge-96.png   the small one-colour mark Android shows in the status bar
//                  next to a notification (it must be white on transparent)

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// one arm of the snowflake, pointing up from the centre; drawn six times
const arm = `<path d="M0 0V-150M0-96l-34-34M0-96l34-34M0-52l-24-24M0-52l24-24" />`;
const snowflake = (scale) => `<g transform="translate(256 256) scale(${scale})" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
  ${[0, 60, 120, 180, 240, 300].map((deg) => `<g transform="rotate(${deg})">${arm}</g>`).join("")}
  <circle r="14" fill="#fff" stroke="none" />
</g>`;
const arc = (scale, radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#3a3a3a"/><stop offset="1" stop-color="#050505"/></radialGradient></defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#g)"/>
  ${snowflake(scale)}
</svg>`;
// the HabitFlow pulse line, white on transparent
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 12h4l3-9 6 18 3-9h4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(out, file));

await png(arc(1.15, 112), 192, "arc-192.png");
await png(arc(1.15, 112), 512, "arc-512.png");
await png(arc(0.82, 0), 512, "arc-maskable-512.png"); // full-bleed, with the drawing inside the safe middle
await png(arc(1.05, 0), 180, "arc-apple.png"); // iOS rounds the corners itself
await png(badge, 96, "badge-96.png");
// shown on "come back" notifications: the pulse line gone flat, waiting to start again
const away = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#1f2937"/><path d="M96 256h110l34-70 44 140 34-70h98" fill="none" stroke="#6b7280" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><text x="356" y="170" font-family="sans-serif" font-size="92" font-weight="700" fill="#9ca3af">z</text><text x="408" y="118" font-family="sans-serif" font-size="62" font-weight="700" fill="#6b7280">z</text></svg>`;
await png(away, 192, "away-192.png");
// ── Notification pictures ────────────────────────────────────────────────────
// A notification shows two pictures: the small app mark in the status bar
// (badge-96.png) and a large one beside the message. The large one says what
// the notification is about at a glance — a sun for the morning, a drop for
// water, a moon for sleep — instead of repeating the logo.
const W = `fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"`;
const NOTIFY = {
  sun: ["#f59e0b", "#ea580c", `<circle cx="256" cy="256" r="74" fill="#fff"/><g ${W} stroke-width="26">${[0, 45, 90, 135, 180, 225, 270, 315].map((d) => `<path transform="rotate(${d} 256 256)" d="M256 116V84"/>`).join("")}</g>`],
  water: ["#38bdf8", "#2563eb", `<path d="M256 96C206 178 156 244 156 314a100 100 0 0 0 200 0c0-70-50-136-100-218z" fill="#fff"/><path d="M214 322a46 46 0 0 0 42 44" fill="none" stroke="#38bdf8" stroke-width="18" stroke-linecap="round"/>`],
  moon: ["#6366f1", "#1e1b4b", `<path d="M330 118a150 150 0 1 0 66 254 124 124 0 0 1-66-254z" fill="#fff"/><circle cx="356" cy="170" r="10" fill="#fff"/><circle cx="398" cy="232" r="7" fill="#fff"/>`],
  heart: ["#fb7185", "#e11d48", `<path d="M256 392s-136-82-136-180a74 74 0 0 1 136-40 74 74 0 0 1 136 40c0 98-136 180-136 180z" fill="#fff"/>`],
  target: ["#34d399", "#059669", `<g ${W} stroke-width="26"><circle cx="256" cy="256" r="138"/><circle cx="256" cy="256" r="78"/></g><circle cx="256" cy="256" r="26" fill="#fff"/>`],
  clock: ["#a78bfa", "#7c3aed", `<g ${W} stroke-width="26"><circle cx="256" cy="256" r="140"/><path d="M256 170v90l58 40"/></g>`],
  flame: ["#fb923c", "#dc2626", `<path d="M262 92c14 62 76 92 76 172a82 82 0 0 1-164 0c0-30 14-52 32-70 6 26 18 40 36 50-8-52-4-106 20-152z" fill="#fff"/>`],
  up: ["#4ade80", "#16a34a", `<g ${W} stroke-width="34"><path d="M256 380V140M150 246l106-106 106 106"/></g>`],
  down: ["#fbbf24", "#d97706", `<g ${W} stroke-width="34"><path d="M256 132v240M150 266l106 106 106-106"/></g>`],
  crown: ["#facc15", "#ca8a04", `<path d="M120 352l-22-176 86 70 72-118 72 118 86-70-22 176z" fill="#fff"/><rect x="120" y="372" width="272" height="30" rx="12" fill="#fff"/>`],
  gift: ["#f472b6", "#be185d", `<rect x="130" y="232" width="252" height="164" rx="16" fill="#fff"/><rect x="112" y="184" width="288" height="62" rx="16" fill="#fff"/><path d="M256 184v212" stroke="#f472b6" stroke-width="26"/><path d="M256 184c-70-10-92-84-44-84 30 0 44 44 44 84zm0 0c70-10 92-84 44-84-30 0-44 44-44 84z" fill="none" stroke="#fff" stroke-width="22" stroke-linejoin="round"/>`],
};
for (const [name, [from, to, glyph]] of Object.entries(NOTIFY)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="512" height="512" rx="120" fill="url(#g)"/>${glyph}</svg>`;
  await png(svg, 192, `n-${name}.png`);
}
console.log("Icons written to public/icons");
