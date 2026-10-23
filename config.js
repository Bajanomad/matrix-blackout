/* BLACKOUT CONFIG — every link, site and shortcut on the home screen lives
 * here. Edit this file, then bump CACHE in sw.js so installed copies update.
 *
 * Icons: any name from ICONS in themes.js — terminal spark branch waves phone
 * shield mail calendar globe repo folder chat call camera photo map pin music
 * play cart card news book note cloud home heart star game bolt search gear
 * user car plane sun moon rocket coffee horseshoe cactus wave link. */
window.BLACKOUT_CONFIG = {
  /* ---------- Screen one: Phone Basics ---------- */
  weather: {
    // Used until "Use my location" is tapped (and if location is refused).
    home: { name: "Todos Santos", lat: 23.4464, lng: -110.2265 },
    units: "f", // "f" or "c"
  },
  clock24: false,
  // Where the calendar card's "Open" button goes. "calshow://" opens Apple
  // Calendar; "https://calendar.google.com/" opens Google Calendar.
  calendarUrl: "calshow://",

  /* ---------- Screen two: My Sites ----------
   * Each group is one drop-down card. Each site:
   *   { name, desc, url, icon }
   * A site with an empty url shows as "not set yet" until you fill it in. */
  sites: [
    {
      title: "411",
      icon: "globe",
      open: true,
      items: [
        { name: "411 BCS", desc: "Baja California Sur directory", url: "", icon: "pin" },
        { name: "Matrix 411", desc: "The Matrix website", url: "https://411matrix.vercel.app/", icon: "terminal" },
        { name: "411 Market", desc: "Marketplace", url: "", icon: "cart" },
      ],
    },
    {
      title: "Play",
      icon: "game",
      open: true,
      items: [
        { name: "The Arcade", desc: "My arcade", url: "", icon: "game" },
        { name: "My Game", desc: "The video game I play", url: "", icon: "play" },
      ],
    },
    {
      title: "Code",
      icon: "branch",
      items: [
        { name: "Blackout", desc: "Bajanomad/matrix-blackout", url: "https://github.com/Bajanomad/matrix-blackout", icon: "repo" },
        { name: "Matrix 411", desc: "Bajanomad/411matrix", url: "https://github.com/Bajanomad/411matrix", icon: "repo" },
        { name: "411 BCS", desc: "Bajanomad/411", url: "https://github.com/Bajanomad/411", icon: "repo" },
        { name: "411 Market", desc: "Bajanomad/411-market", url: "https://github.com/Bajanomad/411-market", icon: "repo" },
        { name: "All repositories", desc: "github.com/Bajanomad", url: "https://github.com/Bajanomad?tab=repositories", icon: "branch" },
      ],
    },
    {
      title: "Blackout",
      icon: "spark",
      items: [
        { name: "Blackout Studio", desc: "Build a themed screen for anyone", url: "/build", icon: "gear" },
        { name: "Themed screen", desc: "The one-page Studio screen", url: "/screen", icon: "star" },
      ],
    },
  ],

  /* ---------- Screen three: Shortcuts ----------
   * Each group is one drop-down card of big buttons. Each button is ONE of:
   *   { label, icon, url: "tel:" }          an iOS app link or web address
   *   { label, icon, shortcut: "Name" }     runs your Shortcuts automation
   *                                         named exactly "Name"
   *   { label, icon, shortcut: "" }         placeholder: not wired yet
   *
   * To wire a placeholder: in the Shortcuts app make a shortcut (for example
   * "Blackout Flashlight" with the Set Flashlight action), then type that
   * exact name into `shortcut` below. Tapping the button opens
   * shortcuts://run-shortcut?name=... which runs it.
   *
   * iOS has no web link for the camera, flashlight, alarms, Settings pages
   * or Focus, so those start as placeholders. */
  shortcuts: [
    {
      title: "Talk",
      icon: "chat",
      open: true,
      items: [
        { label: "Phone", icon: "call", url: "tel:" },
        { label: "Messages", icon: "chat", url: "sms:" },
        { label: "FaceTime", icon: "camera", url: "facetime:" },
        { label: "Mail", icon: "mail", url: "message://" },
        { label: "WhatsApp", icon: "phone", url: "whatsapp://" },
        { label: "Signal", icon: "shield", url: "sgnl://" },
      ],
    },
    {
      title: "Apple apps",
      icon: "home",
      open: true,
      items: [
        { label: "Maps", icon: "map", url: "maps://" },
        { label: "Music", icon: "music", url: "music://" },
        { label: "Calendar", icon: "calendar", url: "calshow://" },
        { label: "Photos", icon: "photo", url: "photos-redirect://" },
        { label: "Notes", icon: "note", url: "mobilenotes://" },
        { label: "Reminders", icon: "star", url: "x-apple-reminderkit://" },
        { label: "Podcasts", icon: "play", url: "podcasts://" },
        { label: "App Store", icon: "cart", url: "itms-apps://" },
        { label: "Shortcuts", icon: "bolt", url: "shortcuts://" },
      ],
    },
    {
      title: "Controls",
      icon: "gear",
      items: [
        { label: "Camera", icon: "camera", shortcut: "" },
        { label: "Flashlight", icon: "bolt", shortcut: "" },
        { label: "Alarm", icon: "sun", shortcut: "" },
        { label: "Timer", icon: "moon", shortcut: "" },
        { label: "Settings", icon: "gear", shortcut: "" },
        { label: "Wi-Fi", icon: "globe", shortcut: "" },
        { label: "Focus", icon: "moon", shortcut: "" },
        { label: "Low Power", icon: "bolt", shortcut: "" },
      ],
    },
    {
      title: "Web apps",
      icon: "spark",
      items: [
        { label: "Claude", icon: "terminal", url: "https://claude.ai/code" },
        { label: "ChatGPT", icon: "spark", url: "https://chatgpt.com/" },
        { label: "GitHub", icon: "branch", url: "https://github.com/" },
        { label: "Spotify", icon: "waves", url: "spotify:" },
        { label: "Gmail", icon: "mail", url: "https://mail.google.com/" },
        { label: "Search", icon: "search", url: "x-web-search://" },
      ],
    },
  ],
};
