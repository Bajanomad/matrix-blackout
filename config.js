/* BLACKOUT CONFIG — every project, link, shortcut, contact and pinned
 * button lives here. Edit this file only; no component needs touching.
 * After editing, bump CACHE in sw.js so installed copies update.
 *
 * No secrets here: this file is public. API keys go in Vercel environment
 * variables (see README) and are only read by the /api routes.
 *
 * Buttons (pinned, comms, tools) are ONE of:
 *   { label, icon, url: "sms:" }          an iOS app link or web address
 *   { label, icon, shortcut: "Name" }     runs your Shortcuts automation
 *                                         named exactly "Name"
 *   { label, icon, shortcut: "" }         placeholder: not wired yet
 *
 * Icons: terminal spark branch waves phone shield mail calendar globe repo
 * folder chat call camera photo map pin music play cart card news book note
 * cloud home heart star game bolt search gear user car plane sun moon rocket
 * coffee horseshoe cactus wave link (drawn in themes.js). */
(function (root) {
  var CONFIG = {
    name: "BLACKOUT",
    clock24: false,

    weather: {
      // Used until "Use my location" is tapped.
      home: { name: "Todos Santos", lat: 23.4464, lng: -110.2265 },
      units: "f", // "f" or "c"
    },

    // Matrix boot on the first open each day. Also switchable in Settings.
    boot: {
      enabled: true,
      lines: ["Wake up, Neo...", "The Matrix has you...", "Follow the white rabbit."],
    },

    // Vercel team slug, for dashboard links. The API uses VERCEL_TEAM_ID.
    vercelTeam: "bajaheat24x7-8566s-projects",

    /* ---------- Projects (Projects tab, status lights, traffic) ----------
     *   site:   live address ("/" means this Blackout site itself)
     *   repo:   "owner/name" on GitHub
     *   vercel: Vercel project name (or prj_ id)
     *   traffic: count it in the 7-day traffic graph (needs Web Analytics on)
     * Leave a field "" to hide that part. */
    projects: [
      { id: "411bcs", name: "411 BCS", icon: "pin", site: "", repo: "Bajanomad/411", vercel: "", traffic: true },
      { id: "matrix", name: "Matrix 411", icon: "terminal", site: "https://411matrix.vercel.app/", repo: "Bajanomad/411matrix", vercel: "411matrix", traffic: true },
      { id: "blackout", name: "Blackout", icon: "bolt", site: "/", repo: "Bajanomad/matrix-blackout", vercel: "matrix-blackout", traffic: false },
      { id: "arcade", name: "The Arcade", icon: "game", site: "", repo: "", vercel: "", traffic: true },
      { id: "book", name: "The Book", icon: "book", site: "", repo: "", vercel: "", traffic: true },
      { id: "market", name: "411 Market", icon: "cart", site: "", repo: "Bajanomad/411-market", vercel: "", traffic: true },
    ],

    /* ---------- Data tab ----------
     * Supabase tables to count. `created` is the timestamp column used for
     * the 7-day sparkline ("" = total only). Signups and database size need
     * supabase/blackout.sql run once in the SQL editor. */
    supabase: {
      dashboard: "https://supabase.com/dashboard/projects",
      tables: [
        { table: "profiles", label: "Profiles", created: "created_at" },
      ],
      // Gauge full-scale for database size (the free plan is 500 MB).
      dbLimitMB: 500,
    },
    // The Shopify card shows only when SHOPIFY_* variables are set in Vercel.
    shopify: { admin: "https://admin.shopify.com/" },

    /* ---------- Comms tab ---------- */
    comms: [
      { label: "Messages", icon: "chat", url: "sms:" },
      { label: "FaceTime", icon: "camera", url: "facetime:" },
      { label: "WhatsApp", icon: "phone", url: "whatsapp://" },
      { label: "Mail", icon: "mail", url: "message://" },
      { label: "Phone", icon: "call", url: "tel:" },
      { label: "Gmail", icon: "mail", url: "googlegmail://" },
    ],
    // Where the Gmail unread card goes when tapped.
    gmailUrl: "https://mail.google.com/",
    /* Favorite people. Any of phone, whatsapp (number with country code,
     * digits only), email. Empty name = placeholder tile. */
    contacts: [
      { name: "", phone: "", whatsapp: "", email: "" },
      { name: "", phone: "", whatsapp: "", email: "" },
      { name: "", phone: "", whatsapp: "", email: "" },
      { name: "", phone: "", whatsapp: "", email: "" },
    ],

    /* ---------- AI & Tools tab ---------- */
    tools: [
      { label: "Claude", icon: "spark", url: "https://claude.ai/new" },
      { label: "Claude Code", icon: "terminal", url: "https://claude.ai/code" },
      { label: "ChatGPT", icon: "chat", url: "https://chatgpt.com/" },
      { label: "Codex", icon: "branch", url: "https://chatgpt.com/codex" },
      { label: "Spotify", icon: "waves", url: "spotify:" },
      { label: "Shortcuts", icon: "bolt", url: "shortcuts://" },
      { label: "Notes", icon: "note", url: "mobilenotes://" },
    ],
    // Placeholders to wire to Shortcuts automations later.
    automations: [
      { label: "Ask Claude by voice", icon: "spark", shortcut: "" },
      { label: "Voice note", icon: "note", shortcut: "" },
      { label: "Flashlight", icon: "bolt", shortcut: "" },
      { label: "Focus mode", icon: "moon", shortcut: "" },
    ],

    /* ---------- Pinned bar: six buttons on every tab ---------- */
    pinned: [
      { label: "Claude", icon: "terminal", url: "https://claude.ai/code" },
      { label: "GitHub", icon: "branch", url: "https://github.com/Bajanomad" },
      { label: "Vercel", icon: "rocket", url: "https://vercel.com/bajaheat24x7-8566s-projects" },
      { label: "Messages", icon: "chat", url: "sms:" },
      { label: "Spotify", icon: "waves", url: "spotify:" },
      { label: "Shortcuts", icon: "bolt", url: "shortcuts://" },
    ],

    ticker: {
      speed: 55, // pixels per second
    },
  };

  // The browser reads window.BLACKOUT_CONFIG; the /api routes require() it.
  if (typeof module === "object" && module.exports) module.exports = CONFIG;
  else root.BLACKOUT_CONFIG = CONFIG;
})(this);
