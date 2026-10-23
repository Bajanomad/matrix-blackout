/* GET /api/data?tz=<minutes> — Supabase row counts (total and new per day
 * for 7 days), signups and database size, plus Shopify orders and revenue
 * for 7 days when SHOPIFY_* variables are set.
 * Signups and size come from supabase/blackout.sql (run it once). */
"use strict";

const { CONFIG, cached, fetchJSON, env, missing, route, each } = require("./_lib");

const SB_NEED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const SHOP_NEED = ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"];

// The last 7 local days (oldest first) as UTC instants; tz as in /api/traffic.
function days(tz) {
  const d = new Date(Date.now() - tz * 60000);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const start = midnight - i * 864e5 + tz * 60000;
    out.push({ since: new Date(start).toISOString(), until: new Date(start + 864e5).toISOString() });
  }
  return out;
}

/* ---------- Supabase ---------- */
function sbHeaders(extra) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return Object.assign({ apikey: key, Authorization: "Bearer " + key }, extra || {});
}
function base() { return env("SUPABASE_URL").replace(/\/+$/, ""); }

// Exact row count from PostgREST's Content-Range header ("0-0/1234" or "*/0").
async function count(table, filters) {
  const r = await fetchJSON(base() + "/rest/v1/" + encodeURIComponent(table) + "?select=*&limit=1" + (filters || ""), {
    method: "HEAD", headers: sbHeaders({ Prefer: "count=exact" }),
  });
  const range = r.headers.get("content-range") || "";
  const n = parseInt(range.split("/")[1], 10);
  return isNaN(n) ? null : n;
}

async function table(t, span) {
  const total = await count(t.table);
  let daily = null;
  if (t.created) {
    const col = encodeURIComponent(t.created);
    daily = await Promise.all(span.map((d) => count(t.table, "&" + col + "=gte." + encodeURIComponent(d.since) + "&" + col + "=lt." + encodeURIComponent(d.until))));
  }
  return { table: t.table, label: t.label || t.table, total, daily };
}

async function supabase(tz) {
  if (missing(SB_NEED).length) return { configured: false, missing: missing(SB_NEED) };
  const span = days(tz);
  const [tables, stats] = await Promise.all([
    each(CONFIG.supabase.tables, (t) => table(t, span)),
    fetchJSON(base() + "/rest/v1/rpc/blackout_stats", {
      method: "POST", headers: sbHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ days: 7, tz_offset_minutes: tz }),
    }).then((r) => r.body, (e) => ({ error: String(e.message || e) })),
  ]);
  // each() turns a failure into {error}; put the table name back on it.
  CONFIG.supabase.tables.forEach((t, i) => { if (tables[i].error) Object.assign(tables[i], { table: t.table, label: t.label || t.table }); });
  return {
    configured: true,
    tables,
    stats: stats && !stats.error ? stats : null,
    statsError: stats && stats.error ? stats.error : null,
  };
}

/* ---------- Shopify ---------- */
const ORDERS = "query($q: String!, $after: String) { orders(first: 250, after: $after, query: $q, sortKey: CREATED_AT) {" +
  " edges { node { createdAt totalPriceSet { shopMoney { amount currencyCode } } } } pageInfo { hasNextPage endCursor } } }";

async function shopify(tz) {
  if (missing(SHOP_NEED).length) return null; // the card hides itself
  const span = days(tz);
  const shop = env("SHOPIFY_STORE_DOMAIN").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const version = env("SHOPIFY_API_VERSION") || "2026-07";
  const orders = new Array(7).fill(0), revenue = new Array(7).fill(0);
  let currency = "", after = null;
  for (let page = 0; page < 8; page++) { // up to 2,000 orders a week
    const r = await fetchJSON("https://" + shop + "/admin/api/" + version + "/graphql.json", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": env("SHOPIFY_ADMIN_TOKEN") },
      body: JSON.stringify({ query: ORDERS, variables: { q: "created_at:>='" + span[0].since + "'", after } }),
    });
    if (r.body.errors) throw new Error(r.body.errors.map((e) => e.message).join("; "));
    const o = r.body.data.orders;
    o.edges.forEach(({ node }) => {
      const t = Date.parse(node.createdAt);
      const i = span.findIndex((d) => t >= Date.parse(d.since) && t < Date.parse(d.until));
      if (i === -1) return;
      orders[i]++;
      revenue[i] += parseFloat(node.totalPriceSet.shopMoney.amount) || 0;
      currency = node.totalPriceSet.shopMoney.currencyCode;
    });
    if (!o.pageInfo.hasNextPage) break;
    after = o.pageInfo.endCursor;
  }
  return { currency, orders, revenue: revenue.map((v) => Math.round(v * 100) / 100) };
}

module.exports = route(async ({ fresh, url }) => {
  const tz = Math.max(-840, Math.min(840, parseInt(url.searchParams.get("tz"), 10) || 0));
  return cached("data:" + tz, 3 * 60 * 1000, fresh, async () => {
    const [sb, shop] = await Promise.all([
      supabase(tz).catch((e) => ({ configured: true, error: String(e.message || e) })),
      shopify(tz).catch((e) => ({ error: String(e.message || e) })),
    ]);
    return { supabase: sb, shopify: shop };
  });
}, 60);
