# matrix-blackout
iPhone Control Center

**MATRIX // BLACKOUT** themes the phone: a Matrix home screen with a black
background, green terminal text and katakana code rain. Open it in Safari on
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

## Screen

Green on black, VT323 / Share Tech Mono, katakana code rain behind
everything. A top bar holds the name, an Online/Offline light and three tabs;
a glowing light slides under the active tab and follows your finger while
you swipe. Swipe left/right or tap a tab to move between three full screens.
Each screen scrolls on its own, and every widget is a drop-down card: tap its
header to fold it open or shut (the header shows a summary while shut). Which
cards are open, and the last screen you were on, are remembered on the phone.

1. **Basics**: Clock (seconds, time zone, UTC), Date (day of year, week),
   Weather (Open-Meteo, free, no key; 5-day forecast, feels like, humidity,
   wind, rain chance, UV), Calendar (month grid, flip months, Open Calendar),
   Sun & Moon, Progress (day/week/month/year), Location (browser geolocation,
   place name from BigDataCloud's free no-key lookup), Battery, Network,
   Device, Storage. Weather starts at the home spot in `config.js`; "Use my
   location" switches to the phone's position. Things iOS keeps from web apps
   (battery level, Wi-Fi/cell, Health/steps, notifications) show a clear
   placeholder card instead.
2. **My Sites**: drop-downs of link cards from `sites` in `config.js`. A site
   with an empty `url` shows as "set up" until you fill it in.
3. **Shortcuts**: drop-downs of big buttons from `shortcuts` in `config.js`.
   iOS app links (`tel:`, `sms:`, `maps://`, `music://`, `calshow://`...)
   open the app. Things with no app link (camera, flashlight, alarm, timer,
   Settings, Wi-Fi, Focus, Low Power) are placeholders: make a shortcut in the
   Shortcuts app, then put its exact name in that button's `shortcut` field;
   the button then opens `shortcuts://run-shortcut?name=...`.

The iPhone status bar (time, battery) is drawn by iOS and cannot be hidden by
a web app; the page runs under it (`black-translucent`) and pads for the notch
and home bar. Code rain pauses in the background and is a still frame when
Reduce Motion is on.

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
| `index.html` | The home screen: top bar, tabs and the three screens. |
| `config.js` | **All links, sites and shortcuts**, plus weather spot and clock settings. |
| `app.js` | Home screen logic: pager and tab light, drop-down cards, widgets, code rain. |
| `app.css` | Home screen styles (safe areas for the notch and home bar). |
| `themes.js` | Icon set (shared), plus the Studio's themes, app catalog, `OWNER` screen and link codec + sanitizer. |
| `screen.html`, `screen.js`, `screen.css` | The Studio's one-page themed screen at `/screen`. |
| `build.html`, `build.css`, `build.js` | Blackout Studio, the builder at `/build`. |
| `vercel.json` | Clean URLs, so `/build` serves `build.html` and `/screen` serves `screen.html`. |
| `manifest.json` | Home-screen app settings. |
| `sw.js` | Offline cache. **Bump `CACHE` (e.g. `-v14`) whenever a file changes**, or installed copies keep the old files. |
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
- 411 BCS, 411 Market, the arcade and the game have empty `url`s in
  `config.js` until their addresses are filled in.
