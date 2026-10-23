# matrix-blackout
iPhone mission control

**MATRIX // BLACKOUT** is a mission-control dashboard for the iPhone: black
and neon green, katakana code rain, scanlines, glowing readouts. Open it in
Safari, then Share → Add to Home Screen; it opens full screen like an app.

One of four separate projects, each in its own repo:

| Project | Repo |
| --- | --- |
| Blackout (this one): phone dashboard | `Bajanomad/matrix-blackout` |
| Matrix 411: Matrix remake of the old website | `Bajanomad/411matrix` |
| 411 BCS | `Bajanomad/411` |
| 411 Market | `Bajanomad/411-market` |

Plain HTML/CSS/JS with no build step and no dependencies, plus small Node
serverless routes in `api/` that Vercel runs as-is. Paths are absolute from
the site root.

## Screen

Top to bottom: the header (name, online light, five tabs with a glowing light
that slides between them, and the alerts strip), the swipeable screens, the
ticker tape, and the pinned dock of six buttons. Swipe left/right or tap a
tab; each tab change glitches. Every screen scrolls on its own and is made of
drop-down cards; tap a header to open or fold it (remembered on the phone).
Pull down at the top of any screen to sync everything.

| Tab | Cards |
| --- | --- |
| **Pulse** | Chrono (clock, date, UTC, week), Weather (Open-Meteo + your location), Next up (Google Calendar), Power (battery where the browser allows; iOS doesn't), Sites (a green/red light per live site), Traffic · 7d (Vercel Web Analytics, all projects combined). |
| **Projects** | Fleet summary, then one card per project: last deploy state, age and build log, last commit, open pull requests, and buttons to the live site, GitHub and Vercel. |
| **Data** | Supabase: database size gauge, signups (total, today, 7-day sparkline), row counts per table with new rows per day. Shopify orders and revenue (only when configured). |
| **Comms** | Messages, FaceTime, WhatsApp, Mail, Phone, Gmail; Gmail unread count; favorite people as big tiles with call, text, FaceTime, WhatsApp and email. |
| **AI·Tools** | Claude, Claude Code, ChatGPT, Codex, Spotify, Shortcuts, Notes; Shortcuts placeholders to wire later; Settings. |

- **Alerts strip** turns red when a deploy fails, a site is down or the
  database is over 90% full. Tap it to jump to Projects.
- **Ticker** scrolls right to left forever: deploys, commits, site uptime,
  row counts, signups, traffic, weather, unread mail, next event, orders.
  Green is healthy, yellow a warning, red a failure, blue info. Tap to pause.
  Data saver slows it down; Reduce Motion freezes it.
- **Live numbers** flicker and flare when they change; status lights pulse.
- **Boot sequence**: on the first open each day a cursor types "Wake up,
  Neo...", "The Matrix has you...", "Follow the white rabbit." and fades
  into the dashboard. Tap to skip; turn it off in AI·Tools → Settings.
- **Easter egg**: tap the clock five times to replay the boot and flood the
  screen with code rain.
- **Offline**: each card keeps its last good copy on the phone and shows it
  marked OFFLINE or STALE; a service that isn't set up says exactly which
  environment variables to add.
- **Data saver** (Settings, or the phone's Low Data Mode where the browser
  reports it): no code rain, slower ticker, half as many refreshes.

## Config

Everything you edit is in `config.js`: projects (site, repo, Vercel
project), Supabase tables, comms buttons, favorite contacts, AI and tool
buttons, automations, the six pinned buttons, weather home spot, boot lines
and ticker speed. No component needs touching. After editing, bump `CACHE` in
`sw.js` so installed copies update.

Buttons are `{ label, icon, url }` for an iOS app link or web address,
`{ label, icon, shortcut: "Name" }` to run a Shortcuts automation by its
exact name, or `{ label, icon, shortcut: "" }` for a placeholder that says
how to wire it. Icons are the names drawn in `themes.js`, listed at the top
of `config.js`.

`config.js` is public (the browser loads it), so it never holds keys.

## Data layer: /api routes

Each route runs on Vercel, reads its keys from environment variables, and
returns JSON. Keys never reach the browser. Responses are cached briefly in
the function (1–10 minutes depending on the source) and for 30–300 s on the
phone; pull-down sends `?fresh=1` to skip the cache (at most once per 10 s).
One failing service never blanks the others.

| Route | What | Needs |
| --- | --- | --- |
| `/api/sites` | Pings every project's `site` and times it. | nothing |
| `/api/projects` | Last Vercel deploy, last commit, open PRs per project. | `VERCEL_TOKEN`, `VERCEL_TEAM_ID`; `GITHUB_TOKEN` optional |
| `/api/traffic` | Page views per day for 7 days, all projects with `traffic: true`. | `VERCEL_TOKEN`, `VERCEL_TEAM_ID`; Web Analytics on each project |
| `/api/data` | Supabase row counts, signups, DB size; Shopify orders and revenue. | `SUPABASE_*`; `SHOPIFY_*` optional |
| `/api/google` | Gmail inbox unread and the next calendar events. | `GOOGLE_*` |

### Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | Where to get it |
| --- | --- | --- |
| `BLACKOUT_KEY` | **Strongly recommended** | Any long random passphrase. With it set, every `/api` route needs it; enter it once on the phone in AI·Tools → Settings → Access key. Without it, anyone who finds the URL can read your commits, unread count and revenue. |
| `VERCEL_TOKEN` | For deploys and traffic | vercel.com → Account Settings → Tokens. Scope it to the team. |
| `VERCEL_TEAM_ID` | For team projects | Team → Settings → General → Team ID (`team_...`). |
| `GITHUB_TOKEN` | Optional (needed for private repos) | GitHub → Settings → Developer settings → Fine-grained token, read-only: Metadata, Contents, Pull requests. Without it: public repos only, 60 calls an hour, refreshed every 10 min. |
| `SUPABASE_URL` | For the Data tab | Supabase → Project Settings → API → Project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | For the Data tab | Same page, `service_role` secret. Server-only; never put it in `config.js`. |
| `GOOGLE_CLIENT_ID` | For Gmail and Calendar | See Google below. |
| `GOOGLE_CLIENT_SECRET` | For Gmail and Calendar | See Google below. |
| `GOOGLE_REFRESH_TOKEN` | For Gmail and Calendar | See Google below. |
| `SHOPIFY_STORE_DOMAIN` | Optional | `your-store.myshopify.com`. The Shopify card hides itself without it. |
| `SHOPIFY_ADMIN_TOKEN` | Optional | Shopify admin → Settings → Apps → Develop apps → create an app with `read_orders`, install, copy the Admin API access token. |
| `SHOPIFY_API_VERSION` | Optional | Defaults to `2026-07`. |

After adding variables, redeploy (Vercel only reads them at deploy time).

### Supabase

Run `supabase/blackout.sql` once in Supabase → SQL Editor. It adds
`blackout_stats()`, which returns the database size and signups per day
(from `auth.users`); only the service role can call it. Row counts need no
SQL: list the tables in `config.js` → `supabase.tables`, with `created` set
to the timestamp column for the 7-day sparkline.

### Google (Gmail unread + Calendar)

1. Google Cloud Console → new project → enable the **Gmail API** and the
   **Google Calendar API**.
2. OAuth consent screen: External, add yourself as a test user, then
   **Publish app** (in "Testing", refresh tokens expire after 7 days).
3. Credentials → Create OAuth client ID → Web application, with redirect URI
   `https://developers.google.com/oauthplayground`.
4. Open the OAuth Playground → gear icon → "Use your own OAuth credentials",
   paste the client ID and secret. Authorize the scopes
   `https://www.googleapis.com/auth/gmail.labels` and
   `https://www.googleapis.com/auth/calendar.readonly`, then "Exchange
   authorization code for tokens" and copy the refresh token.

### Traffic

Turn on Web Analytics for each project (Vercel → Project → Analytics) and set
`traffic: true` and its `vercel` project name in `config.js`. The graph sums
page views across those projects for the last 7 days, in the phone's time
zone, using Vercel's Web Analytics API.

## Make your own (Blackout Studio)

`/build` is a builder anyone can use to make their own version:

1. **Pick a look**: Matrix, Wild West, Deep Space, Synthwave, Baja Beach or
   Minimal. Each changes the colors, type, animated background, icon shape
   and how the panel titles talk (`clock://local`, `★ Town Clock`,
   `CHRONO · LOCAL`, `CLOCK.EXE`...).
2. **Name it**: name, tagline and the greeting typed out on open.
3. **Buttons**: up to 20, from a list of popular apps or any link, each with
   its own icon; folders hold their own list of links (like Repos).
4. **Widgets**: turn weather, apps, calendar and the day/week/year/moon
   status on or off, order them, pick which starts open, and search a
   weather town (Open-Meteo geocoding, °F or °C).
5. **Get it**: a link that carries the whole screen, with the iPhone steps
   (open in Safari → Share → Add to Home Screen).

A live phone preview runs beside the steps on wide screens (a Preview button
on phones). Nothing is stored on a server: the screen is packed into the
link (`/#c=` + base64url JSON, see `themes.js`), and a draft stays on the
device. Links are untrusted input, so `sanitize()` caps every field, keeps
only known themes, icons and widgets, and drops `javascript:`/`data:` links.

Studio screens are the one-page themed layout at `/screen` (old `/#c=`
links are sent there), separate from the dashboard. On a link, the page removes the manifest so iOS saves that exact address
when it is added to the Home Screen, and sets the title and a home-screen
icon drawn in the theme's colors. With no link, `/screen` shows the Studio's
default Matrix screen (`OWNER` in `themes.js`). Tapping the name at the top of any
screen opens Customize: edit this screen in the builder, or start a new one.

## Files

| File | What |
| --- | --- |
| `index.html` | The dashboard shell: header, tabs, screens, ticker, dock, boot overlay. |
| `config.js` | **Everything you edit**: projects, links, shortcuts, contacts, pinned buttons. Shared by the browser and `api/`. |
| `js/core.js` | Shared parts: cards, live numbers, charts, API client with offline copies, ticker, alerts, rain, boot, settings. |
| `js/pulse.js`, `js/projects.js`, `js/data.js`, `js/comms.js`, `js/tools.js` | One file per tab. |
| `js/main.js` | Puts it together: tabs and light, swipe, glitch, pull-down sync, dock. |
| `app.css` | All dashboard styles (safe areas for the notch and home bar). |
| `api/_lib.js` | Shared route helpers: access key, cache, timeouts, JSON errors. |
| `api/sites.js`, `api/projects.js`, `api/traffic.js`, `api/data.js`, `api/google.js` | The data routes (see above). |
| `supabase/blackout.sql` | The one-time SQL for signups and database size. |
| `themes.js` | Icon set (shared), plus the Studio's themes, app catalog, `OWNER` screen and link codec + sanitizer. |
| `screen.html`, `screen.js`, `screen.css` | The Studio's one-page themed screen at `/screen`. |
| `build.html`, `build.css`, `build.js` | Blackout Studio, the builder at `/build`. |
| `vercel.json` | Clean URLs, so `/build` serves `build.html` and `/screen` serves `screen.html`. |
| `manifest.json` | Home-screen app settings. |
| `sw.js` | Offline cache for the app files (never for `/api`). **Bump `CACHE` whenever a file changes**, or installed copies keep the old files. |
| `matrix-icon.svg` | Icon: a glowing ring with Matrix code rain falling behind an anarchy sign (animated SVG; regenerate with `python3 tools/make-icons.py`). |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `favicon-32.png`, `favicon.ico` | PNG/ICO renders of the ring icon for the manifest and older browsers. |
| `apple-touch-icon.png` | 180×180 iPhone home-screen icon, rendered from the SVG. |

## History

The manifest, service worker and icon were first imported into a
`matrix-blackout/` folder inside `411matrix` and the screen was built there.
They were moved here, to the project's own repo, and that folder was removed
from `411matrix`.

## Known limits

- Hosted on the Vercel project `matrix-blackout`
  (team `bajaheat24x7-8566s-projects`), connected to this repo.
- App links (WhatsApp, Signal, Spotify...) need the app installed; if it is
  not, Safari shows an "address is invalid" message.
- 411 BCS, 411 Market, the Arcade and the Book have empty `site`, `repo` or
  `vercel` fields in `config.js` until they are filled in; they show as
  set-up placeholders. Favorite contacts start empty too.
- iOS doesn't give web apps the battery level, Wi-Fi/cell details or Health
  data; those cards say so instead.
- Universal links (claude.ai, chatgpt.com) open the app when it's installed;
  from a Home Screen web app, iOS sometimes opens them in a Safari sheet.
