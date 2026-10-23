/* AI & Tools tab: one-tap AI and utility apps, Shortcuts placeholders to
 * wire later, and Settings (boot sequence, data saver, access key). */
(function () {
  "use strict";

  var BO = window.BO, C = BO.C, el = BO.el;

  function keysCard(id, title, iconName, items, where) {
    var c = BO.card(id, { title: title, icon: iconName, open: true });
    var grid = el("div", { class: "keys" });
    items.forEach(function (item) { grid.appendChild(BO.button(item, "key", where)); });
    c.body.append(grid);
    var wired = items.filter(function (i) { return i.url || i.shortcut; }).length;
    c.summary(wired === items.length ? items.length + " apps" : wired + " of " + items.length + " wired");
    c.state(wired === items.length ? "ok" : "warn", wired === items.length ? "READY" : "WIRE PLACEHOLDERS IN CONFIG.JS → " + where.toUpperCase());
    return c.node;
  }

  function toggle(label, note, get, set) {
    var btn = el("button", { class: "switch", type: "button", role: "switch" }, [el("i")]);
    function sync() { btn.setAttribute("aria-checked", String(!!get())); }
    btn.addEventListener("click", function () { set(!get()); sync(); });
    sync();
    return el("div", { class: "setting" }, [el("div", null, [el("b", { text: label }), el("small", { text: note })]), btn]);
  }

  function settingsCard() {
    var c = BO.card("settings", { title: "Settings", icon: "gear" });
    var S = BO.settings;
    var key = el("input", { class: "field", type: "password", autocomplete: "off", placeholder: "access key", value: S.get("key") || "" });
    c.body.append(
      toggle("Boot sequence", "\"Wake up, Neo...\" on the first open each day.", function () { return S.get("boot"); }, function (v) { S.set("boot", v); }),
      toggle("Data saver", "Slower ticker, no code rain, half as many refreshes.", function () { return S.get("saver"); }, function (v) { S.set("saver", v); }),
      el("div", { class: "setting col" }, [
        el("div", null, [el("b", { text: "Access key" }), el("small", { text: "Only if BLACKOUT_KEY is set in Vercel. Stays on this phone." })]),
        el("div", { class: "field-row" }, [key, el("button", { class: "btn", type: "button", text: "Save", onclick: function () {
          S.set("key", key.value.trim());
          BO.toast("Saved. Syncing…");
          BO.sync();
        } })]),
      ]),
      el("div", { class: "btns" }, [
        el("button", { class: "btn", type: "button", text: "Sync now", onclick: function () { BO.sync(); } }),
        el("button", { class: "btn ghost", type: "button", text: "Replay boot", onclick: function () { BO.rain.flood(5000); BO.boot(true); } }),
        el("button", { class: "btn ghost", type: "button", text: "Clear saved data", onclick: function () {
          try {
            Object.keys(localStorage).forEach(function (k) { if (k.indexOf("bo.api.") === 0 || k === "bo.wx") localStorage.removeItem(k); });
          } catch (e) { /* storage unavailable */ }
          BO.toast("Saved copies cleared. Pull down to sync.");
        } }),
      ]));
    BO.on("settings", function () { c.summary(S.get("saver") ? "saver on" : ""); });
    c.summary(S.get("saver") ? "saver on" : "");
    c.state("ok", "STORED ON THIS PHONE");
    return c.node;
  }

  BO.tabs.tools = function (stack) {
    stack.append(
      keysCard("tools.ai", "AI & apps", "spark", C.tools, "tools"),
      keysCard("tools.auto", "Automations", "bolt", C.automations, "automations"),
      settingsCard());
  };
})();
