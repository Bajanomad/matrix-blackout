/* GET /api/google — Gmail inbox unread count and the next calendar events,
 * using one OAuth refresh token (scopes: gmail.labels, calendar.readonly).
 * See README → Google for how to get the token. */
"use strict";

const { cached, fetchJSON, env, missing, route } = require("./_lib");

const NEED = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"];

// Access tokens last an hour; keep one for 50 minutes.
function token() {
  return cached("gtoken", 50 * 60 * 1000, false, async () => {
    const body = new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      refresh_token: env("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    });
    const r = await fetchJSON("https://oauth2.googleapis.com/token", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    return r.body.access_token;
  });
}

async function gmail(auth) {
  const r = await fetchJSON("https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX", { headers: auth });
  return { unread: r.body.messagesUnread || 0, unreadThreads: r.body.threadsUnread || 0, total: r.body.messagesTotal || 0 };
}

async function calendar(auth) {
  const now = new Date();
  const q = new URLSearchParams({
    timeMin: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(), // include what's on now
    timeMax: new Date(now.getTime() + 7 * 864e5).toISOString(),
    singleEvents: "true", orderBy: "startTime", maxResults: "12",
  });
  const r = await fetchJSON("https://www.googleapis.com/calendar/v3/calendars/primary/events?" + q, { headers: auth });
  return (r.body.items || [])
    .map((e) => ({
      title: e.summary || "(busy)",
      start: (e.start && (e.start.dateTime || e.start.date)) || "",
      end: (e.end && (e.end.dateTime || e.end.date)) || "",
      allDay: !!(e.start && e.start.date),
      where: e.location || "",
      link: e.htmlLink || "",
    }))
    .filter((e) => new Date(e.end).getTime() > now.getTime())
    .slice(0, 6);
}

module.exports = route(async ({ fresh }) => {
  if (missing(NEED).length) return { configured: false, missing: missing(NEED) };
  return cached("google", 2 * 60 * 1000, fresh, async () => {
    const auth = { Authorization: "Bearer " + (await token()) };
    // Each half reports its own error, so a missing scope only blanks one card.
    const [mail, events] = await Promise.all([
      gmail(auth).catch((e) => ({ error: String(e.message || e) })),
      calendar(auth).catch((e) => ({ error: String(e.message || e) })),
    ]);
    return { configured: true, gmail: mail, events: Array.isArray(events) ? events : null, eventsError: events.error || null };
  });
}, 60);
