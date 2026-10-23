/* Shared helpers for the /api routes (files starting with _ are not routes).
 * Keys come only from environment variables and never leave the server. */
"use strict";

const crypto = require("crypto");
const CONFIG = require("../config.js");

// Brief per-instance cache, so a burst of phones (or tabs) costs one upstream call.
const memo = new Map();
async function cached(key, ttlMs, fresh, fn) {
  const hit = memo.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;
  // A pull-down refresh skips the cache, but never more than once per 10 s.
  if (hit && (age < ttlMs && !(fresh && age > 10000))) return hit.value;
  const value = await fn();
  memo.set(key, { at: Date.now(), value });
  return value;
}

async function fetchJSON(url, opts = {}, timeoutMs = 9000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    const text = await r.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
    if (!r.ok) {
      const err = new Error((body && (body.message || (body.error && (body.error.message || body.error)))) || "HTTP " + r.status);
      err.status = r.status;
      throw err;
    }
    return { body, headers: r.headers };
  } finally {
    clearTimeout(timer);
  }
}

function env(name) { return (process.env[name] || "").trim(); }
function missing(names) { return names.filter((n) => !env(n)); }

// Optional lock: with BLACKOUT_KEY set, every route wants the same key in
// the x-blackout-key header (entered once in Settings on the phone).
function allowed(req, res) {
  const want = env("BLACKOUT_KEY");
  if (!want) return true;
  const got = String(req.headers["x-blackout-key"] || "");
  const a = crypto.createHash("sha256").update(got).digest();
  const b = crypto.createHash("sha256").update(want).digest();
  if (crypto.timingSafeEqual(a, b)) return true;
  send(res, 401, { error: "locked" }, 0);
  return false;
}

function send(res, status, data, maxAge) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Private: the data is personal, so no shared CDN caching.
  res.setHeader("Cache-Control", maxAge ? "private, max-age=" + maxAge : "no-store");
  res.end(JSON.stringify(data));
}

// Wraps a route: lock check, ?fresh=1, errors → JSON instead of a crash.
function route(fn, maxAge) {
  return async (req, res) => {
    if (req.method !== "GET") return send(res, 405, { error: "GET only" }, 0);
    if (!allowed(req, res)) return;
    const url = new URL(req.url, "http://x");
    const fresh = url.searchParams.get("fresh") === "1";
    try {
      const data = await fn({ req, fresh, url });
      send(res, 200, { at: Date.now(), ...data }, fresh ? 0 : maxAge);
    } catch (e) {
      send(res, 502, { error: String(e.message || e) }, 0);
    }
  };
}

// Settle each job on its own, so one broken service never blanks the rest.
async function each(items, fn) {
  return Promise.all(items.map((it) => fn(it).catch((e) => ({ error: String(e.message || e) }))));
}

// This site's own address, for a project whose site is "/". Prefer Vercel's
// own production URL over request headers, which a caller could spoof.
function origin(req) {
  const prod = env("VERCEL_PROJECT_PRODUCTION_URL");
  if (prod) return "https://" + prod;
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || (String(host).startsWith("localhost") ? "http" : "https");
  return proto + "://" + host;
}

module.exports = { CONFIG, cached, fetchJSON, env, missing, route, each, origin };
