# HabitFlow

A habit tracker: add daily/weekly/monthly habits, tick them off, and watch
streaks and analytics build. It installs on a phone as an app (PWA) and walks
new users through a short welcome guide. Created by **rammy24d**.

This is the **Next.js** version. The original plain-PHP version is preserved
unchanged in [`legacy-php/`](legacy-php/) and both run against the **same
MySQL database** — existing accounts, passwords and history carry over.

| Layer     | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Database  | MySQL / MariaDB via `mysql2` prepared statements (XAMPP's MySQL works as is) |
| Auth      | Encrypted cookie session (`iron-session`), bcrypt password hashing |
| Styling   | Tailwind CSS 4 with light/dark theme tokens |
| Animation | Motion (`motion/react`), canvas, CSS keyframes, View Transitions API |
| PWA       | Web app manifest, home-screen icons, a minimal service worker (offline page) |

---

## Run it

Needs Node.js 20.9+ and a running MySQL (start it from the XAMPP control panel).

```bash
npm install
npm run db:setup    # creates the database/tables if missing; never overwrites data
npm run dev         # http://localhost:3000
```

Settings live in `.env.local` (database credentials and the session secret).
`.env.example` documents every variable.

`npm run db:setup` is safe on an existing database. If there is no admin
account yet it creates one (`admin`) and prints a generated password — or set
your own with `ADMIN_PASSWORD='...' npm run db:setup`.

For a production build: `npm run build && npm start`.

**On your phone:** with the phone on the same Wi-Fi, open the "Network"
address `npm run dev` prints (e.g. `http://192.168.1.20:3000`). Everything
works there, but a true "Install app" needs **https** — browsers only treat
`localhost` and https sites as installable. Deploy it, or use an https tunnel,
to test the installed app on a phone.

> The folder still sits inside XAMPP's `htdocs`, but Apache no longer serves
> the app — Node does. Apache only serves the old version at
> `http://localhost/habit-flow/legacy-php/`.

---

## Where things are

```
src/
  app/                    one folder per URL
    page.tsx                /            landing
    (auth)/                 /login  /register  /verify   (signed-out only)
    (app)/                  /dashboard  /analytics  /monthly  /profile  /support  /admin
      layout.tsx              auth check + sidebar for every page in the group
      template.tsx            page-enter transition
    manifest.ts             the web app manifest (name, icons, start URL)
  lib/
    db.ts                 connection pool + query helpers
    session.ts  auth.ts   cookie session, currentUser / requireUser / requireAdmin
    data.ts               every read query, one function per page
    actions/              every write, as Server Actions (auth, habits, profile, admin)
    otp.ts                verification codes
    pwa.ts                install prompt, device detection, opening the guide
  components/             UI; charts/ are hand-built SVG; guide/ is the welcome guide
public/
  sw.js  offline.html     service worker and the page it shows when offline
  icons/                  home-screen icons
db/schema.sql             the full schema
scripts/setup-db.mjs      `npm run db:setup`
legacy-php/               the original PHP app, untouched
```

### PHP page → Next.js

| PHP | Now |
|---|---|
| `index.php`, `login.php`, `register.php`, `otp_verify.php` | `/`, `/login`, `/register`, `/verify` |
| `dashboard.php`, `analytics.php`, `monthly.php`, `profile.php` | `/dashboard`, `/analytics`, `/monthly`, `/profile` |
| `donate.php` | `/support` — a link to the creator's tip page; the eSewa sandbox flow was removed |
| `admin/index.php` | `/admin` |
| `logout.php` | `logoutAction` (the Log out button) |
| `setup.php` | `npm run db:setup` |
| `includes/config.php` | `src/lib/*` + `.env.local` |

The old `.php` URLs redirect to the new ones.

### How a request works

**Reading.** Each page is a Server Component: it runs on the server, calls
`requireUser()`, loads its data from `lib/data.ts`, and sends HTML. Database
code and credentials never reach the browser.

**Writing.** Forms and buttons call Server Actions in `lib/actions/`. An
action re-checks who is calling, validates the input, runs the query, then
calls `revalidatePath()` so the page re-renders with fresh data. The dashboard
and monthly grid use `useOptimistic`, so a tick shows instantly and the server
confirms behind it.

---

## Security

| Concern | PHP version | This version |
|---|---|---|
| SQL injection | PDO prepared statements | `mysql2` prepared statements — every query in `lib/` is parameterised |
| Passwords | `password_hash()` bcrypt | `bcryptjs`, cost 12. Existing `$2y$` hashes verify unchanged |
| Sessions | `$_SESSION` + `PHPSESSID` cookie | One encrypted, tamper-proof cookie; `HttpOnly`, `SameSite=Lax`, 24 h |
| CSRF | Hidden token in every form | Server Actions only accept same-origin POSTs, plus the `SameSite=Lax` cookie |
| XSS | `htmlspecialchars()` on output | React escapes all rendered text by default |
| Authorization | `requireLogin()` / `requireAdmin()` | `requireUser()` / `requireAdmin()` — in every page **and** every action |
| OTP comparison | `hash_equals()` | `crypto.timingSafeEqual()` |

The user row is re-read from the database on every request, so disabling an
account or changing its role takes effect immediately.

---

## Support page

`/support` credits the creator and links to their tip page
(`https://kamaucha.me/rammy24d`), opening it in a new tab. The app takes no
payments itself. The handle and link live in one place: `CREATOR` in
`src/lib/constants.ts`.

The eSewa sandbox integration from the PHP version was removed from this app
(it still exists in `legacy-php/`). An existing `donations` table in your
database is left alone but no longer read or written.

---

## Phone app (PWA)

- **Manifest** (`src/app/manifest.ts`): name, colours, icons, `standalone`
  display, start URL `/dashboard`, and long-press shortcuts.
- **Icons**: `public/icons/` (192, 512, maskable) and `src/app/apple-icon.png`.
- **Service worker** (`public/sw.js`): registered in production builds only.
  It caches nothing private — pages always come fresh from the server. Its one
  job is to show `offline.html` instead of a browser error when there's no
  connection.
- **Install**: on Android/Chrome/Edge the guide shows an **Install app**
  button when the browser offers one; on iPhone it shows the Share → Add to
  Home Screen steps.

## Welcome guide

A five-step walkthrough (`src/components/guide/`) opens automatically the
first time someone reaches the app on a device, and right after sign-up. The
**Guide** button (sidebar) or **?** (phone top bar) reopens it. Wording and
illustrations switch between phone and desktop; on a phone the steps can be
swiped. The last step gives install instructions for the device it's opened on
— iPhone, Android or desktop — or says so if the app is already installed.
"Seen" is remembered per browser in `localStorage`.

---

## Animations

| Where | What |
|---|---|
| Landing, sign-in | **Flow field** — canvas particles drifting on a shifting current that bends around the cursor |
| Landing | Headline words rise from a mask; a hand-drawn underline draws itself; a live demo card ticks itself off and tilts in 3D; magnetic buttons |
| Theme toggle | The new theme expands as a circle from the button (View Transitions API) |
| Welcome guide | Looping miniatures of each action (a tap adds a habit, a box ticks itself, the tab highlight walks the bar, the icon drops onto a home screen); steps slide and can be swiped |
| Support page | Hearts drift up behind the card; the creator badge spins in with a rotating ring |
| Checking a habit | The tick draws, sparks burst out, colour washes across the row from the checkbox, the name strikes through, the streak counter rolls |
| Finishing the day | Confetti and a "Perfect day" banner |
| Dashboard | Count-up numbers, a progress ring, filter pill that glides between tabs, rows that reflow when filtered or deleted |
| Charts | Lines draw, columns grow in sequence, the radar unfolds from its centre |
| Monthly grid | Cells arrive in a diagonal wave and pop when toggled; the month label slides in the direction you navigated |
| Navigation | One shared highlight pill glides between sidebar items; pages fade up on enter |
| Verify screen | Code digits flip in and type themselves; the boxes shake on a wrong code |
| Cards | A soft glow follows the cursor |

All of it respects the OS "reduce motion" setting.

---

## Differences from the PHP version

- **Notes and moods now save.** The PHP dashboard had the note dialog but no
  server code behind it; it works now and feeds the mood chart.
- **Streaks survive until midnight.** A streak used to read 0 until today was
  ticked; it now shows the run up to yesterday and grows when today is done.
- **Unchecking keeps a note.** If a day has a note or mood, unchecking only
  clears the completion.
- **Counts ignore un-completed rows** consistently (`completed_count > 0`).
- **Phones get navigation** (top bar + bottom tabs); the PHP version hid the
  sidebar on small screens with nothing in its place.
- **Installable as an app**, with a welcome guide for new users.
- **No in-app payments.** The eSewa test checkout is replaced by a link to the
  creator's tip page.
- **Dark theme**, following the OS by default.
- **Verification codes** are still shown on screen, since there is no mail
  server. Only sign-up uses them, as before.
- Text is stored as typed rather than HTML-escaped before storage. Older rows
  that were stored escaped (`Tom &amp; Jerry`) are decoded when displayed.
