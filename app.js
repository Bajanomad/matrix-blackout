/* MATRIX // BLACKOUT — phone home screen: code rain, clock, weather, shortcuts,
 * and the repository menu. All content is built with DOM APIs and textContent. */
(function () {
  "use strict";

  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Shortcuts: official web addresses, or the app's own link for WhatsApp and
   * Signal (Signal has no web app). `menu` opens the repository screen. */
  var APPS = [
    { label: "Claude Code", ico: "CC", href: "https://claude.ai/code" },
    { label: "ChatGPT", ico: "GPT", href: "https://chatgpt.com/" },
    { label: "GitHub", ico: "GH", href: "https://github.com/" },
    { label: "Spotify", ico: "SP", href: "https://open.spotify.com/" },
    { label: "WhatsApp", ico: "WA", href: "whatsapp://" },
    { label: "Signal", ico: "SG", href: "sgnl://" },
    { label: "Gmail", ico: "GM", href: "https://mail.google.com/" },
    { label: "Calendar", ico: "CAL", href: "https://calendar.google.com/" },
    { label: "Matrix 411", ico: "411", href: "https://411matrix.vercel.app/" },
    { label: "Repos", ico: "{ }", menu: "repos" },
  ];

  /* Repositories in the connected GitHub account (Bajanomad). */
  var REPOS = [
    { label: "Blackout", note: "Bajanomad/matrix-blackout", href: "https://github.com/Bajanomad/matrix-blackout" },
    { label: "Matrix 411", note: "Bajanomad/411matrix", href: "https://github.com/Bajanomad/411matrix" },
    { label: "411 BCS", note: "Bajanomad/411", href: "https://github.com/Bajanomad/411" },
    { label: "411 Market", note: "Bajanomad/411-market", href: "https://github.com/Bajanomad/411-market" },
    { label: "All repositories", note: "github.com/Bajanomad", href: "https://github.com/Bajanomad?tab=repositories" },
  ];

  /* Weather defaults to Todos Santos (coordinates from the 411 places data). */
  var HOME_SPOT = { name: "Todos Santos", lat: 23.4464, lng: -110.2265 };
  var SPOT_KEY = "blackout.spot";

  /** el("div", {class: "x", text: "hi"}, [children]) */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) return;
        if (k === "text") node.textContent = v;
        else if (k === "class") node.className = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? "" : String(v));
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  /* ---------- Code rain ---------- */
  function startRain() {
    var canvas = el("canvas", { id: "rain", "aria-hidden": "true" });
    document.body.prepend(el("div", { id: "scan", "aria-hidden": "true" }));
    document.body.prepend(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var GLYPHS = "アカサタナハマヤラワイキシチニヒミリウクスツヌフムユルエケセテネヘメレオコソトノホモヨロ0123456789";
    var size = 16, drops = [], w = 0, h = 0, raf = 0, last = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = [];
      for (var i = 0; i < Math.ceil(w / size); i++) drops[i] = Math.floor(Math.random() * -h / size);
      ctx.fillStyle = "#020704"; ctx.fillRect(0, 0, w, h);
    }
    function frame() {
      ctx.fillStyle = "rgba(2,7,4,0.08)"; ctx.fillRect(0, 0, w, h);
      ctx.font = size + 'px "Share Tech Mono", ui-monospace, monospace';
      ctx.textBaseline = "top";
      for (var i = 0; i < drops.length; i++) {
        var y = drops[i] * size;
        if (y > 0) {
          ctx.fillStyle = Math.random() > 0.975 ? "#d4ffe4" : "rgba(53,255,118,0.6)";
          ctx.fillText(GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)), i * size, y);
        }
        if (y > h && Math.random() > 0.975) drops[i] = 0; else drops[i]++;
      }
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / 24) return;
      last = now; frame();
    }
    function start() { if (!raf) raf = requestAnimationFrame(loop); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (REDUCE) return; // static background under reduced motion
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    start();
  }

  /* ---------- Clock widget ---------- */
  function clockWidget() {
    var hm = el("span");
    var period = el("small");
    var time = el("time", null, [hm, period]);
    var date = el("div", { class: "date" });
    var fmt = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" });
    function tick() {
      var now = new Date();
      var parts = fmt.formatToParts(now);
      hm.textContent = parts.filter(function (p) { return p.type !== "dayPeriod"; }).map(function (p) { return p.value; }).join("").trim();
      period.textContent = parts.filter(function (p) { return p.type === "dayPeriod"; }).map(function (p) { return p.value; }).join("");
      time.setAttribute("datetime", now.toISOString());
      date.textContent = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
    }
    tick();
    setInterval(tick, 1000 * 15);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
    return el("section", { class: "panel clock", "aria-label": "Clock" }, [time, date]);
  }

  /* ---------- Weather widget (Open-Meteo, free, no key) ---------- */
  var WMO = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
    51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Snow", 73: "Snow", 75: "Heavy snow", 77: "Snow", 80: "Showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
  };

  function loadSpot() {
    try {
      var s = JSON.parse(localStorage.getItem(SPOT_KEY) || "null");
      if (s && typeof s.lat === "number" && typeof s.lng === "number") return s;
    } catch (e) { /* storage unavailable */ }
    return HOME_SPOT;
  }
  function saveSpot(s) {
    try { localStorage.setItem(SPOT_KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ }
  }

  function weatherWidget() {
    var temp = el("span", { class: "temp", text: "--°" });
    var desc = el("span", { text: "Loading weather" });
    var place = el("small");
    var btn = el("button", { class: "panel weather", type: "button", "aria-label": "Weather. Tap to use my location." }, [
      temp, el("span", { class: "meta" }, [desc, place]),
    ]);
    var spot = loadSpot();

    function load() {
      place.textContent = spot.name + " ⌖";
      if (!navigator.onLine) { desc.textContent = "Offline"; return; }
      var url = "https://api.open-meteo.com/v1/forecast?latitude=" + spot.lat + "&longitude=" + spot.lng +
        "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto";
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(function (d) {
        var c = d.current || {};
        var f = Math.round(c.temperature_2m);
        var cel = Math.round((c.temperature_2m - 32) * 5 / 9);
        temp.textContent = f + "°F";
        desc.textContent = (WMO[c.weather_code] || "Weather") + " · " + cel + "°C";
      }).catch(function () {
        desc.textContent = "Weather unavailable";
      });
    }

    btn.addEventListener("click", function () {
      if (!navigator.geolocation) return load();
      desc.textContent = "Finding you";
      navigator.geolocation.getCurrentPosition(function (pos) {
        spot = { name: "My location", lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4) };
        saveSpot(spot);
        load();
      }, function () {
        spot = HOME_SPOT;
        saveSpot(spot);
        load();
      }, { timeout: 10000, maximumAge: 600000 });
    });

    load();
    setInterval(load, 1000 * 60 * 15);
    window.addEventListener("online", load);
    return btn;
  }

  /* ---------- Shortcuts ---------- */
  function appTile(a, openMenu) {
    var inner = [el("span", { class: "ico", "aria-hidden": "true", text: a.ico }), el("span", { class: "lbl", text: a.label })];
    if (a.menu) {
      return el("li", null, [el("button", { class: "app", type: "button", "aria-haspopup": "dialog", onclick: openMenu }, inner)]);
    }
    var web = /^https:/.test(a.href);
    return el("li", null, [el("a", {
      class: "app", href: a.href,
      target: web ? "_blank" : null, rel: web ? "noopener" : null,
    }, inner)]);
  }

  /* ---------- Repository menu: its own screen, a history entry ---------- */
  function repoMenu() {
    var back = el("button", { class: "back", type: "button", "aria-label": "Back to home", text: "←" });
    var sheet = el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "repos-title", hidden: true }, [
      el("div", { class: "sheet-inner" }, [
        el("div", { class: "sheet-bar" }, [back, el("h2", { id: "repos-title", text: "Repositories" })]),
        el("ul", { class: "repos" }, REPOS.map(function (r) {
          return el("li", null, [el("a", { class: "repo", href: r.href, target: "_blank", rel: "noopener" }, [
            el("b", { text: r.label }), el("span", { text: r.note }),
          ])]);
        })),
      ]),
    ]);
    var opener = null;

    function show() {
      opener = document.activeElement;
      sheet.hidden = false;
      document.body.style.overflow = "hidden";
      back.focus();
    }
    function hide() {
      sheet.hidden = true;
      document.body.style.overflow = "";
      if (opener && opener.focus) opener.focus();
    }
    function open() {
      if (!sheet.hidden) return;
      history.pushState({ sheet: "repos" }, "");
      show();
    }
    function close() {
      if (sheet.hidden) return;
      if (history.state && history.state.sheet === "repos") history.back(); else hide();
    }

    back.addEventListener("click", close);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("popstate", function () {
      if (history.state && history.state.sheet === "repos") show(); else if (!sheet.hidden) hide();
    });
    // Reloaded while the menu was open: start on the home screen.
    if (history.state && history.state.sheet === "repos") history.replaceState(null, "");

    return { node: sheet, open: open };
  }

  /* ---------- Mount ---------- */
  startRain();
  var menu = repoMenu();
  var linkState = el("span", { class: "link-state" });
  function setLink() {
    linkState.textContent = navigator.onLine ? "Online" : "Offline";
    linkState.classList.toggle("off", !navigator.onLine);
  }
  setLink();
  window.addEventListener("online", setLink);
  window.addEventListener("offline", setLink);

  document.body.appendChild(el("main", { class: "home" }, [
    el("div", { class: "status" }, [el("span", { text: "Matrix // Blackout" }), linkState]),
    clockWidget(),
    weatherWidget(),
    el("ul", { class: "apps", "aria-label": "Shortcuts" }, APPS.map(function (a) { return appTile(a, menu.open); })),
    el("div", { class: "foot", text: "WAKE UP, NEO" }),
  ]));
  document.body.appendChild(menu.node);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
    });
  }
})();
