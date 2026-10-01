# HabitFlow

A habit tracker: add daily/weekly/monthly habits, tick them off, and watch
streaks and analytics build. It installs on a phone as an app, works offline,
runs a seasonal **Winter Arc** challenge with a leaderboard, and walks new
users through a short welcome guide. Created by **rammy24d**.

The original plain-PHP version is kept in [`legacy-php/`](legacy-php/) for
reference. It used MySQL; this app uses PostgreSQL, so the two no longer share
a database.

| Layer     | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Database  | PostgreSQL via `pg`, parameterised queries |
| Auth      | Encrypted cookie session (`iron-session`), bcrypt password hashing |
| Styling   | Tailwind CSS 4 with light/dark theme tokens |
| Animation | Motion (`motion/react`), canvas, CSS keyframes, View Transitions API |
| Offline   | Service worker + on-device sync queue; installable (PWA) |

---

## Run it locally

Needs Node.js 20.9+. Nothing else to install — a local Postgres comes with
the project.

```bash
npm install
npm run db:local    # starts Postgres; leave this terminal open
```

In a second terminal:

```bash
npm run db:setup    # first time only: creates tables and an admin account
npm run dev         # http://localhost:3000
```

`db:setup` prints the admin password it generated (or set your own with
`ADMIN_PASSWORD='...' npm run db:setup`). It is safe to re-run; it never
overwrites data. Local data lives in `.pgdata/`.

**On your phone:** with the phone on the same Wi-Fi, open the "Network"
address `npm run dev` prints (e.g. `http://192.168.1.20:3000`). Installing as
an app and offline use need **https** (or `localhost`), so test those on the
deployed site.

---

## Going live

### 1. Database

Create a PostgreSQL database with any host (Aiven's free plan works), then:

```bash
npm run db:setup:live
```

It asks you to paste the database's **Service URI** (`postgres://…`), finds
the CA certificate in your Downloads folder, creates the tables and the admin
account, and writes everything your hosting provider needs to
`.env.live.local` (git-ignored — it contains the database password).

### 2. Environment variables on the host

| Variable | Value |
|---|---|
| `DATABASE_URL` | the Service URI |
| `DB_SSL_CA` | the provider's CA certificate text, if it uses its own (Aiven does) |
| `SESSION_SECRET` | 32+ random characters; the same on every copy of the app |
| `DB_POOL_SIZE` | connections per running copy; keep it small (2–3) on free databases |

### 3. Check it: `/api/health`

Open `https://your-site/api/health`. It answers `200 {"status":"ok"}` when the
session secret and database are both usable, and `503` with a plain-language
reason when they aren't. It never prints hosts, usernames or secrets. If the
site shows a generic server error, look here first.

### Load balancing

The app runs as several identical copies behind a load balancer: the session
is an encrypted cookie (no sticky sessions), all data is in Postgres, and
`/api/health` tells the balancer which copies may receive traffic. Every copy
must have the same `SESSION_SECRET` and run the same build.

On Vercel, Render, Railway and similar, this is done for you. To run it
yourself, `deploy/` has nginx in front of N app containers:

```bash
cp .env.example deploy/.env        # fill in DATABASE_URL and SESSION_SECRET
docker compose -f deploy/docker-compose.yml up -d --build --scale app=3
```

---

## Where things are

```
src/
  app/                    one folder per URL
    page.tsx                /            landing
    (auth)/                 /login  /register  /verify
    (app)/                  /dashboard  /analytics  /arc  /monthly  /profile  /support  /admin
      layout.tsx              auth check, sidebar, offline status, welcome guide
    api/health  api/version   status check; which build is running
    api/sync                  applies habit ticks, including ones made offline
    sw.js/                    the service worker (served with the build id in it)
    manifest.ts               web app manifest
  lib/
    db.ts  db-config.mjs  connection pool, query helpers, connection settings
    session.ts  auth.ts   cookie session, currentUser / requireUser / requireAdmin
    data.ts  arc.ts       every read query
    habit-log.ts          the one place a habit is marked done / not done
    actions/              every other write, as Server Actions
    offline.ts            sync queue, online state, update & restart
    workouts.ts           the workout catalogue
  components/             UI; charts/ are hand-built SVG
db/schema.sql             the full schema
scripts/                  db:local, db:setup, db:setup:live
deploy/                   Dockerfile, nginx load balancer config, docker-compose
legacy-php/               the original PHP app
```

**Reading.** Each page is a Server Component: it runs on the server, calls
`requireUser()`, loads its data, and sends HTML. Database code and credentials
never reach the browser.

**Writing.** Forms and buttons call Server Actions in `lib/actions/`, which
re-check who is calling and validate input. The one exception is ticking a
habit, described next.

---

## Offline use and syncing

- **Ticking works with no connection.** A tick is written to a small queue on
  the device first and shown at once, on the dashboard and the monthly grid.
  The queue survives reloads and restarts.
- **Sync.** Whenever there is a connection the queue is sent to
  `POST /api/sync`. Each change says the state it wants ("done" / "not done"
  for a habit on a day), so sending it twice is harmless.
- **Screens are saved.** The service worker keeps the app's files and the
  latest copy of the main screens, and serves them when the network can't.
  A screen that was never saved shows a short "offline" page.
- **Everything else needs a connection** — adding or deleting habits, notes,
  profile, joining the arc. Offline, those say so instead of failing.
- **A pill at the bottom** shows "Offline · N changes saved on this device",
  "Syncing…", or "All changes synced".
- **Sign-out** clears the queue and the saved screens from the device.

### Updates

Each build has an id. The app checks `/api/version` and, when the server is
running a newer build, shows **"A new version is ready — Update & restart"**.
Pressing it **syncs pending changes first**; if they can't be synced (no
connection), the update is refused and the changes stay safely on the device.
"Check for update" and "Restart app" are also on the Winter Arc screen and in
Profile.

