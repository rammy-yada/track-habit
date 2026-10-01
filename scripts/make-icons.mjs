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
console.log("Icons written to public/icons");
