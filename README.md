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
| `RESEND_API_KEY`, `EMAIL_FROM` | optional — turns on email (see below) |
| `CRON_SECRET` | optional — lets the reminder job call the site |
| `GOOGLE_SITE_VERIFICATION` | optional — the code from Google Search Console's "HTML tag" method, to prove the site is yours |
| `APP_URL` | the site's public address, e.g. `https://habits.example.com`. Not needed on Vercel (it knows its own address). **Set it on a self-hosted server**, so links in emails can never be pointed elsewhere by a forged request |

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

### Email (optional)

Email is sent through [Resend](https://resend.com). With it set up:

- **Forgot password** on the sign-in page emails a one-time link (30 minutes,
  single use; only a hash of it is stored).
- **Sign-up codes** are emailed instead of shown on screen, which proves the
  person owns the address.
- **Winter Arc reminders**: at 7 PM in each member's own timezone, one email
  if they still have habits open that day (alongside the notification, if on). Never twice in a day, and every
  email has an unsubscribe link.

Emails are written in **Nepali** for people whose timezone is Nepal and
**English** for everyone else; anyone can choose either in Profile.

Setup:

1. Create a Resend account, add and verify your domain (until then Resend only
   delivers to your own address), and create an API key.
2. On the host set `RESEND_API_KEY`, `EMAIL_FROM` (e.g.
   `HabitFlow <hello@yourdomain.com>`) and `CRON_SECRET` (any long random
   string).
3. Reminders need something to call the site on a schedule. That is
   `.github/workflows/reminders.yml`, which GitHub runs for free every 15
   minutes. In the
   GitHub repository add two secrets (Settings → Secrets and variables →
   Actions): `SITE_URL` (your site's address) and `CRON_SECRET` (the same
   value as on the host).

Without these variables the app works as before: codes are shown on screen
and a forgotten password is reset by an admin.

### Notifications: what is sent, and how people control it

The app asks to turn notifications on a few seconds after it opens (sooner in
the installed app), explains what will be sent first, and backs off each time
it is put off (a day, three days, a week, then never).

In **Profile → App** each person chooses:

- **Motivation**: off, or 1–3 a day. The morning quote at 8; with 2 or 3, more
  in the afternoon — but only while habits are still open.
- **Nudge me if I stop**: a kind message 2, 4, 7, 14 and 30 days after the
  last tick, then nothing. One email goes out at a week (if emails are on).
  After a week away the everyday messages stop too: an app someone has left
  should go quiet, not louder.
- **App icon**: automatic (the Winter Arc snowflake while in the arc),
  HabitFlow, or Winter Arc. It is applied when the app is installed; Android
  and desktop Chrome pick up a change within a day or so, an iPhone needs the
  app re-added to the Home Screen. (A website cannot swap its installed icon
  from one day to the next the way a native app can.)
- **Number on the icon**: how many of today's habits are still open, where
  the device supports it; it clears when everything is done.

### Notifications (optional)

Real push notifications, like a native app — they arrive when the app is
closed. On iPhone they need the app added to the Home Screen first.

- **Habit reminders** at the time set on each habit, if it isn't ticked yet.
- **A quote** every morning at 8, in Nepali or English.
- **An evening nudge** at 7 PM for Winter Arc members with habits still open.

All on each person's own clock. People switch them on in the join flow or in
Profile.

Setup: run `npm run push:keys` once, add the three lines it prints
(`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) to the host, and set
`CRON_SECRET` plus the two GitHub secrets described under Email — the same
scheduled job (`.github/workflows/reminders.yml`, every 15 minutes) sends both
the emails and the notifications.

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
    sigmadev/               the admin-only area: /sigmadev  /sigmadev/users  /sigmadev/admins  /sigmadev/categories  /sigmadev/arc  /sigmadev/blog  /sigmadev/inbox  /sigmadev/notifications  /sigmadev/account
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

A seasonal challenge that runs **Oct 1 – Jan 31** (123 days, across New
Year; a season is named after the year it starts in).

**Joining is a guided flow.** The public page `/winter-arc` explains it and
has the Join button. Someone without an account is asked to create one (or
continue with Google) first, then lands on `/arc/start`: choose habits →
reminders → begin. Nothing is saved until the last button; then the opening
scene plays and the account takes on the Winter Arc look.

**The look belongs to accounts that joined.** The site is in its normal
light/dark theme for visitors and for members who haven't joined. For an
account in the arc, every screen slowly dissolves into the black-and-white
poster theme (a theme picked by hand with the theme button always wins).

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
- **Sharing**: "Share my progress" builds a 1080×1350 picture of the member's
  real numbers plus a caption, and opens the phone's share sheet (Instagram,
  Facebook, WhatsApp…). On a computer it offers the picture to download. The
  hashtags are `SHARE_HASHTAGS` in `src/lib/constants.ts`.
- **Intro images**: in Admin → Winter Arc, upload a "before" and an "after"
  picture (transparent PNG works best) to replace the built-in drawings in the
  opening scene. They are converted to WebP and shown in black and white.
- **Workout recommendations** sit beside it, in six categories. "Add as daily
  habit" puts one on your checklist. The catalogue is a plain list in
  `src/lib/workouts.ts`.

### The Arc screen

Opening the Winter Arc covers the whole screen (the app's own menu is out of
the way; an arrow goes back to Today). It starts with a **story** — a few
full-screen animated cards you tap through: the day, your streak, your rank,
today's pack, a line for the day. Then four sections:

- **Goals** — up to seven things to have achieved by Jan 31 (private), and
  the member's pack with today's progress and badges.
- **Tips** — a tip of the day and the rest by theme, plus workouts to add.
- **Quote** — write a line of your own; it is drawn onto a picture with your
  name, photo and day of the arc (`/api/share-card?kind=quote`) to post to
  Instagram, Facebook or TikTok through the phone's share menu.
- **Leaderboard** — the poster, podium and ranking.

Someone who hasn't joined sees a shorter story that ends in "Join", and the
leaderboard. While the season is live the Arc tab is raised and pulsing, and
Today shows an invitation to non-members.


A pack is a ready-made set of habits an admin puts together in
**Admin → Winter Arc → Habit packs** (three come built in). There are two kinds:

- **Winter Arc** packs are chosen when joining the arc — one per member.
- **Everyone** packs can be added by any member from the Today screen, at any
  time of year, alongside other packs.

Either way the pack's habits are created for the member automatically and
shown in a section of their own on Today. A habit the admin adds to a pack
later is created for everyone already on it. Tables: `arc_packs`,
`arc_pack_habits`, `pack_members`; `habits.arc_habit_id` links a member's
habit back to the pack habit it came from.

### Surprises and badges

Finishing every habit of the Winter Arc pack for the day opens a gift. On
milestone days (1, 3, 7, 14, 21, 30, 50, 75, 100 and 123 perfect days) it
holds a badge; on other days one of the surprise messages, which the admin can
write (suggestions are offered) or leave as the built-in ones. Badges earned
are shown on the Winter Arc screen.

### Intro: shake, sound and wording

In **Admin → Winter Arc → Opening scene** the admin sets how hard the screen
shakes at the moment of change (off / soft / hard), the sound (three built-in
ones made with the Web Audio API, or an uploaded MP3/OGG/WAV/M4A of up to
2 MB), and the five lines of text shown while it plays, with ready-made
suggestions. Preview plays the scene with unsaved changes. Members can mute
the sound; people who ask their device for reduced motion never see the intro.
Settings live in `site_settings`, the sound in `site_images`.

### Site-wide theme and intro

The theme button cycles **light → dark → Winter Arc**, for anyone who wants
to choose by hand.

The first time someone opens `/arc`, a short scene plays like the opening of
a game: player name and level, a tired character with nearly empty stat bars,
a flash and "level up" as the bars fill and the strong character appears, then
"New quest unlocked — Winter Arc" with a **Press start** button. It can be
skipped, is never shown to people who ask for reduced motion, and "Replay
intro" at the bottom of the arc screen plays it again.

In the Winter Arc theme everything is grey — except on a screen where a colour
is being chosen (avatar or habit colour), where real colours come back so the
swatches can be told apart.

## Support page

`/support` credits the creator and links to their tip page
(`https://kamaucha.me/rammy24d`). The app takes no payments itself. The handle
and link are `CREATOR` in `src/lib/constants.ts`.

When every habit for the day is done, a small prompt under the "Perfect day"
banner invites the user to support the creator. "Not today" hides it until
tomorrow; "Don't ask again" hides it for good.

## Blog, Collaborate and Brand deals

Three public pages, no account needed:

- **`/blog`** — posts written in **Admin → Blog**. The editor has a formatting
  toolbar (headings, bold, italic, lists, quote, code, link), a live preview,
  a cover picture (cropped to 1200×630 and converted to WebP), and a panel for
  search engines: address, search title and description with length counters,
  topics, a preview of the search result, and a checklist. Posts are plain text
  with a few marks (`## heading`, `- item`, `**bold**`, `[text](https://…)`)
  rendered by `src/components/blog/PostBody.tsx` — never as HTML, so nothing
  typed into a post can run as code. Three starter posts come built in.
  Published posts get their own title, description, canonical address,
  article data for search engines, a place in the sitemap and in the RSS feed
  (`/blog/feed.xml`). Drafts are visible only in the admin area.
- **`/collaborate`** and **`/brand-deals`** — each has a form. What is sent
  lands in **Admin → Inbox** (table `inquiries`), where it can be answered by
  email, marked read or deleted; admins are also emailed when email is set up.
  The forms are checked on the server, limited to three messages an hour per
  address, and have a hidden field that catches form-filling programs.

## Signing up, profiles and privacy

- **Finishing the profile.** The first time someone signs in — with a password
  or with Google — they are asked for a username (a Google sign-up is given a
  made-up one to change), gender, date of birth and country. Until that is done
  every signed-in page and action sends them back to `/welcome`
  (`requireUser()` in `src/lib/auth.ts`). Under-13s are refused.
- **Leaderboard profiles.** Tapping someone on the Winter Arc leaderboard opens
  their profile: name, photo, their arc numbers and badges, and their age,
  gender and country — each only while its owner leaves it switched on
  (Profile → About you). The date of birth itself is never sent.
- **Badges.** An admin makes badges in Admin → Winter Arc: earned automatically
  (perfect days, a streak, points) or given by hand. Members see them in
  Profile, with progress.
- **Logging out** is at the end of Profile and asks first. The phone header has
  only the theme switch.
- **Saving the password.** Sign-in forms are marked up for password managers,
  and after a successful sign-in the browser is asked to offer saving it
  (`src/lib/credentials.ts`; the password is held in memory only until then).

## Storage

Admin → Overview shows how full the database is, against the size of the plan
(typed in there — the site can't ask the host). Once a day the scheduled job
checks it: at 80% the admins are emailed; at 95% uploads (photos, pictures,
sounds) are refused so the site itself keeps working, and the admins are
emailed again. The same job clears out old sign-in attempts, codes and
"already sent" records. A profile photo is stored as a 256px WebP of around
10 KB; a year of daily ticks for one person is a few hundred KB.

## Search engines and link previews

- **`/sitemap.xml`** (`src/app/sitemap.ts`) lists the public pages (home,
  Winter Arc, blog, collaborate, brand deals, sign-up, sign-in, privacy,
  terms) and every published blog post.
- **`/robots.txt`** (`src/app/robots.ts`) points crawlers at the sitemap and
  away from the signed-in screens and the API.
- Every public page has its own title, description and canonical address;
  private and in-between pages (dashboard, verify, reset…) are `noindex`.
- **Link previews**: sharing the site on Facebook, WhatsApp, X or Discord
  shows a title, description and picture (`src/app/opengraph-image.tsx`).
- **Structured data** on the home page tells search engines this is a free
  web application.

The address used in all of these is `SITE_URL` in `src/lib/site.ts`
(`APP_URL` overrides it). After deploying, add the site in
[Google Search Console](https://search.google.com/search-console) and submit
`/sitemap.xml` there.

---

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
no habit screens. Signing in as an admin goes straight to `/sigmadev`, the menu
is admin-only, and the member pages redirect back to it. The check runs on the
server in the layout and again inside every admin action.

The area is deliberately not called "admin". To anyone who isn't an
administrator — signed in or not — every address under `/sigmadev` answers
with the ordinary "page not found", title included, exactly like an address
that doesn't exist; `/admin` doesn't exist at all. It is left out of
`robots.txt` and the sitemap. That keeps it from being advertised or guessed;
what actually protects it is still the server-side check.

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
| Passwords | `bcryptjs`, cost 12; 8–72 characters |
| Sessions | One encrypted, tamper-proof cookie; `HttpOnly`, `SameSite=Lax`, 24 h |
| Signing out other devices | The cookie carries a fingerprint of the password hash. Change or reset the password (yourself, by email link, or by an admin) and every other device is signed out |
| Password guessing | 8 wrong passwords per account, or 40 from one address, in 15 minutes pauses sign-in (`src/lib/throttle.ts`, table `rate_limits`). The "current password" boxes in Profile allow 5 |
| Email flooding | At most 4 verification codes per address per 30 minutes; reset links: one per account per 2 minutes, 6 requests per address per hour |
| Verification codes | 6 digits, 10 minutes, 5 guesses, compared with `crypto.timingSafeEqual()` |
| Reset links | Random 256-bit token, only its SHA-256 stored, 30 minutes, single use |
| Account discovery | Sign-in and forgot-password answer the same whether or not the account exists |
| CSRF | Server Actions only accept same-origin POSTs; API routes check the Origin; `SameSite=Lax` cookie |
| Clickjacking & co. | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, HSTS on every response (`next.config.ts`) |
| XSS | React escapes all rendered text |
| Authorization | `requireUser()` / `requireAdmin()` in every page, action and API route |
| Ownership | Every habit query carries `user_id = <signed-in user>`; another member's id is "not found" |
| Uploads | Re-encoded to WebP on the server; anything that isn't a real image is refused |
| Database connection | TLS with certificate verification for hosted databases |

The user row is re-read from the database on every request, so disabling an
account or changing its role takes effect immediately. Without email set up,
verification codes are shown on screen — fine for local development, but it
means addresses are not verified, so set up email before going live.

Anything destructive asks first: deleting a habit, a user, a category or your
own account (which also needs the password), resetting a password, disabling
an account, changing a role, removing a photo, removing someone from the arc
and leaving it.

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
