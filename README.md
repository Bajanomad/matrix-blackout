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

- **Status line**: name and an Online/Offline indicator.
- **Clock widget**: time and date, from the phone.
- **Weather widget**: current conditions from Open-Meteo (free, no key).
  Defaults to Todos Santos (23.4464, -110.2265, from the 411 places data).
  Tap it to use the phone's location; the choice is remembered on that phone.
- **Shortcuts** (10):

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

## Files

| File | What |
| --- | --- |
| `index.html` | The page. |
| `app.css` | Theme and layout (safe areas for the notch and home bar). |
| `app.js` | Shortcuts and repository list (`APPS`, `REPOS` at the top), rain, widgets, menu. |
| `manifest.json` | Home-screen app settings. |
| `sw.js` | Offline cache. **Bump `CACHE` (e.g. `-v7`) whenever a file changes**, or installed copies keep the old files. |
| `matrix-icon.svg` | Icon. |
| `apple-touch-icon.png` | 180×180 iPhone home-screen icon, rendered from the SVG. |

To change a shortcut or add a repository, edit `APPS` or `REPOS` in `app.js`
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
