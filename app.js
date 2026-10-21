/* MATRIX // BLACKOUT — phone theme: code rain, widgets, app launcher and the
 * repository screen. All content is built with DOM APIs and textContent. */
(function () {
  "use strict";

  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  /* Line icons, drawn on a 24x24 grid: [tag, attributes] pairs. */
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
  };

  /* Shortcuts: official web addresses, or the app's own link for WhatsApp and
   * Signal (Signal has no web app). `menu` opens the repository screen. */
  var APPS = [
    { label: "Claude Code", icon: "terminal", href: "https://claude.ai/code" },
    { label: "ChatGPT", icon: "spark", href: "https://chatgpt.com/" },
    { label: "GitHub", icon: "branch", href: "https://github.com/" },
    { label: "Spotify", icon: "waves", href: "https://open.spotify.com/" },
    { label: "WhatsApp", icon: "phone", href: "whatsapp://" },
    { label: "Signal", icon: "shield", href: "sgnl://" },
    { label: "Gmail", icon: "mail", href: "https://mail.google.com/" },
    { label: "Calendar", icon: "calendar", href: "https://calendar.google.com/" },
    { label: "Matrix 411", icon: "globe", href: "https://411matrix.vercel.app/" },
    { label: "Repos", icon: "repo", menu: "repos" },
  ];

  /* Repositories in the connected GitHub account (Bajanomad). */
  var REPOS = [
    { name: "Blackout", desc: "Phone theme · Bajanomad/matrix-blackout", href: "https://github.com/Bajanomad/matrix-blackout" },
    { name: "Matrix 411", desc: "Matrix remake of the old website · Bajanomad/411matrix", href: "https://github.com/Bajanomad/411matrix" },
    { name: "411 BCS", desc: "Bajanomad/411", href: "https://github.com/Bajanomad/411" },
    { name: "411 Market", desc: "Bajanomad/411-market", href: "https://github.com/Bajanomad/411-market" },
    { name: "All repositories", desc: "github.com/Bajanomad", href: "https://github.com/Bajanomad?tab=repositories" },
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

  function icon(name) {
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    ICONS[name].forEach(function (part) {
      var node = document.createElementNS(SVGNS, part[0]);
      Object.keys(part[1]).forEach(function (k) { node.setAttribute(k, part[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  /** A terminal-window panel: title bar + body children (as on Matrix 411). */
  function panel(title, children, extraClass) {
    return el("section", { class: "panel" + (extraClass ? " " + extraClass : ""), "aria-label": title }, [
      el("div", { class: "term-bar" }, [
        el("span", { class: "dot on" }), el("span", { class: "dot" }), el("span", { class: "dot" }),
        el("span", { class: "label", text: title }),
      ]),
    ].concat(children));
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

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
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
    }
    function frame() {
      ctx.fillStyle = "rgba(0,0,0,0.07)"; ctx.fillRect(0, 0, w, h);
      ctx.font = size + 'px "Share Tech Mono", ui-monospace, monospace';
      ctx.textBaseline = "top";
      for (var i = 0; i < drops.length; i++) {
        var y = drops[i] * size;
        if (y > 0) {
          ctx.fillStyle = Math.random() > 0.96 ? "#d4ffe4" : "rgba(0,255,65,0.9)";
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
    if (REDUCE) return; // static black background under reduced motion
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    start();
  }

  /** Types `text` into `node`, then leaves a blinking cursor. */
  function typeInto(node, text) {
    var span = el("span");
    node.textContent = "";
    node.appendChild(span);
    node.appendChild(el("span", { class: "cursor", "aria-hidden": "true" }));
    if (REDUCE) { span.textContent = text; return; }
    var i = 0;
    (function next() {
      span.textContent = text.slice(0, i);
      if (i++ < text.length) setTimeout(next, 55);
    })();
  }

  /* ---------- Widget: clock ---------- */
  function clockWidget() {
    var hm = el("span", { class: "hm" });
    var sec = el("span", { class: "sec" });
    var ap = el("span", { class: "ap" });
    var date = el("div", { class: "clock-date" });
    var fmt = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" });
    function tick() {
      var now = new Date();
      var parts = fmt.formatToParts(now);
      hm.textContent = parts.filter(function (p) { return p.type !== "dayPeriod"; }).map(function (p) { return p.value; }).join("").trim();
      ap.textContent = parts.filter(function (p) { return p.type === "dayPeriod"; }).map(function (p) { return p.value; }).join("");
      sec.textContent = ":" + pad(now.getSeconds());
      date.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    }
    tick();
    setInterval(tick, 1000);
    return panel("clock://local", [el("div", { class: "clock-time" }, [hm, sec, ap]), date], "clock");
  }

  /* ---------- Widget: weather (Open-Meteo, free, no key) ---------- */
  var WMO = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
    51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Snow", 73: "Snow", 75: "Heavy snow", 77: "Snow", 80: "Showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
  };
  function wxShort(code) {
    if (code === 0 || code === 1) return "CLEAR";
    if (code === 2) return "P.CLDY";
    if (code === 3) return "CLOUDY";
    if (code === 45 || code === 48) return "FOG";
    if (code >= 95) return "STORM";
    if (code >= 71 && code <= 86 && code !== 80 && code !== 81 && code !== 82) return "SNOW";
    return "RAIN";
  }

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
    var temp = el("span", { class: "wx-temp", text: "--°" });
    var cond = el("span", { text: "Loading weather" });
    var extra = el("small");
    var sun = el("small");
    var days = el("div", { class: "wx-days" });
    var locate = el("button", { class: "locate", type: "button", text: "⌖", "aria-label": "Use my location for weather" });
    var spot = loadSpot();
    var widget = panel("weather://" + spot.name.toLowerCase().replace(/\s+/g, "-"), [
      el("div", { class: "wx-now" }, [temp, el("span", { class: "wx-desc" }, [cond, extra, sun]), locate]),
      days,
    ], "weather");
    var label = widget.querySelector(".label");

    function hhmm(iso) { return iso ? iso.slice(11, 16) : "--:--"; }

    function load() {
      label.textContent = "weather://" + spot.name.toLowerCase().replace(/\s+/g, "-");
      if (!navigator.onLine) { cond.textContent = "Offline"; return; }
      var url = "https://api.open-meteo.com/v1/forecast?latitude=" + spot.lat + "&longitude=" + spot.lng +
        "&current=temperature_2m,weather_code,wind_speed_10m" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=5" +
        "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto";
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(function (d) {
        var c = d.current || {}, dl = d.daily || {};
        temp.textContent = Math.round(c.temperature_2m) + "°F";
        cond.textContent = WMO[c.weather_code] || "Weather";
        var hi = dl.temperature_2m_max ? Math.round(dl.temperature_2m_max[0]) : "--";
        var lo = dl.temperature_2m_min ? Math.round(dl.temperature_2m_min[0]) : "--";
        extra.textContent = Math.round((c.temperature_2m - 32) * 5 / 9) + "°C · H " + hi + "° L " + lo + "°";
        sun.textContent = "↑" + hhmm(dl.sunrise && dl.sunrise[0]) + " ↓" + hhmm(dl.sunset && dl.sunset[0]);
        days.textContent = "";
        (dl.time || []).slice(1, 5).forEach(function (t, i) {
          var day = new Date(t + "T12:00:00").toLocaleDateString([], { weekday: "short" }).toUpperCase();
          days.appendChild(el("div", { class: "wx-day" }, [
            el("b", { text: day }),
            el("span", { text: Math.round(dl.temperature_2m_max[i + 1]) + "°/" + Math.round(dl.temperature_2m_min[i + 1]) + "°" }),
            wxShort(dl.weather_code[i + 1]),
          ]));
        });
      }).catch(function () {
        cond.textContent = "Weather unavailable";
      });
    }

    locate.addEventListener("click", function () {
      if (!navigator.geolocation) return load();
      cond.textContent = "Finding you";
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
    return widget;
  }

  /* ---------- Widget: calendar (this month, today lit) ---------- */
  function calendarWidget() {
    var now = new Date();
    var m = now.getMonth(), y = now.getFullYear();
    var first = new Date(y, m, 1).getDay();
    var count = new Date(y, m + 1, 0).getDate();
    var head = el("tr", null, ["S", "M", "T", "W", "T", "F", "S"].map(function (d) { return el("th", { text: d }); }));
    var rows = [], row = [];
    for (var i = 0; i < first; i++) row.push(el("td"));
    for (var d = 1; d <= count; d++) {
      row.push(el("td", { class: d === now.getDate() ? "today" : null, text: String(d) }));
      if (row.length === 7) { rows.push(el("tr", null, row)); row = []; }
    }
    if (row.length) { while (row.length < 7) row.push(el("td")); rows.push(el("tr", null, row)); }
    var title = now.toLocaleDateString([], { month: "short" }).toLowerCase();
    return panel("cal://" + title, [
      el("a", { class: "cal-link", href: "https://calendar.google.com/", target: "_blank", rel: "noopener", "aria-label": "Open Calendar" }, [
        el("table", { class: "cal" }, [el("thead", null, [head]), el("tbody", null, rows)]),
      ]),
    ], "calendar");
  }

  /* ---------- Widget: system (day/week/year progress, moon) ---------- */
  var MOON = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
  function moonPhase(date) {
    var synodic = 29.530588853;
    var age = ((date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % synodic;
    if (age < 0) age += synodic;
    return { name: MOON[Math.floor((age / synodic) * 8 + 0.5) % 8], lit: Math.round((1 - Math.cos(2 * Math.PI * age / synodic)) / 2 * 100) };
  }

  function systemWidget() {
    var list = el("ul", { class: "sys" });
    function row(key, value, pct) {
      return el("li", null, [
        el("div", { class: "k" }, [el("span", { text: key }), el("b", { text: value })]),
        pct === undefined ? null : el("div", { class: "bar" }, [el("i", { style: "width:" + pct + "%" })]),
      ]);
    }
    function render() {
      var now = new Date();
      var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var dayPct = (now - midnight) / 864e5 * 100;
      var weekPct = (((now.getDay() + 6) % 7) + dayPct / 100) / 7 * 100;
      var yStart = new Date(now.getFullYear(), 0, 1), yEnd = new Date(now.getFullYear() + 1, 0, 1);
      var yearPct = (now - yStart) / (yEnd - yStart) * 100;
      var moon = moonPhase(now);
      list.textContent = "";
      list.appendChild(row("DAY", Math.floor(dayPct) + "%", dayPct));
      list.appendChild(row("WEEK", Math.floor(weekPct) + "%", weekPct));
      list.appendChild(row("YEAR", Math.floor(yearPct) + "%", yearPct));
      list.appendChild(row("MOON", moon.lit + "%"));
      list.appendChild(el("li", { class: "moon", text: moon.name }));
    }
    render();
    setInterval(render, 60 * 1000);
    return panel("sys://status", [list], "system");
  }

  /* ---------- App launcher ---------- */
  function appTile(a, openMenu) {
    var inner = [el("span", { class: "ico" }, [icon(a.icon)]), el("span", { class: "lbl", text: a.label })];
    if (a.menu) {
      return el("li", null, [el("button", { class: "app", type: "button", "aria-haspopup": "dialog", onclick: openMenu }, inner)]);
    }
    var web = /^https:/.test(a.href);
    return el("li", null, [el("a", {
      class: "app", href: a.href,
      target: web ? "_blank" : null, rel: web ? "noopener" : null,
    }, inner)]);
  }

  /* ---------- Repository screen: its own screen, a history entry ---------- */
  function repoMenu() {
    var back = el("button", { class: "back", type: "button", "aria-label": "Back to home", text: "←" });
    var sheet = el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "repos-title", hidden: true }, [
      el("div", { class: "sheet-inner" }, [
        el("div", { class: "sheet-bar" }, [back, el("h2", { id: "repos-title", text: "Repositories" })]),
        el("ul", { class: "repos" }, REPOS.map(function (r, i) {
          return el("li", null, [el("a", { class: "repo", href: r.href, target: "_blank", rel: "noopener" }, [
            el("span", { class: "code", text: pad(i + 1) + " // REPO" }),
            el("span", { class: "name", text: r.name }),
            el("span", { class: "desc", text: r.desc }),
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
    sheet.addEventListener("click", function (e) { if (e.target === sheet || e.target.classList.contains("sheet-inner")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("popstate", function () {
      if (history.state && history.state.sheet === "repos") show(); else if (!sheet.hidden) hide();
    });
    // Reloaded while the screen was open: start on the home screen.
    if (history.state && history.state.sheet === "repos") history.replaceState(null, "");

    return { node: sheet, open: open };
  }

  /* ---------- Accordion: everything but the clock folds; one open at a time ---------- */
  function accordion(home) {
    var group = el("div", { class: "acc" });
    var panels = Array.prototype.slice.call(home.querySelectorAll(".panel:not(.clock)"));
    panels.forEach(function (p) {
      var bar = p.querySelector(".term-bar");
      var body = el("div", { class: "acc-body" });
      while (bar.nextSibling) body.appendChild(bar.nextSibling);
      p.appendChild(body);
      bar.setAttribute("role", "button");
      bar.setAttribute("tabindex", "0");
      bar.appendChild(el("span", { class: "chev", "aria-hidden": "true", text: "▾" }));
      function toggle() {
        var open = !p.classList.contains("open");
        panels.forEach(function (q) {
          q.classList.remove("open");
          q.querySelector(".term-bar").setAttribute("aria-expanded", "false");
        });
        if (open) { p.classList.add("open"); bar.setAttribute("aria-expanded", "true"); }
      }
      bar.setAttribute("aria-expanded", "false");
      bar.addEventListener("click", toggle);
      bar.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
      group.appendChild(p);
      if (p.classList.contains("launcher")) { p.classList.add("open"); bar.setAttribute("aria-expanded", "true"); }
    });
    home.appendChild(group);
  }

  /* ---------- Lock zoom: no pinch, no double-tap zoom ---------- */
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); });
  });
  var lastTouch = 0;
  document.addEventListener("touchend", function (e) {
    var now = Date.now();
    if (now - lastTouch < 350) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
  document.addEventListener("touchmove", function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  /* ---------- Mount ---------- */
  startRain();
  var menu = repoMenu();
  var net = el("span", { class: "net" });
  function setNet() {
    net.textContent = navigator.onLine ? "Online" : "Offline";
    net.classList.toggle("off", !navigator.onLine);
  }
  setNet();
  window.addEventListener("online", setNet);
  window.addEventListener("offline", setNet);

  var boot = el("p", { class: "boot" });
  var home = el("main", { class: "home" }, [
    el("div", { class: "brand" }, [
      el("div", null, [el("b", { text: "BLACKOUT" }), el("small", { text: "Matrix // phone" })]),
      net,
    ]),
    boot,
    clockWidget(),
    weatherWidget(),
    panel("apps://launch", [
      el("ul", { class: "apps", "aria-label": "Shortcuts" }, APPS.map(function (a) { return appTile(a, menu.open); })),
    ], "launcher"),
    calendarWidget(),
    systemWidget(),
  ]);
  document.body.appendChild(home);
  accordion(home);
  document.body.appendChild(menu.node);
  typeInto(boot, "> wake up, neo...");

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
    });
  }
})();
