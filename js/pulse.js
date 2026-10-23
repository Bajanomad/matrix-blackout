/* Pulse tab: clock and date, weather, next events, battery, live status
 * lights for every site, and combined traffic for the last seven days. */
(function () {
  "use strict";

  var BO = window.BO, C = BO.C, el = BO.el, row = BO.row, pad = BO.pad;

  /* ---------- Chrono (clock + date). Tap the time 5× for the easter egg. ---------- */
  function chronoCard() {
    var c = BO.card("chrono", { title: "Chrono", icon: "terminal", open: true });
    var hm = el("span", { class: "clock-hm" }), sec = el("span", { class: "clock-s" }), ap = el("span", { class: "clock-ap" });
    var clock = el("div", { class: "clock", role: "timer" }, [hm, sec, ap]);
    var date = el("div", { class: "clock-date" });
    var ro = {};
    var grid = el("div", { class: "readouts" }, ["UTC", "Day", "Week", "Year"].map(function (k) {
      ro[k] = el("b");
      return el("div", { class: "ro" }, [ro[k], el("span", { text: k === "Day" ? "day of year" : k === "Year" ? "year done" : k })]);
    }));
    c.body.append(clock, date, grid);
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* old browser */ }

    // Easter egg: five taps on the clock within 2 s replays the boot and floods the rain.
    var taps = [];
    clock.addEventListener("click", function () {
      var now = Date.now();
      taps = taps.filter(function (t) { return now - t < 2000; }).concat(now);
      if (taps.length >= 5) {
        taps = [];
        BO.rain.flood(5000);
        BO.boot(true);
      }
    });

    BO.every(function (now) {
      var h = now.getHours(), text;
      if (C.clock24) { text = pad(h) + ":" + pad(now.getMinutes()); ap.textContent = ""; }
      else { text = ((h % 12) || 12) + ":" + pad(now.getMinutes()); ap.textContent = h < 12 ? "AM" : "PM"; }
      hm.textContent = text;
      sec.textContent = ":" + pad(now.getSeconds());
      date.textContent = BO.DAYS[now.getDay()] + " · " + BO.MONTHS[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear() + (tz ? " · " + tz.replace(/_/g, " ") : "");
      var y = now.getFullYear(), start = new Date(y, 0, 1), next = new Date(y + 1, 0, 1);
      var doy = Math.floor((new Date(y, now.getMonth(), now.getDate()) - start) / 864e5) + 1;
      BO.num(ro.UTC, pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes()));
      BO.num(ro.Day, String(doy));
      BO.num(ro.Week, String(isoWeek(now)));
      BO.num(ro.Year, ((now - start) / (next - start) * 100).toFixed(1) + "%");
      c.summary(text + (ap.textContent ? " " + ap.textContent : ""));
    });
    c.state("ok", "LOCAL CLOCK · tap the time five times");
    return c.node;
  }
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  }

  /* ---------- Weather (Open-Meteo + BigDataCloud, free, no key) ---------- */
  var HOME = C.weather.home;
  var WMO = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
    51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Snow", 73: "Snow", 75: "Heavy snow", 77: "Snow", 80: "Showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
  };
  function wxIcon(code, day) { return code >= 95 ? "bolt" : code <= 1 ? (day === 0 ? "moon" : "sun") : "cloud"; }
  function hhmm(iso) {
    var t = (iso || "").split("T")[1] || "";
    var h = +t.slice(0, 2), m = t.slice(3, 5);
    return C.clock24 ? pad(h) + ":" + m : ((h % 12) || 12) + ":" + m + (h < 12 ? "a" : "p");
  }

  function weatherCard() {
    var c = BO.card("weather", { title: "Weather", icon: "cloud", open: true });
    var spot = BO.load("spot", null);
    if (!spot || typeof spot.lat !== "number") spot = null;
    var wx = BO.load("wx", null), loading = false, locating = false;
    var place = el("div", { class: "wx-place" });
    var now = el("div", { class: "wx-now" });
    var grid = el("div", { class: "readouts" });
    var days = el("ol", { class: "wx-days" });
    var locBtn = el("button", { class: "btn", type: "button", onclick: locate }, [BO.icon("pin"), ""]);
    var homeBtn = el("button", { class: "btn ghost", type: "button", onclick: useHome, text: HOME.name });
    c.body.append(place, now, grid, days, el("div", { class: "btns" }, [locBtn, homeBtn]));

    function where() { return spot || { name: HOME.name, lat: HOME.lat, lng: HOME.lng }; }
    function fetchWx(force) {
      var s = where();
      var fresh = wx && wx.lat === s.lat && wx.lng === s.lng && Date.now() - wx.at < 10 * 60 * 1000;
      if ((fresh && !force) || loading) return Promise.resolve();
      if (!navigator.onLine) { render(); return Promise.resolve(); }
      loading = true; render();
      var f = C.weather.units === "c";
      var url = "https://api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lng +
        "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max" +
        "&timezone=auto&forecast_days=6" + (f ? "" : "&temperature_unit=fahrenheit&wind_speed_unit=mph");
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(function (data) {
        wx = { at: Date.now(), lat: s.lat, lng: s.lng, data: data };
        BO.save("wx", wx);
      }).catch(function () { if (wx) wx.failed = true; })
        .then(function () { loading = false; render(); });
    }
    function locate() {
      if (!("geolocation" in navigator)) { BO.toast("This browser can't share location."); return; }
      if (locating) return;
      locating = true; render();
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = Math.round(pos.coords.latitude * 1e4) / 1e4, lng = Math.round(pos.coords.longitude * 1e4) / 1e4;
        spot = { name: "My location", lat: lat, lng: lng };
        BO.save("spot", spot);
        locating = false;
        fetchWx(true);
        fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + lat + "&longitude=" + lng + "&localityLanguage=en")
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            var name = d && (d.city || d.locality || d.principalSubdivision);
            if (!name || !spot || spot.lat !== lat) return;
            spot.name = name;
            spot.region = [d.principalSubdivision, d.countryName].filter(Boolean).join(", ");
            BO.save("spot", spot);
            render();
          }).catch(function () { /* the coordinates are enough */ });
      }, function (err) {
        locating = false; render();
        BO.toast(err.code === 1 ? "Location is off for this app. Allow it in Settings → Privacy → Location Services → Safari Websites." : "Couldn't get your location. Try again outside or with Wi-Fi on.");
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 });
    }
    function useHome() { spot = null; BO.save("spot", null); fetchWx(true); }

    function deg(v) { return Math.round(v) + "°"; }
    function ro(label, value) { return el("div", { class: "ro" }, [el("b", { text: value }), el("span", { text: label })]); }
    function render() {
      var s = where();
      place.textContent = s.name + (s.region ? " · " + s.region : "");
      locBtn.lastChild.textContent = locating ? "LOCATING…" : spot ? "Update location" : "Use my location";
      homeBtn.hidden = !spot;
      var d = wx && wx.lat === s.lat && wx.lng === s.lng ? wx.data : null;
      if (!d || !d.current) {
        now.textContent = ""; grid.textContent = ""; days.textContent = "";
        now.appendChild(loading ? BO.loading("ACQUIRING WEATHER") : el("p", { class: "note", text: navigator.onLine ? "Weather unavailable. Pull down to retry." : "Offline. Weather shows when you're back online." }));
        c.state(loading ? "idle" : "warn", loading ? "LINKING…" : "NO SIGNAL");
        c.summary("--");
        return;
      }
      var cur = d.current, daily = d.daily, u = d.current_units || {};
      now.textContent = "";
      var temp = el("span", { class: "wx-temp" });
      now.append(BO.icon(wxIcon(cur.weather_code, cur.is_day)), temp,
        el("span", { class: "wx-cond" }, [el("b", { text: WMO[cur.weather_code] || "Weather" }),
          el("span", { text: "H " + deg(daily.temperature_2m_max[0]) + "  L " + deg(daily.temperature_2m_min[0]) })]));
      temp.textContent = deg(cur.temperature_2m);
      grid.textContent = "";
      grid.append(
        ro("feels like", deg(cur.apparent_temperature)),
        ro("humidity", Math.round(cur.relative_humidity_2m) + "%"),
        ro("wind " + (u.wind_speed_10m || ""), String(Math.round(cur.wind_speed_10m))),
        ro("rain chance", (daily.precipitation_probability_max[0] == null ? "--" : daily.precipitation_probability_max[0]) + "%"),
        ro("uv index", daily.uv_index_max[0] == null ? "--" : String(Math.round(daily.uv_index_max[0]))),
        ro("sun ↑ ↓", hhmm(daily.sunrise[0]) + " " + hhmm(daily.sunset[0])));
      days.textContent = "";
      for (var i = 1; i < daily.time.length; i++) {
        var day = new Date(daily.time[i] + "T12:00");
        days.appendChild(el("li", null, [
          el("span", { class: "d", text: BO.DAYS[day.getDay()].slice(0, 3).toUpperCase() }),
          BO.icon(wxIcon(daily.weather_code[i], 1)),
          el("span", { class: "c", text: WMO[daily.weather_code[i]] || "" }),
          el("span", { class: "p", text: daily.precipitation_probability_max[i] ? daily.precipitation_probability_max[i] + "%" : "" }),
          el("span", { class: "t", text: deg(daily.temperature_2m_max[i]) + "/" + deg(daily.temperature_2m_min[i]) }),
        ]));
      }
      if (loading) c.state("idle", "UPDATING…");
      else if (wx.failed || Date.now() - wx.at > 60 * 60 * 1000) c.state("warn", "STALE · " + BO.ago(wx.at) + " · OPEN-METEO");
      else c.state("ok", "LIVE · " + BO.ago(wx.at) + " · OPEN-METEO");
      c.summary(deg(cur.temperature_2m) + " " + (WMO[cur.weather_code] || ""));
      var storm = cur.weather_code >= 95 || daily.precipitation_probability_max[0] >= 70;
      BO.ticker.set("weather", [{
        text: "WX " + s.name.toUpperCase() + " " + deg(cur.temperature_2m) + " " + (WMO[cur.weather_code] || "").toUpperCase() + " H" + deg(daily.temperature_2m_max[0]) + " L" + deg(daily.temperature_2m_min[0]),
        level: storm ? "warn" : "info",
      }]);
    }
    render();
    BO.source(10 * 60 * 1000, function (fresh) { return fetchWx(fresh); });
    return c.node;
  }

  /* ---------- Next events (Google Calendar via /api/google) ---------- */
  function eventsCard() {
    var c = BO.card("events", { title: "Next up", icon: "calendar", open: true });
    var list = el("ol", { class: "events" });
    c.body.append(list);
    function when(e) {
      var s = new Date(e.allDay ? e.start + "T00:00" : e.start), now = new Date();
      var same = s.toDateString() === now.toDateString();
      var tmr = new Date(now.getTime() + 864e5).toDateString() === s.toDateString();
      var day = same ? "TODAY" : tmr ? "TMRW" : BO.DAYS[s.getDay()].slice(0, 3).toUpperCase();
      return { day: day, time: e.allDay ? "ALL DAY" : BO.time(s), live: !e.allDay && s <= now && new Date(e.end) > now };
    }
    BO.feed("google", 2 * 60 * 1000, function (res) {
      list.textContent = "";
      var d = res && res.data;
      if (!res) { list.appendChild(BO.loading("SYNCING CALENDAR")); BO.showState(c, null); return; }
      if (d && d.configured === false) {
        list.appendChild(BO.needsEnv(d.missing, "Google Calendar"));
        c.state("idle", "NOT CONNECTED"); c.summary("--");
        return;
      }
      BO.showState(c, res);
      if (!d) return;
      if (!d.events) {
        list.appendChild(BO.placeholder("Calendar", "Couldn't read the calendar: " + (d.eventsError || "unknown error") + ". The refresh token needs the calendar.readonly scope."));
        c.summary("--");
        return;
      }
      if (!d.events.length) {
        list.appendChild(el("p", { class: "note", text: "Nothing in the next 7 days. Clear skies." }));
        c.summary("clear");
        BO.ticker.set("events", [{ text: "CAL CLEAR 7D", level: "ok" }]);
        return;
      }
      d.events.forEach(function (e) {
        var w = when(e);
        list.appendChild(el("li", { class: w.live ? "live" : null }, [
          el("span", { class: "ev-when" }, [el("b", { text: w.live ? "NOW" : w.time }), el("span", { text: w.day })]),
          el("span", { class: "ev-what" }, [el("b", { text: e.title }), e.where ? el("small", { text: e.where }) : null]),
        ]));
      });
      var first = when(d.events[0]);
      c.summary((first.live ? "NOW " : first.day === "TODAY" ? "" : first.day + " ") + (first.live ? "" : first.time));
      BO.ticker.set("events", [{ text: "NEXT " + (first.live ? "NOW" : first.day + " " + first.time) + " · " + d.events[0].title.toUpperCase(), level: "info" }]);
    });
    return c.node;
  }

  /* ---------- Battery (Chrome/Android; iOS keeps it private) ---------- */
  function batteryCard() {
    var c = BO.card("battery", { title: "Power", icon: "bolt" });
    if (!navigator.getBattery) {
      c.body.append(BO.placeholder("Battery level", "iOS doesn't share the battery with web apps. It's in the status bar and Control Center; a Shortcuts automation can log it."));
      c.state("idle", "NOT AVAILABLE ON IOS");
      c.summary("iOS");
      return c.node;
    }
    var box = el("div", { class: "gauges" });
    c.body.append(box);
    navigator.getBattery().then(function (b) {
      function render() {
        var pct = Math.round(b.level * 100);
        box.textContent = "";
        box.append(BO.gauge(pct, pct + "%", b.charging ? "charging" : "battery"));
        box.firstChild.className = "gauge " + (pct <= 15 ? "bad" : pct <= 30 ? "warn" : "ok");
        c.summary(pct + "%" + (b.charging ? " ⚡" : ""));
        c.state(pct <= 15 && !b.charging ? "bad" : "ok", b.charging ? "CHARGING" : "ON BATTERY");
      }
      ["levelchange", "chargingchange"].forEach(function (e) { b.addEventListener(e, render); });
      render();
    }).catch(function () { c.body.append(BO.placeholder("Battery level", "Not available here.")); });
    return c.node;
  }

  /* ---------- Site status lights (/api/sites) ---------- */
  function sitesCard() {
    var c = BO.card("sites", { title: "Sites", icon: "globe", open: true });
    var grid = el("div", { class: "lights" });
    c.body.append(grid);
    var unset = C.projects.filter(function (p) { return !p.site; });
    BO.feed("sites", 60 * 1000, function (res) {
      grid.textContent = "";
      var d = res && res.data;
      BO.showState(c, res);
      if (!d) { grid.appendChild(BO.loading("PINGING")); return; }
      var down = [], segs = [];
      d.sites.forEach(function (s) {
        var lvl = s.state === "up" ? "ok" : s.state === "warn" ? "warn" : "bad";
        if (s.state === "down") down.push(s.name + " DOWN");
        segs.push({ text: s.name.toUpperCase() + " " + (s.state === "up" ? "UP " + s.ms + "MS" : s.state === "warn" ? "HTTP " + s.status : "DOWN" + (s.error ? " · " + s.error.toUpperCase() : "")), level: lvl });
        grid.appendChild(el("a", Object.assign({ class: "light " + lvl }, BO.linkAttrs(s.url)), [
          el("i", { class: "led " + lvl }),
          el("b", { text: s.name }),
          el("span", { text: s.state === "up" ? s.ms + " ms" : s.state === "warn" ? "HTTP " + s.status : s.error || "down" }),
        ]));
      });
      unset.forEach(function (p) {
        grid.appendChild(el("div", { class: "light unset" }, [el("i", { class: "led" }), el("b", { text: p.name }), el("span", { text: "no url in config" })]));
      });
      var up = d.sites.filter(function (s) { return s.state === "up"; }).length;
      c.summary(up + "/" + d.sites.length + " UP");
      if (res.state === "live" || res.state === "cached") {
        BO.alerts.set("sites", res.state === "live" ? down : []);
        BO.ticker.set("sites", segs);
      }
    });
    return c.node;
  }

  /* ---------- Traffic, last 7 days (/api/traffic) ---------- */
  function trafficCard() {
    var c = BO.card("traffic", { title: "Traffic · 7d", icon: "waves", open: true, wide: true });
    var box = el("div");
    c.body.append(box);
    BO.feed("traffic?tz=" + new Date().getTimezoneOffset(), 10 * 60 * 1000, function (res) {
      box.textContent = "";
      var d = res && res.data;
      if (!res) { box.appendChild(BO.loading("COUNTING VISITS")); BO.showState(c, null); return; }
      if (d && d.configured === false) {
        box.appendChild(BO.needsEnv(d.missing, "Vercel Web Analytics"));
        c.state("idle", "NOT CONNECTED"); c.summary("--");
        return;
      }
      BO.showState(c, res);
      if (!d || !d.days) return;
      var views = d.days.map(function (x) { return x.views; });
      var total = views.reduce(function (a, b) { return a + b; }, 0);
      var visitors = d.days.reduce(function (a, x) { return a + x.visitors; }, 0);
      var peak = Math.max.apply(null, views), today = views[views.length - 1];
      var prev = views[views.length - 2] || 0;
      var delta = prev ? Math.round((today - prev) / prev * 100) : 0;
      box.append(
        el("div", { class: "readouts" }, [
          ro("views 7d", BO.compact(total)), ro("visitors 7d", BO.compact(visitors)),
          ro("today", BO.compact(today), delta ? (delta > 0 ? "+" : "") + delta + "%" : ""), ro("peak day", BO.compact(peak)),
        ]),
        BO.areaChart(views, d.days.map(function (x) { return x.label.toUpperCase(); })));
      var per = el("div", { class: "per" });
      d.projects.forEach(function (p) {
        per.appendChild(el("div", { class: "kv" }, [el("span", { text: p.name }), el("b", { class: p.error ? "warn-t" : null, text: p.error ? "no analytics" : BO.compact(p.total) })]));
      });
      box.append(per);
      c.summary(BO.compact(total) + " views");
      BO.ticker.set("traffic", [{ text: "TRAFFIC 7D " + BO.compact(total) + " VIEWS · TODAY " + BO.compact(today) + (delta ? " (" + (delta > 0 ? "▲" : "▼") + Math.abs(delta) + "%)" : ""), level: delta < -50 ? "warn" : "ok" }]);
    });
    function ro(label, value, chip) {
      return el("div", { class: "ro" }, [el("b", { text: value }), el("span", null, [label, chip ? el("em", { class: chip.charAt(0) === "-" ? "bad-t" : "ok-t", text: " " + chip }) : null])]);
    }
    return c.node;
  }

  BO.tabs.pulse = function (stack) {
    stack.append(chronoCard(), weatherCard(), eventsCard(), batteryCard(), sitesCard(), trafficCard());
  };
})();
