/* Projects tab: a fleet summary, then one drop-down per project with its
 * last deploy, last commit and open pull requests, and buttons to the live
 * site, the GitHub repo and the Vercel dashboard. Data: /api/projects. */
(function () {
  "use strict";

  var BO = window.BO, C = BO.C, el = BO.el;

  // Vercel deploy states → LED level.
  function level(state) {
    if (state === "READY") return "ok";
    if (state === "ERROR" || state === "CANCELED") return "bad";
    if (state === "BUILDING" || state === "QUEUED" || state === "INITIALIZING") return "warn";
    return "idle";
  }
  function ro(label, value, cls) { return el("div", { class: "ro" }, [el("b", { class: cls || null, text: value }), el("span", { text: label })]); }
  function site(p) { return p.site ? (p.site.charAt(0) === "/" ? location.origin + p.site : p.site) : ""; }

  function fleetCard() {
    var c = BO.card("fleet", { title: "Fleet", icon: "rocket", open: true });
    var grid = el("div", { class: "readouts" }), note = el("div");
    c.body.append(grid, note);
    BO.feed("projects", 2 * 60 * 1000, function (res) {
      var d = res && res.data;
      BO.showState(c, res);
      grid.textContent = "";
      if (!d) { grid.appendChild(BO.loading("LINKING FLEET")); return; }
      var ok = 0, bad = 0, busy = 0, prs = 0;
      d.projects.forEach(function (p) {
        var lv = p.vercel && !p.vercel.error ? level(p.vercel.state) : "";
        if (lv === "ok") ok++; else if (lv === "bad") bad++; else if (lv === "warn") busy++;
        if (p.github && p.github.pulls) prs += p.github.pulls.length;
      });
      grid.append(ro("projects", String(C.projects.length)), ro("ready", String(ok), "ok-t"),
        ro("failed", String(bad), bad ? "bad-t" : null), ro("building", String(busy), busy ? "warn-t" : null), ro("open PRs", String(prs), "info-t"));
      note.textContent = "";
      if (!d.vercelConfigured) note.appendChild(BO.needsEnv(["VERCEL_TOKEN", "VERCEL_TEAM_ID"], "Vercel deploys"));
      c.summary(bad ? bad + " FAILED" : ok + " OK");
    });
    return c.node;
  }

  function projectCard(p) {
    var c = BO.card("proj." + p.id, { title: p.name, icon: p.icon || "repo" });
    var deployBox = el("div"), commitBox = el("div"), prBox = el("div");
    var links = [];
    if (site(p)) links.push(el("a", Object.assign({ class: "btn" }, BO.linkAttrs(site(p))), [BO.icon("globe"), "Live site"]));
    if (p.repo) links.push(el("a", Object.assign({ class: "btn ghost" }, BO.linkAttrs("https://github.com/" + p.repo)), [BO.icon("branch"), "GitHub"]));
    if (p.vercel) links.push(el("a", Object.assign({ class: "btn ghost" }, BO.linkAttrs("https://vercel.com/" + C.vercelTeam + "/" + p.vercel)), [BO.icon("rocket"), "Vercel"]));
    c.body.append(deployBox, commitBox, prBox, links.length ? el("div", { class: "btns" }, links) : null);
    if (!p.site && !p.repo && !p.vercel) {
      c.body.prepend(BO.placeholder(p.name, "Add its site, repo and vercel project in config.js → projects."));
    }

    BO.feed("projects", 2 * 60 * 1000, function (res) {
      var all = res && res.data && res.data.projects;
      var d = all && all.filter(function (x) { return x.id === p.id; })[0];
      deployBox.textContent = ""; commitBox.textContent = ""; prBox.textContent = "";
      if (!res) { deployBox.appendChild(BO.loading("LINKING")); BO.showState(c, null); return; }
      BO.showState(c, res);
      if (!d) return;
      var segs = [];

      // Deploy
      var v = d.vercel;
      var lv = "idle";
      if (v && v.error) {
        deployBox.appendChild(BO.placeholder("Vercel", "Couldn't read deploys: " + v.error));
      } else if (v) {
        lv = level(v.state);
        deployBox.append(el("div", { class: "readouts" }, [
          ro("deploy", v.state, lv + "-t"),
          ro("when", v.at ? BO.ago(v.at) : "--"),
          ro("target", v.target || "--"),
        ]));
        if (v.message) deployBox.append(BO.row("Built", v.message));
        if (v.inspect) deployBox.append(el("a", Object.assign({ class: "mini-link" }, BO.linkAttrs(v.inspect)), ["Open build log ›"]));
        segs.push({ text: p.name.toUpperCase() + " DEPLOY " + v.state + (v.at ? " " + BO.ago(v.at).toUpperCase() : ""), level: lv === "idle" ? "info" : lv });
      }

      // Commit
      var g = d.github;
      if (g && g.error) {
        commitBox.appendChild(BO.placeholder("GitHub", "Couldn't read the repo: " + g.error + (res.data.githubToken ? "" : ". Private repos need GITHUB_TOKEN.")));
      } else if (g && g.commit) {
        commitBox.append(el("a", Object.assign({ class: "commit" }, BO.linkAttrs(g.commit.url)), [
          el("span", { class: "label", text: "last commit" }),
          el("b", { text: g.commit.message }),
          el("small", { text: g.commit.sha + " · " + g.commit.author + " · " + BO.ago(g.commit.at) }),
        ]));
        segs.push({ text: "COMMIT " + p.name.toUpperCase() + ": " + g.commit.message, level: "info" });
      }

      // Pull requests
      if (g && g.pulls) {
        prBox.append(el("div", { class: "label pr-head", text: g.pulls.length + " open pull request" + (g.pulls.length === 1 ? "" : "s") }));
        g.pulls.slice(0, 5).forEach(function (pr) {
          prBox.append(el("a", Object.assign({ class: "pr" }, BO.linkAttrs(pr.url)), [
            el("span", { class: "pr-num", text: "#" + pr.number }),
            el("span", { class: "pr-title", text: pr.title }),
            pr.draft ? el("span", { class: "tag", text: "draft" }) : null,
          ]));
        });
        if (g.pulls.length) segs.push({ text: p.name.toUpperCase() + " " + g.pulls.length + " PR OPEN", level: "info" });
      }

      c.state(lv === "idle" ? (res.state === "live" ? "ok" : "warn") : lv, (v ? "DEPLOY " + v.state + " · " : "") + (res.state === "live" ? "LIVE " + BO.ago(res.at) : "STALE"));
      c.summary(v && !v.error ? v.state : g && g.pulls ? g.pulls.length + " PR" : "--");
      BO.ticker.set("proj." + p.id, segs);
    });
    return c.node;
  }

  BO.tabs.projects = function (stack) {
    stack.appendChild(fleetCard());
    C.projects.forEach(function (p) { stack.appendChild(projectCard(p)); });
    // One alert per failed deploy.
    BO.feed("projects", 2 * 60 * 1000, function (res) {
      if (!res || res.state !== "live") return;
      var names = {};
      C.projects.forEach(function (p) { names[p.id] = p.name; });
      BO.alerts.set("deploys", res.data.projects.filter(function (p) {
        return p.vercel && p.vercel.state === "ERROR";
      }).map(function (p) { return names[p.id] + " DEPLOY FAILED"; }));
    });
  };
})();
