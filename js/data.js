/* Data tab: Supabase readouts (database size gauge, signups, row counts
 * with 7-day sparklines) and a Shopify orders and revenue card that only
 * appears when the store is configured. Data: /api/data. */
(function () {
  "use strict";

  var BO = window.BO, C = BO.C, el = BO.el;
  var FEED = "data?tz=" + new Date().getTimezoneOffset();

  function sum(a) { return (a || []).reduce(function (x, y) { return x + (y || 0); }, 0); }
  function ro(label, value, cls, spark) {
    return el("div", { class: "ro" }, [el("b", { class: cls || null, text: value }), el("span", { text: label }), spark || null]);
  }

  /* ---------- Supabase core: size gauge + signups ---------- */
  function coreCard() {
    var c = BO.card("sb.core", { title: "Supabase", icon: "cloud", open: true });
    var box = el("div");
    c.body.append(box, el("div", { class: "btns" }, [el("a", Object.assign({ class: "btn ghost" }, BO.linkAttrs(C.supabase.dashboard)), [BO.icon("cloud"), "Dashboard"])]));
    BO.feed(FEED, 3 * 60 * 1000, function (res) {
      box.textContent = "";
      var sb = res && res.data && res.data.supabase;
      if (!res) { box.appendChild(BO.loading("QUERYING DATABASE")); BO.showState(c, null); return; }
      if (sb && sb.configured === false) {
        box.appendChild(BO.needsEnv(sb.missing, "Supabase"));
        c.state("idle", "NOT CONNECTED"); c.summary("--");
        return;
      }
      BO.showState(c, res);
      if (!sb) return;
      if (sb.error) { box.appendChild(BO.placeholder("Supabase", "Couldn't reach the database: " + sb.error)); c.summary("--"); return; }
      var s = sb.stats;
      if (!s) {
        box.appendChild(BO.placeholder("Signups and size", "Run supabase/blackout.sql once in the Supabase SQL editor. (" + (sb.statsError || "function missing") + ")"));
        c.summary("--");
        return;
      }
      var limit = (C.supabase.dbLimitMB || 500) * 1e6;
      var pct = s.db_size_bytes / limit * 100;
      var daily = s.signups_daily || [];
      var week = sum(daily), today = daily[daily.length - 1] || 0;
      box.append(el("div", { class: "core" }, [
        BO.gauge(pct, BO.bytes(s.db_size_bytes), "of " + BO.bytes(limit)),
        el("div", { class: "core-side" }, [
          el("div", { class: "readouts two" }, [
            ro("signups", BO.compact(s.signups_total)),
            ro("today", "+" + today, today ? "ok-t" : null),
          ]),
          el("div", { class: "ro" }, [el("b", { text: "+" + week }), el("span", { text: "new signups · 7d" }), BO.sparkline(daily, 160, 34)]),
        ]),
      ]));
      c.summary(BO.compact(s.signups_total) + " users");
      var lvl = pct >= 90 ? "bad" : pct >= 70 ? "warn" : "ok";
      BO.ticker.set("sb.core", [
        { text: "SIGNUPS +" + week + " 7D · TODAY +" + today + " · TOTAL " + BO.compact(s.signups_total), level: "ok" },
        { text: "DB " + BO.bytes(s.db_size_bytes) + " / " + BO.bytes(limit) + " (" + Math.round(pct) + "%)", level: lvl },
      ]);
      if (res.state === "live") BO.alerts.set("db", pct >= 90 ? ["DATABASE " + Math.round(pct) + "% FULL"] : []);
    });
    return c.node;
  }

  /* ---------- Row counts per table, with new rows per day ---------- */
  function tablesCard() {
    var c = BO.card("sb.tables", { title: "Tables", icon: "folder", open: true });
    var box = el("div", { class: "tables" });
    c.body.append(box);
    BO.feed(FEED, 3 * 60 * 1000, function (res) {
      box.textContent = "";
      var sb = res && res.data && res.data.supabase;
      if (!res) { box.appendChild(BO.loading("COUNTING ROWS")); BO.showState(c, null); return; }
      if (sb && sb.configured === false) { box.appendChild(BO.needsEnv(sb.missing, "Supabase")); c.state("idle", "NOT CONNECTED"); return; }
      BO.showState(c, res);
      if (!sb || !sb.tables) return;
      var rows = 0, segs = [];
      sb.tables.forEach(function (t) {
        if (t.error) {
          box.appendChild(el("div", { class: "trow" }, [el("b", { text: t.label }), el("span", { class: "bad-t", text: t.error })]));
          segs.push({ text: t.label.toUpperCase() + " UNREADABLE", level: "bad" });
          return;
        }
        rows += t.total || 0;
        var week = t.daily ? sum(t.daily) : null;
        box.appendChild(el("div", { class: "trow" }, [
          el("div", { class: "trow-head" }, [el("b", { text: t.label }), el("small", { text: t.table })]),
          el("span", { class: "trow-num", text: BO.compact(t.total) }),
          t.daily ? el("div", { class: "trow-spark" }, [BO.sparkline(t.daily, 100, 26), el("small", { class: week ? "ok-t" : null, text: "+" + week + " 7d" })]) : el("div", { class: "trow-spark" }),
        ]));
        segs.push({ text: t.label.toUpperCase() + " " + BO.compact(t.total) + " ROWS" + (week ? " +" + week + " 7D" : ""), level: "ok" });
      });
      c.summary(BO.compact(rows) + " rows");
      BO.ticker.set("sb.tables", segs);
    });
    return c.node;
  }

  /* ---------- Shopify: shows only when configured ---------- */
  function shopCard() {
    var c = BO.card("shop", { title: "Shopify", icon: "cart", open: true });
    c.node.hidden = true;
    var box = el("div");
    c.body.append(box, el("div", { class: "btns" }, [el("a", Object.assign({ class: "btn ghost" }, BO.linkAttrs(C.shopify.admin)), [BO.icon("cart"), "Shopify admin"])]));
    BO.feed(FEED, 3 * 60 * 1000, function (res) {
      var s = res && res.data && res.data.shopify;
      c.node.hidden = !s; // not configured: no card at all
      if (!s) return;
      box.textContent = "";
      BO.showState(c, res);
      if (s.error) { box.appendChild(BO.placeholder("Shopify", "Couldn't read orders: " + s.error)); c.summary("--"); return; }
      var cur = s.currency || "";
      var money = function (v) {
        try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v); } catch (e) { return v.toFixed(2); }
      };
      var orders = sum(s.orders), rev = sum(s.revenue);
      var today = s.revenue[s.revenue.length - 1] || 0;
      box.append(el("div", { class: "readouts" }, [
        ro("orders 7d", String(orders), null, BO.sparkline(s.orders, 100, 24)),
        ro("revenue 7d", money(rev), "ok-t", BO.sparkline(s.revenue, 100, 24)),
        ro("today", money(today)),
        ro("avg order", orders ? money(rev / orders) : "--"),
      ]));
      c.summary(money(rev));
      BO.ticker.set("shop", [{ text: "SHOP " + orders + " ORDERS " + money(rev) + " 7D · TODAY " + money(today), level: "ok" }]);
    });
    return c.node;
  }

  BO.tabs.data = function (stack) {
    stack.append(coreCard(), tablesCard(), shopCard());
  };
})();
