/*
 * 411 visit counter: a small badge in the bottom-right corner showing unique
 * visits today and the running total. Tap it for week / month / year / all
 * time and a 30-day chart.
 *
 * A visit is one browser per site per day (BCS time). The browser keeps a
 * random id in localStorage; no IPs, names or cookies from other sites.
 * Counts live in the "411 Apps" Supabase project (see docs/VISIT_COUNTER.md
 * in Bajanomad/411). The publishable key is public by design: the tables are
 * locked and the browser can only call counter_visit / counter_stats.
 *
 * Use:  <script src="/visit-counter.js" data-site="411-news" defer></script>
 * Options (data- attributes on the script tag):
 *   data-site     required, a site id from public.counter_sites
 *   data-bottom   extra px to lift the badge (default 0)
 *   data-right    extra px from the right edge (default 0)
 *   data-hide     CSS selector; the badge hides while it matches (e.g. a game layer)
 *
 * Previews (*-david-s-projects-8e466a51.vercel.app) and localhost show the
 * numbers but do not count. Add ?nocount to any URL to stop counting this
 * browser for good (?count turns it back on).
 */
(function () {
  "use strict";

  var API = "https://ktrpdsthdajhwzeuufql.supabase.co/rest/v1/rpc/";
  var KEY = "sb_publishable_4OxnCWwo5i-RGcZF1tspuA_zrTGHTr5";
  var ID_KEY = "411.visitor";
  var OPT_OUT_KEY = "411.visitor.nocount";

  if (window.__visitCounter) return;
  window.__visitCounter = true;

  var script =
    document.currentScript || document.querySelector("script[data-site][src*='visit-counter']");
  if (!script) return;
  var site = script.getAttribute("data-site");
  if (!site) return;
  var liftBottom = parseInt(script.getAttribute("data-bottom") || "0", 10) || 0;
  var liftRight = parseInt(script.getAttribute("data-right") || "0", 10) || 0;
  var hideSelector = script.getAttribute("data-hide");

  function store(get, key, value) {
    try {
      if (get) return window.localStorage.getItem(key);
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) {
      /* storage blocked */
    }
    return null;
  }

  var params = new URLSearchParams(window.location.search);
  if (params.has("nocount")) store(false, OPT_OUT_KEY, "1");
  if (params.has("count")) store(false, OPT_OUT_KEY, null);

  var host = window.location.hostname;
  var isPreview =
    host === "localhost" ||
    /^127\.|^192\.168\.|^10\./.test(host) ||
    /-david-s-projects-8e466a51\.vercel\.app$/.test(host);
  var ua = navigator.userAgent || "";
  var isBot = navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i.test(ua);
  var shouldCount = !isPreview && !isBot && !store(true, OPT_OUT_KEY);

  function visitorId() {
    var id = store(true, ID_KEY);
    if (id && /^[A-Za-z0-9-]{8,64}$/.test(id)) return id;
    id =
      window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
    store(false, ID_KEY, id);
    return store(true, ID_KEY) === id ? id : null;
  }

  function rpc(name, body) {
    return fetch(API + name, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).then(function (r) {
      if (!r.ok) throw new Error("counter " + r.status);
      return r.json();
    });
  }

  function isSpanish() {
    var lang = document.documentElement.getAttribute("lang") || "";
    return lang.toLowerCase().indexOf("es") === 0;
  }

  var TEXT = {
    en: {
      today: "today",
      total: "total",
      title: "Unique visits",
      week: "Last 7 days",
      month: "Last 30 days",
      year: "This year",
      all: "All time",
      people: "Unique people",
      best: "Best day",
      since: "Counting since",
      chart: "Last 30 days",
      note: "One visit = one person per day, BCS time.",
      open: "Site visits",
    },
    es: {
      today: "hoy",
      total: "total",
      title: "Visitas únicas",
      week: "Últimos 7 días",
      month: "Últimos 30 días",
      year: "Este año",
      all: "Todo el tiempo",
      people: "Personas únicas",
      best: "Mejor día",
      since: "Contando desde",
      chart: "Últimos 30 días",
      note: "Una visita = una persona por día, hora de BCS.",
      open: "Visitas al sitio",
    },
  };

  function fmt(n, compact) {
    var loc = isSpanish() ? "es-MX" : "en-US";
    try {
      if (compact && n >= 10000) {
        return new Intl.NumberFormat(loc, { notation: "compact", maximumFractionDigits: 1 }).format(n);
      }
      return new Intl.NumberFormat(loc).format(n);
    } catch (e) {
      return String(n);
    }
  }

  function fmtDay(iso) {
    var parts = String(iso).split("-");
    var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2], 12));
    try {
      return d.toLocaleDateString(isSpanish() ? "es-MX" : "en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return iso;
    }
  }

  var CSS =
    ":host{all:initial}" +
    ".wrap{position:fixed;z-index:2147483000;right:calc(6px + var(--r) + env(safe-area-inset-right));" +
    "bottom:calc(6px + var(--b) + env(safe-area-inset-bottom));font:500 11px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;" +
    "color:#fff;-webkit-font-smoothing:antialiased}" +
    ".pill{display:flex;align-items:center;gap:5px;border:0;margin:0;padding:3px 8px;border-radius:999px;" +
    "background:rgba(17,17,17,.62);color:inherit;font:inherit;cursor:pointer;opacity:.78;" +
    "-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);box-shadow:0 1px 3px rgba(0,0,0,.25);" +
    "transition:opacity .15s;-webkit-tap-highlight-color:transparent}" +
    ".pill:hover,.pill:focus-visible,.open .pill{opacity:1}" +
    ".pill:focus-visible{outline:2px solid #7ee787;outline-offset:2px}" +
    ".dot{width:6px;height:6px;border-radius:50%;background:#7ee787;box-shadow:0 0 5px #7ee787}" +
    ".sep{opacity:.5}" +
    ".card{position:absolute;right:0;bottom:calc(100% + 6px);width:236px;max-width:calc(100vw - 24px);box-sizing:border-box;" +
    "padding:12px;border-radius:12px;background:rgba(17,17,17,.94);box-shadow:0 8px 28px rgba(0,0,0,.4);" +
    "-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:none}" +
    ".open .card{display:block}" +
    ".h{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 8px;font-size:12px;font-weight:700}" +
    ".x{border:0;background:none;color:#aaa;font:inherit;font-size:14px;cursor:pointer;padding:0 2px}" +
    ".grid{display:grid;grid-template-columns:1fr auto;gap:4px 10px;margin:0}" +
    ".grid dt{color:#bbb}.grid dd{margin:0;text-align:right;font-weight:700;font-variant-numeric:tabular-nums}" +
    ".big dd{color:#7ee787;font-size:13px}" +
    ".chart{margin:10px 0 2px;color:#bbb;font-size:10px}" +
    ".bars{display:flex;align-items:flex-end;gap:2px;height:44px;margin-top:4px}" +
    ".bars i{flex:1;min-height:1px;background:#7ee787;opacity:.85;border-radius:1px 1px 0 0}" +
    ".bars i.z{background:#444}" +
    ".note{margin:8px 0 0;color:#888;font-size:10px;line-height:1.35}" +
    "@media print{.wrap{display:none}}";

  var host$ = document.createElement("div");
  host$.setAttribute("data-visit-counter", site);
  var root = host$.attachShadow ? host$.attachShadow({ mode: "open" }) : host$;
  var style = document.createElement("style");
  style.textContent = CSS;
  var wrap = document.createElement("div");
  wrap.className = "wrap";
  wrap.style.setProperty("--b", liftBottom + "px");
  wrap.style.setProperty("--r", liftRight + "px");
  wrap.hidden = true;
  root.appendChild(style);
  root.appendChild(wrap);

  var stats = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render() {
    if (!stats) return;
    var t = TEXT[isSpanish() ? "es" : "en"];
    var isOpen = wrap.classList.contains("open");
    wrap.textContent = "";

    var pill = el("button", "pill");
    pill.type = "button";
    pill.setAttribute("aria-expanded", isOpen ? "true" : "false");
    pill.setAttribute("aria-label", t.open);
    pill.appendChild(el("span", "dot"));
    pill.appendChild(el("span", "", fmt(stats.today, true) + " " + t.today));
    pill.appendChild(el("span", "sep", "·"));
    pill.appendChild(el("span", "", fmt(stats.total, true) + " " + t.total));
    pill.addEventListener("click", function (e) {
      e.stopPropagation();
      wrap.classList.toggle("open");
      render();
    });

    var card = el("div", "card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", t.title);
    card.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    var h = el("div", "h");
    h.appendChild(el("span", "", t.title));
    var x = el("button", "x", "×");
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () {
      wrap.classList.remove("open");
      render();
    });
    h.appendChild(x);
    card.appendChild(h);

    var dl = el("dl", "grid");
    [
      [t.today[0].toUpperCase() + t.today.slice(1), stats.today, true],
      [t.week, stats.week],
      [t.month, stats.month],
      [t.year, stats.year],
      [t.all, stats.total, true],
      [t.people, stats.people],
      [t.best, stats.best],
    ].forEach(function (row) {
      var box = el("div", row[2] ? "big" : "");
      box.style.display = "contents";
      box.appendChild(el("dt", "", row[0]));
      box.appendChild(el("dd", "", fmt(row[1] || 0)));
      dl.appendChild(box);
    });
    card.appendChild(dl);

    var days = stats.days || [];
    if (days.length) {
      card.appendChild(el("div", "chart", t.chart));
      var bars = el("div", "bars");
      var max = 1;
      days.forEach(function (d) {
        if (d.visits > max) max = d.visits;
      });
      days.forEach(function (d) {
        var b = el("i", d.visits ? "" : "z");
        b.style.height = Math.max(4, Math.round((d.visits / max) * 100)) + "%";
        b.title = fmtDay(d.day) + ": " + fmt(d.visits);
        bars.appendChild(b);
      });
      card.appendChild(bars);
    }
    card.appendChild(el("p", "note", (stats.since ? t.since + " " + fmtDay(stats.since) + ". " : "") + t.note));

    wrap.appendChild(card);
    wrap.appendChild(pill);
  }

  document.addEventListener("click", function () {
    if (wrap.classList.contains("open")) {
      wrap.classList.remove("open");
      render();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && wrap.classList.contains("open")) {
      wrap.classList.remove("open");
      render();
    }
  });

  // If a bottom bar (tab bar, dock, toolbar) sits in the corner, ride just above it.
  // A bar is a wide, short box at the bottom edge that stays put: fixed or
  // sticky, or any box when the page itself does not scroll (app shells).
  function barTopAt(x, y, vw, vh, pageScrolls) {
    var stack = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
    var top = null;
    for (var i = 0; i < stack.length; i++) {
      if (stack[i] !== host$) {
        top = stack[i];
        break;
      }
    }
    for (var n = top; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      var pos = window.getComputedStyle(n).position;
      var pinned = pos === "fixed" || pos === "sticky";
      if (!pinned && pageScrolls) continue;
      var r = n.getBoundingClientRect();
      if (r.bottom >= vh - 20 && r.height > 0 && r.height <= vh * 0.3 && r.width >= vw * 0.5) return r.top;
      if (pinned) return null;
    }
    return null;
  }

  function liftAboveBars() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var scroller = document.scrollingElement || document.documentElement;
    var pageScrolls = scroller.scrollHeight > vh + 1;
    var lift = 0;
    for (var k = 0; k < 3 && !lift; k++) {
      var t = barTopAt(vw - 24, vh - [4, 14, 26][k], vw, vh, pageScrolls);
      if (t != null && t > vh * 0.5) lift = Math.round(vh - t);
    }
    var bottom = lift ? lift + 6 + liftBottom + "px" : "";
    if (wrap.style.bottom !== bottom) wrap.style.bottom = bottom;
  }

  function updateHidden() {
    if (stats) liftAboveBars();
    var hide = !stats || !!document.fullscreenElement;
    if (!hide && hideSelector) {
      try {
        hide = !!document.querySelector(hideSelector);
      } catch (e) {
        /* bad selector */
      }
    }
    if (wrap.hidden !== hide) wrap.hidden = hide;
  }

  var lastLang = isSpanish();
  function tick() {
    updateHidden();
    var es = isSpanish();
    if (es !== lastLang) {
      lastLang = es;
      render();
    }
  }

  function start() {
    document.body.appendChild(host$);
    var id = shouldCount ? visitorId() : null;
    var call = id ? rpc("counter_visit", { p_site: site, p_visitor: id }) : rpc("counter_stats", { p_site: site });
    call
      .then(function (data) {
        if (!data || typeof data.total !== "number") return;
        stats = data;
        render();
        updateHidden();
        setInterval(tick, 1000);
      })
      .catch(function () {
        /* offline or blocked: stay hidden */
      });
  }

  function whenReady() {
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
  }

  // Wait for a prerendered page to actually be shown before counting.
  if (document.prerendering) {
    document.addEventListener("prerenderingchange", whenReady, { once: true });
  } else {
    whenReady();
  }
})();
