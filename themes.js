/* BLACKOUT themes — shared by the home screen (app.js) and the builder
 * (build.js): the themes, the icon set, the app catalog, the owner's own
 * screen, and the codec that packs a whole screen into its link (#c=...).
 * Everything a link carries is untrusted, so it goes through sanitize(). */
(function () {
  "use strict";

  /* ---------- Themes ----------
   * css: the data-theme value (variables live in app.css).
   * fonts: Google Fonts css2 family query.
   * fx: the background effect app.js draws.
   * title(kind, arg): each panel's title bar, in the theme's own voice. */
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  var THEMES = {
    matrix: {
      label: "Matrix",
      blurb: "Green code rain, terminal panels, wake up Neo.",
      fonts: "family=Share+Tech+Mono&family=VT323",
      fx: "rain",
      name: "BLACKOUT", sub: "Matrix // phone", boot: "> wake up, neo...",
      swatch: ["#000000", "#00ff41", "#d4ffe4"],
      icon: { bg: "#000000", fg: "#00ff41", glyph: "terminal" },
      title: function (k, a) {
        return { clock: "clock://local", weather: "weather://" + slug(a), apps: "apps://launch", calendar: "cal://" + String(a).toLowerCase(), status: "sys://status" }[k] || a;
      },
    },
    western: {
      label: "Wild West",
      blurb: "Desert sunset, mesas, drifting dust and wanted-poster type.",
      fonts: "family=Rye&family=Bitter:wght@400;600;700",
      fx: "desert",
      name: "FRONTIER", sub: "Est. 1886 · Territory phone", boot: "Saddle up, partner.",
      swatch: ["#2a140b", "#f2b544", "#f6e7c8"],
      icon: { bg: "#3a1c0e", fg: "#f2b544", glyph: "star" },
      title: function (k, a) {
        return { clock: "★ Town Clock", weather: "★ Sky over " + a, apps: "★ General Store", calendar: "★ Almanac · " + a, status: "★ Trail Log" }[k] || "★ " + a;
      },
    },
    space: {
      label: "Deep Space",
      blurb: "A starfield with shooting stars and mission-control readouts.",
      fonts: "family=Orbitron:wght@500;700&family=Exo+2:wght@400;600",
      fx: "stars",
      name: "ORBIT", sub: "Mission control", boot: "All systems nominal. Liftoff.",
      swatch: ["#03040c", "#7cc4ff", "#c9b6ff"],
      icon: { bg: "#050816", fg: "#7cc4ff", glyph: "rocket" },
      title: function (k, a) {
        return { clock: "CHRONO · LOCAL", weather: "ATMOS · " + String(a).toUpperCase(), apps: "MODULES", calendar: "MISSION CAL · " + String(a).toUpperCase(), status: "TELEMETRY" }[k] || String(a).toUpperCase();
      },
    },
    synthwave: {
      label: "Synthwave",
      blurb: "Outrun sun, neon grid racing to the horizon.",
      fonts: "family=Audiowide&family=Rajdhani:wght@500;600;700",
      fx: "grid",
      name: "NIGHTDRIVE", sub: "1986 forever", boot: "Insert coin to continue",
      swatch: ["#14002b", "#ff2bd6", "#22e4ff"],
      icon: { bg: "#14002b", fg: "#ff2bd6", glyph: "bolt" },
      title: function (k, a) {
        return { clock: "CLOCK.EXE", weather: "WEATHER.EXE", apps: "APPS.EXE", calendar: "CAL.EXE", status: "STATUS.EXE" }[k] || String(a).toUpperCase().replace(/\s+/g, "_") + ".EXE";
      },
    },
    ocean: {
      label: "Baja Beach",
      blurb: "Rolling waves, warm sand colors, easy reading.",
      fonts: "family=Fredoka:wght@500;600&family=Nunito:wght@500;700;800",
      fx: "waves",
      name: "Low Tide", sub: "Salt life", boot: "Surf's up.",
      swatch: ["#04303c", "#ffd166", "#e9fbff"],
      icon: { bg: "#065a6b", fg: "#ffd166", glyph: "sun" },
      title: function (k, a) {
        return { clock: "Clock", weather: "Weather · " + a, apps: "Apps", calendar: "Calendar · " + a, status: "Today" }[k] || a;
      },
    },
    minimal: {
      label: "Minimal",
      blurb: "Quiet dark glass, no effects. Just your stuff.",
      fonts: "family=Inter:wght@400;500;600;700",
      fx: "none",
      name: "Home", sub: "", boot: "",
      swatch: ["#0b0b10", "#ffffff", "#9aa3b2"],
      icon: { bg: "#111118", fg: "#ffffff", glyph: "home" },
      title: function (k, a) {
        return { clock: "Clock", weather: "Weather · " + a, apps: "Apps", calendar: "Calendar · " + a, status: "Today" }[k] || a;
      },
    },
  };

  /* ---------- Icons: line drawings on a 24x24 grid ([tag, attrs] pairs) ---------- */
  var ICONS = {
    terminal: [["rect", { x: 3, y: 4, width: 18, height: 16, rx: 2 }], ["path", { d: "M7 10l3 2.5L7 15" }], ["path", { d: "M12.5 15.5H17" }]],
    spark: [["path", { d: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" }], ["path", { d: "M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" }]],
    branch: [["circle", { cx: 6, cy: 5, r: 2 }], ["circle", { cx: 6, cy: 19, r: 2 }], ["circle", { cx: 18, cy: 7, r: 2 }], ["path", { d: "M6 7v10" }], ["path", { d: "M18 9c0 5-12 3-12 8" }]],
    waves: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M7 9.5c3.5-1.3 7-1.1 10 .7" }], ["path", { d: "M7.6 12.7c2.9-1 5.8-.8 8.3.6" }], ["path", { d: "M8.3 15.7c2.2-.7 4.4-.5 6.3.5" }]],
    phone: [["path", { d: "M4 20l1.2-3.6A8.5 8.5 0 1 1 8 19z" }], ["path", { d: "M9.2 8.6c.3-.4.8-.4 1 0l.8 1.4c.2.3.1.7-.2 1l-.5.4a5 5 0 0 0 2.3 2.3l.4-.5c.3-.3.7-.4 1-.2l1.4.8c.4.2.4.7 0 1-.8.8-2 1-3 .5a8 8 0 0 1-3.7-3.7c-.5-1-.3-2.2.5-3z" }]],
    shield: [["path", { d: "M12 3.5a8.5 8.5 0 1 1-6.6 13.9L4 20.5l3.1-1.3A8.5 8.5 0 0 1 12 3.5z", "stroke-dasharray": "2.4 1.6" }], ["path", { d: "M9 12h6M12 9v6" }]],
    mail: [["rect", { x: 3, y: 5.5, width: 18, height: 13, rx: 1.5 }], ["path", { d: "M3.5 7l8.5 6 8.5-6" }]],
    calendar: [["rect", { x: 3.5, y: 5, width: 17, height: 15, rx: 1.5 }], ["path", { d: "M3.5 10h17M8 3v4M16 3v4" }], ["path", { d: "M8 14h2M14 14h2M8 17h2" }]],
    globe: [["circle", { cx: 12, cy: 12, r: 9 }], ["ellipse", { cx: 12, cy: 12, rx: 4, ry: 9 }], ["path", { d: "M3.5 9h17M3.5 15h17" }]],
    repo: [["path", { d: "M3 6.5h6l2 2h10V19H3z" }], ["path", { d: "M10 12.5l-2 2 2 2M14 12.5l2 2-2 2" }]],
    folder: [["path", { d: "M3 6.5h6l2 2h10V19H3z" }]],
    chat: [["path", { d: "M4 5h16v11H9l-4 3.5V16H4z" }], ["path", { d: "M8 9.5h8M8 12.5h5" }]],
    call: [["path", { d: "M6.5 3.5l3 .5 1.2 3.8-2 1.4a11 11 0 0 0 6.1 6.1l1.4-2 3.8 1.2.5 3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" }]],
    camera: [["path", { d: "M3 8h4l1.8-2.5h6.4L17 8h4v11H3z" }], ["circle", { cx: 12, cy: 13, r: 3.6 }]],
    photo: [["rect", { x: 3, y: 4.5, width: 18, height: 15, rx: 1.5 }], ["circle", { cx: 8.5, cy: 9.5, r: 1.6 }], ["path", { d: "M3.5 17l5-5 4 4 2.5-2.5 5.5 5" }]],
    map: [["path", { d: "M3 6l6-2.5 6 2.5 6-2.5v14.5L15 20.5 9 18l-6 2.5z" }], ["path", { d: "M9 3.5V18M15 6v14.5" }]],
    pin: [["path", { d: "M12 21s-6.5-6.3-6.5-11a6.5 6.5 0 0 1 13 0c0 4.7-6.5 11-6.5 11z" }], ["circle", { cx: 12, cy: 10, r: 2.4 }]],
    music: [["path", { d: "M9 18V5.5l11-2V16" }], ["circle", { cx: 6.5, cy: 18, r: 2.5 }], ["circle", { cx: 17.5, cy: 16, r: 2.5 }]],
    play: [["rect", { x: 2.5, y: 5, width: 19, height: 14, rx: 3 }], ["path", { d: "M10 9v6l5-3z" }]],
    cart: [["path", { d: "M3 4h2.5l2.2 10.5h10.8L20.5 7H6.6" }], ["circle", { cx: 9, cy: 19, r: 1.5 }], ["circle", { cx: 17, cy: 19, r: 1.5 }]],
    card: [["rect", { x: 2.5, y: 5.5, width: 19, height: 13, rx: 2 }], ["path", { d: "M2.5 10h19M6 15h4" }]],
    news: [["path", { d: "M4 5h13v14H6a2 2 0 0 1-2-2z" }], ["path", { d: "M17 9h3v8a2 2 0 0 1-2 2" }], ["path", { d: "M7 9h7M7 12h7M7 15h4" }]],
    book: [["path", { d: "M4 5.5C6.5 4 9.5 4 12 5.5v14c-2.5-1.5-5.5-1.5-8 0z" }], ["path", { d: "M20 5.5c-2.5-1.5-5.5-1.5-8 0v14c2.5-1.5 5.5-1.5 8 0z" }]],
    note: [["path", { d: "M5 3.5h10l4 4v13H5z" }], ["path", { d: "M15 3.5v4h4M8 12h8M8 15.5h8M8 9h4" }]],
    cloud: [["path", { d: "M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9a4.75 4.75 0 0 1-.5 9.5z" }]],
    home: [["path", { d: "M3.5 11L12 4l8.5 7" }], ["path", { d: "M6 9.5V20h12V9.5" }], ["path", { d: "M10 20v-5.5h4V20" }]],
    heart: [["path", { d: "M12 20s-7.5-4.6-8.6-9.6A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 8.6 3.2C19.5 15.4 12 20 12 20z" }]],
    star: [["path", { d: "M12 3.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" }]],
    game: [["path", { d: "M7 7.5h10a4.5 4.5 0 0 1 4.3 5.8l-1 3.3a2.4 2.4 0 0 1-4 1L14.5 15.5h-5L7.7 17.6a2.4 2.4 0 0 1-4-1l-1-3.3A4.5 4.5 0 0 1 7 7.5z" }], ["path", { d: "M7.5 10.5v3M6 12h3" }], ["circle", { cx: 16, cy: 11, r: 0.6 }], ["circle", { cx: 17.6, cy: 13, r: 0.6 }]],
    bolt: [["path", { d: "M13 2.5L5 13.5h6l-1 8 8-11h-6z" }]],
    search: [["circle", { cx: 10.5, cy: 10.5, r: 6.5 }], ["path", { d: "M15.3 15.3L21 21" }]],
    gear: [["circle", { cx: 12, cy: 12, r: 3.2 }], ["path", { d: "M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" }]],
    user: [["circle", { cx: 12, cy: 8, r: 4 }], ["path", { d: "M4 20.5a8 8 0 0 1 16 0" }]],
    car: [["path", { d: "M3.5 16.5v-4l2-5h13l2 5v4z" }], ["path", { d: "M3.5 12.5h17" }], ["circle", { cx: 7.5, cy: 17.5, r: 1.8 }], ["circle", { cx: 16.5, cy: 17.5, r: 1.8 }]],
    plane: [["path", { d: "M21 4.5L3 11l7 2.5 2.5 7z" }], ["path", { d: "M10 13.5L21 4.5" }]],
    sun: [["circle", { cx: 12, cy: 12, r: 4 }], ["path", { d: "M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" }]],
    moon: [["path", { d: "M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" }]],
    rocket: [["path", { d: "M12 2.5c3.5 2.5 5 6.5 4 11.5H8c-1-5 .5-9 4-11.5z" }], ["circle", { cx: 12, cy: 9, r: 1.8 }], ["path", { d: "M8 14l-3 3.5h4M16 14l3 3.5h-4M10.5 17.5l1.5 3.5 1.5-3.5" }]],
    coffee: [["path", { d: "M4.5 8.5h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" }], ["path", { d: "M16.5 10h1.5a2.5 2.5 0 0 1 0 5h-1.5" }], ["path", { d: "M8.5 3.5v2M12.5 3.5v2" }]],
    horseshoe: [["path", { d: "M6.5 20.5H4.2C3.4 16 3 11.5 4.5 8a8 8 0 0 1 15 0c1.5 3.5 1.1 8-.3 12.5h-2.3" }], ["path", { d: "M6.5 20.5c-1-4-1-8 .5-10.5a5.7 5.7 0 0 1 10 0c1.5 2.5 1.5 6.5.5 10.5" }], ["circle", { cx: 6.4, cy: 12, r: 0.5 }], ["circle", { cx: 17.6, cy: 12, r: 0.5 }]],
    cactus: [["path", { d: "M10 21V5a2 2 0 0 1 4 0v16" }], ["path", { d: "M10 13H7a2 2 0 0 1-2-2V8.5a1.5 1.5 0 0 1 3 0V10h2" }], ["path", { d: "M14 15h3a2 2 0 0 0 2-2V10.5a1.5 1.5 0 0 0-3 0V12h-2" }], ["path", { d: "M6 21h12" }]],
    wave: [["path", { d: "M2.5 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 3-2" }], ["path", { d: "M2.5 19c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 3-2" }], ["path", { d: "M5 11c0-4 3-6.5 6.5-6.5 2.5 0 4 1.5 4 3-1.5-.5-3.5 0-4 2" }]],
    link: [["path", { d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" }], ["path", { d: "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" }]],
  };

  /* ---------- App catalog for the builder's quick-add list ----------
   * Web addresses open the app when it is installed (universal links);
   * the few app links (sms:, tel:...) are iPhone built-ins. */
  var CATALOG = [
    { label: "Messages", icon: "chat", href: "sms:" },
    { label: "Phone", icon: "call", href: "tel:" },
    { label: "Mail", icon: "mail", href: "message://" },
    { label: "Maps", icon: "map", href: "https://maps.apple.com/" },
    { label: "Photos", icon: "photo", href: "photos-redirect://" },
    { label: "Notes", icon: "note", href: "mobilenotes://" },
    { label: "Music", icon: "music", href: "https://music.apple.com/" },
    { label: "Spotify", icon: "waves", href: "https://open.spotify.com/" },
    { label: "YouTube", icon: "play", href: "https://www.youtube.com/" },
    { label: "WhatsApp", icon: "phone", href: "whatsapp://" },
    { label: "Instagram", icon: "camera", href: "https://www.instagram.com/" },
    { label: "Facebook", icon: "user", href: "https://www.facebook.com/" },
    { label: "Gmail", icon: "mail", href: "https://mail.google.com/" },
    { label: "Google", icon: "search", href: "https://www.google.com/" },
    { label: "Calendar", icon: "calendar", href: "https://calendar.google.com/" },
    { label: "ChatGPT", icon: "spark", href: "https://chatgpt.com/" },
    { label: "Claude", icon: "spark", href: "https://claude.ai/" },
    { label: "Amazon", icon: "cart", href: "https://www.amazon.com/" },
    { label: "Netflix", icon: "play", href: "https://www.netflix.com/" },
    { label: "News", icon: "news", href: "https://news.google.com/" },
    { label: "Weather", icon: "cloud", href: "https://weather.com/" },
    { label: "GitHub", icon: "branch", href: "https://github.com/" },
  ];

  /* ---------- Starter screens for each theme in the builder ---------- */
  var STARTER_APPS = [
    { l: "Messages", i: "chat", h: "sms:" },
    { l: "Phone", i: "call", h: "tel:" },
    { l: "Maps", i: "map", h: "https://maps.apple.com/" },
    { l: "Photos", i: "photo", h: "photos-redirect://" },
    { l: "Music", i: "music", h: "https://music.apple.com/" },
    { l: "YouTube", i: "play", h: "https://www.youtube.com/" },
    { l: "Mail", i: "mail", h: "message://" },
    { l: "Notes", i: "note", h: "mobilenotes://" },
    { l: "Google", i: "search", h: "https://www.google.com/" },
    { l: "Favorites", i: "star", m: [
      { n: "Wikipedia", d: "The free encyclopedia", h: "https://www.wikipedia.org/" },
      { n: "Reddit", d: "Front page", h: "https://www.reddit.com/" },
    ] },
  ];

  function starter(themeId) {
    var t = THEMES[themeId] || THEMES.matrix;
    return {
      v: 1, t: themeId, n: t.name, s: t.sub, b: t.boot,
      w: { n: "Los Angeles", la: 34.0522, lo: -118.2437 }, u: "f",
      x: ["weather", "apps", "calendar", "status"], o: "apps",
      k: "https://calendar.google.com/",
      a: JSON.parse(JSON.stringify(STARTER_APPS)),
    };
  }

  /* ---------- The owner's own screen (what "/" shows with no link) ---------- */
  var OWNER = {
    v: 1, t: "matrix", n: "BLACKOUT", s: "Matrix // phone", b: "> wake up, neo...",
    w: { n: "Todos Santos", la: 23.4464, lo: -110.2265 }, u: "f",
    x: ["weather", "apps", "calendar", "status"], o: "weather",
    k: "https://calendar.google.com/",
    a: [
      { l: "Claude Code", i: "terminal", h: "https://claude.ai/code" },
      { l: "ChatGPT", i: "spark", h: "https://chatgpt.com/" },
      { l: "GitHub", i: "branch", h: "https://github.com/" },
      { l: "Spotify", i: "waves", h: "https://open.spotify.com/" },
      { l: "WhatsApp", i: "phone", h: "whatsapp://" },
      { l: "Signal", i: "shield", h: "sgnl://" },
      { l: "Gmail", i: "mail", h: "https://mail.google.com/" },
      { l: "Calendar", i: "calendar", h: "https://calendar.google.com/" },
      { l: "Matrix 411", i: "globe", h: "https://411matrix.vercel.app/" },
      { l: "Repos", i: "repo", m: [
        { n: "Blackout", d: "Phone theme · Bajanomad/matrix-blackout", h: "https://github.com/Bajanomad/matrix-blackout" },
        { n: "Matrix 411", d: "Matrix remake of the old website · Bajanomad/411matrix", h: "https://github.com/Bajanomad/411matrix" },
        { n: "411 BCS", d: "Bajanomad/411", h: "https://github.com/Bajanomad/411" },
        { n: "411 Market", d: "Bajanomad/411-market", h: "https://github.com/Bajanomad/411-market" },
        { n: "All repositories", d: "github.com/Bajanomad", h: "https://github.com/Bajanomad?tab=repositories" },
      ] },
    ],
  };

  var WIDGETS = ["weather", "apps", "calendar", "status"];
  var MAX_APPS = 20, MAX_LINKS = 20;

  /* ---------- Sanitizing: a shared link can carry anything ---------- */
  function str(v, max) { return typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, "").slice(0, max) : ""; }
  function num(v, lo, hi) { return typeof v === "number" && isFinite(v) && v >= lo && v <= hi ? v : null; }

  // Web links and app links (sms:, whatsapp://...) are fine; script-running
  // and local schemes are not.
  function safeHref(v) {
    var h = str(v, 600).trim();
    var m = /^([a-z][a-z0-9+.-]*):/i.exec(h);
    if (!m) return "";
    var scheme = m[1].toLowerCase();
    if (["javascript", "data", "vbscript", "file", "blob", "about", "chrome", "view-source"].indexOf(scheme) !== -1) return "";
    return h;
  }

  function sanitize(raw) {
    if (!raw || typeof raw !== "object") return null;
    var t = THEMES[raw.t] ? raw.t : "matrix";
    var cfg = {
      v: 1, t: t,
      n: str(raw.n, 24) || THEMES[t].name,
      s: str(raw.s, 40),
      b: str(raw.b, 60),
      u: raw.u === "c" ? "c" : "f",
      k: safeHref(raw.k) || "https://calendar.google.com/",
      x: [], o: "", w: null, a: [],
    };
    if (raw.w && typeof raw.w === "object") {
      var la = num(raw.w.la, -90, 90), lo = num(raw.w.lo, -180, 180);
      if (la !== null && lo !== null) cfg.w = { n: str(raw.w.n, 40) || "Weather", la: la, lo: lo };
    }
    (Array.isArray(raw.x) ? raw.x : []).forEach(function (k) {
      if (WIDGETS.indexOf(k) !== -1 && cfg.x.indexOf(k) === -1) cfg.x.push(k);
    });
    if (!cfg.w) cfg.x = cfg.x.filter(function (k) { return k !== "weather"; });
    cfg.o = cfg.x.indexOf(raw.o) !== -1 ? raw.o : cfg.x[0] || "";
    (Array.isArray(raw.a) ? raw.a : []).slice(0, MAX_APPS).forEach(function (a) {
      if (!a || typeof a !== "object") return;
      var app = { l: str(a.l, 18) || "App", i: ICONS[a.i] ? a.i : "link" };
      if (Array.isArray(a.m)) {
        app.m = a.m.slice(0, MAX_LINKS).map(function (r) {
          return r && typeof r === "object" ? { n: str(r.n, 40) || "Link", d: str(r.d, 80), h: safeHref(r.h) } : null;
        }).filter(function (r) { return r && r.h; });
        cfg.a.push(app);
      } else {
        app.h = safeHref(a.h);
        if (app.h) cfg.a.push(app);
      }
    });
    return cfg;
  }

  /* ---------- Link codec: JSON → UTF-8 → base64url in #c= ---------- */
  function encode(cfg) {
    var bytes = new TextEncoder().encode(JSON.stringify(cfg));
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decode(text) {
    try {
      var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return sanitize(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) {
      return null;
    }
  }

  function fromHash(hash) {
    var m = /(?:^#|&)c=([A-Za-z0-9_-]+)/.exec(hash || "");
    return m ? decode(m[1]) : null;
  }

  function linkFor(cfg, path) {
    return location.origin + (path || "/") + "#c=" + encode(cfg);
  }

  function fontHref(themeId) {
    return "https://fonts.googleapis.com/css2?" + (THEMES[themeId] || THEMES.matrix).fonts + "&display=swap";
  }

  window.BLACKOUT = {
    THEMES: THEMES, ICONS: ICONS, CATALOG: CATALOG, OWNER: OWNER, WIDGETS: WIDGETS,
    MAX_APPS: MAX_APPS, MAX_LINKS: MAX_LINKS,
    starter: starter, sanitize: sanitize, encode: encode, decode: decode,
    fromHash: fromHash, linkFor: linkFor, fontHref: fontHref,
  };
})();
