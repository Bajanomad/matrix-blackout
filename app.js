/* BLACKOUT — phone home screen: a themed background, widgets, an app
 * launcher and folders. With no link it is the owner's Matrix screen; a
 * link made in the builder (/#c=...) carries anyone else's whole screen:
 * theme, name, apps, folders, widgets and weather spot (themes.js).
 * All content is built with DOM APIs and textContent. */
(function () {
  "use strict";

  var B = window.BLACKOUT;
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  var fromLink = B.fromHash(location.hash);
  var CFG = fromLink || B.sanitize(B.OWNER);
  var THEME = B.THEMES[CFG.t];
  var SPOT_KEY = "blackout.spot";

  // The builder's preview swaps the link in place: rebuild the screen.
  window.addEventListener("hashchange", function () { location.reload(); });

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
    (B.ICONS[name] || B.ICONS.link).forEach(function (part) {
      var node = document.createElementNS(SVGNS, part[0]);
      Object.keys(part[1]).forEach(function (k) { node.setAttribute(k, part[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  /** A panel: title bar + body children. */
  function panel(title, children, extraClass) {
    return el("section", { class: "panel" + (extraClass ? " " + extraClass : ""), "aria-label": title }, [
      el("div", { class: "term-bar" }, [
        el("span", { class: "dot on" }), el("span", { class: "dot" }), el("span", { class: "dot" }),
        el("span", { class: "label", text: title }),
      ]),
    ].concat(children));
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- Theme: data-theme, fonts, and the home-screen identity ---------- */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", CFG.t);
    // index.html already loads the Matrix fonts.
    if (CFG.t !== "matrix") document.head.appendChild(el("link", { rel: "stylesheet", href: B.fontHref(CFG.t) }));
    if (!fromLink) return; // the owner's screen keeps its own manifest and icon

    document.title = CFG.n;
    var meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (meta) meta.setAttribute("content", CFG.n);
    var color = document.querySelector('meta[name="theme-color"]');
    if (color) color.setAttribute("content", THEME.icon.bg);
    // Without a manifest, iOS saves this exact address (link included) when
    // it is added to the Home Screen, so the screen opens as built.
    var manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) manifest.remove();
    themeIcon(function (png) {
      var touch = document.querySelector('link[rel="apple-touch-icon"]');
      if (touch) touch.setAttribute("href", png);
      var fav = document.querySelector('link[rel="icon"]');
      if (fav) { fav.setAttribute("href", png); fav.setAttribute("type", "image/png"); }
    });
  }

  // A 180x180 home-screen icon in the theme's colors, drawn from its glyph.
  function themeIcon(done) {
    var look = THEME.icon;
    var parts = (B.ICONS[look.glyph] || B.ICONS.star).map(function (p) {
      return "<" + p[0] + Object.keys(p[1]).map(function (k) { return " " + k + '="' + p[1][k] + '"'; }).join("") + "/>";
    }).join("");
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + look.fg +
      '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + parts + "</svg>";
    var img = new Image();
    img.onload = function () {
      var c = document.createElement("canvas");
      c.width = c.height = 180;
      var ctx = c.getContext("2d");
      if (!ctx) return;
      var g = ctx.createRadialGradient(90, 70, 10, 90, 90, 130);
      g.addColorStop(0, look.bg === "#000000" ? "#04140a" : look.bg);
      g.addColorStop(1, "#000000");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 180, 180);
      ctx.shadowColor = look.fg;
      ctx.shadowBlur = 14;
      ctx.drawImage(img, 36, 36, 108, 108);
      try { done(c.toDataURL("image/png")); } catch (e) { /* tainted canvas: keep the default */ }
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------- Background effects ---------- */
  function startEffect() {
    var canvas = el("canvas", { id: "rain", "aria-hidden": "true" });
    document.body.prepend(el("div", { id: "scan", "aria-hidden": "true" }));
    document.body.prepend(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx || THEME.fx === "none") return;
    var w = 0, h = 0, raf = 0, last = 0;
    var fx = EFFECTS[THEME.fx]();
    var fps = fx.fps || 24;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.resize(ctx, w, h);
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / fps) return;
      last = now; fx.frame(ctx, w, h, now);
    }
    function start() { if (!raf) raf = requestAnimationFrame(loop); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (REDUCE) { fx.frame(ctx, w, h, 0); return; } // one still frame under Reduce Motion
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    start();
  }

  var EFFECTS = {
    // Katakana code rain.
    rain: function () {
      var GLYPHS = "アカサタナハマヤラワイキシチニヒミリウクスツヌフムユルエケセテネヘメレオコソトノホモヨロ0123456789";
      var size = 16, drops = [];
      return {
        resize: function (ctx, w, h) {
          drops = [];
          for (var i = 0; i < Math.ceil(w / size); i++) drops[i] = Math.floor(Math.random() * -h / size);
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
        },
        frame: function (ctx, w, h) {
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
        },
      };
    },

    // Twinkling three-layer starfield drifting past, with a shooting star now and then.
    stars: function () {
      var stars = [], shot = null;
      return {
        fps: 30,
        resize: function (ctx, w, h) {
          stars = [];
          var n = Math.round(w * h / 2600);
          for (var i = 0; i < n; i++) {
            var z = Math.random();
            stars.push({ x: Math.random() * w, y: Math.random() * h, z: z, r: 0.4 + z * 1.3, p: Math.random() * 6.28 });
          }
        },
        frame: function (ctx, w, h, t) {
          ctx.clearRect(0, 0, w, h);
          for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            s.y += 0.05 + s.z * 0.35;
            if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
            var a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 700 + s.p)) * (0.4 + s.z * 0.6);
            ctx.fillStyle = s.z > 0.85 ? "rgba(201,182,255," + a + ")" : "rgba(220,235,255," + a + ")";
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
          }
          if (!shot && t && Math.random() < 0.004) shot = { x: Math.random() * w * 0.8 + w * 0.2, y: Math.random() * h * 0.4, life: 1 };
          if (shot) {
            var len = 90 * shot.life;
            var g = ctx.createLinearGradient(shot.x, shot.y, shot.x + len, shot.y - len * 0.45);
            g.addColorStop(0, "rgba(255,255,255," + shot.life + ")");
            g.addColorStop(1, "rgba(124,196,255,0)");
            ctx.strokeStyle = g; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(shot.x, shot.y); ctx.lineTo(shot.x + len, shot.y - len * 0.45); ctx.stroke();
            shot.x -= 9; shot.y += 4; shot.life -= 0.03;
            if (shot.life <= 0) shot = null;
          }
        },
      };
    },

    // Desert sunset: sky gradient, a low sun, mesa silhouettes, drifting dust.
    desert: function () {
      var motes = [], mesas = [];
      return {
        fps: 24,
        resize: function (ctx, w, h) {
          motes = [];
          for (var i = 0; i < 40; i++) motes.push({ x: Math.random() * w, y: h * (0.35 + Math.random() * 0.65), v: 0.2 + Math.random() * 0.6, r: 0.6 + Math.random() * 1.6 });
          mesas = [];
          var x = -20;
          while (x < w + 40) {
            var mw = 60 + Math.random() * 120;
            mesas.push({ x: x, w: mw, top: 0.06 + Math.random() * 0.1, cap: 0.25 + Math.random() * 0.3 });
            x += mw + Math.random() * 60;
          }
        },
        frame: function (ctx, w, h) {
          var sky = ctx.createLinearGradient(0, 0, 0, h);
          sky.addColorStop(0, "#1b0b06"); sky.addColorStop(0.45, "#5a2312"); sky.addColorStop(0.72, "#c4601f"); sky.addColorStop(0.82, "#f2a541"); sky.addColorStop(1, "#3a1a0c");
          ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
          var horizon = h * 0.82;
          var sun = ctx.createRadialGradient(w * 0.68, horizon - 10, 4, w * 0.68, horizon - 10, 90);
          sun.addColorStop(0, "rgba(255,226,150,0.95)"); sun.addColorStop(0.35, "rgba(255,170,70,0.55)"); sun.addColorStop(1, "rgba(255,120,40,0)");
          ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "#24100a";
          mesas.forEach(function (m) {
            var top = horizon - h * m.top, inset = m.w * m.cap * 0.5;
            ctx.beginPath();
            ctx.moveTo(m.x, horizon + 2); ctx.lineTo(m.x + inset, top); ctx.lineTo(m.x + m.w - inset, top); ctx.lineTo(m.x + m.w, horizon + 2);
            ctx.fill();
          });
          ctx.fillStyle = "#1a0b06"; ctx.fillRect(0, horizon, w, h - horizon);
          motes.forEach(function (d) {
            d.x += d.v; d.y += Math.sin(d.x / 40) * 0.15;
            if (d.x > w + 4) { d.x = -4; d.y = h * (0.35 + Math.random() * 0.65); }
            ctx.fillStyle = "rgba(255,214,150,0.35)";
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
          });
        },
      };
    },

    // Outrun: striped sun over a neon grid scrolling toward you.
    grid: function () {
      var offset = 0;
      return {
        fps: 30,
        resize: function () {},
        frame: function (ctx, w, h) {
          var horizon = h * 0.62;
          var sky = ctx.createLinearGradient(0, 0, 0, horizon);
          sky.addColorStop(0, "#0b001c"); sky.addColorStop(1, "#3b0050");
          ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon);
          var r = Math.min(w, h) * 0.26, cx = w / 2, cy = horizon - r * 0.35;
          var sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
          sun.addColorStop(0, "#ffd84a"); sun.addColorStop(0.55, "#ff5ea8"); sun.addColorStop(1, "#c41aff");
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.clip();
          ctx.fillStyle = sun; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
          ctx.fillStyle = "#1a0030";
          for (var i = 0; i < 7; i++) {
            var y = cy + r * 0.05 + i * r * 0.14, th = 1.5 + i * 1.6;
            ctx.fillRect(cx - r, y, r * 2, th);
          }
          ctx.restore();
          ctx.fillStyle = "#12002a"; ctx.fillRect(0, horizon, w, h - horizon);
          ctx.strokeStyle = "rgba(255,43,214,0.75)"; ctx.lineWidth = 1.2;
          ctx.shadowColor = "#ff2bd6"; ctx.shadowBlur = 6;
          for (var v = -12; v <= 12; v++) {
            ctx.beginPath(); ctx.moveTo(cx + v * 18, horizon); ctx.lineTo(cx + v * w * 0.22, h); ctx.stroke();
          }
          offset = (offset + 0.012) % 1;
          for (var j = 0; j < 14; j++) {
            var p = (j + offset) / 14, y2 = horizon + (h - horizon) * p * p;
            ctx.globalAlpha = Math.min(1, p * 2.5);
            ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(w, y2); ctx.stroke();
          }
          ctx.globalAlpha = 1; ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(34,228,255,0.6)"; ctx.fillRect(0, horizon - 1, w, 2);
        },
      };
    },

    // Layered swells rolling in under a teal sky, with sparkles on the water.
    waves: function () {
      var glints = [];
      return {
        fps: 30,
        resize: function (ctx, w, h) {
          glints = [];
          for (var i = 0; i < 26; i++) glints.push({ x: Math.random() * w, y: h * (0.58 + Math.random() * 0.4), p: Math.random() * 6.28 });
        },
        frame: function (ctx, w, h, t) {
          var sky = ctx.createLinearGradient(0, 0, 0, h);
          sky.addColorStop(0, "#032530"); sky.addColorStop(0.55, "#06495a"); sky.addColorStop(1, "#0a7486");
          ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
          var layers = [
            { y: 0.6, a: 10, k: 0.012, s: 0.0006, c: "rgba(14,140,160,0.55)" },
            { y: 0.7, a: 14, k: 0.009, s: -0.0008, c: "rgba(10,110,130,0.7)" },
            { y: 0.8, a: 18, k: 0.007, s: 0.001, c: "rgba(6,80,98,0.85)" },
            { y: 0.9, a: 16, k: 0.011, s: -0.0012, c: "rgba(4,56,70,0.95)" },
          ];
          layers.forEach(function (L) {
            ctx.beginPath(); ctx.moveTo(0, h);
            for (var x = 0; x <= w + 8; x += 8) {
              ctx.lineTo(x, h * L.y + Math.sin(x * L.k + t * L.s) * L.a + Math.sin(x * L.k * 2.3 + t * L.s * 1.7) * L.a * 0.3);
            }
            ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = L.c; ctx.fill();
          });
          glints.forEach(function (g) {
            var a = Math.max(0, Math.sin(t / 500 + g.p));
            ctx.fillStyle = "rgba(255,240,200," + a * 0.6 + ")";
            ctx.fillRect(g.x, g.y, 2, 1.2);
          });
        },
      };
    },
  };

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
    return panel(THEME.title("clock"), [el("div", { class: "clock-time" }, [hm, sec, ap]), date], "clock");
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

  // The weather spot from the link (or the owner's), unless "use my location" was tapped.
  var HOME_SPOT = CFG.w ? { name: CFG.w.n, lat: CFG.w.la, lng: CFG.w.lo } : null;
  function loadSpot() {
    try {
      var s = JSON.parse(localStorage.getItem(SPOT_KEY) || "null");
      if (s && typeof s.lat === "number" && typeof s.lng === "number" && s.name === "My location") return s;
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
    var widget = panel(THEME.title("weather", spot.name), [
      el("div", { class: "wx-now" }, [temp, el("span", { class: "wx-desc" }, [cond, extra, sun]), locate]),
      days,
    ], "weather");
    var label = widget.querySelector(".label");
    var celsius = CFG.u === "c";

    function hhmm(iso) { return iso ? iso.slice(11, 16) : "--:--"; }
    function deg(f) { return Math.round(celsius ? (f - 32) * 5 / 9 : f); }

    function load() {
      label.textContent = THEME.title("weather", spot.name);
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
        var f = c.temperature_2m;
        temp.textContent = deg(f) + (celsius ? "°C" : "°F");
        cond.textContent = WMO[c.weather_code] || "Weather";
        var hi = dl.temperature_2m_max ? deg(dl.temperature_2m_max[0]) : "--";
        var lo = dl.temperature_2m_min ? deg(dl.temperature_2m_min[0]) : "--";
        var other = celsius ? Math.round(f) + "°F" : Math.round((f - 32) * 5 / 9) + "°C";
        extra.textContent = other + " · H " + hi + "° L " + lo + "°";
        sun.textContent = "↑" + hhmm(dl.sunrise && dl.sunrise[0]) + " ↓" + hhmm(dl.sunset && dl.sunset[0]);
        days.textContent = "";
        (dl.time || []).slice(1, 5).forEach(function (t, i) {
          var day = new Date(t + "T12:00:00").toLocaleDateString([], { weekday: "short" }).toUpperCase();
          days.appendChild(el("div", { class: "wx-day" }, [
            el("b", { text: day }),
            el("span", { text: deg(dl.temperature_2m_max[i + 1]) + "°/" + deg(dl.temperature_2m_min[i + 1]) + "°" }),
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
    var month = now.toLocaleDateString([], { month: "short" });
    var web = /^https:/.test(CFG.k);
    return panel(THEME.title("calendar", month), [
      el("a", { class: "cal-link", href: CFG.k, target: web ? "_blank" : null, rel: web ? "noopener" : null, "aria-label": "Open Calendar" }, [
        el("table", { class: "cal" }, [el("thead", null, [head]), el("tbody", null, rows)]),
      ]),
    ], "calendar");
  }

  /* ---------- Widget: status (day/week/year progress, moon) ---------- */
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
    return panel(THEME.title("status"), [list], "system");
  }

  /* ---------- App launcher ---------- */
  function appTile(a, openFolder) {
    var inner = [el("span", { class: "ico" }, [icon(a.i)]), el("span", { class: "lbl", text: a.l })];
    if (a.m) {
      return el("li", null, [el("button", { class: "app", type: "button", "aria-haspopup": "dialog", onclick: openFolder }, inner)]);
    }
    var web = /^https?:/.test(a.h);
    return el("li", null, [el("a", {
      class: "app", href: a.h,
      target: web ? "_blank" : null, rel: web ? "noopener" : null,
    }, inner)]);
  }

  /* ---------- Sheets (folders, settings): their own screen, a history entry ---------- */
  var sheetCount = 0;
  function sheet(title, items) {
    var id = "sheet-" + (++sheetCount);
    var back = el("button", { class: "back", type: "button", "aria-label": "Back to home", text: "←" });
    var node = el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": id + "-title", hidden: true }, [
      el("div", { class: "sheet-inner" }, [
        el("div", { class: "sheet-bar" }, [back, el("h2", { id: id + "-title", text: title })]),
        el("ul", { class: "repos" }, items.map(function (r, i) {
          var web = /^https?:/.test(r.h);
          return el("li", null, [el("a", { class: "repo", href: r.h, target: web && !r.same ? "_blank" : null, rel: web ? "noopener" : null }, [
            el("span", { class: "code", text: pad(i + 1) + " //" }),
            el("span", { class: "name", text: r.n }),
            r.d ? el("span", { class: "desc", text: r.d }) : null,
          ])]);
        })),
      ]),
    ]);
    var opener = null;

    function show() {
      opener = document.activeElement;
      node.hidden = false;
      back.focus();
    }
    function hide() {
      node.hidden = true;
      if (opener && opener.focus) opener.focus();
    }
    function open() {
      if (!node.hidden) return;
      history.pushState({ sheet: id }, "");
      show();
    }
    function close() {
      if (node.hidden) return;
      if (history.state && history.state.sheet === id) history.back(); else hide();
    }

    back.addEventListener("click", close);
    node.addEventListener("click", function (e) { if (e.target === node || e.target.classList.contains("sheet-inner")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("popstate", function () {
      if (history.state && history.state.sheet === id) show(); else if (!node.hidden) hide();
    });

    document.body.appendChild(node);
    return open;
  }
  // Reloaded while a sheet was open: start on the home screen.
  if (history.state && history.state.sheet) history.replaceState(null, "");

  /* ---------- Accordion: everything but the clock folds; one open at a time ---------- */
  function accordion(home, openKind) {
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
      if (p.getAttribute("data-kind") === openKind) { p.classList.add("open"); bar.setAttribute("aria-expanded", "true"); }
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
  applyTheme();
  startEffect();
  var net = el("span", { class: "net" });
  function setNet() {
    net.textContent = navigator.onLine ? "Online" : "Offline";
    net.classList.toggle("off", !navigator.onLine);
  }
  setNet();
  window.addEventListener("online", setNet);
  window.addEventListener("offline", setNet);

  // Tapping the name opens the builder with this screen loaded.
  var openSettings = sheet("Customize", [
    { n: "Edit this screen", d: "Change the theme, apps and widgets, then save it as a new link.", h: B.linkFor(CFG, "/build"), same: true },
    { n: "Make a new one", d: "Start from any theme.", h: location.origin + "/build", same: true },
  ]);

  var widgets = {
    weather: function () { return CFG.w ? weatherWidget() : null; },
    apps: function () {
      return panel(THEME.title("apps"), [
        el("ul", { class: "apps", "aria-label": "Shortcuts" }, CFG.a.map(function (a) {
          return appTile(a, a.m ? sheet(a.l, a.m) : null);
        })),
      ], "launcher");
    },
    calendar: calendarWidget,
    status: systemWidget,
  };

  var boot = el("p", { class: "boot" });
  var home = el("main", { class: "home" }, [
    el("div", { class: "brand" }, [
      el("button", { class: "brand-name", type: "button", "aria-label": "Customize this screen", onclick: openSettings }, [
        el("b", { text: CFG.n }), CFG.s ? el("small", { text: CFG.s }) : null,
      ]),
      net,
    ]),
    CFG.b ? boot : null,
    clockWidget(),
  ]);
  CFG.x.forEach(function (kind) {
    var w = widgets[kind]();
    if (w) { w.setAttribute("data-kind", kind); home.appendChild(w); }
  });
  document.body.appendChild(home);
  accordion(home, CFG.o);
  if (CFG.b) typeInto(boot, CFG.b);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
    });
  }
})();
