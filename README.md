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
| `DB_POOL_SIZE` | connections per running copy of the app. Default 2 — leave it there on a free database |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional — turns on "Continue with Google" (see below) |

### Speed: keep the server next to the database

Every page makes several database queries, so the distance between the two
is what makes the site feel fast or slow. `vercel.json` pins Vercel's servers
to **Singapore (`sin1`)**. If your database is somewhere else, change that to
the nearest [Vercel region](https://vercel.com/docs/edge-network/regions)
(the database's region is shown in its provider's console).

A free database allows very few connections (Aiven's free plan: 15 in total).
The app is built around that: each running copy holds at most two, releases
them after five idle seconds, and retries once if none is free.

### 3. Check it: `/api/health`

Open `https://your-site/api/health`. It answers `200 {"status":"ok"}` when the
session secret and database are both usable, and `503` with a plain-language
reason when they aren't. It never prints hosts, usernames or secrets. If the
site shows a generic server error, look here first.

### Sign in with Google (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project, then **APIs & Services → OAuth consent screen**. Fill in the app name, and these links from your site: home page `/`, privacy policy `/privacy`, terms `/terms`.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   Authorised redirect URI: `https://YOUR-SITE/auth/google/callback`
   (for local testing also add `http://localhost:3000/auth/google/callback`).
3. Put the client ID and secret in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on the host and redeploy. The button appears on the sign-in and sign-up pages once both are set.

Only name and email are requested. A Google account whose email already
belongs to a password account is not merged into it (emails typed at sign-up
are never verified, so merging would be unsafe); the person is asked to use
their password instead.

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
    auth/google/            "Continue with Google": redirect out, and the callback
    privacy/  terms/        Privacy Policy and Terms of Service
    (app)/                  the member's screens: /dashboard  /analytics  /arc  /monthly  /profile  /support
      layout.tsx              auth check, sidebar, offline status, welcome guide
      loading.tsx             the skeleton shown while a page's data loads
    admin/                  the admin-only area: /admin  /admin/users  /admin/categories  /admin/arc  /admin/account
    api/health  api/version   status check; which build is running
    api/sync                  applies habit ticks, including ones made offline
    api/avatar                profile photo upload (→ 256px WebP) and serving
    api/export                "Download my data"
    sw.js/                    the service worker (served with the build id in it)
    manifest.ts               web app manifest
  lib/
    db.ts  db-config.mjs  connection pool, query helpers, connection settings
    session.ts  auth.ts   cookie session, currentUser / requireUser / requireAdmin
    data.ts  arc.ts       every read query for members
    admin-data.ts         every read query for the admin area
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

### Site-wide theme and intro

The theme button cycles **light → dark → Winter Arc**. The Winter Arc theme is
the same black-and-white poster look applied to the whole site (one fixed
layer greys out colour and adds grain), and it is the default from October to
December for anyone who hasn't chosen a theme.

The first time someone opens `/arc`, a short scene plays: a tired silhouette is
hit by a burst of energy and stands up strong, then the title lands. It can be
skipped (tap, Skip, or Escape), is never shown to people who ask for reduced
motion, and "Replay intro" at the bottom of the arc screen plays it again. The
figures are original drawings, not existing characters.

## Support page

`/support` credits the creator and links to their tip page
(`https://kamaucha.me/rammy24d`). The app takes no payments itself. The handle
and link are `CREATOR` in `src/lib/constants.ts`.

When every habit for the day is done, a small prompt under the "Perfect day"
banner invites the user to support the creator. "Not today" hides it until
tomorrow; "Don't ask again" hides it for good.

## Privacy Policy and Terms

`/privacy` and `/terms` are public pages, linked from the landing page, the
sign-in and sign-up forms, and Profile. They describe what the app actually
stores and who can see it. Set `CONTACT_EMAIL` in `src/lib/constants.ts` to a
public address before going live — and have them reviewed if the site will
have real users; they are a plain-language starting point, not legal advice.

## Who can see what

- **A user** sees only their own habits, check-ins, notes, moods and charts.
- **Other users** see nothing, unless the person joins the Winter Arc: then
  first name, last initial, username, photo, points and active days are
  shown on the leaderboard.
- **An admin** sees every account's name, username, email, role, join date,
  last sign-in and counts of habits and check-ins — not habit names, notes or
  moods.
- **Nobody** can read passwords; only bcrypt hashes are stored.

## Admin area

An admin account is a different kind of account: it manages the site and has
no habit screens. Signing in as an admin goes straight to `/admin`, the menu
is admin-only, and the member pages redirect back to it. Members, in turn,
cannot open anything under `/admin` — the check runs on the server in the
layout and again inside every admin action.

| Page | What it does |
|---|---|
| **Overview** | Accounts, active/disabled, check-ins today, Winter Arc members; check-ins and sign-ups for the last 7 days; newest members; popular categories; database status and running version |
| **Users** | Search; add a user; change role; disable/enable; delete (with everything they own); **reset a forgotten password** (a new one is shown once to pass on); remove an inappropriate photo |
| **Categories** | Add, rename (habits follow the new name), delete (its habits move to "General") |
| **Winter Arc** | The live ranking; remove someone from this year's leaderboard |
| **My Account** | The admin's own name, photo, timezone and password |

An admin cannot change, disable or delete their own account, so there is
always at least one. To create or recover one from the terminal:
`npm run admin`.

## Profile photos

Members and admins can add a photo from Profile. The browser shrinks it
before uploading; the server then decodes and re-encodes whatever arrives —
cropped square, 256px, **WebP**, metadata (location, camera) removed — and
stores only that copy (a few KB) in the database. A file that isn't really an
image is refused. Photos are served only to signed-in users.

## Your data

From **Profile → Your data** a member can download everything held about them
as a JSON file, or delete their account (password required). Both are also
described in the Privacy Policy.

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
| Navigation | One shared highlight pill glides between items; pages fade up; a shimmering skeleton stands in while a page loads |

All of it respects the OS "reduce motion" setting.
