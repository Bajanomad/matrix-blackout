/* BLACKOUT core — shared by every tab: DOM helpers, drop-down cards, live
 * readouts, small SVG charts, the API client (with offline copies), the
 * ticker, the alerts strip, code rain, the boot sequence and settings.
 * Tabs register in BO.tabs; js/main.js puts it together. All content is
 * built with DOM APIs and textContent. */
(function () {
  "use strict";

  var C = window.BLACKOUT_CONFIG;
  var ICONS = window.BLACKOUT.ICONS;
  var SVGNS = "http://www.w3.org/2000/svg";
  var BO = (window.BO = { C: C, tabs: {} });
  BO.REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- DOM ---------- */
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
      node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return node;
  }
  function svg(tag, attrs, children) {
    var node = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function icon(name) {
    var s = svg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", class: "ico" });
    (ICONS[name] || ICONS.link).forEach(function (part) { s.appendChild(svg(part[0], part[1])); });
    return s;
  }
  BO.el = el; BO.svg = svg; BO.icon = icon;
  BO.$ = function (id) { return document.getElementById(id); };

  /* ---------- Storage (can be missing in private mode) ---------- */
  BO.load = function (key, fallback) {
    try { var v = localStorage.getItem("bo." + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  };
  BO.save = function (key, value) {
    try { localStorage.setItem("bo." + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  };

  /* ---------- Settings ---------- */
  var settings = BO.load("settings", {});
  BO.settings = {
    get: function (k) {
      var d = { boot: C.boot.enabled, saver: false, key: "" };
      return settings[k] === undefined ? d[k] : settings[k];
    },
    set: function (k, v) {
      settings[k] = v;
      BO.save("settings", settings);
      BO.emit("settings", k);
    },
  };
  // Data saver: the setting, or the phone's Low Data Mode where the browser says so.
  BO.saver = function () {
    return BO.settings.get("saver") || !!(navigator.connection && navigator.connection.saveData);
  };

  /* ---------- Tiny event bus ---------- */
  var subs = {};
  BO.on = function (name, fn) { (subs[name] = subs[name] || []).push(fn); };
  BO.emit = function (name, arg) { (subs[name] || []).forEach(function (fn) { fn(arg); }); };

  /* ---------- Text helpers ---------- */
  BO.pad = function (n) { return (n < 10 ? "0" : "") + n; };
  BO.DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  BO.MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  BO.ago = function (t) {
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 45) return "just now";
    if (s < 3600) return Math.round(s / 60) + "m ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago";
    return Math.round(s / 86400) + "d ago";
  };
  BO.time = function (d) {
    var h = d.getHours();
    return C.clock24 ? BO.pad(h) + ":" + BO.pad(d.getMinutes()) : ((h % 12) || 12) + ":" + BO.pad(d.getMinutes()) + (h < 12 ? "a" : "p");
  };
  BO.compact = function (n) {
    if (n == null || isNaN(n)) return "--";
    var a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (a >= 1e4) return (n / 1e3).toFixed(1) + "K";
    return Math.round(n).toLocaleString("en-US");
  };
  BO.bytes = function (b) {
    if (b == null) return "--";
    if (b >= 1e9) return (b / 1e9).toFixed(2) + " GB";
    if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
    return Math.round(b / 1e3) + " KB";
  };

  /* ---------- Live readouts: numbers flicker and glow when they change ---------- */
  BO.num = function (node, text) {
    text = String(text);
    if (node.textContent === text) return;
    var first = node.textContent === "";
    node.textContent = text;
    if (first || BO.REDUCE) return;
    node.classList.remove("tick");
    void node.offsetWidth; // restart the animation
    node.classList.add("tick");
  };

  var toastTimer = 0;
  BO.toast = function (msg) {
    var t = BO.$("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 4200);
  };

  /* ---------- Links and buttons ---------- */
  // Web links open over the app (Safari sheet) so the dashboard stays put;
  // same-site pages and app links (sms:, shortcuts://...) open in place.
  BO.linkAttrs = function (url) {
    var web = /^https?:/i.test(url) && url.indexOf(location.origin) !== 0;
    return { href: url, target: web ? "_blank" : null, rel: web ? "noopener" : null };
  };
  BO.shortcutUrl = function (name) { return "shortcuts://run-shortcut?name=" + encodeURIComponent(name); };
  /** A config button ({label, icon, url | shortcut}) as an <a>, or a placeholder <button>. */
  BO.button = function (item, cls, where) {
    var body = [el("span", { class: "key-ico" }, [icon(item.icon)]), el("span", { class: "key-label", text: item.label })];
    if (item.url) return el("a", Object.assign({ class: cls }, BO.linkAttrs(item.url)), body);
    if (item.shortcut) {
      return el("a", { class: cls, href: BO.shortcutUrl(item.shortcut) }, body.concat(el("span", { class: "key-tag", text: "shortcut" })));
    }
    return el("button", { class: cls + " unset", type: "button", onclick: function () {
      BO.toast(item.label + " isn't wired yet. Make a shortcut in the Shortcuts app, then put its exact name in config.js → " + where + " → " + item.label + " → shortcut.");
    } }, body.concat(el("span", { class: "key-tag", text: "set up" })));
  };

  /* ---------- Drop-down card ----------
   * BO.card(id, {title, icon, open}) → {node, body, summary(text),
   * state(level, text)}. The header LED shows ok / warn / bad / idle. */
  BO.card = function (id, opts) {
    var open = BO.load("open." + id, !!opts.open);
    var bodyId = "body-" + id.replace(/[^a-z0-9]+/gi, "-");
    var sum = el("span", { class: "card-sum" });
    var led = el("i", { class: "led idle", "aria-hidden": "true" });
    var head = el("button", { class: "card-head", type: "button", "aria-expanded": String(open), "aria-controls": bodyId }, [
      icon(opts.icon), led,
      el("span", { class: "card-title", text: opts.title }),
      sum,
      el("span", { class: "chev", "aria-hidden": "true" }),
    ]);
    var inner = el("div", { class: "card-pad" });
    var foot = el("div", { class: "card-foot" });
    var body = el("div", { class: "card-body", id: bodyId, role: "region", "aria-label": opts.title }, [el("div", { class: "card-clip" }, [inner, foot])]);
    var node = el("article", { class: "card" + (open ? " open" : "") + (opts.wide ? " wide" : "") }, [head, body]);
    if (!open) body.inert = true;
    head.addEventListener("click", function () {
      open = !open;
      node.classList.toggle("open", open);
      head.setAttribute("aria-expanded", String(open));
      body.inert = !open;
      BO.save("open." + id, open);
    });
    return {
      node: node, body: inner, head: head,
      summary: function (t) { BO.num(sum, t); },
      state: function (level, text) {
        led.className = "led " + (level || "idle");
        foot.textContent = text || "";
        foot.hidden = !text;
      },
      open: function () { if (!open) head.click(); },
    };
  };

  BO.row = function (k, v) { return el("div", { class: "kv" }, [el("span", { text: k }), el("b", { text: v == null ? "" : String(v) })]); };
  BO.placeholder = function (title, text) {
    return el("div", { class: "ph" }, [el("span", { class: "tag", text: "placeholder" }), el("b", { text: title }), el("p", { text: text })]);
  };
  BO.loading = function (text) { return el("div", { class: "loading" }, [text || "LOADING", el("span", { class: "caret" })]); };

  /* ---------- SVG charts (no library) ---------- */
  /** Sparkline of values: a glowing line with a soft fill. */
  BO.sparkline = function (values, w, h) {
    w = w || 120; h = h || 32;
    var s = svg("svg", { class: "spark", viewBox: "0 0 " + w + " " + h, preserveAspectRatio: "none", "aria-hidden": "true" });
    if (!values || values.length < 2) return s;
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    var span = max - min || 1;
    var pts = values.map(function (v, i) {
      return [(i / (values.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)];
    });
    var line = pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    s.appendChild(svg("polygon", { class: "spark-fill", points: "0," + h + " " + line + " " + w + "," + h }));
    s.appendChild(svg("polyline", { class: "spark-line", points: line }));
    var last = pts[pts.length - 1];
    s.appendChild(svg("circle", { class: "spark-dot", cx: last[0], cy: last[1], r: 2.2 }));
    return s;
  };

  /** Thin 240° gauge arc, pct 0..100, with a big readout in the middle. */
  BO.gauge = function (pct, value, label) {
    var r = 40, c = 2 * Math.PI * r, arc = c * (240 / 360);
    var p = Math.max(0, Math.min(100, pct || 0));
    var level = p >= 90 ? "bad" : p >= 70 ? "warn" : "ok";
    return el("div", { class: "gauge " + level }, [
      svg("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" }, [
        svg("circle", { class: "g-track", cx: 50, cy: 50, r: r, "stroke-dasharray": arc + " " + c, transform: "rotate(150 50 50)" }),
        svg("circle", { class: "g-val", cx: 50, cy: 50, r: r, "stroke-dasharray": (arc * p / 100) + " " + c, transform: "rotate(150 50 50)" }),
      ]),
      el("b", { class: "g-num", text: value }),
      el("span", { class: "g-label", text: label }),
    ]);
  };

  /** Area chart with day labels under each point. */
  BO.areaChart = function (values, labels) {
    var w = 320, h = 140, padT = 14, padB = 20;
    var s = svg("svg", { class: "area", viewBox: "0 0 " + w + " " + h, role: "img" });
    var max = Math.max.apply(null, values.concat([1]));
    var step = w / Math.max(1, values.length - 1);
    for (var g = 0; g <= 3; g++) {
      var gy = padT + (h - padT - padB) * g / 3;
      s.appendChild(svg("line", { class: "grid", x1: 0, x2: w, y1: gy, y2: gy }));
    }
    var pts = values.map(function (v, i) {
      return [Math.min(w - 4, Math.max(4, i * step)), padT + (h - padT - padB) * (1 - v / max)];
    });
    var line = pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    s.appendChild(svg("polygon", { class: "area-fill", points: pts[0][0] + "," + (h - padB) + " " + line + " " + pts[pts.length - 1][0] + "," + (h - padB) }));
    s.appendChild(svg("polyline", { class: "area-line", points: line }));
    pts.forEach(function (p, i) {
      s.appendChild(svg("circle", { class: "area-dot", cx: p[0], cy: p[1], r: i === pts.length - 1 ? 3.5 : 2.4 }));
      var t = svg("text", { class: "area-label", x: p[0], y: h - 5, "text-anchor": i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle" });
      t.textContent = labels[i] || "";
      s.appendChild(t);
    });
    return s;
  };

  /* ---------- API client ----------
   * BO.api("sites", fresh) → {state, data, at, error}. state is live,
   * cached (offline or failed: the last good copy), locked, or error.
   * The last good copy is kept on the phone so cards fill in instantly. */
  BO.api = function (name, fresh) {
    var keep = BO.load("api." + name, null);
    var headers = {};
    var key = BO.settings.get("key");
    if (key) headers["x-blackout-key"] = key;
    if (!navigator.onLine) return Promise.resolve({ state: keep ? "cached" : "offline", data: keep && keep.data, at: keep && keep.at, error: "offline" });
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    return fetch("/api/" + name + (fresh ? "?fresh=1" : ""), { headers: headers, signal: ctl && ctl.signal, cache: fresh ? "no-store" : "default" })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          if (r.status === 401) return { state: "locked", data: keep && keep.data, at: keep && keep.at, error: "locked" };
          if (!r.ok) throw new Error(body.error || "HTTP " + r.status);
          BO.save("api." + name, { at: body.at || Date.now(), data: body });
          return { state: "live", data: body, at: body.at || Date.now() };
        });
      })
      .catch(function (e) {
        return { state: keep ? "cached" : "error", data: keep && keep.data, at: keep && keep.at, error: String(e && e.message || e) };
      })
      .then(function (res) { clearTimeout(timer); return res; });
  };
  /** The last good copy without a network call (for the first paint). */
  BO.kept = function (name) {
    var keep = BO.load("api." + name, null);
    return keep ? { state: "cached", data: keep.data, at: keep.at } : null;
  };

  /** Puts a result's state on a card: LED colour and the foot line. */
  BO.showState = function (card, res, extra) {
    if (!res) { card.state("idle", "LINKING…"); return; }
    if (res.state === "live") card.state("ok", "LIVE · " + BO.ago(res.at) + (extra ? " · " + extra : ""));
    else if (res.state === "cached") card.state("warn", (res.error === "offline" ? "OFFLINE" : "STALE") + " · last good copy " + BO.ago(res.at));
    else if (res.state === "locked") card.state("bad", "LOCKED · enter the access key in AI & Tools → Settings");
    else if (res.state === "offline") card.state("warn", "OFFLINE · shows when you're back online");
    else card.state("bad", "LINK DOWN · " + (res.error || "unknown error"));
  };
  /** "Add these in Vercel" note for a service whose variables aren't set. */
  BO.needsEnv = function (names, what) {
    return el("div", { class: "ph" }, [
      el("span", { class: "tag", text: "not connected" }),
      el("b", { text: what }),
      el("p", { text: "Add in Vercel → Settings → Environment Variables: " + names.join(", ") }),
    ]);
  };

  /* ---------- Sources: everything that refreshes ----------
   * BO.source(every, run) registers run(fresh) → Promise. It runs now, on a
   * timer while the app is visible (slower in data saver), and on pull-down. */
  var sources = [];
  BO.source = function (everyMs, run) {
    var s = { every: everyMs, run: run, last: 0 };
    sources.push(s);
    return s;
  };
  function runSource(s, fresh) {
    s.last = Date.now();
    return Promise.resolve().then(function () { return s.run(fresh); }).catch(function () {});
  }
  BO.refreshAll = function (fresh) {
    BO.emit("sync", true);
    return Promise.all(sources.map(function (s) { return runSource(s, fresh); })).then(function () { BO.emit("sync", false); });
  };
  BO.startSources = function () {
    BO.refreshAll(false);
    setInterval(function () {
      if (document.hidden) return;
      var k = BO.saver() ? 2 : 1;
      sources.forEach(function (s) { if (Date.now() - s.last >= s.every * k) runSource(s, false); });
    }, 15000);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) return;
      sources.forEach(function (s) { if (Date.now() - s.last >= Math.min(s.every, 60000)) runSource(s, false); });
    });
    window.addEventListener("online", function () { BO.refreshAll(false); });
  };

  /* ---------- Clock tick: one timer for every per-second readout ---------- */
  var tickers = [];
  BO.every = function (fn) { tickers.push(fn); fn(new Date()); };
  BO.startTicking = function () {
    function tick() {
      var now = new Date();
      tickers.forEach(function (fn) { fn(now); });
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    }
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  };

  /* ---------- Ticker: endless right-to-left tape of live info ----------
   * BO.ticker.set(key, [{text, level: ok | warn | bad | info}]). Each source
   * owns its key; tapping the tape pauses it; data saver slows it down. */
  BO.ticker = (function () {
    var parts = {}, order = [];
    var tape, track, x = 0, width = 0, paused = false, raf = 0, lastT = 0, dirty = false;
    function segments() {
      var all = [];
      order.forEach(function (k) { all = all.concat(parts[k] || []); });
      return all.length ? all : [{ text: "BLACKOUT ONLINE · AWAITING TELEMETRY", level: "info" }];
    }
    function rebuild() {
      dirty = false;
      if (!track) return;
      var segs = segments();
      track.textContent = "";
      // Two copies side by side: when the first has scrolled off, jump back by one copy.
      for (var copy = 0; copy < 2; copy++) {
        var run = el("span", { class: "tape-run", "aria-hidden": copy ? "true" : null });
        segs.forEach(function (s) { run.appendChild(el("span", { class: "seg " + (s.level || "info") }, [el("i"), s.text])); });
        track.appendChild(run);
      }
      width = track.firstChild.getBoundingClientRect().width || 1;
      x = x % width;
      track.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
    }
    function speed() {
      if (paused || BO.REDUCE) return 0;
      return (C.ticker.speed || 55) * (BO.saver() ? 0.3 : 1);
    }
    function loop(t) {
      raf = requestAnimationFrame(loop);
      var dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0;
      lastT = t;
      var v = speed();
      if (!v) return;
      x -= v * dt;
      if (x <= -width) x += width;
      track.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
    }
    function start() { if (!raf) { lastT = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    return {
      mount: function (node) {
        tape = node;
        track = node.querySelector(".tape-track");
        node.addEventListener("click", function () {
          paused = !paused;
          tape.classList.toggle("paused", paused);
        });
        rebuild();
        document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
        window.addEventListener("resize", function () { rebuild(); }, { passive: true });
        start();
      },
      set: function (key, segs) {
        if (order.indexOf(key) === -1) order.push(key);
        var before = JSON.stringify(parts[key] || []);
        parts[key] = segs;
        if (before === JSON.stringify(segs) || dirty) return;
        dirty = true;
        setTimeout(rebuild, 250);
      },
    };
  })();

  /* ---------- Alerts strip ----------
   * BO.alerts.set(key, ["411 BCS deploy failed", ...]). Red when any exist. */
  BO.alerts = (function () {
    var all = {}, node = null, seen = false;
    function render() {
      if (!node) return;
      var list = [];
      Object.keys(all).forEach(function (k) { list = list.concat(all[k]); });
      node.classList.toggle("on", list.length > 0);
      node.textContent = "";
      if (list.length) {
        node.append(el("b", { text: "⚠ " + list.length + (list.length === 1 ? " ALERT" : " ALERTS") }), el("span", { text: list.join("  ·  ") }));
      } else {
        node.append(el("span", { text: seen ? "ALL SYSTEMS NOMINAL" : "SCANNING SYSTEMS" }), el("span", { class: "caret" }));
      }
    }
    return {
      mount: function (n) { node = n; render(); },
      set: function (key, list) { seen = true; all[key] = list; render(); },
    };
  })();

  /* ---------- Code rain ---------- */
  BO.rain = (function () {
    var canvas, ctx, w = 0, h = 0, raf = 0, last = 0, drops = [], size = 16, flood = 0;
    var GLYPHS = "アカサタナハマヤラワイキシチニヒミリウクスツヌフムユルエケセテネヘメレオコソトノホモヨロ0123456789ZXΞ";
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
      var flooding = Date.now() < flood;
      ctx.fillStyle = flooding ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = size + 'px "Share Tech Mono", ui-monospace, monospace';
      ctx.textBaseline = "top";
      for (var i = 0; i < drops.length; i++) {
        var y = drops[i] * size;
        if (y > 0) {
          ctx.fillStyle = Math.random() > 0.95 ? "#e6fff0" : "rgba(0,255,65,0.9)";
          ctx.fillText(GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)), i * size, y);
        }
        if (y > h && Math.random() > (flooding ? 0.9 : 0.975)) drops[i] = 0; else drops[i]++;
      }
      if (!flooding && canvas.classList.contains("flood")) canvas.classList.remove("flood");
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      var fast = Date.now() < flood;
      if (now - last < (fast ? 33 : 55)) return;
      last = now; frame();
    }
    function on() { return !BO.saver() && !BO.REDUCE; }
    function start() { if (!raf && on()) raf = requestAnimationFrame(loop); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    return {
      mount: function (c) {
        canvas = c; ctx = c.getContext("2d");
        if (!ctx) return;
        resize();
        window.addEventListener("resize", resize, { passive: true });
        for (var i = 0; i < 40; i++) frame(); // a still frame for Reduce Motion / data saver
        document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
        BO.on("settings", function () { if (on()) start(); else stop(); });
        start();
      },
      /** Full-screen rain over everything for a few seconds. */
      flood: function (ms) {
        if (!ctx) return;
        flood = Date.now() + (ms || 4000);
        canvas.classList.add("flood");
        if (!raf) raf = requestAnimationFrame(loop);
        setTimeout(function () { if (!on()) stop(); }, (ms || 4000) + 200);
      },
    };
  })();

  /* ---------- Boot sequence: "Wake up, Neo..." ----------
   * Runs on the first open each day (unless turned off in Settings) and from
   * the clock easter egg. Tap anywhere to skip. */
  BO.boot = function (force) {
    var today = new Date().toDateString();
    if (!force && (!BO.settings.get("boot") || BO.load("bootDay", "") === today)) return;
    BO.save("bootDay", today);
    var box = BO.$("boot");
    var out = box.querySelector(".boot-lines");
    out.textContent = "";
    box.hidden = false;
    box.classList.remove("out");
    var timers = [], done = false;
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function finish() {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      box.classList.add("out");
      setTimeout(function () { box.hidden = true; }, 600);
    }
    box.onclick = finish;
    var lines = C.boot.lines, t = 300, perChar = BO.REDUCE ? 0 : 55;
    lines.forEach(function (line) {
      later(function () {
        var p = el("p", null, [el("span"), el("span", { class: "caret" })]);
        out.querySelectorAll(".caret").forEach(function (c) { c.remove(); });
        out.appendChild(p);
      }, t);
      for (var i = 1; i <= line.length; i++) {
        (function (n) { later(function () { out.lastChild.firstChild.textContent = line.slice(0, n); }, t + 40 + n * perChar); })(i);
      }
      t += 40 + line.length * perChar + 900;
    });
    later(finish, t + 500);
  };
})();
