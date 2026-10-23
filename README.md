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

Styled like the Matrix 411 site: green on black, terminal panels with
`name://` title bars, VT323 / Share Tech Mono, katakana code rain behind
everything, and a typed `> wake up, neo...` boot line.

The screen is locked to one phone screen: no scrolling, no pinch or double-tap
zoom. The clock stays on top; weather, apps, calendar and status are folded
bars, and tapping one opens it (the others fold shut so everything fits).
The iPhone status bar (time, battery) is drawn by iOS and cannot be hidden
by a web app; the page runs under it (`black-translucent`).

Widgets:

- **clock://local**: time with seconds, and the date, from the phone.
- **weather://todos-santos**: current conditions, high/low, sunrise/sunset
  and a 4-day forecast from Open-Meteo (free, no key). Defaults to Todos
  Santos (23.4464, -110.2265, from the 411 places data). The ⌖ button
  switches to the phone's location; the choice is remembered on that phone.
- **cal://month**: this month with today lit; tap to open Calendar.
- **sys://status**: progress bars for the day, week and year, and the moon
  phase with how much of it is lit.
- **Online/Offline** indicator next to the name.

- **apps://launch**: 10 shortcuts, each with a drawn green line icon
  (Matrix-style, not the companies' logos):

| Shortcut | Opens |
| --- | --- |
| Claude Code | https://claude.ai/code |
| ChatGPT | https://chatgpt.com/ |
| GitHub | https://github.com/ |
| Spotify | https://open.spotify.com/ |
| WhatsApp | `whatsapp://` (the app) |
| Signal | `sgnl://` (the app; Signal has no web version) |
| Gmail | https://mail.google.com/ |
| Calendar | https://calendar.google.com/ (Google Calendar) |
| Matrix 411 | https://411matrix.vercel.app/ |
| Repos | the repository menu below |

- **Repository menu** (its own screen; back arrow, Escape, tapping outside
  the links, or the phone's back gesture returns home): Blackout, Matrix 411,
  411 BCS, 411 Market, and All repositories (github.com/Bajanomad). Private
  repositories need you signed in to GitHub.

Code rain pauses when the app is in the background and is off when the phone
has Reduce Motion turned on.

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

On a link, the page removes the manifest so iOS saves that exact address
when it is added to the Home Screen, and sets the title and a home-screen
icon drawn in the theme's colors. With no link, `/` is still the owner's
Matrix screen (`OWNER` in `themes.js`). Tapping the name at the top of any
screen opens Customize: edit this screen in the builder, or start a new one.

## Files

| File | What |
| --- | --- |
| `index.html` | The page. |
| `app.css` | Theme and layout (safe areas for the notch and home bar). |
| `themes.js` | Themes, icons, the app catalog, the owner's screen (`OWNER`), and the link codec + sanitizer. |
| `app.js` | The home screen: background effects, widgets, launcher, folders, Customize. |
| `build.html`, `build.css`, `build.js` | Blackout Studio, the builder at `/build`. |
| `vercel.json` | Clean URLs, so `/build` serves `build.html`. |
| `manifest.json` | Home-screen app settings. |
| `sw.js` | Offline cache. **Bump `CACHE` (e.g. `-v7`) whenever a file changes**, or installed copies keep the old files. |
| `matrix-icon.svg` | Icon: a glowing ring with Matrix code rain falling inside (animated SVG; regenerate with `python3 tools/make-icons.py`). |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `favicon-32.png`, `favicon.ico` | PNG/ICO renders of the ring icon for the manifest and older browsers. |
| `apple-touch-icon.png` | 180×180 iPhone home-screen icon, rendered from the SVG. |

To change the owner's shortcuts or repositories, edit `OWNER` in `themes.js`
and bump the cache in `sw.js`.

## History

The manifest, service worker and icon were first imported into a
`matrix-blackout/` folder inside `411matrix` and the screen was built there.
They were moved here, to the project's own repo, and that folder was removed
from `411matrix`.

## Known limits

- Hosted on the Vercel project `matrix-blackout`
  (team `bajaheat24x7-8566s-projects`), connected to this repo.
- WhatsApp and Signal open through their app links; if the app is not
  installed, Safari shows an "address is invalid" message.
