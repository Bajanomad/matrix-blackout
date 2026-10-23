/* GET /api/projects — per project in config.js: the last Vercel deploy,
 * the last GitHub commit and the open pull requests.
 * Vercel needs VERCEL_TOKEN (+ VERCEL_TEAM_ID for team projects).
 * GitHub works without a token for public repos but is rate-limited to
 * 60 calls an hour; GITHUB_TOKEN (read-only) lifts that and reaches private repos. */
"use strict";

const { CONFIG, cached, fetchJSON, env, route, each } = require("./_lib");

function vercel(path) {
  const team = env("VERCEL_TEAM_ID");
  const sep = path.indexOf("?") === -1 ? "?" : "&";
  return fetchJSON("https://api.vercel.com" + path + (team ? sep + "teamId=" + encodeURIComponent(team) : ""), {
    headers: { Authorization: "Bearer " + env("VERCEL_TOKEN") },
  }).then((r) => r.body);
}

function github(path) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "blackout-dashboard", "X-GitHub-Api-Version": "2022-11-28" };
  if (env("GITHUB_TOKEN")) headers.Authorization = "Bearer " + env("GITHUB_TOKEN");
  return fetchJSON("https://api.github.com" + path, { headers }).then((r) => r.body);
}

async function deploy(p) {
  const proj = await cached("vproj:" + p.vercel, 6 * 3600 * 1000, false, () => vercel("/v9/projects/" + encodeURIComponent(p.vercel)));
  const list = await vercel("/v6/deployments?projectId=" + encodeURIComponent(proj.id) + "&limit=1");
  const d = (list.deployments || [])[0];
  if (!d) return { project: proj.name, state: "NONE" };
  const meta = d.meta || {};
  return {
    project: proj.name,
    state: d.readyState || d.state || "UNKNOWN", // READY, ERROR, BUILDING, QUEUED, CANCELED...
    target: d.target || "preview",
    at: d.createdAt || d.created || 0,
    url: d.url ? "https://" + d.url : "",
    inspect: d.inspectorUrl || "",
    branch: meta.githubCommitRef || "",
    message: (meta.githubCommitMessage || "").split("\n")[0],
  };
}

async function repo(p) {
  const r = encodeURI(p.repo);
  const [commits, pulls] = await Promise.all([
    github("/repos/" + r + "/commits?per_page=1"),
    github("/repos/" + r + "/pulls?state=open&per_page=20"),
  ]);
  const c = commits[0];
  return {
    url: "https://github.com/" + p.repo,
    commit: c ? {
      sha: c.sha.slice(0, 7),
      message: (c.commit.message || "").split("\n")[0],
      author: (c.author && c.author.login) || (c.commit.author && c.commit.author.name) || "",
      at: c.commit.author && c.commit.author.date ? Date.parse(c.commit.author.date) : 0,
      url: c.html_url,
    } : null,
    pulls: pulls.map((pr) => ({ number: pr.number, title: pr.title, url: pr.html_url, author: pr.user && pr.user.login, draft: !!pr.draft })),
  };
}

module.exports = route(async ({ fresh }) => {
  const hasVercel = !!env("VERCEL_TOKEN");
  const hasGitHub = !!env("GITHUB_TOKEN");
  // Without a GitHub token, stay well under 60 calls an hour.
  const ttl = hasGitHub ? 2 * 60 * 1000 : 10 * 60 * 1000;
  return cached("projects", ttl, fresh, async () => {
    const projects = await each(CONFIG.projects, async (p) => {
      const [v, g] = await Promise.all([
        p.vercel && hasVercel ? deploy(p).catch((e) => ({ error: String(e.message || e) })) : null,
        p.repo ? repo(p).catch((e) => ({ error: String(e.message || e) })) : null,
      ]);
      return { id: p.id, vercel: v, github: g };
    });
    return { vercelConfigured: hasVercel, githubToken: hasGitHub, projects };
  });
}, 60);
