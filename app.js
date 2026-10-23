/* BLACKOUT — the home screen: three swipeable screens (Basics, My Sites,
 * Shortcuts) of drop-down cards over Matrix code rain. Links, sites and
 * shortcuts come from config.js; icons from themes.js. All content is built
 * with DOM APIs and textContent. */
(function () {
  "use strict";

  var C = window.BLACKOUT_CONFIG;
  var ICONS = window.BLACKOUT.ICONS;
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Helpers ---------- */
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

  // Web links open over the app (Safari sheet) so the home screen stays put;
  // same-site pages and app links (tel:, shortcuts://...) open in place.
  function linkAttrs(url) {
    var web = /^https?:/i.test(url) && url.indexOf(location.origin) !== 0;
    return { href: url, target: web ? "_blank" : null, rel: web ? "noopener" : null };
  }

  /* ---------- Drop-down card ----------
   * card(id, {title, icon, open}) → {node, body, summary(text)}. Tapping the
   * header folds it open or shut (animated in CSS); the choice is remembered. */
  function card(id, opts) {
    var open = load("open." + id, !!opts.open);
    var bodyId = "body-" + id;
    var sum = el("span", { class: "card-sum" });
    var head = el("button", { class: "card-head", type: "button", "aria-expanded": String(open), "aria-controls": bodyId }, [
      icon(opts.icon),
      el("span", { class: "card-title", text: opts.title }),
      sum,
      el("span", { class: "chev", "aria-hidden": "true" }),
    ]);
    var inner = el("div", { class: "card-pad" });
    var body = el("div", { class: "card-body", id: bodyId, role: "region", "aria-label": opts.title }, [el("div", { class: "card-clip" }, [inner])]);
    var node = el("article", { class: "card" + (open ? " open" : "") }, [head, body]);
    if (!open) body.inert = true;
    head.addEventListener("click", function () {
      open = !open;
      node.classList.toggle("open", open);
      head.setAttribute("aria-expanded", String(open));
      body.inert = !open;
      save("open." + id, open);
    });
    return { node: node, body: inner, summary: function (t) { sum.textContent = t; } };
  }

  function row(k, v) { return el("div", { class: "kv" }, [el("span", { text: k }), el("b", { text: v })]); }
  function bar(pct) { return el("div", { class: "bar" }, [el("i", { style: "width:" + Math.max(0, Math.min(100, pct)).toFixed(1) + "%" })]); }
  function placeholder(title, text) {
    return el("div", { class: "ph" }, [el("span", { class: "tag", text: "placeholder" }), el("b", { text: title }), el("p", { text: text })]);
  }

  // Everything that changes with the clock registers here; one timer drives it.
  var tickers = [];
  function every(fn) { tickers.push(fn); fn(new Date()); }
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

  /* ---------- Code rain ---------- */
  function startRain() {
    var canvas = $("rain");
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var GLYPHS = "アカサタナハマヤラワイキシチニヒミリウクスツヌフムユルエケセテネヘメレオコソトノホモヨロ0123456789";
    var size = 16, drops = [], w = 0, h = 0, raf = 0, last = 0;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = [];
      for (var i = 0; i < Math.ceil(w / size); i++) drops[i] = Math.floor(Math.random() * -h / size);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
    }
    function frame() {
      ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(0, 0, w, h);
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
      if (now - last < 50) return; // 20 fps is plenty for rain
      last = now; frame();
    }
    function start() { if (!raf) raf = requestAnimationFrame(loop); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (REDUCE) { for (var i = 0; i < 40; i++) frame(); return; } // a still frame under Reduce Motion
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    start();
  }

  /* ---------- Pager: three screens, tabs and the sliding light ---------- */
  function startPager() {
    var pager = $("pager");
    var tabs = [].slice.call(document.querySelectorAll(".tab"));
    var light = document.querySelector(".tab-light");
    var current = -1, queued = false;

    function select(i) {
      if (i === current) return;
      current = i;
      tabs.forEach(function (t, n) {
        t.setAttribute("aria-selected", String(n === i));
        t.tabIndex = n === i ? 0 : -1;
      });
      save("screen", i);
    }
    // The light follows the swipe itself, so it glides between tabs mid-drag.
    function sync() {
      queued = false;
      var w = pager.clientWidth || 1;
      var pos = Math.max(0, Math.min(tabs.length - 1, pager.scrollLeft / w));
      light.style.setProperty("--pos", pos.toFixed(4));
      select(Math.round(pos));
    }
    function go(i, instant) {
      pager.scrollTo({ left: i * pager.clientWidth, behavior: instant || REDUCE ? "auto" : "smooth" });
    }

    pager.addEventListener("scroll", function () {
      if (!queued) { queued = true; requestAnimationFrame(sync); }
    }, { passive: true });
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { go(i); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = (current + d + tabs.length) % tabs.length;
        go(n); tabs[n].focus();
      });
    });
    // Rotation or resize: stay on the same screen.
    window.addEventListener("resize", function () { go(current, true); }, { passive: true });

    var start = load("screen", 0);
    start = start >= 0 && start < tabs.length ? start : 0;
    select(start);
    light.style.setProperty("--pos", start);
    requestAnimationFrame(function () { go(start, true); sync(); document.body.classList.add("ready"); });
  }

  /* ---------- Online / offline ---------- */
  function startNet() {
    var net = $("net");
    function update() {
      net.textContent = navigator.onLine ? "ONLINE" : "OFFLINE";
      net.classList.toggle("off", !navigator.onLine);
      netListeners.forEach(function (fn) { fn(); });
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }
  var netListeners = [];

  /* =====================================================================
   * Screen one: Phone Basics
   * ===================================================================== */

  /* ---------- Clock ---------- */
  function clockCard() {
    var c = card("clock", { title: "Clock", icon: "terminal", open: true });
    var hm = el("span", { class: "clock-hm" }), sec = el("span", { class: "clock-s" }), ap = el("span", { class: "clock-ap" });
    var zone = el("div", { class: "clock-zone" });
    var utc = row("UTC", "");
    c.body.append(el("div", { class: "clock" }, [hm, sec, ap]), zone, utc);
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* old browser */ }
    every(function (now) {
      var h = now.getHours(), text;
      if (C.clock24) { text = pad(h) + ":" + pad(now.getMinutes()); ap.textContent = ""; }
      else { text = ((h % 12) || 12) + ":" + pad(now.getMinutes()); ap.textContent = h < 12 ? "AM" : "PM"; }
      hm.textContent = text;
      sec.textContent = ":" + pad(now.getSeconds());
      var off = -now.getTimezoneOffset();
      zone.textContent = (tz ? tz.replace(/_/g, " ") + " · " : "") + "UTC" + (off >= 0 ? "+" : "-") + Math.floor(Math.abs(off) / 60) + (Math.abs(off) % 60 ? ":" + pad(Math.abs(off) % 60) : "");
      utc.lastChild.textContent = pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes());
      c.summary(text + (ap.textContent ? " " + ap.textContent : ""));
    });
    return c.node;
  }

  /* ---------- Date ---------- */
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 864e5 + 1) / 7);
  }
  function dateCard() {
    var c = card("date", { title: "Date", icon: "calendar", open: true });
    var big = el("div", { class: "date-big" }), sub = el("div", { class: "date-sub" });
    var doy = row("Day of year", ""), wk = row("Week", ""), left = row("Days left this year", "");
    c.body.append(big, sub, doy, wk, left);
    var lastDay = -1;
    every(function (now) {
      if (now.getDate() === lastDay) return;
      lastDay = now.getDate();
      var y = now.getFullYear();
      var start = new Date(y, 0, 1), next = new Date(y + 1, 0, 1);
      var today = new Date(y, now.getMonth(), now.getDate());
      var n = Math.round((today - start) / 864e5) + 1, total = Math.round((next - start) / 864e5);
      big.textContent = DAYS[now.getDay()];
      sub.textContent = MONTHS[now.getMonth()] + " " + now.getDate() + ", " + y;
      doy.lastChild.textContent = n + " / " + total;
      wk.lastChild.textContent = String(isoWeek(now));
      left.lastChild.textContent = String(total - n);
      c.summary(DAYS[now.getDay()].slice(0, 3) + " " + MONTHS[now.getMonth()].slice(0, 3) + " " + now.getDate());
    });
    return c.node;
  }

  /* ---------- Location + weather (Open-Meteo and BigDataCloud, free, no key) ---------- */
  var HOME = C.weather.home;
  var spot = load("spot", null);
  if (!spot || typeof spot.lat !== "number" || typeof spot.lng !== "number") spot = null;
  var wx = load("wx", null);
  var wxListeners = [], spotListeners = [];
  function currentSpot() { return spot || { name: HOME.name, lat: HOME.lat, lng: HOME.lng }; }

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
    var c = card("weather", { title: "Weather", icon: "cloud", open: true });
    var place = el("div", { class: "wx-place" });
    var now = el("div", { class: "wx-now" });
    var details = el("div", { class: "wx-grid" });
    var days = el("ol", { class: "wx-days" });
    var status = el("div", { class: "wx-status" });
    var locBtn = el("button", { class: "btn", type: "button", onclick: locate }, [icon("pin"), "Use my location"]);
    var homeBtn = el("button", { class: "btn ghost", type: "button", onclick: useHome, text: HOME.name });
    var refresh = el("button", { class: "btn ghost", type: "button", onclick: function () { fetchWeather(true); }, text: "Refresh" });
    c.body.append(place, now, details, days, status, el("div", { class: "btns" }, [locBtn, homeBtn, refresh]));

    function deg(v) { return Math.round(v) + "°"; }
    function render() {
      var s = currentSpot();
      place.textContent = s.name + (s.region ? " · " + s.region : "");
      locBtn.lastChild.textContent = locating ? "Locating…" : spot ? "Update my location" : "Use my location";
      homeBtn.hidden = !spot;
      var d = wx && wx.lat === s.lat && wx.lng === s.lng ? wx.data : null;
      if (!d || !d.current) {
        now.textContent = ""; details.textContent = ""; days.textContent = "";
        status.textContent = wxLoading ? "Loading weather…" : navigator.onLine ? "Weather unavailable. Tap Refresh." : "Offline. Weather shows when you're back online.";
        c.summary(wxLoading ? "…" : "--");
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
    }
    wxListeners.push(render);
    spotListeners.push(render);
    netListeners.push(function () { render(); fetchWeather(); });
    render();
    return c.node;
  }

  function locationCard() {
    var c = card("location", { title: "Location", icon: "pin" });
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
        return;
      }
      box.append(row("Place", spot.name));
      if (spot.region) box.append(row("Region", spot.region));
      box.append(row("Latitude", spot.lat.toFixed(4)), row("Longitude", spot.lng.toFixed(4)));
      if (spot.acc) box.append(row("Accuracy", "± " + spot.acc + " m"));
      maps.href = "https://maps.apple.com/?ll=" + spot.lat + "," + spot.lng + "&q=" + encodeURIComponent(spot.name);
      c.summary(spot.name);
    }
    spotListeners.push(render);
    render();
    return c.node;
  }

  /* ---------- Calendar ---------- */
  function calendarCard() {
    var c = card("calendar", { title: "Calendar", icon: "calendar", open: true });
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
      c.summary(MONTHS[now.getMonth()]);
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
      var s = currentSpot();
      var d = wx && wx.lat === s.lat && wx.lng === s.lng ? wx.data : null;
      box.textContent = "";
      if (d && d.daily) {
        var rise = d.daily.sunrise[0], set = d.daily.sunset[0];
        var len = (new Date(set) - new Date(rise)) / 60000;
        box.append(row("Sunrise", hhmm(rise)), row("Sunset", hhmm(set)), row("Daylight", Math.floor(len / 60) + "h " + pad(Math.round(len % 60)) + "m"));
        c.summary("↑" + hhmm(rise).replace(/ [AP]M/, "") + " ↓" + hhmm(set).replace(/ [AP]M/, ""));
      } else {
        box.append(el("p", { class: "note", text: "Sunrise and sunset come with the weather." }));
        c.summary(moon.name);
      }
      box.append(row("Moon", moon.name), row("Lit", moon.lit + "%"), bar(moon.lit), row("Moon age", moon.age.toFixed(1) + " days"));
    }
    wxListeners.push(render);
    spotListeners.push(render);
    render();
    return c.node;
  }

  /* ---------- Progress (day, week, month, year) ---------- */
  function progressCard() {
    var c = card("progress", { title: "Progress", icon: "bolt" });
    var rows = {};
    ["Day", "Week", "Month", "Year"].forEach(function (k) {
      var r = row(k, ""), b = bar(0);
      rows[k] = { v: r.lastChild, b: b.firstChild };
      c.body.append(r, b);
    });
    every(function (now) {
      var mid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var day = (now - mid) / 864e5;
      var mStart = new Date(now.getFullYear(), now.getMonth(), 1), mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      var yStart = new Date(now.getFullYear(), 0, 1), yEnd = new Date(now.getFullYear() + 1, 0, 1);
      var p = {
        Day: day * 100,
        Week: (((now.getDay() + 6) % 7) + day) / 7 * 100,
        Month: (now - mStart) / (mEnd - mStart) * 100,
        Year: (now - yStart) / (yEnd - yStart) * 100,
      };
      Object.keys(p).forEach(function (k) {
        rows[k].v.textContent = p[k].toFixed(k === "Year" ? 2 : 1) + "%";
        rows[k].b.style.width = p[k].toFixed(2) + "%";
      });
      c.summary("Day " + Math.floor(p.Day) + "%");
    });
    return c.node;
  }

  /* ---------- Battery (Chrome only; iOS keeps it private) ---------- */
  function batteryCard() {
    var c = card("battery", { title: "Battery", icon: "bolt" });
    if (!navigator.getBattery) {
      c.body.append(placeholder("Battery level", "iOS doesn't share the battery with web apps. It's in the status bar and Control Center; a Shortcuts automation can speak or log it."));
      c.summary("iOS only");
      return c.node;
    }
    navigator.getBattery().then(function (b) {
      var level = row("Level", ""), state = row("State", ""), bx = bar(0);
      c.body.append(level, bx, state);
      function render() {
        var pct = Math.round(b.level * 100);
        level.lastChild.textContent = pct + "%";
        bx.firstChild.style.width = pct + "%";
        state.lastChild.textContent = b.charging ? "Charging" : "On battery";
        c.summary(pct + "%" + (b.charging ? " ⚡" : ""));
      }
      ["levelchange", "chargingchange"].forEach(function (e) { b.addEventListener(e, render); });
      render();
    }).catch(function () { c.body.append(placeholder("Battery level", "Not available here.")); });
    return c.node;
  }

  /* ---------- Network ---------- */
  function networkCard() {
    var c = card("network", { title: "Network", icon: "globe" });
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
      c.summary(navigator.onLine ? "Online" : "Offline");
    }
    netListeners.push(render);
    render();
    return c.node;
  }

  /* ---------- Device ---------- */
  function deviceCard() {
    var c = card("device", { title: "Device", icon: "gear" });
    var box = el("div");
    c.body.append(box);
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
        row("Orientation", window.innerWidth > window.innerHeight ? "Landscape" : "Portrait"),
        row("Home Screen app", standalone ? "Yes" : "No (Safari)"),
        row("Language", navigator.language || "--"),
        row("Appearance", window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light"),
        row("Reduce Motion", REDUCE ? "On" : "Off"));
      if (!standalone) box.append(el("p", { class: "note", text: "Tip: Share → Add to Home Screen to open Blackout full screen like an app." }));
      c.summary(os);
    }
    window.addEventListener("resize", render, { passive: true });
    render();
    return c.node;
  }

  /* ---------- Storage ---------- */
  function storageCard() {
    var c = card("storage", { title: "Storage", icon: "folder" });
    if (!(navigator.storage && navigator.storage.estimate)) {
      c.body.append(placeholder("Phone storage", "Free space on the iPhone is in Settings → General → iPhone Storage."));
      c.summary("--");
      return c.node;
    }
    function mb(b) { return b > 1e9 ? (b / 1e9).toFixed(1) + " GB" : (b / 1e6).toFixed(1) + " MB"; }
    navigator.storage.estimate().then(function (e) {
      c.body.append(row("This app uses", mb(e.usage || 0)), row("Space it may use", mb(e.quota || 0)), bar(e.quota ? (e.usage || 0) / e.quota * 100 : 0),
        el("p", { class: "note", text: "Only this app's share. Whole-phone storage is in Settings → General → iPhone Storage." }));
      c.summary(mb(e.usage || 0));
    }).catch(function () { c.summary("--"); });
    return c.node;
  }

  /* ---------- iPhone-only data: clean placeholders ---------- */
  function activityCard() {
    var c = card("activity", { title: "Activity", icon: "heart" });
    c.body.append(
      el("div", { class: "rings", "aria-hidden": "true" }, [el("i"), el("i"), el("i")]),
      placeholder("Steps, Move and Health", "Health data never reaches web apps. Placeholder until a Shortcuts automation can feed it in."));
    c.summary("--");
    return c.node;
  }
  function notifyCard() {
    var c = card("notify", { title: "Notifications", icon: "chat" });
    c.body.append(placeholder("Messages, missed calls, Focus", "iOS keeps these to the Lock Screen and Notification Center. Placeholder for now."));
    c.summary("--");
    return c.node;
  }

  /* =====================================================================
   * Screen two: My Sites
   * ===================================================================== */
  function siteCards() {
    return C.sites.map(function (g, gi) {
      var c = card("sites." + gi + "." + g.title, { title: g.title, icon: g.icon || "globe", open: g.open });
      var list = el("ul", { class: "sites" });
      var set = 0;
      g.items.forEach(function (s) {
        var inner = [
          el("span", { class: "tile" }, [icon(s.icon || "globe")]),
          el("span", { class: "site-text" }, [el("b", { text: s.name }), el("small", { text: s.desc || "" })]),
        ];
        if (s.url) {
          set++;
          var host = s.url.charAt(0) === "/" ? "this site" + s.url : s.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
          inner[1].appendChild(el("i", { text: host }));
          list.appendChild(el("li", null, [el("a", Object.assign({ class: "site" }, linkAttrs(s.url)), inner.concat(el("span", { class: "go", "aria-hidden": "true", text: "›" })))]));
        } else {
          inner[1].appendChild(el("i", { text: "Not set yet: add its url in config.js → sites" }));
          list.appendChild(el("li", null, [el("button", { class: "site unset", type: "button", onclick: function () {
            toast(s.name + " has no link yet. Add its url in config.js under sites → " + g.title + ".");
          } }, inner.concat(el("span", { class: "tag", text: "set up" })))]));
        }
      });
      c.body.append(list);
      c.summary(set === g.items.length ? g.items.length + (g.items.length === 1 ? " site" : " sites") : set + " of " + g.items.length + " set");
      return c.node;
    });
  }

  /* =====================================================================
   * Screen three: Shortcuts
   * ===================================================================== */
  function shortcutCards() {
    return C.shortcuts.map(function (g, gi) {
      var c = card("short." + gi + "." + g.title, { title: g.title, icon: g.icon || "bolt", open: g.open });
      var grid = el("div", { class: "keys" });
      var wired = 0;
      g.items.forEach(function (s) {
        var label = [el("span", { class: "key-ico" }, [icon(s.icon)]), el("span", { class: "key-label", text: s.label })];
        if (s.url) {
          wired++;
          grid.appendChild(el("a", Object.assign({ class: "key" }, linkAttrs(s.url)), label));
        } else if (s.shortcut) {
          wired++;
          grid.appendChild(el("a", { class: "key", href: "shortcuts://run-shortcut?name=" + encodeURIComponent(s.shortcut) },
            label.concat(el("span", { class: "key-tag", text: "shortcut" }))));
        } else {
          grid.appendChild(el("button", { class: "key unset", type: "button", onclick: function () {
            toast(s.label + " isn't wired yet. Make a shortcut in the Shortcuts app, then put its exact name in config.js → shortcuts → " + g.title + " → " + s.label + ".");
          } }, label.concat(el("span", { class: "key-tag", text: "set up" }))));
        }
      });
      c.body.append(grid);
      c.summary(wired === g.items.length ? g.items.length + " apps" : wired + " of " + g.items.length + " wired");
      return c.node;
    });
  }

  /* ---------- Start ---------- */
  $("stack-0").append(clockCard(), dateCard(), weatherCard(), calendarCard(), sunCard(), progressCard(),
    locationCard(), batteryCard(), networkCard(), deviceCard(), storageCard(), activityCard(), notifyCard());
  siteCards().forEach(function (n) { $("stack-1").appendChild(n); });
  shortcutCards().forEach(function (n) { $("stack-2").appendChild(n); });

  startPager();
  startNet();
  startRain();
  startTicking();
  fetchWeather();
  setInterval(function () { if (!document.hidden) fetchWeather(); }, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) fetchWeather(); });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
  }
})();
