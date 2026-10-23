# matrix-blackout
iPhone Control Center: a spaceship bridge you can build on.

**BLACKOUT // BRIDGE** turns the phone's home screen into a spaceship bridge:
black, neon orange and green, live HUD readouts, and stations you build
yourself. Open it in Safari on
the iPhone, then Share → Add to Home Screen; it opens full screen like an app.

One of four separate projects, each in its own repo:

| Project | Repo |
| --- | --- |
| Blackout (this one): phone theme | `Bajanomad/matrix-blackout` |
| Matrix 411: Matrix remake of the old website | `Bajanomad/411matrix` |
| 411 BCS | `Bajanomad/411` |
| 411 Market | `Bajanomad/411-market` |

Plain HTML/CSS/JS, no build step. Serve the repo root as-is (Vercel, Netlify,
GitHub Pages). Paths are absolute from the site root (`/app.js`, `/sw.js`).

## The Bridge (home screen)

The home screen is a spaceship bridge on black: neon orange structure, neon
green live readouts, cut-corner glowing panels, a starfield with a moving
grid floor, and HUD type (Orbitron + Share Tech Mono). Everything is on one
screen:

- **Top HUD**: ship name, NET and PWR lights (power where the browser shares
  it), clock.
- **Viewscreen**: big clock, stardate, live weather, and four ring gauges
  (day, year, moon lit, humidity). Tap it for Chrono details.
- **Ticker**: rotating status lines (position, wind, sunrise/sunset, moon,
  power).
- **Stations**: a grid of module tiles with live readouts. Tap one to open its
  console. Built in: Atmosphere (weather + 5-day), Chrono, Calendar, Sun & Moon,
  Mission Time (day/week/month/year), Nav (location), Power, Comms, Systems,
  plus one deck per `sites` group and one key pad per `shortcuts` group in
  `config.js` (with tap-through quick buttons right on the tile).
- **Dock**: ARRANGE (move ◀ ▶, stow ⊘, edit ✎ stations), FABRICATE, SHARE,
  STUDIO.

### FABRICATE: make your own modules

Pick a template, name it, choose an icon, an accent (orange, green, cyan,
magenta, red) and a size, fill it in, and it comes online as a station:
Link Deck, Quick Keys (tel:, sms:, app links, `shortcuts://run-shortcut?name=`),
Log (notes that save as you type), Checklist, Counter (+/− right on the tile),
Timer (alarm + vibration, survives closing the app), Stopwatch (laps),
Countdown (T−days), World Clock, Web Panel (docks an https page that allows
framing). Edit or decommission any of them later.

### SHARE: your bridge is a template

SHARE renames the ship and packs your stations into a link (`/#bridge=...`)
or a `.bridge.json` file. Whoever opens it gets your stations, skins and
links added to theirs (your notes, ticks, counts and timers stay home). Reset
restores the default bridge. Layout and modules live in localStorage
(`bo.bridge`); links and files are untrusted, so `sanitizeLayout()` caps
every field, keeps only known templates, icons and accents, and drops
`javascript:` / `data:` links.

## Editing links and shortcuts

Everything is in `config.js`: the weather home spot and units, 12/24-hour
clock, the calendar button, `sites` and `shortcuts`. Each group there is one
drop-down card; add items to a group or add new groups. Icons are the names in
`ICONS` in `themes.js` (listed at the top of `config.js`). After editing, bump
`CACHE` in `sw.js` so installed copies pick it up.

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
links are sent there). On a link, the page removes the manifest so iOS saves that exact address
when it is added to the Home Screen, and sets the title and a home-screen
icon drawn in the theme's colors. With no link, `/screen` shows the Studio's
default Matrix screen (`OWNER` in `themes.js`). Tapping the name at the top of any
screen opens Customize: edit this screen in the builder, or start a new one.

## Files

| File | What |
| --- | --- |
| `index.html` | The Bridge: HUD, viewscreen, stations, dock and console sheet. |
| `config.js` | **All links, sites and shortcuts**, plus weather spot and clock settings. |
| `app.js` | Bridge logic: system modules, FABRICATE templates, arrange, share/import, starfield. |
| `app.css` | Bridge styles (black + neon orange/green; safe areas for the notch and home bar). |
| `themes.js` | Icon set (shared), plus the Studio's themes, app catalog, `OWNER` screen and link codec + sanitizer. |
| `screen.html`, `screen.js`, `screen.css` | The Studio's one-page themed screen at `/screen`. |
| `build.html`, `build.css`, `build.js` | Blackout Studio, the builder at `/build`. |
| `vercel.json` | Clean URLs, so `/build` serves `build.html` and `/screen` serves `screen.html`. |
| `manifest.json` | Home-screen app settings. |
| `sw.js` | Offline cache. **Bump `CACHE` (e.g. `-v15`) whenever a file changes**, or installed copies keep the old files. |
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
- Every project link in `config.js` points at its live `*.vercel.app` address.