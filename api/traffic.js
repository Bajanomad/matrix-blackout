/* GET /api/traffic?tz=<minutes> — page views per day for the last 7 days,
 * summed across every project with `traffic: true` and a `vercel` project,
 * from Vercel Web Analytics (it must be enabled on those projects).
 * tz is the phone's Date#getTimezoneOffset(), so days match the phone. */
"use strict";

const { CONFIG, cached, fetchJSON, env, missing, route, each } = require("./_lib");

const NEED = ["VERCEL_TOKEN"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function vercel(path) {
  const team = env("VERCEL_TEAM_ID");
  const sep = path.indexOf("?") === -1 ? "?" : "&";
  return fetchJSON("https://api.vercel.com" + path + (team ? sep + "teamId=" + encodeURIComponent(team) : ""), {
    headers: { Authorization: "Bearer " + env("VERCEL_TOKEN") },
  });
}

// The last 7 local days (oldest first) as UTC instants.
function days(tz) {
  const now = Date.now() - tz * 60000; // the phone's wall clock, as if UTC
  const d = new Date(now);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const start = midnight - i * 864e5;
    out.push({
      date: new Date(start).toISOString().slice(0, 10),
      label: DAYS[new Date(start).getUTCDay()],
      since: new Date(start + tz * 60000).toISOString(),
      until: new Date(Math.min(start + 864e5 + tz * 60000, Date.now())).toISOString(),
    });
  }
  return out;
}

module.exports = route(async ({ fresh, url }) => {
  if (missing(NEED).length) return { configured: false, missing: missing(NEED) };
  const tz = Math.max(-840, Math.min(840, parseInt(url.searchParams.get("tz"), 10) || 0));
  const projects = CONFIG.projects.filter((p) => p.vercel && p.traffic);
  return cached("traffic:" + tz, 10 * 60 * 1000, fresh, async () => {
    const span = days(tz);
    const rows = await each(projects, async (p) => {
      const proj = await cached("vproj:" + p.vercel, 6 * 3600 * 1000, false, () => vercel("/v9/projects/" + encodeURIComponent(p.vercel)).then((r) => r.body));
      const counts = await Promise.all(span.map((d) =>
        vercel("/v1/query/web-analytics/visits/count?projectId=" + proj.id + "&since=" + encodeURIComponent(d.since) + "&until=" + encodeURIComponent(d.until))
          .then((r) => (r.body && r.body.data ? r.body.data : {}))));
      return { id: p.id, name: p.name, views: counts.map((c) => c.pageviews || 0), visitors: counts.map((c) => c.visitors || 0) };
    });
    const out = span.map((d, i) => ({ date: d.date, label: d.label, views: 0, visitors: 0 }));
    const per = projects.map((p, n) => {
      const r = rows[n];
      if (r.error) return { id: p.id, name: p.name, error: r.error };
      r.views.forEach((v, i) => { out[i].views += v; out[i].visitors += r.visitors[i]; });
      return { id: p.id, name: p.name, total: r.views.reduce((a, b) => a + b, 0) };
    });
    return { configured: true, days: out, projects: per };
  });
}, 300);
