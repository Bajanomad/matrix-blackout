/* GET /api/sites — is each project's live site up? Pings every `site` in
 * config.js from the server (no CORS limits) and times the answer. */
"use strict";

const { CONFIG, cached, route, each, origin } = require("./_lib");

async function check(p, base) {
  const url = p.site.charAt(0) === "/" ? base + p.site : p.site;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctl.signal, headers: { "user-agent": "BlackoutStatus/1.0" } });
    const ms = Date.now() - t0;
    if (r.body && r.body.cancel) r.body.cancel().catch(() => {});
    // 2xx/3xx up; 4xx answers but something's off; 5xx down.
    const state = r.status < 400 ? "up" : r.status < 500 ? "warn" : "down";
    return { id: p.id, name: p.name, url, state, status: r.status, ms };
  } catch (e) {
    return { id: p.id, name: p.name, url, state: "down", status: 0, ms: Date.now() - t0, error: e.name === "AbortError" ? "timeout" : String(e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = route(async ({ req, fresh }) => {
  const base = origin(req);
  const list = CONFIG.projects.filter((p) => p.site);
  const sites = await cached("sites", 60 * 1000, fresh, () => each(list, (p) => check(p, base)));
  return { sites };
}, 30);
