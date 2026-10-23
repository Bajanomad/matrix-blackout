/* BLACKOUT // BRIDGE — the phone's control center as a spaceship bridge.
 *
 * One screen: a viewscreen of live readouts (time, weather, gauges), a ticker,
 * and a grid of stations. Every station is a module: tap it to open its
 * console. System modules (weather, calendar, sun & moon, power...) and the
 * link/shortcut decks from config.js are built in; anything else the pilot
 * builds right here with FABRICATE, from templates (link deck, quick keys,
 * note, checklist, counter, timer, stopwatch, countdown, world clock, web
 * panel). ARRANGE reorders and hides stations; SHARE packs the whole bridge
 * into a link or a file someone else can load.
 *
 * Everything is built with DOM APIs and textContent. Layout and user modules
 * live in guarded localStorage ("bo.bridge"); anything from a link or a file
 * goes through sanitizeLayout() first. */
(function () {
  "use strict";

  var C = window.BLACKOUT_CONFIG;
  var ICONS = window.BLACKOUT.ICONS;
  var ICON_NAMES = Object.keys(ICONS);
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";
  var $ = function (id) { return document.getElementById(id); };

  /* =====================================================================
   * Helpers
   * ===================================================================== */
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
    svg.setAttribute("class", "ico");
    (ICONS[name] || ICONS.link).forEach(function (part) {
      var node = document.createElementNS(SVGNS, part[0]);
      Object.keys(part[1]).forEach(function (k) { node.setAttribute(k, part[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  // localStorage can be missing or throw (private mode): everything works without it.
  function load(key, fallback) {
    try { var v = localStorage.getItem("bo." + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem("bo." + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  var toastTimer = 0;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 4200);
  }

  // Web links open over the app (Safari sheet) so the bridge stays put;
  // same-site pages and app links (tel:, shortcuts://...) open in place.
  function linkAttrs(url) {
    var web = /^https?:/i.test(url) && url.indexOf(location.origin) !== 0;
    return { href: url, target: web ? "_blank" : null, rel: web ? "noopener" : null };
  }

  // Links from the pilot, a share link or a file: never script or data URLs.
  function safeUrl(u) {
    if (typeof u !== "string") return "";
    u = u.trim().slice(0, 2000);
    if (!u) return "";
    if (/^(javascript|data|vbscript|file|blob):/i.test(u.replace(/[\s\u0000-\u001f]/g, ""))) return "";
    if (u.charAt(0) === "/" && u.charAt(1) !== "/") return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
    if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(u)) return "https://" + u; // "example.com" → https
    return "";
  }

  function row(k, v) { return el("div", { class: "kv" }, [el("span", { text: k }), el("b", { text: v })]); }
  function bar(pct) { return el("div", { class: "bar" }, [el("i", { style: "width:" + Math.max(0, Math.min(100, pct)).toFixed(1) + "%" })]); }
  function placeholder(title, text) {
    return el("div", { class: "ph" }, [el("span", { class: "tag", text: "placeholder" }), el("b", { text: title }), el("p", { text: text })]);
  }

  // Everything that changes with the clock registers here; one timer drives it.
  var tickers = [];
  function every(fn) { tickers.push(fn); fn(new Date()); }
  // A user module's clock work stops once it is edited or removed (its
  // registry slot then holds a newer copy), so an old timer never re-fires.
  function everyFor(m, fn) { every(function (now) { if (registry[m.id] === m) fn(now); }); }
  function startTicking() {
    function tick() {
      var now = new Date();
      tickers.forEach(function (fn) { fn(now); });
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    }
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { var now = new Date(); tickers.forEach(function (fn) { fn(now); }); }
    });
  }

  function clockText(d) {
    var h = d.getHours();
    return C.clock24 ? pad(h) + ":" + pad(d.getMinutes()) : ((h % 12) || 12) + ":" + pad(d.getMinutes());
  }

  /* =====================================================================
   * Module registry
   * A module is { id, title, icon, accent, wide, body, read, sub, quick }.
   * `body` is its console, built once and kept live; the tile shows `read`
   * and `sub`; `quick` optionally builds tap-through buttons on the tile.
   * ===================================================================== */
  var registry = {};
  var systemIds = [];

  function refreshTile(mod) {
    if (!mod.tile) return;
    mod.tile.read.textContent = mod.read || "--";
    mod.tile.sub.textContent = mod.sub || "";
  }

  /** card(id, opts) → {node, body, summary(text), detail(text)}: a system module. */
  function card(id, opts) {
    var mod = registry[id] = {
      id: id, title: opts.title, icon: opts.icon, accent: opts.accent || "orange", wide: !!opts.wide,
      body: el("div"), read: "", sub: opts.sub || "", system: true,
    };
    systemIds.push(id);
    return {
      node: mod,
      body: mod.body,
      summary: function (t) { mod.read = t; refreshTile(mod); },
      detail: function (t) { mod.sub = t; refreshTile(mod); },
    };
  }

  /* =====================================================================
   * System modules
   * ===================================================================== */

  /* ---------- Chrono: clock + date details ---------- */
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 864e5 + 1) / 7);
  }
  function dayOfYear(now) {
    var y = now.getFullYear();
    var start = new Date(y, 0, 1), next = new Date(y + 1, 0, 1);
    var today = new Date(y, now.getMonth(), now.getDate());
    return { n: Math.round((today - start) / 864e5) + 1, total: Math.round((next - start) / 864e5) };
  }
  function chronoCard() {
    var c = card("chrono", { title: "Chrono", icon: "terminal", accent: "green" });
    var zone = row("Time zone", ""), utc = row("UTC", ""), doy = row("Day of year", ""), wk = row("ISO week", ""), left = row("Days left this year", "");
    c.body.append(zone, utc, doy, wk, left);
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* old browser */ }
    every(function (now) {
      var off = -now.getTimezoneOffset();
      zone.lastChild.textContent = (tz ? tz.replace(/_/g, " ") + " · " : "") + "UTC" + (off >= 0 ? "+" : "-") + Math.floor(Math.abs(off) / 60) + (Math.abs(off) % 60 ? ":" + pad(Math.abs(off) % 60) : "");
      utc.lastChild.textContent = pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes()) + ":" + pad(now.getUTCSeconds());
      var d = dayOfYear(now);
      doy.lastChild.textContent = d.n + " / " + d.total;
      wk.lastChild.textContent = String(isoWeek(now));
      left.lastChild.textContent = String(d.total - d.n);
      c.summary("UTC " + pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes()));
      c.detail("Day " + d.n + " · Week " + isoWeek(now));
    });
    return c.node;
  }

  /* ---------- Location + weather (Open-Meteo and BigDataCloud, free, no key) ---------- */
  var HOME = C.weather.home;
  var spot = load("spot", null);
  if (!spot || typeof spot.lat !== "number" || typeof spot.lng !== "number") spot = null;
  var wx = load("wx", null);
  var wxListeners = [], spotListeners = [], netListeners = [];
  function currentSpot() { return spot || { name: HOME.name, lat: HOME.lat, lng: HOME.lng }; }
  function currentWx() { var s = currentSpot(); return wx && wx.lat === s.lat && wx.lng === s.lng ? wx.data : null; }

  var WMO = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
    51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Snow", 73: "Snow", 75: "Heavy snow", 77: "Snow", 80: "Showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
  };
  function wxIcon(code, day) {
    if (code >= 95) return "bolt";
    if (code <= 1) return day === 0 ? "moon" : "sun";
    return "cloud";
  }
  function deg(v) { return Math.round(v) + "°"; }

  var wxLoading = false;
  function fetchWeather(force) {
    var s = currentSpot();
    var fresh = wx && wx.lat === s.lat && wx.lng === s.lng && Date.now() - wx.at < 10 * 60 * 1000;
    if ((fresh && !force) || wxLoading || !navigator.onLine) return;
    wxLoading = true;
    wxListeners.forEach(function (fn) { fn(); });
    var f = C.weather.units === "c";
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lng +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,precipitation" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max" +
      "&timezone=auto&forecast_days=6" + (f ? "" : "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch");
    fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (data) {
      wx = { at: Date.now(), lat: s.lat, lng: s.lng, data: data };
      save("wx", wx);
    }).catch(function () {
      if (wx) wx.failed = true;
    }).then(function () {
      wxLoading = false;
      wxListeners.forEach(function (fn) { fn(); });
    });
  }

  var locating = false;
  function locate() {
    if (!("geolocation" in navigator)) { toast("This browser can't share location."); return; }
    if (locating) return;
    locating = true;
    spotListeners.forEach(function (fn) { fn(); });
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = Math.round(pos.coords.latitude * 1e4) / 1e4, lng = Math.round(pos.coords.longitude * 1e4) / 1e4;
      spot = { name: "My location", lat: lat, lng: lng, acc: Math.round(pos.coords.accuracy), at: Date.now() };
      save("spot", spot);
      locating = false;
      spotListeners.forEach(function (fn) { fn(); });
      fetchWeather(true);
      fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + lat + "&longitude=" + lng + "&localityLanguage=en")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var name = d && (d.city || d.locality || d.principalSubdivision);
          if (!name || !spot || spot.lat !== lat) return;
          spot.name = name;
          spot.region = [d.principalSubdivision, d.countryName].filter(Boolean).join(", ");
          save("spot", spot);
          spotListeners.forEach(function (fn) { fn(); });
          wxListeners.forEach(function (fn) { fn(); });
        }).catch(function () { /* the coordinates are enough */ });
    }, function (err) {
      locating = false;
      spotListeners.forEach(function (fn) { fn(); });
      toast(err.code === 1 ? "Location is off for this app. Allow it in Settings → Privacy → Location Services → Safari Websites." : "Couldn't get your location. Try again outside or with Wi-Fi on.");
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 });
  }
  function useHome() {
    spot = null;
    save("spot", null);
    spotListeners.forEach(function (fn) { fn(); });
    fetchWeather(true);
  }

  function weatherCard() {
    var c = card("weather", { title: "Atmosphere", icon: "cloud", accent: "green", wide: true });
    var place = el("div", { class: "wx-place" });
    var now = el("div", { class: "wx-now" });
    var details = el("div");
    var days = el("ol", { class: "wx-days" });
    var status = el("div", { class: "wx-status" });
    var locBtn = el("button", { class: "btn", type: "button", onclick: locate }, [icon("pin"), "Use my location"]);
    var homeBtn = el("button", { class: "btn ghost", type: "button", onclick: useHome, text: HOME.name });
    var refresh = el("button", { class: "btn ghost", type: "button", onclick: function () { fetchWeather(true); }, text: "Refresh" });
    c.body.append(place, now, details, days, status, el("div", { class: "btns" }, [locBtn, homeBtn, refresh]));

    function render() {
      var s = currentSpot();
      place.textContent = s.name + (s.region ? " · " + s.region : "");
      locBtn.lastChild.textContent = locating ? "Locating…" : spot ? "Update my location" : "Use my location";
      homeBtn.hidden = !spot;
      var d = currentWx();
      if (!d || !d.current) {
        now.textContent = ""; details.textContent = ""; days.textContent = "";
        status.textContent = wxLoading ? "Loading weather…" : navigator.onLine ? "Weather unavailable. Tap Refresh." : "Offline. Weather shows when you're back online.";
        c.summary(wxLoading ? "…" : "--");
        c.detail(s.name);
        return;
      }
      var cur = d.current, daily = d.daily, u = d.current_units || {};
      now.textContent = "";
      now.append(icon(wxIcon(cur.weather_code, cur.is_day)),
        el("span", { class: "wx-temp", text: deg(cur.temperature_2m) }),
        el("span", { class: "wx-cond" }, [el("b", { text: WMO[cur.weather_code] || "Weather" }),
          el("span", { text: "H " + deg(daily.temperature_2m_max[0]) + "  L " + deg(daily.temperature_2m_min[0]) })]));
      details.textContent = "";
      details.append(
        row("Feels like", deg(cur.apparent_temperature)),
        row("Humidity", Math.round(cur.relative_humidity_2m) + "%"),
        row("Wind", Math.round(cur.wind_speed_10m) + " " + (u.wind_speed_10m || "")),
        row("Rain chance", (daily.precipitation_probability_max[0] == null ? "--" : daily.precipitation_probability_max[0]) + "%"),
        row("UV index", daily.uv_index_max[0] == null ? "--" : String(Math.round(daily.uv_index_max[0]))));
      days.textContent = "";
      for (var i = 1; i < daily.time.length; i++) {
        var day = new Date(daily.time[i] + "T12:00");
        days.appendChild(el("li", null, [
          el("span", { class: "d", text: DAYS[day.getDay()].slice(0, 3) }),
          icon(wxIcon(daily.weather_code[i], 1)),
          el("span", { class: "c", text: WMO[daily.weather_code[i]] || "" }),
          el("span", { class: "p", text: daily.precipitation_probability_max[i] ? daily.precipitation_probability_max[i] + "%" : "" }),
          el("span", { class: "t", text: deg(daily.temperature_2m_max[i]) + " / " + deg(daily.temperature_2m_min[i]) }),
        ]));
      }
      var mins = Math.round((Date.now() - wx.at) / 60000);
      status.textContent = wxLoading ? "Updating…" : (wx.failed ? "Couldn't update. " : "") + "Updated " + (mins < 1 ? "just now" : mins + " min ago") + " · Open-Meteo";
      c.summary(deg(cur.temperature_2m) + " " + (WMO[cur.weather_code] || ""));
      c.detail(s.name + " · H " + deg(daily.temperature_2m_max[0]) + " L " + deg(daily.temperature_2m_min[0]));
    }
    wxListeners.push(render);
    spotListeners.push(render);
    netListeners.push(function () { render(); fetchWeather(); });
    render();
    return c.node;
  }

  function locationCard() {
    var c = card("location", { title: "Nav", icon: "pin" });
    var box = el("div");
    var btn = el("button", { class: "btn", type: "button", onclick: locate }, [icon("pin"), ""]);
    var maps = el("a", { class: "btn ghost", target: "_blank", rel: "noopener", text: "Open in Maps" });
    c.body.append(box, el("div", { class: "btns" }, [btn, maps]));
    function render() {
      box.textContent = "";
      btn.lastChild.textContent = locating ? "Locating…" : spot ? "Update my location" : "Use my location";
      maps.hidden = !spot;
      if (!spot) {
        box.append(el("p", { class: "note", text: "Weather uses " + HOME.name + " until you share your location. It stays on this phone." }));
        c.summary(HOME.name);
        c.detail(HOME.lat.toFixed(2) + ", " + HOME.lng.toFixed(2));
        return;
      }
      box.append(row("Place", spot.name));
      if (spot.region) box.append(row("Region", spot.region));
      box.append(row("Latitude", spot.lat.toFixed(4)), row("Longitude", spot.lng.toFixed(4)));
      if (spot.acc) box.append(row("Accuracy", "± " + spot.acc + " m"));
      maps.href = "https://maps.apple.com/?ll=" + spot.lat + "," + spot.lng + "&q=" + encodeURIComponent(spot.name);
      c.summary(spot.name);
      c.detail(spot.lat.toFixed(2) + ", " + spot.lng.toFixed(2));
    }
    spotListeners.push(render);
    render();
    return c.node;
  }

  /* ---------- Calendar ---------- */
  function calendarCard() {
    var c = card("calendar", { title: "Calendar", icon: "calendar" });
    var offset = 0;
    var title = el("b", { class: "cal-title" });
    var todayBtn = el("button", { class: "btn ghost small", type: "button", text: "Today", onclick: function () { offset = 0; render(new Date()); } });
    var grid = el("div", { class: "cal", role: "grid" });
    c.body.append(
      el("div", { class: "cal-head" }, [
        el("button", { class: "icon-btn", type: "button", "aria-label": "Previous month", text: "‹", onclick: function () { offset--; render(new Date()); } }),
        title,
        el("button", { class: "icon-btn", type: "button", "aria-label": "Next month", text: "›", onclick: function () { offset++; render(new Date()); } }),
      ]),
      grid,
      el("div", { class: "btns" }, [todayBtn, el("a", Object.assign({ class: "btn" }, linkAttrs(C.calendarUrl)), [icon("calendar"), "Open Calendar"])]));

    var shown = "";
    function render(now) {
      var first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      var key = first.getFullYear() + "-" + first.getMonth() + "-" + now.getDate() + "-" + offset;
      if (key === shown) return;
      shown = key;
      title.textContent = MONTHS[first.getMonth()] + " " + first.getFullYear();
      todayBtn.hidden = offset === 0;
      grid.textContent = "";
      ["S", "M", "T", "W", "T", "F", "S"].forEach(function (d) { grid.appendChild(el("span", { class: "dow", text: d })); });
      for (var i = 0; i < first.getDay(); i++) grid.appendChild(el("span"));
      var count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      for (var n = 1; n <= count; n++) {
        var today = offset === 0 && n === now.getDate();
        grid.appendChild(el("span", { class: today ? "day today" : "day", text: String(n), "aria-current": today ? "date" : null }));
      }
      c.summary(DAYS[now.getDay()].slice(0, 3) + " " + now.getDate());
      c.detail(MONTHS[now.getMonth()] + " " + now.getFullYear());
    }
    every(render);
    return c.node;
  }

  /* ---------- Sun & moon ---------- */
  var MOON = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
  function moonPhase(date) {
    var synodic = 29.530588853;
    var age = ((date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % synodic;
    if (age < 0) age += synodic;
    return { name: MOON[Math.floor((age / synodic) * 8 + 0.5) % 8], lit: Math.round((1 - Math.cos(2 * Math.PI * age / synodic)) / 2 * 100), age: age };
  }
  function hhmm(iso) {
    var t = iso.split("T")[1] || "";
    var h = +t.slice(0, 2), m = t.slice(3, 5);
    return C.clock24 ? pad(h) + ":" + m : ((h % 12) || 12) + ":" + m + (h < 12 ? " AM" : " PM");
  }
  function sunCard() {
    var c = card("sun", { title: "Sun & Moon", icon: "sun" });
    var box = el("div");
    c.body.append(box);
    function render() {
      var moon = moonPhase(new Date());
      var d = currentWx();
      box.textContent = "";
      if (d && d.daily) {
        var rise = d.daily.sunrise[0], set = d.daily.sunset[0];
        var len = (new Date(set) - new Date(rise)) / 60000;
        box.append(row("Sunrise", hhmm(rise)), row("Sunset", hhmm(set)), row("Daylight", Math.floor(len / 60) + "h " + pad(Math.round(len % 60)) + "m"));
        c.summary("↓ " + hhmm(set).replace(/ [AP]M/, ""));
        c.detail(moon.name + " · " + moon.lit + "%");
      } else {
        box.append(el("p", { class: "note", text: "Sunrise and sunset come with the weather." }));
        c.summary(moon.lit + "%");
        c.detail(moon.name);
      }
      box.append(row("Moon", moon.name), row("Lit", moon.lit + "%"), bar(moon.lit), row("Moon age", moon.age.toFixed(1) + " days"));
    }
    wxListeners.push(render);
    spotListeners.push(render);
    render();
    return c.node;
  }

  /* ---------- Progress (day, week, month, year) ---------- */
  function progressOf(now) {
    var mid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var day = (now - mid) / 864e5;
    var mStart = new Date(now.getFullYear(), now.getMonth(), 1), mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    var yStart = new Date(now.getFullYear(), 0, 1), yEnd = new Date(now.getFullYear() + 1, 0, 1);
    return {
      Day: day * 100,
      Week: (((now.getDay() + 6) % 7) + day) / 7 * 100,
      Month: (now - mStart) / (mEnd - mStart) * 100,
      Year: (now - yStart) / (yEnd - yStart) * 100,
    };
  }
  function progressCard() {
    var c = card("progress", { title: "Mission Time", icon: "bolt", accent: "green" });
    var rows = {};
    ["Day", "Week", "Month", "Year"].forEach(function (k) {
      var r = row(k, ""), b = bar(0);
      rows[k] = { v: r.lastChild, b: b.firstChild };
      c.body.append(r, b);
    });
    every(function (now) {
      var p = progressOf(now);
      Object.keys(p).forEach(function (k) {
        rows[k].v.textContent = p[k].toFixed(k === "Year" ? 2 : 1) + "%";
        rows[k].b.style.width = p[k].toFixed(2) + "%";
      });
      c.summary(p.Year.toFixed(1) + "%");
      c.detail("of " + now.getFullYear() + " · week " + Math.floor(p.Week) + "%");
    });
    return c.node;
  }

  /* ---------- Power (Chrome only; iOS keeps it private) ---------- */
  var power = null;
  var powerListeners = [];
  function powerCard() {
    var c = card("power", { title: "Power", icon: "bolt" });
    if (!navigator.getBattery) {
      c.body.append(placeholder("Battery level", "iOS doesn't share the battery with web apps. It's in the status bar and Control Center; a Shortcuts automation can speak or log it."));
      c.summary("iOS");
      c.detail("In the status bar");
      return c.node;
    }
    navigator.getBattery().then(function (b) {
      var level = row("Level", ""), state = row("State", ""), bx = bar(0);
      c.body.append(level, bx, state);
      function render() {
        var pct = Math.round(b.level * 100);
        power = { pct: pct, charging: b.charging };
        level.lastChild.textContent = pct + "%";
        bx.firstChild.style.width = pct + "%";
        state.lastChild.textContent = b.charging ? "Charging" : "On battery";
        c.summary(pct + "%" + (b.charging ? " ⚡" : ""));
        c.detail(b.charging ? "Charging" : "On battery");
        powerListeners.forEach(function (fn) { fn(); });
      }
      ["levelchange", "chargingchange"].forEach(function (e) { b.addEventListener(e, render); });
      render();
    }).catch(function () { c.body.append(placeholder("Battery level", "Not available here.")); });
    return c.node;
  }

  /* ---------- Comms ---------- */
  function commsCard() {
    var c = card("comms", { title: "Comms", icon: "globe" });
    var box = el("div");
    c.body.append(box);
    function render() {
      var cn = navigator.connection;
      box.textContent = "";
      box.append(row("Status", navigator.onLine ? "Online" : "Offline"));
      if (cn && cn.effectiveType) {
        box.append(row("Speed class", cn.effectiveType.toUpperCase()));
        if (cn.downlink) box.append(row("Downlink", "≈ " + cn.downlink + " Mb/s"));
        if (cn.rtt) box.append(row("Latency", "≈ " + cn.rtt + " ms"));
      } else {
        box.append(placeholder("Wi-Fi / cellular", "iOS doesn't tell web apps which network you're on or how strong it is. Signal bars live in the status bar."));
      }
      c.summary(navigator.onLine ? "ONLINE" : "OFFLINE");
      c.detail(cn && cn.effectiveType ? cn.effectiveType.toUpperCase() + (cn.rtt ? " · " + cn.rtt + " ms" : "") : "Link status");
    }
    netListeners.push(render);
    render();
    return c.node;
  }

  /* ---------- Systems (device + storage) ---------- */
  function systemsCard() {
    var c = card("systems", { title: "Systems", icon: "gear" });
    var box = el("div"), store = el("div");
    c.body.append(box, store);
    var ua = navigator.userAgent;
    var ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var m = /OS (\d+)[_.](\d+)/.exec(ua);
    var os = ios ? "iOS" + (m ? " " + m[1] + "." + m[2] : "") : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : "Other";
    var standalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    function render() {
      box.textContent = "";
      box.append(
        row("System", os),
        row("Screen", screen.width + " × " + screen.height + " @" + (window.devicePixelRatio || 1) + "x"),
        row("Viewport", window.innerWidth + " × " + window.innerHeight),
        row("Home Screen app", standalone ? "Yes" : "No (Safari)"),
        row("Language", navigator.language || "--"),
        row("Reduce Motion", REDUCE ? "On" : "Off"));
      if (!standalone) box.append(el("p", { class: "note", text: "Tip: Share → Add to Home Screen to open the bridge full screen like an app." }));
      c.summary(os);
      c.detail(standalone ? "Home Screen app" : "In Safari");
    }
    window.addEventListener("resize", render, { passive: true });
    render();
    if (navigator.storage && navigator.storage.estimate) {
      var mb = function (b) { return b > 1e9 ? (b / 1e9).toFixed(1) + " GB" : (b / 1e6).toFixed(1) + " MB"; };
      navigator.storage.estimate().then(function (e) {
        store.append(row("This app uses", mb(e.usage || 0)), row("Space it may use", mb(e.quota || 0)), bar(e.quota ? (e.usage || 0) / e.quota * 100 : 0));
      }).catch(function () { /* no estimate */ });
    }
    return c.node;
  }

  /* ---------- Config decks: sites and shortcuts from config.js ---------- */
  function deckBody(items) {
    var list = el("ul", { class: "links" });
    items.forEach(function (s) {
      var inner = [icon(s.icon || "globe"), el("span", null, [el("b", { text: s.name }), el("small", { text: s.desc || (s.url ? s.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "") })])];
      if (s.url) list.appendChild(el("li", null, [el("a", Object.assign({ class: "link-row" }, linkAttrs(s.url)), inner.concat(el("span", { class: "go", "aria-hidden": "true", text: "›" })))]));
      else list.appendChild(el("li", null, [el("button", { class: "link-row unset", type: "button", onclick: function () { toast(s.name + " has no link yet. Add its url in config.js."); } }, inner.concat(el("span", { class: "tag", text: "set up" })))]));
    });
    return list;
  }
  function keyHref(s) {
    if (s.url) return s.url;
    if (s.shortcut) return "shortcuts://run-shortcut?name=" + encodeURIComponent(s.shortcut);
    return "";
  }
  function keysBody(items) {
    var grid = el("div", { class: "keys" });
    items.forEach(function (s) {
      var label = [icon(s.icon), el("span", { text: s.label })];
      var href = keyHref(s);
      if (href) grid.appendChild(el("a", Object.assign({ class: "key" }, linkAttrs(href)), s.shortcut && !s.url ? label.concat(el("span", { class: "key-tag", text: "shortcut" })) : label));
      else grid.appendChild(el("button", { class: "key unset", type: "button", onclick: function () {
        toast(s.label + " isn't wired yet. Make a shortcut in the Shortcuts app, then put its exact name in config.js → shortcuts.");
      } }, label.concat(el("span", { class: "key-tag", text: "set up" }))));
    });
    return grid;
  }
  function quickStrip(items, hrefOf, labelOf) {
    return function () {
      return items.filter(function (s) { return hrefOf(s); }).slice(0, 4).map(function (s) {
        return el("a", Object.assign({ "aria-label": labelOf(s), onclick: function (e) { e.stopPropagation(); } }, linkAttrs(hrefOf(s))), [icon(s.icon)]);
      });
    };
  }
  function configDecks() {
    (C.sites || []).forEach(function (g, gi) {
      var id = "site." + gi;
      var set = g.items.filter(function (s) { return s.url; }).length;
      var mod = registry[id] = {
        id: id, title: g.title, icon: g.icon || "globe", accent: "orange", body: deckBody(g.items), system: true,
        read: set + (set === 1 ? " LINK" : " LINKS"), sub: g.items.map(function (s) { return s.name; }).join(" · "),
        quick: quickStrip(g.items, function (s) { return s.url; }, function (s) { return s.name; }),
      };
      systemIds.push(mod.id);
    });
    (C.shortcuts || []).forEach(function (g, gi) {
      var id = "keys." + gi;
      var wired = g.items.filter(keyHref).length;
      var mod = registry[id] = {
        id: id, title: g.title, icon: g.icon || "bolt", accent: "green", body: keysBody(g.items), system: true,
        read: wired + " / " + g.items.length, sub: wired === g.items.length ? "All keys wired" : "keys wired",
        quick: quickStrip(g.items, keyHref, function (s) { return s.label; }),
      };
      systemIds.push(mod.id);
    });
  }

  /* =====================================================================
   * User modules: the templates FABRICATE builds from
   * ===================================================================== */
  var ACCENTS = { orange: "#ff7a1a", green: "#39ff88", cyan: "#2ef2ff", magenta: "#ff3bd4", red: "#ff3b4e" };
  var layout; // { ship, order, hidden, modules }
  var saveTimer = 0;
  function saveLayout() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { save("bridge", layout); }, 250);
  }

  var beepCtx = null;
  function alarm() {
    try {
      beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach(function (t) {
        var o = beepCtx.createOscillator(), g = beepCtx.createGain();
        o.type = "square"; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, beepCtx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.2, beepCtx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, beepCtx.currentTime + t + 0.2);
        o.connect(g); g.connect(beepCtx.destination);
        o.start(beepCtx.currentTime + t); o.stop(beepCtx.currentTime + t + 0.22);
      });
    } catch (e) { /* no audio */ }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
  }

  function fmtDuration(ms, showTenths) {
    ms = Math.max(0, ms);
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    var out = (h ? h + ":" + pad(m) : String(m)) + ":" + pad(s % 60);
    return showTenths ? out + "." + Math.floor((ms % 1000) / 100) : out;
  }

  var TIMEZONES = (function () {
    try { if (Intl.supportedValuesOf) return Intl.supportedValuesOf("timeZone"); } catch (e) { /* old browser */ }
    return ["UTC", "America/Mazatlan", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Mexico_City", "Europe/London", "Europe/Madrid", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney"];
  })();

  /* Each type: label, icon, desc, defaults, fields (for the fabricator form),
   * mount(mod, entry) fills the console and keeps read/sub live. Mutate
   * mod.data then call saveLayout() to persist. */
  var TYPES = {
    deck: {
      label: "Link Deck", icon: "link", desc: "A stack of links: sites, apps, docs. Sub-decks for folders.",
      defaults: function () { return { items: [{ name: "411 BCS", url: "https://411-xi.vercel.app/", icon: "pin" }] }; },
      fields: [{ key: "items", type: "items", sub: ["name", "url", "icon"] }],
      mount: function (mod, m) {
        var items = mod.data.items;
        m.body.append(deckBody(items.map(function (s) { return { name: s.name, url: s.url, icon: s.icon, desc: "" }; })));
        m.read = items.length + (items.length === 1 ? " LINK" : " LINKS");
        m.sub = items.map(function (s) { return s.name; }).join(" · ");
        m.quick = quickStrip(items, function (s) { return s.url; }, function (s) { return s.name; });
      },
    },
    keys: {
      label: "Quick Keys", icon: "bolt", desc: "Big launch buttons: call, text, apps, iOS Shortcuts.",
      defaults: function () { return { items: [{ name: "Call", url: "tel:", icon: "call" }, { name: "Text", url: "sms:", icon: "chat" }, { name: "Maps", url: "maps://", icon: "map" }] }; },
      fields: [{ key: "items", type: "items", sub: ["name", "url", "icon"], hint: "Tip: shortcuts://run-shortcut?name=Flashlight runs an iOS Shortcut." }],
      mount: function (mod, m) {
        var items = mod.data.items.map(function (s) { return { label: s.name, url: s.url, icon: s.icon }; });
        m.body.append(keysBody(items));
        m.read = items.length + " KEYS";
        m.sub = items.map(function (s) { return s.label; }).join(" · ");
        m.quick = quickStrip(items, keyHref, function (s) { return s.label; });
      },
    },
    note: {
      label: "Log", icon: "note", desc: "A captain's log: notes that save as you type.",
      defaults: function () { return { text: "" }; },
      fields: [],
      mount: function (mod, m) {
        var ta = el("textarea", { class: "input", rows: "10", placeholder: "Captain's log…", "aria-label": mod.name });
        ta.value = mod.data.text || "";
        var stamp = el("p", { class: "note" });
        function sum() {
          var first = (mod.data.text || "").split("\n").filter(Boolean)[0] || "Empty";
          m.read = first.slice(0, 28);
          m.sub = (mod.data.text || "").length + " chars";
          refreshTile(m);
        }
        ta.addEventListener("input", function () {
          mod.data.text = ta.value.slice(0, 20000);
          stamp.textContent = "Saved · " + clockText(new Date());
          saveLayout(); sum();
        });
        m.body.append(el("label", { class: "field" }, [ta]), stamp);
        sum();
      },
    },
    checklist: {
      label: "Checklist", icon: "star", desc: "Pre-flight checks, groceries, to-dos.",
      defaults: function () { return { items: [] }; },
      fields: [{ key: "seed", type: "textarea", label: "Items (one per line)", optional: true }],
      mount: function (mod, m) {
        var list = el("ul", { class: "checks" });
        var input = el("input", { class: "input", placeholder: "Add an item and press Enter", maxlength: "200", "aria-label": "New item" });
        function render() {
          list.textContent = "";
          mod.data.items.forEach(function (it, i) {
            var box = el("input", { type: "checkbox", "aria-label": it.t });
            box.checked = !!it.done;
            box.addEventListener("change", function () { it.done = box.checked; saveLayout(); render(); });
            list.appendChild(el("li", { class: it.done ? "done" : "" }, [box, el("span", { text: it.t }),
              el("button", { class: "icon-btn", type: "button", "aria-label": "Remove " + it.t, text: "✕", onclick: function () { mod.data.items.splice(i, 1); saveLayout(); render(); } })]));
          });
          var done = mod.data.items.filter(function (it) { return it.done; }).length;
          m.read = done + " / " + mod.data.items.length;
          m.sub = mod.data.items.length ? (done === mod.data.items.length ? "All clear" : (mod.data.items.filter(function (it) { return !it.done; })[0] || {}).t || "") : "Empty";
          refreshTile(m);
        }
        input.addEventListener("keydown", function (e) {
          if (e.key !== "Enter" || !input.value.trim()) return;
          if (mod.data.items.length >= 200) { toast("That's 200 items. Clear some first."); return; }
          mod.data.items.push({ t: input.value.trim().slice(0, 200), done: false });
          input.value = ""; saveLayout(); render();
        });
        m.body.append(input, list, el("div", { class: "btns" }, [
          el("button", { class: "btn ghost small", type: "button", text: "Clear checked", onclick: function () { mod.data.items = mod.data.items.filter(function (it) { return !it.done; }); saveLayout(); render(); } }),
          el("button", { class: "btn ghost small", type: "button", text: "Uncheck all", onclick: function () { mod.data.items.forEach(function (it) { it.done = false; }); saveLayout(); render(); } }),
        ]));
        render();
      },
    },
    counter: {
      label: "Counter", icon: "spark", desc: "Tap to count: reps, fish, days sober, coffees.",
      defaults: function () { return { value: 0, step: 1 }; },
      fields: [{ key: "step", type: "number", label: "Step", min: 1, max: 1000 }],
      mount: function (mod, m) {
        var big = el("div", { class: "big-read" });
        function set(v) {
          mod.data.value = Math.max(-1e9, Math.min(1e9, v));
          big.textContent = String(mod.data.value);
          m.read = String(mod.data.value);
          m.sub = "step " + mod.data.step;
          refreshTile(m); saveLayout();
        }
        m.body.append(big, el("div", { class: "btns" }, [
          el("button", { class: "btn ghost", type: "button", text: "− " + mod.data.step, onclick: function () { set(mod.data.value - mod.data.step); } }),
          el("button", { class: "btn solid", type: "button", text: "+ " + mod.data.step, onclick: function () { set(mod.data.value + mod.data.step); } }),
          el("button", { class: "btn danger small", type: "button", text: "Reset", onclick: function () { set(0); } }),
        ]));
        m.quick = function () {
          return [
            el("button", { type: "button", "aria-label": "Minus", text: "−", onclick: function (e) { e.stopPropagation(); set(mod.data.value - mod.data.step); } }),
            el("button", { type: "button", "aria-label": "Plus", text: "+", onclick: function (e) { e.stopPropagation(); set(mod.data.value + mod.data.step); } }),
          ];
        };
        big.textContent = String(mod.data.value);
        m.read = String(mod.data.value);
        m.sub = "step " + mod.data.step;
      },
    },
    timer: {
      label: "Timer", icon: "moon", desc: "Countdown with an alarm. Survives closing the app.",
      defaults: function () { return { minutes: 10, endAt: 0, left: 0 }; },
      fields: [{ key: "minutes", type: "number", label: "Minutes", min: 1, max: 1440 }],
      mount: function (mod, m) {
        var d = mod.data;
        var big = el("div", { class: "big-read" });
        var go = el("button", { class: "btn solid", type: "button" });
        function remaining() { return d.endAt ? d.endAt - Date.now() : (d.left || d.minutes * 60000); }
        function render() {
          var r = remaining();
          if (d.endAt && r <= 0) { d.endAt = 0; d.left = 0; saveLayout(); alarm(); toast("⏰ " + mod.name + " — time's up."); }
          big.textContent = fmtDuration(d.endAt ? r : (d.left || d.minutes * 60000));
          go.textContent = d.endAt ? "Pause" : d.left ? "Resume" : "Start";
          m.read = big.textContent;
          m.sub = d.endAt ? "Running" : d.left ? "Paused" : d.minutes + " min";
          refreshTile(m);
        }
        function toggle() {
          if (d.endAt) { d.left = d.endAt - Date.now(); d.endAt = 0; }
          else { d.endAt = Date.now() + (d.left || d.minutes * 60000); d.left = 0; }
          saveLayout(); render();
        }
        go.addEventListener("click", toggle);
        m.body.append(big, el("div", { class: "btns" }, [go,
          el("button", { class: "btn ghost", type: "button", text: "Reset", onclick: function () { d.endAt = 0; d.left = 0; saveLayout(); render(); } })]));
        m.quick = function () { return [el("button", { type: "button", "aria-label": "Start or pause", text: "⏯", onclick: function (e) { e.stopPropagation(); toggle(); } })]; };
        everyFor(m, render);
      },
    },
    stopwatch: {
      label: "Stopwatch", icon: "terminal", desc: "Lap timer for runs, dives, launches.",
      defaults: function () { return { startedAt: 0, banked: 0, laps: [] }; },
      fields: [],
      mount: function (mod, m) {
        var d = mod.data;
        var big = el("div", { class: "big-read" });
        var laps = el("ol", { class: "checks" });
        var go = el("button", { class: "btn solid", type: "button" });
        function elapsed() { return d.banked + (d.startedAt ? Date.now() - d.startedAt : 0); }
        function render() {
          big.textContent = fmtDuration(elapsed(), true);
          go.textContent = d.startedAt ? "Stop" : "Start";
          m.read = fmtDuration(elapsed());
          m.sub = d.startedAt ? "Running" : d.laps.length ? d.laps.length + " laps" : "Ready";
          refreshTile(m);
        }
        function renderLaps() {
          laps.textContent = "";
          d.laps.forEach(function (ms, i) { laps.appendChild(el("li", null, [el("span", { text: "Lap " + (i + 1) }), el("b", { text: fmtDuration(ms, true) })])); });
        }
        function toggle() {
          if (d.startedAt) { d.banked = elapsed(); d.startedAt = 0; } else d.startedAt = Date.now();
          saveLayout(); render();
        }
        go.addEventListener("click", toggle);
        m.body.append(big, el("div", { class: "btns" }, [go,
          el("button", { class: "btn ghost", type: "button", text: "Lap", onclick: function () { if (d.laps.length < 99) { d.laps.push(elapsed()); saveLayout(); renderLaps(); render(); } } }),
          el("button", { class: "btn danger small", type: "button", text: "Reset", onclick: function () { d.startedAt = 0; d.banked = 0; d.laps = []; saveLayout(); renderLaps(); render(); } })]), laps);
        m.quick = function () { return [el("button", { type: "button", "aria-label": "Start or stop", text: "⏯", onclick: function (e) { e.stopPropagation(); toggle(); } })]; };
        renderLaps();
        // While its console is open, a running stopwatch repaints its tenths.
        m.onOpen = function () {
          (function loop() { if (!m.open || registry[m.id] !== m) return; if (d.startedAt) render(); requestAnimationFrame(loop); })();
        };
        everyFor(m, render);
      },
    },
    countdown: {
      label: "Countdown", icon: "rocket", desc: "Days to launch: a trip, a birthday, a deadline.",
      defaults: function () { var t = new Date(Date.now() + 30 * 864e5); return { date: t.toISOString().slice(0, 10) }; },
      fields: [{ key: "date", type: "date", label: "Target date" }],
      mount: function (mod, m) {
        var big = el("div", { class: "big-read" }), sub = el("p", { class: "note", style: "text-align:center" });
        m.body.append(big, sub);
        everyFor(m, function (now) {
          var target = new Date(mod.data.date + "T00:00");
          var ms = target - now;
          var days = Math.ceil(ms / 864e5);
          big.textContent = isNaN(days) ? "--" : days > 0 ? "T−" + days + "d" : days === 0 ? "TODAY" : "T+" + Math.abs(days) + "d";
          sub.textContent = isNaN(target) ? "Set a date" : target.toDateString() + (ms > 0 ? " · " + Math.floor(ms / 36e5) + " hours to go" : "");
          m.read = big.textContent;
          m.sub = isNaN(target) ? "" : target.toDateString();
          refreshTile(m);
        });
      },
    },
    worldclock: {
      label: "World Clock", icon: "globe", desc: "Time somewhere else: family, clients, home port.",
      defaults: function () { return { zone: "America/Los_Angeles" }; },
      fields: [{ key: "zone", type: "zone", label: "Time zone" }],
      mount: function (mod, m) {
        var big = el("div", { class: "big-read" }), sub = el("p", { class: "note", style: "text-align:center" });
        m.body.append(big, sub);
        var fmt, dfmt;
        try {
          fmt = new Intl.DateTimeFormat([], { timeZone: mod.data.zone, hour: "numeric", minute: "2-digit", hour12: !C.clock24 });
          dfmt = new Intl.DateTimeFormat([], { timeZone: mod.data.zone, weekday: "short", month: "short", day: "numeric" });
        } catch (e) { fmt = null; }
        everyFor(m, function (now) {
          big.textContent = fmt ? fmt.format(now) : "--";
          sub.textContent = mod.data.zone.replace(/_/g, " ") + (dfmt ? " · " + dfmt.format(now) : "");
          m.read = big.textContent;
          m.sub = mod.data.zone.split("/").pop().replace(/_/g, " ");
          refreshTile(m);
        });
      },
    },
    web: {
      label: "Web Panel", icon: "news", desc: "Dock a web page into the bridge (sites that allow it).",
      defaults: function () { return { url: "https://411-weather.vercel.app/" }; },
      fields: [{ key: "url", type: "url", label: "Page address (https)" }],
      mount: function (mod, m) {
        var url = mod.data.url;
        var host = url.replace(/^https:\/\//, "").split("/")[0];
        m.read = host.toUpperCase();
        m.sub = "Web panel";
        m.onOpen = function () {
          if (m.body.childNodes.length) return;
          m.body.append(
            el("iframe", { class: "web-frame", src: url, title: mod.name, loading: "lazy", referrerpolicy: "no-referrer", sandbox: "allow-scripts allow-same-origin allow-forms allow-popups" }),
            el("p", { class: "note", text: "Blank? That site doesn't allow being docked. Open it instead." }),
            el("div", { class: "btns" }, [el("a", Object.assign({ class: "btn" }, linkAttrs(url)), [icon("link"), "Open " + host])]));
        };
      },
    },
  };

  /* ---------- Validation: storage, share links and files are untrusted ---------- */
  function str(v, max, fallback) {
    if (typeof v !== "string") return fallback;
    v = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
    return v || fallback;
  }
  function num(v, min, max, fallback) { v = Number(v); return isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback; }
  function iconName(v, fallback) { return ICONS[v] ? v : fallback; }

  function sanitizeModule(raw) {
    if (!raw || typeof raw !== "object" || !TYPES[raw.type]) return null;
    var type = TYPES[raw.type];
    var d = raw.data && typeof raw.data === "object" ? raw.data : {};
    var def = type.defaults();
    var data = {};
    if (raw.type === "deck" || raw.type === "keys") {
      data.items = (Array.isArray(d.items) ? d.items : def.items).slice(0, 24).map(function (it) {
        return it && typeof it === "object" ? { name: str(it.name, 40, "Link"), url: safeUrl(it.url), icon: iconName(it.icon, raw.type === "keys" ? "bolt" : "globe") } : null;
      }).filter(Boolean);
    } else if (raw.type === "note") {
      data.text = typeof d.text === "string" ? d.text.slice(0, 20000) : "";
    } else if (raw.type === "checklist") {
      data.items = (Array.isArray(d.items) ? d.items : []).slice(0, 200).map(function (it) {
        return it && typeof it === "object" ? { t: str(it.t, 200, "Item"), done: !!it.done } : null;
      }).filter(Boolean);
    } else if (raw.type === "counter") {
      data.value = Math.round(num(d.value, -1e9, 1e9, 0));
      data.step = Math.round(num(d.step, 1, 1000, 1));
    } else if (raw.type === "timer") {
      data.minutes = Math.round(num(d.minutes, 1, 1440, 10));
      data.endAt = num(d.endAt, 0, 9e15, 0);
      data.left = num(d.left, 0, 864e5, 0);
    } else if (raw.type === "stopwatch") {
      data.startedAt = num(d.startedAt, 0, 9e15, 0);
      data.banked = num(d.banked, 0, 9e12, 0);
      data.laps = (Array.isArray(d.laps) ? d.laps : []).slice(0, 99).map(function (x) { return num(x, 0, 9e12, 0); });
    } else if (raw.type === "countdown") {
      data.date = typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : def.date;
    } else if (raw.type === "worldclock") {
      data.zone = TIMEZONES.indexOf(d.zone) >= 0 ? d.zone : def.zone;
    } else if (raw.type === "web") {
      var u = safeUrl(d.url);
      data.url = /^https:\/\//i.test(u) ? u : def.url;
    }
    return {
      id: typeof raw.id === "string" && /^u-[a-z0-9]{1,24}$/.test(raw.id) ? raw.id : newId(),
      type: raw.type,
      name: str(raw.name, 40, type.label),
      icon: iconName(raw.icon, type.icon),
      accent: ACCENTS[raw.accent] ? raw.accent : "orange",
      wide: !!raw.wide,
      data: data,
    };
  }

  function sanitizeLayout(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    var modules = (Array.isArray(raw.modules) ? raw.modules : []).slice(0, 60).map(sanitizeModule).filter(Boolean);
    var seen = {};
    modules = modules.filter(function (m) { if (seen[m.id]) return false; seen[m.id] = true; return true; });
    var ids = function (list) { return (Array.isArray(list) ? list : []).filter(function (x) { return typeof x === "string" && x.length < 40; }).slice(0, 200); };
    var ship = raw.ship && typeof raw.ship === "object" ? raw.ship : {};
    return {
      ship: { name: str(ship.name, 20, "BLACKOUT"), sub: str(ship.sub, 28, "BRIDGE // CMD") },
      order: ids(raw.order),
      hidden: ids(raw.hidden),
      modules: modules,
    };
  }

  var idCounter = 0;
  function newId() { return "u-" + Date.now().toString(36) + (idCounter++).toString(36); }

  /* ---------- Mounting user modules into the registry ---------- */
  function mountUser(mod) {
    var m = registry[mod.id] = {
      id: mod.id, title: mod.name, icon: mod.icon, accent: mod.accent, wide: mod.wide,
      body: el("div"), read: "", sub: "", user: mod,
    };
    TYPES[mod.type].mount(mod, m);
    return m;
  }

  /* =====================================================================
   * Bridge: viewscreen, ticker, station grid
   * ===================================================================== */
  function gauge(label, accent) {
    var R = 40, L = 2 * Math.PI * R;
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");
    var track = document.createElementNS(SVGNS, "circle");
    var fill = document.createElementNS(SVGNS, "circle");
    [track, fill].forEach(function (c) { c.setAttribute("cx", "50"); c.setAttribute("cy", "50"); c.setAttribute("r", String(R)); svg.appendChild(c); });
    track.setAttribute("class", "track");
    fill.setAttribute("class", "fill");
    fill.setAttribute("stroke-dasharray", L.toFixed(1));
    fill.setAttribute("stroke-dashoffset", L.toFixed(1));
    var val = el("span", { class: "g-val", text: "--" });
    var node = el("div", { class: "gauge" + (accent ? " " + accent : ""), role: "img", "aria-label": label }, [el("div", { style: "position:relative;width:100%;display:grid;place-items:center" }, [svg, val]), el("span", { class: "g-lab", text: label })]);
    return {
      node: node,
      set: function (pct, text) {
        fill.setAttribute("stroke-dashoffset", (L * (1 - Math.max(0, Math.min(100, pct)) / 100)).toFixed(1));
        val.textContent = text;
        node.setAttribute("aria-label", label + " " + text);
      },
    };
  }

  function buildViewscreen() {
    var vs = $("viewscreen");
    var time = el("div", { class: "vs-time" }), date = el("div", { class: "vs-date" });
    var wxBox = el("div", { class: "vs-wx" });
    var gDay = gauge("DAY", ""), gYear = gauge("YEAR", "orange"), gMoon = gauge("MOON", ""), gHum = gauge("HUMID", "orange");
    vs.append(el("div", { class: "radar", "aria-hidden": "true" }),
      el("div", { class: "vs-top" }, [el("div", null, [time, date]), wxBox]),
      el("div", { class: "gauges" }, [gDay.node, gYear.node, gMoon.node, gHum.node]));
    vs.addEventListener("click", function (e) { if (!e.target.closest("button,a")) openModule("chrono"); });

    var lastMin = -1;
    every(function (now) {
      var h = now.getHours();
      var main = clockText(now);
      time.textContent = main;
      time.appendChild(el("small", { text: ":" + pad(now.getSeconds()) + (C.clock24 ? "" : h < 12 ? " AM" : " PM") }));
      $("hud-clock").textContent = main + (C.clock24 ? "" : (h < 12 ? "a" : "p"));
      if (now.getMinutes() === lastMin) return;
      lastMin = now.getMinutes();
      var d = dayOfYear(now);
      date.textContent = DAYS[now.getDay()] + " · " + MONTHS[now.getMonth()].slice(0, 3) + " " + now.getDate() + " · SD " + now.getFullYear() + "." + String(d.n).padStart(3, "0");
      var p = progressOf(now);
      gDay.set(p.Day, Math.floor(p.Day) + "%");
      gYear.set(p.Year, Math.floor(p.Year) + "%");
      var moon = moonPhase(now);
      gMoon.set(moon.lit, moon.lit + "%");
    });

    function renderWx() {
      var d = currentWx();
      wxBox.textContent = "";
      if (!d || !d.current) {
        wxBox.append(el("div", { class: "t", text: "--°" }), el("div", { class: "c", text: wxLoading ? "SCANNING…" : "NO DATA" }));
        gHum.set(0, "--");
        return;
      }
      wxBox.append(icon(wxIcon(d.current.weather_code, d.current.is_day)), el("div", { class: "t", text: deg(d.current.temperature_2m) }), el("div", { class: "c", text: (WMO[d.current.weather_code] || "") }));
      gHum.set(d.current.relative_humidity_2m, Math.round(d.current.relative_humidity_2m) + "%");
    }
    wxListeners.push(renderWx);
    spotListeners.push(renderWx);
    renderWx();
  }

  function startTicker() {
    var t = $("ticker");
    var i = 0;
    function lines() {
      var s = currentSpot(), d = currentWx(), out = [];
      out.push("ALL SYSTEMS NOMINAL · " + (navigator.onLine ? "COMMS LINK UP" : "COMMS DOWN · RUNNING ON SAVED DATA"));
      out.push("POSITION " + s.name.toUpperCase() + " · " + Math.abs(s.lat).toFixed(2) + (s.lat >= 0 ? "N " : "S ") + Math.abs(s.lng).toFixed(2) + (s.lng >= 0 ? "E" : "W"));
      if (d && d.current) out.push("WIND " + Math.round(d.current.wind_speed_10m) + " " + ((d.current_units || {}).wind_speed_10m || "") + " · FEELS " + deg(d.current.apparent_temperature) + " · RAIN " + (d.daily.precipitation_probability_max[0] || 0) + "%");
      if (d && d.daily) out.push("SUNRISE " + hhmm(d.daily.sunrise[0]) + " · SUNSET " + hhmm(d.daily.sunset[0]));
      out.push(moonPhase(new Date()).name.toUpperCase() + " · " + Object.keys(registry).length + " STATIONS ONLINE");
      if (power) out.push("POWER " + power.pct + "%" + (power.charging ? " · CHARGING" : ""));
      return out;
    }
    function next() { var l = lines(); t.textContent = l[i % l.length]; i++; }
    next();
    setInterval(function () { if (!document.hidden) next(); }, 6000);
  }

  function startLights() {
    var net = $("net"), pwr = $("pwr");
    function update() {
      net.textContent = navigator.onLine ? "NET" : "NET ✕";
      net.classList.toggle("off", !navigator.onLine);
      netListeners.forEach(function (fn) { fn(); });
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    function updatePower() {
      if (!power) { pwr.classList.add("dim"); pwr.textContent = "PWR"; return; }
      pwr.classList.remove("dim");
      pwr.textContent = (power.charging ? "⚡" : "PWR ") + power.pct + "%";
      pwr.classList.toggle("low", power.pct <= 20 && !power.charging);
    }
    powerListeners.push(updatePower);
    updatePower();
  }

  /* ---------- Station grid ---------- */
  var arranging = false;

  function orderedIds() {
    var all = Object.keys(registry);
    var order = layout.order.filter(function (id) { return registry[id]; });
    all.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
    return order;
  }

  function renderTiles() {
    var host = $("modules");
    host.textContent = "";
    host.classList.toggle("arranging", arranging);
    document.body.classList.toggle("arranging", arranging);
    var ids = orderedIds();
    var shown = 0;
    ids.forEach(function (id, idx) {
      var m = registry[id];
      var hidden = layout.hidden.indexOf(id) >= 0;
      if (hidden && !arranging) { m.tile = null; return; }
      shown++;
      var read = el("div", { class: "tile-read", text: m.read || "--" });
      var sub = el("div", { class: "tile-sub", text: m.sub || "" });
      var kids = [
        el("div", { class: "tile-head" }, [icon(m.icon), el("span", { class: "tile-title", text: m.title }), el("span", { class: "tile-code", text: (m.user ? "U" : "S") + "-" + pad(idx + 1) })]),
        read, sub,
      ];
      if (m.quick && !arranging) {
        var q = m.quick();
        if (q.length) kids.push(el("div", { class: "tile-quick" }, q));
      }
      if (arranging) kids.push(arrangeControls(m, idx, ids, hidden));
      var tile = el("div", {
        class: "tile panel" + (m.wide ? " wide" : "") + (hidden ? " hidden-mod" : ""),
        "data-accent": m.accent, role: "button", tabindex: "0", "aria-label": m.title + ": " + (m.read || ""),
      }, kids);
      tile.addEventListener("click", function (e) {
        if (arranging || e.target.closest(".tile-quick,.tile-edit")) return;
        openModule(id);
      });
      tile.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && e.target === tile && !arranging) { e.preventDefault(); openModule(id); }
      });
      m.tile = { node: tile, read: read, sub: sub };
      host.appendChild(tile);
    });
    host.appendChild(el("button", { class: "tile panel fab-tile", type: "button", onclick: function () { openFabricator(); } }, [el("b", { text: "+" }), "FABRICATE MODULE"]));
    $("station-count").textContent = shown + " ONLINE" + (layout.hidden.length ? " · " + layout.hidden.length + " STOWED" : "");
  }

  function arrangeControls(m, idx, ids, hidden) {
    function move(dir) {
      var order = ids.slice();
      var j = idx + dir;
      if (j < 0 || j >= order.length) return;
      order.splice(j, 0, order.splice(idx, 1)[0]);
      layout.order = order;
      saveLayout(); renderTiles();
    }
    var btns = [
      el("button", { type: "button", "aria-label": "Move " + m.title + " earlier", text: "◀", onclick: function () { move(-1); } }),
      el("button", { type: "button", "aria-label": "Move " + m.title + " later", text: "▶", onclick: function () { move(1); } }),
      el("button", { type: "button", "aria-label": (hidden ? "Show " : "Stow ") + m.title, text: hidden ? "👁" : "⊘", onclick: function () {
        if (hidden) layout.hidden = layout.hidden.filter(function (x) { return x !== m.id; });
        else layout.hidden.push(m.id);
        saveLayout(); renderTiles();
      } }),
    ];
    if (m.user) btns.push(el("button", { type: "button", "aria-label": "Edit " + m.title, text: "✎", onclick: function () { openFabricator(m.user); } }));
    return el("div", { class: "tile-edit" }, btns);
  }

  /* ---------- Sheet ---------- */
  var sheetMod = null;
  function openSheet(title, iconName, body, actions, mod) {
    closeSheetNow();
    $("sheet-title").textContent = title;
    $("sheet-icon").textContent = "";
    $("sheet-icon").appendChild(icon(iconName));
    $("sheet-actions").textContent = "";
    (actions || []).forEach(function (a) { $("sheet-actions").appendChild(a); });
    $("sheet-body").textContent = "";
    $("sheet-body").appendChild(body);
    $("sheet").hidden = false;
    $("sheet-backdrop").hidden = false;
    document.body.style.overflow = "hidden";
    sheetMod = mod || null;
    if (sheetMod) sheetMod.open = true;
    // The phone's Back gesture closes the console instead of leaving.
    if (!history.state || !history.state.sheet) history.pushState({ sheet: 1 }, "");
    setTimeout(function () { $("sheet-close").focus(); }, 30);
  }
  function closeSheetNow() {
    if (sheetMod) sheetMod.open = false;
    sheetMod = null;
    $("sheet").hidden = true;
    $("sheet-backdrop").hidden = true;
    document.body.style.overflow = "";
  }
  function closeSheet() {
    if (history.state && history.state.sheet) history.back(); else closeSheetNow();
  }
  window.addEventListener("popstate", function () { if (!$("sheet").hidden) closeSheetNow(); });
  $("sheet-close").addEventListener("click", closeSheet);
  $("sheet-backdrop").addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });

  function openModule(id) {
    var m = registry[id];
    if (!m) return;
    var actions = m.user ? [el("button", { class: "btn ghost small", type: "button", text: "Edit", onclick: function () { openFabricator(m.user); } })] : [];
    openSheet(m.title, m.icon, m.body, actions, m);
    if (m.onOpen) m.onOpen();
  }

  /* =====================================================================
   * FABRICATE: build or edit a module from a template
   * ===================================================================== */
  function openFabricator(existing) {
    if (existing) { fabricateForm(existing.type, JSON.parse(JSON.stringify(existing))); return; }
    var grid = el("div", { class: "templates" }, Object.keys(TYPES).map(function (key) {
      var t = TYPES[key];
      return el("button", { class: "template panel", type: "button", onclick: function () { fabricateForm(key, null); } }, [icon(t.icon), el("b", { text: t.label }), el("small", { text: t.desc })]);
    }));
    openSheet("Fabricate module", "spark", el("div", null, [
      el("p", { class: "note", text: "Pick a template. You name it, skin it and fill it in; the bridge builds the station." }), grid]));
  }

  function fabricateForm(typeKey, mod) {
    var type = TYPES[typeKey];
    var editing = !!mod;
    mod = mod || { id: newId(), type: typeKey, name: type.label, icon: type.icon, accent: "orange", wide: false, data: type.defaults() };
    var form = el("form", { novalidate: true });

    var name = el("input", { maxlength: "40", value: mod.name, required: true });
    form.append(el("label", { class: "field" }, [el("span", { text: "Station name" }), name]));

    var iconWrap = el("div", { class: "icon-pick", role: "radiogroup", "aria-label": "Icon" });
    function drawIcons() {
      iconWrap.textContent = "";
      ICON_NAMES.forEach(function (n) {
        iconWrap.appendChild(el("button", { type: "button", "aria-label": n, "aria-pressed": String(mod.icon === n), onclick: function () { mod.icon = n; drawIcons(); } }, [icon(n)]));
      });
    }
    drawIcons();
    form.append(el("div", { class: "field" }, [el("span", { text: "Icon" }), iconWrap]));

    var sw = el("div", { class: "swatches", role: "radiogroup", "aria-label": "Accent" });
    function drawSw() {
      sw.textContent = "";
      Object.keys(ACCENTS).forEach(function (k) {
        sw.appendChild(el("button", { type: "button", "aria-label": k, "aria-pressed": String(mod.accent === k), style: "background:" + ACCENTS[k] + ";color:" + ACCENTS[k], onclick: function () { mod.accent = k; drawSw(); } }));
      });
    }
    drawSw();
    var size = el("div", { class: "seg" });
    function drawSize() {
      size.textContent = "";
      [["Standard", false], ["Wide", true]].forEach(function (o) {
        size.appendChild(el("button", { type: "button", text: o[0], "aria-pressed": String(mod.wide === o[1]), onclick: function () { mod.wide = o[1]; drawSize(); } }));
      });
    }
    drawSize();
    form.append(el("div", { class: "row-inline" }, [el("div", { class: "field", style: "flex:1" }, [el("span", { text: "Accent" }), sw]), el("div", { class: "field", style: "flex:1" }, [el("span", { text: "Size" }), size])]));

    // Type-specific fields
    var readers = [];
    type.fields.forEach(function (f) {
      if (f.type === "items") {
        var box = el("div", { class: "items-edit" });
        var items = mod.data.items;
        var drawItems = function () {
          box.textContent = "";
          items.forEach(function (it, i) {
            var n = el("input", { class: "input", value: it.name, maxlength: "40", placeholder: "Label", "aria-label": "Label " + (i + 1) });
            var u = el("input", { class: "input", value: it.url, maxlength: "2000", placeholder: "https://… or tel: / sms: / app://", inputmode: "url", autocapitalize: "none", "aria-label": "Link " + (i + 1) });
            n.addEventListener("input", function () { it.name = n.value; });
            u.addEventListener("input", function () { it.url = u.value; });
            var sel = el("select", { class: "input icon-sel", "aria-label": "Icon " + (i + 1) }, ICON_NAMES.map(function (k) { return el("option", { value: k, text: k }); }));
            sel.value = it.icon;
            sel.addEventListener("change", function () { it.icon = sel.value; });
            box.appendChild(el("div", { class: "item-row" }, [n, u,
              el("button", { class: "icon-btn", type: "button", "aria-label": "Remove " + (it.name || "item"), text: "✕", onclick: function () { items.splice(i, 1); drawItems(); } }),
              sel,
              el("span", { class: "row-inline" }, [
                el("button", { class: "icon-btn", type: "button", "aria-label": "Move up", text: "▲", onclick: function () { if (i > 0) { items.splice(i - 1, 0, items.splice(i, 1)[0]); drawItems(); } } }),
                el("button", { class: "icon-btn", type: "button", "aria-label": "Move down", text: "▼", onclick: function () { if (i < items.length - 1) { items.splice(i + 1, 0, items.splice(i, 1)[0]); drawItems(); } } }),
              ]),
            ]));
          });
          box.appendChild(el("button", { class: "btn ghost small", type: "button", text: "+ Add " + (typeKey === "keys" ? "key" : "link"), onclick: function () {
            if (items.length >= 24) { toast("24 is the limit for one module. Fabricate another for more."); return; }
            items.push({ name: "", url: "", icon: typeKey === "keys" ? "bolt" : "globe" }); drawItems();
          } }));
        };
        drawItems();
        form.append(el("div", { class: "field" }, [el("span", { text: typeKey === "keys" ? "Keys" : "Links" }), box, f.hint ? el("p", { class: "note", text: f.hint }) : null]));
        return;
      }
      var input;
      if (f.type === "zone") {
        input = el("select", null, TIMEZONES.map(function (z) { return el("option", { value: z, text: z.replace(/_/g, " ") }); }));
        input.value = mod.data[f.key];
      } else if (f.type === "textarea") {
        input = el("textarea", { rows: "6", placeholder: "One per line" });
      } else {
        input = el("input", { type: f.type === "url" ? "url" : f.type, value: mod.data[f.key] == null ? "" : String(mod.data[f.key]), min: f.min, max: f.max, inputmode: f.type === "number" ? "numeric" : null, autocapitalize: f.type === "url" ? "none" : null });
      }
      form.append(el("label", { class: "field" }, [el("span", { text: f.label }), input]));
      readers.push(function () {
        if (f.key === "seed") {
          if (input.value.trim()) input.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 200).forEach(function (t) { mod.data.items.push({ t: t, done: false }); });
        } else mod.data[f.key] = f.type === "number" ? Number(input.value) : input.value;
      });
    });

    var actions = el("div", { class: "btns" }, [
      el("button", { class: "btn solid", type: "submit", text: editing ? "Save module" : "Bring online" }),
      el("button", { class: "btn ghost", type: "button", text: "Cancel", onclick: closeSheet }),
      editing ? el("button", { class: "btn danger", type: "button", text: "Decommission", onclick: function () {
        if (!confirm("Remove " + mod.name + " from the bridge?")) return;
        layout.modules = layout.modules.filter(function (x) { return x.id !== mod.id; });
        delete registry[mod.id];
        saveLayout(); renderTiles(); closeSheet(); toast(mod.name + " decommissioned.");
      } }) : null,
    ]);
    form.append(actions);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      mod.name = name.value;
      readers.forEach(function (r) { r(); });
      var clean = sanitizeModule(mod);
      if (!clean) return;
      if (clean.type === "web" && clean.data.url !== safeUrl(mod.data.url)) toast("Web panels need an https:// address.");
      var at = layout.modules.map(function (x) { return x.id; }).indexOf(clean.id);
      if (at >= 0) layout.modules[at] = clean; else layout.modules.push(clean);
      delete registry[clean.id];
      mountUser(clean);
      saveLayout();
      closeSheetNow();
      if (history.state && history.state.sheet) history.back();
      renderTiles();
      toast((editing ? "Saved: " : "Online: ") + clean.name);
    });
    openSheet(editing ? "Edit " + mod.name : "New " + type.label, type.icon, form);
    if (!editing) setTimeout(function () { name.select(); }, 60);
  }

  /* =====================================================================
   * SHARE: link, file, import, ship name
   * ===================================================================== */
  function toB64(json) {
    var bytes = new TextEncoder().encode(json), bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromB64(code) {
    var b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    var bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    return new TextDecoder().decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); }));
  }
  function exportable() {
    var clean = sanitizeLayout(layout);
    // Personal running state stays home: notes, checklist ticks and timers.
    clean.modules.forEach(function (m) {
      if (m.type === "note") m.data.text = "";
      if (m.type === "checklist") m.data.items.forEach(function (it) { it.done = false; });
      if (m.type === "timer") { m.data.endAt = 0; m.data.left = 0; }
      if (m.type === "stopwatch") { m.data.startedAt = 0; m.data.banked = 0; m.data.laps = []; }
      if (m.type === "counter") m.data.value = 0;
    });
    return { v: 1, kind: "blackout-bridge", ship: clean.ship, order: clean.order, hidden: clean.hidden, modules: clean.modules };
  }

  function importLayout(raw, mode) {
    var incoming = sanitizeLayout(raw);
    if (!incoming.modules.length && mode !== "replace") { toast("Nothing to import in that bridge."); return; }
    if (mode === "replace") layout = incoming;
    else {
      incoming.modules.forEach(function (m) {
        m.id = newId();
        layout.modules.push(m);
      });
      layout.modules = layout.modules.slice(0, 60);
    }
    Object.keys(registry).forEach(function (id) { if (registry[id].user) delete registry[id]; });
    layout.modules.forEach(mountUser);
    applyShip();
    save("bridge", layout);
    renderTiles();
    toast("Imported " + incoming.modules.length + " module" + (incoming.modules.length === 1 ? "" : "s") + ".");
  }

  function applyShip() {
    $("ship-name").textContent = layout.ship.name;
    $("ship-sub").textContent = layout.ship.sub;
    document.title = layout.ship.name + " // BRIDGE";
  }

  function openShare() {
    var shipName = el("input", { maxlength: "20", value: layout.ship.name });
    var shipSub = el("input", { maxlength: "28", value: layout.ship.sub });
    var status = el("p", { class: "note", role: "status" });
    var file = el("input", { type: "file", accept: "application/json,.json", hidden: true });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      f.text().then(function (t) { importLayout(JSON.parse(t), "merge"); closeSheet(); }).catch(function () { status.textContent = "That file isn't a bridge."; });
      file.value = "";
    });
    var body = el("div", null, [
      el("p", { class: "note", text: "Your bridge is a template other people can load: share it and they get your stations, skins and links (notes, ticks and timers stay on your phone)." }),
      el("label", { class: "field" }, [el("span", { text: "Ship name" }), shipName]),
      el("label", { class: "field" }, [el("span", { text: "Subtitle" }), shipSub]),
      el("div", { class: "btns" }, [
        el("button", { class: "btn solid", type: "button", text: "Save name", onclick: function () {
          layout.ship = sanitizeLayout({ ship: { name: shipName.value, sub: shipSub.value } }).ship;
          applyShip(); saveLayout(); status.textContent = "Ship renamed.";
        } }),
      ]),
      el("div", { class: "btns" }, [
        el("button", { class: "btn", type: "button", text: "Share link", onclick: function () {
          var url = location.origin + "/#bridge=" + toB64(JSON.stringify(exportable()));
          if (url.length > 60000) { status.textContent = "This bridge is too big for a link. Export a file instead."; return; }
          (navigator.share ? navigator.share({ title: layout.ship.name + " bridge", url: url }) : navigator.clipboard.writeText(url).then(function () { status.textContent = "Link copied."; }))
            .catch(function () { status.textContent = url; });
        } }),
        el("button", { class: "btn ghost", type: "button", text: "Export file", onclick: function () {
          var blob = new Blob([JSON.stringify(exportable(), null, 2)], { type: "application/json" });
          var a = el("a", { href: URL.createObjectURL(blob), download: layout.ship.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".bridge.json" });
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        } }),
        el("button", { class: "btn ghost", type: "button", text: "Import file", onclick: function () { file.click(); } }),
      ]),
      el("div", { class: "btns" }, [
        el("button", { class: "btn danger small", type: "button", text: "Reset bridge", onclick: function () {
          if (!confirm("Remove every module you made and restore the default layout?")) return;
          importLayout({}, "replace"); closeSheet();
        } }),
        el("a", { class: "btn ghost small", href: "/build", text: "Blackout Studio: build a screen for someone" }),
      ]),
      file, status,
    ]);
    openSheet("Share & settings", "spark", body);
  }

  function importFromHash() {
    if (location.hash.indexOf("#bridge=") !== 0) return;
    var code = location.hash.slice(8);
    history.replaceState(null, "", location.pathname + location.search);
    try {
      var raw = JSON.parse(fromB64(code));
      var n = sanitizeLayout(raw).modules.length;
      if (n && confirm("Load " + n + " module" + (n === 1 ? "" : "s") + " from this shared bridge into yours?")) importLayout(raw, "merge");
    } catch (e) { toast("That bridge link is broken."); }
  }

  /* =====================================================================
   * Space backdrop: slow starfield
   * ===================================================================== */
  function startSpace() {
    var canvas = $("space");
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var stars = [], w = 0, h = 0, raf = 0, last = 0;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      for (var i = 0; i < Math.round(w * h / 2600); i++) stars.push({ x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.8 + 0.2, c: Math.random() < 0.12 ? "#ff9a4a" : Math.random() < 0.2 ? "#7dffb5" : "#ffffff" });
      frame(0);
    }
    function frame(dt) {
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
      var g = ctx.createRadialGradient(w * 0.8, h * 0.1, 10, w * 0.8, h * 0.1, h * 0.7);
      g.addColorStop(0, "rgba(255,122,26,0.10)"); g.addColorStop(1, "rgba(255,122,26,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y += s.z * dt * 0.012;
        if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
        ctx.globalAlpha = 0.35 + s.z * 0.6;
        ctx.fillStyle = s.c;
        ctx.fillRect(s.x, s.y, s.z * 1.6, s.z * 1.6 + (dt ? s.z * 1.2 : 0));
      }
      ctx.globalAlpha = 1;
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      var dt = last ? Math.min(64, now - last) : 16;
      if (now - last < 33) return; // ~30 fps is plenty
      last = now; frame(dt);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (REDUCE) return; // a still starfield under Reduce Motion
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
    });
    raf = requestAnimationFrame(loop);
  }

  /* =====================================================================
   * Start
   * ===================================================================== */
  layout = sanitizeLayout(load("bridge", null));
  weatherCard(); chronoCard(); calendarCard(); sunCard(); progressCard();
  locationCard(); powerCard(); commsCard(); systemsCard();
  configDecks();
  layout.modules.forEach(mountUser);
  applyShip();

  buildViewscreen();
  renderTiles();
  startLights();
  startTicker();
  startSpace();
  startTicking();
  fetchWeather();
  importFromHash();

  $("dock-fab").addEventListener("click", function () { openFabricator(); });
  $("dock-share").addEventListener("click", openShare);
  $("dock-edit").addEventListener("click", function () {
    arranging = !arranging;
    $("dock-edit").setAttribute("aria-pressed", String(arranging));
    renderTiles();
    if (arranging) toast("Arrange mode: ◀ ▶ move a station, ⊘ stows it, ✎ edits your own.");
  });

  setInterval(function () { if (!document.hidden) fetchWeather(); }, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) fetchWeather(); });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
  }
})();