---

## Winter Arc

`/arc` is a seasonal challenge that runs **Oct 1 – Dec 31** every year.

- **Joining is opt-in** and is what puts someone on the leaderboard, shown as
  first name + last initial and username. Leaving removes them.
- **Scoring** (`src/lib/arc.ts`): 10 points per habit ticked, counting at most
  5 habits a day. A tick only scores if it reached the server within a day of
  the day it is for — filling in old days fixes the record, not the score.
  Ties go to more active days, then to whoever joined first.
- **The look** is a black-and-white poster: film grain, thin tall lettering, a
  hooded knight resting on a sword (drawn in SVG in `ArcScreen.tsx`), snow and
  drifting fog. On a phone it is the screen; on desktop it sits in a phone
  frame.
- **Workout recommendations** sit beside it, in six categories. "Add as daily
  habit" puts one on your checklist. The catalogue is a plain list in
  `src/lib/workouts.ts`.

## Support page

`/support` credits the creator and links to their tip page
(`https://kamaucha.me/rammy24d`). The app takes no payments itself. The handle
and link are `CREATOR` in `src/lib/constants.ts`.

## Welcome guide

A five-step walkthrough opens the first time someone reaches the app on a
device, and right after sign-up. **Guide** (sidebar) or **?** (phone) reopens
it. Wording switches between phone and desktop, steps can be swiped, and the
last step gives install instructions for the device it is opened on.

---

## Security

| Concern | How it is handled |
|---|---|
| SQL injection | Every query is parameterised; values never go into SQL text |
| Passwords | `bcryptjs`, cost 12 |
| Sessions | One encrypted, tamper-proof cookie; `HttpOnly`, `SameSite=Lax`, 24 h |
| CSRF | Server Actions only accept same-origin POSTs; `/api/sync` checks the Origin; `SameSite=Lax` cookie |
| XSS | React escapes all rendered text |
| Authorization | `requireUser()` / `requireAdmin()` in every page, action and API route |
| OTP comparison | `crypto.timingSafeEqual()` |
| Database connection | TLS with certificate verification for hosted databases |

The user row is re-read from the database on every request, so disabling an
account or changing its role takes effect immediately. Verification codes are
shown on screen because there is no mail server.

---

## Animations

| Where | What |
|---|---|
| Landing, sign-in | **Flow field** — canvas particles drifting on a current that bends around the cursor |
| Landing | Headline words rise from a mask; a hand-drawn underline draws itself; a live demo card tilts in 3D; magnetic buttons |
| Theme toggle | The new theme expands as a circle from the button |
| Checking a habit | The tick draws, sparks burst out, colour washes across the row, the streak counter rolls; confetti when the day is complete |
| Winter Arc | Title letters come into focus one by one; the knight rises; a glint runs down the sword; snow falls and fog drifts; podium blocks rise III, II, then I |
| Workouts | Category pill glides between tabs; cards deal in with a slight flip |
| Charts | Lines draw, columns grow in sequence, the radar unfolds |
| Monthly grid | Cells arrive in a diagonal wave and pop when toggled |
| Welcome guide | Looping miniatures of each action; steps slide and can be swiped |
| Navigation | One shared highlight pill glides between items; pages fade up |

All of it respects the OS "reduce motion" setting.
