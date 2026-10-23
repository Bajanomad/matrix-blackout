/* BLACKOUT Studio — the builder. Pick a look, name it, set up apps,
 * folders and widgets, watch it live in a phone preview, and get a link
 * that carries the whole screen (themes.js packs it into #c=...). Opening
 * that link on an iPhone and adding it to the Home Screen installs it.
 * Nothing is stored on a server: a draft stays on this device. */
(function () {
  "use strict";

  var B = window.BLACKOUT;
  var SVGNS = "http://www.w3.org/2000/svg";
  var DRAFT_KEY = "blackout.draft";
  var WIDGET_NAMES = { weather: "Weather", apps: "Apps", calendar: "Calendar", status: "Day, week, year & moon" };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) return;
        if (k === "text") node.textContent = v;
        else if (k === "class") node.className = v;
        else if (k === "value") node.value = v;
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

  /* ---------- State ---------- */
  function loadDraft() {
    try { return B.sanitize(JSON.parse(localStorage.getItem(DRAFT_KEY) || "null")); } catch (e) { return null; }
  }
  var cfg = B.fromHash(location.hash) || loadDraft() || B.starter("matrix");
  // Hidden widgets keep their place so turning one back on restores it.
  B.WIDGETS.forEach(function (k) { if (cfg.x.indexOf(k) === -1 && !(k === "weather" && !cfg.w)) cfg.hidden = (cfg.hidden || []).concat(k); });

  function clean() {
    var out = JSON.parse(JSON.stringify(cfg));
    delete out.hidden;
    return B.sanitize(out);
  }

  var previewTimer = 0;
  function changed(rerender) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(clean())); } catch (e) { /* storage unavailable */ }
    if (rerender) render();
    else updateLink();
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 350);
  }

  /* ---------- Layout ---------- */
  var main = el("main", { class: "studio" });
  var steps = el("div", { class: "steps" });
  var frame = el("iframe", { class: "phone-screen", title: "Live preview of your home screen", loading: "lazy" });
  var side = el("aside", { class: "preview", "aria-label": "Live preview" }, [
    el("div", { class: "phone" }, [el("div", { class: "notch", "aria-hidden": "true" }), frame]),
    el("p", { class: "hint", text: "Live preview. Tap things in it, just like on your phone." }),
  ]);
  var linkBox = el("input", { class: "link-box", type: "text", readonly: true, "aria-label": "Your link" });

  document.body.appendChild(el("header", { class: "top" }, [
    el("div", { class: "top-inner" }, [
      el("a", { class: "logo", href: "/build" }, [el("b", { text: "BLACKOUT" }), el("span", { text: "Studio" })]),
      el("button", { class: "btn ghost show-preview", type: "button", text: "Preview", onclick: openPreview }),
    ]),
  ]));
  main.appendChild(el("section", { class: "hero" }, [
    el("h1", { text: "Make your phone's home screen yours." }),
    el("p", { text: "Pick a look, add your apps and widgets, then save it to your iPhone's Home Screen. Free, no account, nothing to install." }),
  ]));
  main.appendChild(el("div", { class: "cols" }, [steps, side]));
  document.body.appendChild(main);

  function step(n, title, sub, body) {
    return el("section", { class: "step" }, [
      el("div", { class: "step-head" }, [el("span", { class: "num", text: String(n) }), el("div", null, [el("h2", { text: title }), sub ? el("p", { text: sub }) : null])]),
      el("div", { class: "step-body" }, body),
    ]);
  }

  function field(label, input, help) {
    return el("label", { class: "field" }, [el("span", { class: "flabel", text: label }), input, help ? el("small", { text: help }) : null]);
  }

  function textInput(value, max, oninput, placeholder) {
    return el("input", { type: "text", value: value || "", maxlength: max, placeholder: placeholder || "", oninput: function (e) { oninput(e.target.value); } });
  }

  /* ---------- Step 1: theme ---------- */
  function themeStep() {
    var grid = el("div", { class: "themes" });
    Object.keys(B.THEMES).forEach(function (id) {
      var t = B.THEMES[id];
      var sw = t.swatch;
      grid.appendChild(el("button", {
        class: "theme-card", type: "button", "aria-pressed": cfg.t === id ? "true" : "false",
        onclick: function () {
          var old = B.THEMES[cfg.t];
          // Keep anything typed; swap the words that came with the old look.
          if (!cfg.n || cfg.n === old.name) cfg.n = t.name;
          if (cfg.s === old.sub) cfg.s = t.sub;
          if (cfg.b === old.boot) cfg.b = t.boot;
          cfg.t = id;
          changed(true);
        },
      }, [
        el("span", { class: "swatch theme-" + id, style: "--a:" + sw[0] + ";--b:" + sw[1] + ";--c:" + sw[2] }, [
          el("span", { class: "sw-name", text: t.name }),
          el("span", { class: "sw-icons" }, ["star", "music", "map"].map(function (n) { return el("i", null, [icon(n)]); })),
        ]),
        el("span", { class: "tc-text" }, [el("b", { text: t.label }), el("small", { text: t.blurb })]),
      ]));
    });
    return step(1, "Pick a look", "Every look changes the colors, type, background and how the panels talk.", [grid]);
  }

  /* ---------- Step 2: name ---------- */
  function nameStep() {
    return step(2, "Name it", "Shown at the top of the screen and under its Home Screen icon.", [
      el("div", { class: "row3" }, [
        field("Name", textInput(cfg.n, 24, function (v) { cfg.n = v; changed(); })),
        field("Tagline", textInput(cfg.s, 40, function (v) { cfg.s = v; changed(); }, "optional")),
        field("Greeting", textInput(cfg.b, 60, function (v) { cfg.b = v; changed(); }, "optional"), "Typed out when the screen opens."),
      ]),
    ]);
  }

  /* ---------- Step 3: apps and folders ---------- */
  function appsStep() {
    var list = el("ol", { class: "app-list" });
    cfg.a.forEach(function (a, i) { list.appendChild(appRow(a, i)); });
    var full = cfg.a.length >= B.MAX_APPS;
    return step(3, "Your buttons", "Up to " + B.MAX_APPS + ". A folder opens a list of links of its own.", [
      list,
      el("div", { class: "adds" }, [
        el("button", { class: "btn", type: "button", disabled: full, text: "+ Popular apps", onclick: openCatalog }),
        el("button", { class: "btn", type: "button", disabled: full, text: "+ Any website", onclick: function () {
          cfg.a.push({ l: "New", i: "link", h: "https://" }); changed(true);
        } }),
        el("button", { class: "btn", type: "button", disabled: full, text: "+ Folder", onclick: function () {
          cfg.a.push({ l: "Folder", i: "folder", m: [{ n: "Link", d: "", h: "https://" }] }); changed(true);
        } }),
      ]),
      el("p", { class: "note", text: "Tip: a website link opens the real app when it's installed (Spotify, YouTube, Instagram…). Messages, Phone, Mail, Photos and Notes use iPhone app links." }),
    ]);
  }

  function move(arr, i, d) {
    var j = i + d;
    if (j < 0 || j >= arr.length) return;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    changed(true);
  }

  function rowTools(arr, i, label) {
    return el("div", { class: "tools" }, [
      el("button", { class: "mini", type: "button", "aria-label": "Move " + label + " up", text: "↑", disabled: i === 0, onclick: function () { move(arr, i, -1); } }),
      el("button", { class: "mini", type: "button", "aria-label": "Move " + label + " down", text: "↓", disabled: i === arr.length - 1, onclick: function () { move(arr, i, 1); } }),
      el("button", { class: "mini danger", type: "button", "aria-label": "Remove " + label, text: "✕", onclick: function () { arr.splice(i, 1); changed(true); } }),
    ]);
  }

  function appRow(a, i) {
    var iconBtn = el("button", { class: "icon-pick", type: "button", "aria-label": "Change icon for " + a.l, onclick: function () {
      openIcons(a.i, function (name) { a.i = name; changed(true); });
    } }, [icon(a.i)]);
    var label = textInput(a.l, 18, function (v) { a.l = v; changed(); });
    label.setAttribute("aria-label", "Button name");
    var row = el("li", { class: "app-row" + (a.m ? " folder" : "") }, [
      iconBtn,
      el("div", { class: "app-fields" }, [
        label,
        a.m ? el("span", { class: "tag", text: "Folder · " + a.m.length + " link" + (a.m.length === 1 ? "" : "s") }) : (function () {
          var h = textInput(a.h, 600, function (v) { a.h = v; changed(); }, "https://");
          h.setAttribute("aria-label", "Link for " + a.l);
          h.setAttribute("inputmode", "url");
          h.setAttribute("autocapitalize", "off");
          h.setAttribute("autocorrect", "off");
          return h;
        })(),
      ]),
      rowTools(cfg.a, i, a.l),
    ]);
    if (a.m) row.appendChild(folderEditor(a));
    return row;
  }

  function folderEditor(a) {
    var links = el("ol", { class: "folder-links" });
    a.m.forEach(function (r, i) {
      var n = textInput(r.n, 40, function (v) { r.n = v; changed(); }, "Name");
      var d = textInput(r.d, 80, function (v) { r.d = v; changed(); }, "Note (optional)");
      var h = textInput(r.h, 600, function (v) { r.h = v; changed(); }, "https://");
      h.setAttribute("inputmode", "url");
      h.setAttribute("autocapitalize", "off");
      links.appendChild(el("li", { class: "flink" }, [el("div", { class: "flink-fields" }, [n, d, h]), rowTools(a.m, i, r.n || "link")]));
    });
    return el("div", { class: "folder-box" }, [
      links,
      el("button", { class: "btn small", type: "button", disabled: a.m.length >= B.MAX_LINKS, text: "+ Link in this folder", onclick: function () {
        a.m.push({ n: "", d: "", h: "https://" }); changed(true);
      } }),
    ]);
  }

  /* ---------- Step 4: widgets and weather ---------- */
  function widgetsStep() {
    var order = cfg.x.concat((cfg.hidden || []).filter(function (k) { return cfg.x.indexOf(k) === -1; }));
    B.WIDGETS.forEach(function (k) { if (order.indexOf(k) === -1) order.push(k); });
    var list = el("ol", { class: "widget-list" });
    order.forEach(function (k, i) {
      var on = cfg.x.indexOf(k) !== -1;
      var needsSpot = k === "weather" && !cfg.w;
      list.appendChild(el("li", { class: "widget-row" + (on ? "" : " off") }, [
        el("label", { class: "switch" }, [
          el("input", { type: "checkbox", checked: on, disabled: needsSpot, onchange: function (e) {
            if (e.target.checked) {
              cfg.x = order.filter(function (w) { return w === k || cfg.x.indexOf(w) !== -1; });
              cfg.hidden = (cfg.hidden || []).filter(function (w) { return w !== k; });
            } else {
              cfg.x = cfg.x.filter(function (w) { return w !== k; });
              cfg.hidden = (cfg.hidden || []).concat(k);
            }
            if (cfg.x.indexOf(cfg.o) === -1) cfg.o = cfg.x[0] || "";
            changed(true);
          } }),
          el("span", { text: WIDGET_NAMES[k] + (needsSpot ? " (pick a town below)" : "") }),
        ]),
        on ? el("label", { class: "radio" }, [
          el("input", { type: "radio", name: "open-first", checked: cfg.o === k, onchange: function () { cfg.o = k; changed(); } }),
          el("span", { text: "open" }),
        ]) : null,
        el("div", { class: "tools" }, [
          el("button", { class: "mini", type: "button", "aria-label": "Move " + WIDGET_NAMES[k] + " up", text: "↑", disabled: i === 0, onclick: function () { reorder(order, i, -1); } }),
          el("button", { class: "mini", type: "button", "aria-label": "Move " + WIDGET_NAMES[k] + " down", text: "↓", disabled: i === order.length - 1, onclick: function () { reorder(order, i, 1); } }),
        ]),
      ]));
    });

    var results = el("ul", { class: "geo-results" });
    var search = el("input", { type: "search", placeholder: "Search a town or city", autocomplete: "off", "aria-label": "Weather town" });
    var timer = 0;
    search.addEventListener("input", function () {
      clearTimeout(timer);
      var q = search.value.trim();
      if (q.length < 2) { results.textContent = ""; return; }
      timer = setTimeout(function () { geocode(q, results, search); }, 300);
    });

    return step(4, "Widgets", "The clock is always on top. The rest fold open one at a time; pick which starts open.", [
      list,
      el("div", { class: "weather-box" }, [
        el("p", { class: "flabel", text: "Weather town" }),
        el("p", { class: "current-spot" }, [
          cfg.w ? el("b", { text: cfg.w.n }) : el("span", { text: "None yet" }),
          el("span", { class: "units" }, ["f", "c"].map(function (u) {
            return el("button", { class: "unit", type: "button", "aria-pressed": cfg.u === u ? "true" : "false", text: u === "f" ? "°F" : "°C", onclick: function () { cfg.u = u; changed(true); } });
          })),
        ]),
        search,
        results,
        el("small", { class: "note", text: "On the phone, the ⌖ button switches the weather to where you are." }),
      ]),
      field("Calendar opens", textInput(cfg.k, 600, function (v) { cfg.k = v; changed(); }, "https://calendar.google.com/"), "Where a tap on the calendar goes."),
    ]);
  }

  function reorder(order, i, d) {
    var j = i + d;
    if (j < 0 || j >= order.length) return;
    var t = order[i]; order[i] = order[j]; order[j] = t;
    cfg.x = order.filter(function (k) { return cfg.x.indexOf(k) !== -1; });
    changed(true);
  }

  function geocode(q, results, search) {
    fetch("https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        results.textContent = "";
        (d.results || []).forEach(function (p) {
          var where = [p.admin1, p.country].filter(Boolean).join(", ");
          results.appendChild(el("li", null, [el("button", { type: "button", onclick: function () {
            cfg.w = { n: p.name, la: +p.latitude.toFixed(4), lo: +p.longitude.toFixed(4) };
            if (cfg.x.indexOf("weather") === -1) {
              cfg.x.unshift("weather");
              cfg.hidden = (cfg.hidden || []).filter(function (w) { return w !== "weather"; });
            }
            search.value = "";
            changed(true);
          } }, [el("b", { text: p.name }), el("span", { text: where })])]));
        });
        if (!results.childNodes.length) results.appendChild(el("li", { class: "none", text: "No places found." }));
      })
      .catch(function () {
        results.textContent = "";
        results.appendChild(el("li", { class: "none", text: "Search is not working right now." }));
      });
  }

  /* ---------- Step 5: get it ---------- */
  function getStep() {
    var copied = el("span", { class: "copied", "aria-live": "polite" });
    return step(5, "Put it on your iPhone", null, [
      el("div", { class: "get" }, [
        el("div", { class: "link-row" }, [
          linkBox,
          el("button", { class: "btn primary", type: "button", text: "Copy link", onclick: function () {
            var text = linkBox.value;
            var ok = function () { copied.textContent = "Copied!"; setTimeout(function () { copied.textContent = ""; }, 2000); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { linkBox.select(); });
            else { linkBox.select(); try { document.execCommand("copy"); ok(); } catch (e) { /* select is enough */ } }
          } }),
          copied,
        ]),
        el("ol", { class: "how" }, [
          el("li", null, [el("b", { text: "Open your link in Safari" }), " on the iPhone (tap ", el("a", { class: "open-link", href: "/", target: "_blank", rel: "noopener", text: "Open my screen" }), " there, or text the link to yourself)."]),
          el("li", null, [el("b", { text: "Tap Share" }), " (the square with the arrow), then ", el("b", { text: "Add to Home Screen" }), "."]),
          el("li", null, [el("b", { text: "Open it from the Home Screen." }), " It runs full screen like an app and works offline."]),
        ]),
        el("p", { class: "note", text: "Your link is your screen: everything is packed into it, nothing is saved on a server. Keep it somewhere safe. To change your screen later, tap its name at the top, then Edit this screen, and add the new link to your Home Screen." }),
      ]),
    ]);
  }

  /* ---------- Dialogs: icon picker, popular apps ---------- */
  function dialog(title, body) {
    var close = el("button", { class: "mini", type: "button", "aria-label": "Close", text: "✕" });
    var box = el("div", { class: "dialog-backdrop", role: "dialog", "aria-modal": "true", "aria-label": title }, [
      el("div", { class: "dialog" }, [el("div", { class: "dialog-head" }, [el("h3", { text: title }), close]), body]),
    ]);
    function done() { box.remove(); document.removeEventListener("keydown", esc); }
    function esc(e) { if (e.key === "Escape") done(); }
    close.addEventListener("click", done);
    box.addEventListener("click", function (e) { if (e.target === box) done(); });
    document.addEventListener("keydown", esc);
    document.body.appendChild(box);
    close.focus();
    return done;
  }

  function openIcons(current, pick) {
    var done;
    var grid = el("div", { class: "icon-grid" }, Object.keys(B.ICONS).map(function (name) {
      return el("button", { class: "icon-pick", type: "button", "aria-label": name, "aria-pressed": name === current ? "true" : "false", onclick: function () { done(); pick(name); } }, [icon(name)]);
    }));
    done = dialog("Pick an icon", grid);
  }

  function openCatalog() {
    var done;
    var list = el("div", { class: "catalog" }, B.CATALOG.map(function (c) {
      return el("button", { class: "cat-item", type: "button", onclick: function (e) {
        if (cfg.a.length >= B.MAX_APPS) return;
        cfg.a.push({ l: c.label, i: c.icon, h: c.href });
        e.currentTarget.classList.add("added");
        changed();
      } }, [el("span", { class: "icon-pick" }, [icon(c.icon)]), el("b", { text: c.label })]);
    }));
    done = dialog("Popular apps", el("div", null, [list, el("button", { class: "btn primary wide", type: "button", text: "Done", onclick: function () { done(); render(); } })]));
  }

  /* ---------- Preview ---------- */
  function updateLink() {
    var link = B.linkFor(clean(), "/");
    linkBox.value = link;
    var open = document.querySelector(".open-link");
    if (open) open.setAttribute("href", link);
  }

  function updatePreview() {
    var src = "/#c=" + B.encode(clean());
    frame.setAttribute("src", src);
    var full = document.querySelector(".full-preview iframe");
    if (full) full.setAttribute("src", src);
  }

  function openPreview() {
    var f = el("iframe", { title: "Preview of your home screen", src: "/#c=" + B.encode(clean()) });
    var box = el("div", { class: "full-preview", role: "dialog", "aria-modal": "true", "aria-label": "Preview" }, [
      el("button", { class: "btn primary close-preview", type: "button", text: "Back to editing", onclick: function () { box.remove(); } }),
      f,
    ]);
    document.body.appendChild(box);
  }

  /* ---------- Render ---------- */
  function render() {
    var y = window.scrollY;
    steps.textContent = "";
    steps.appendChild(themeStep());
    steps.appendChild(nameStep());
    steps.appendChild(appsStep());
    steps.appendChild(widgetsStep());
    steps.appendChild(getStep());
    updateLink();
    window.scrollTo(0, y);
  }

  render();
  updatePreview();
})();
