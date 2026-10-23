/* BLACKOUT main — puts the screen together: tabs and the sliding light,
 * swipe paging with a glitch on each tab change, pull-down sync, the pinned
 * dock, ticker, alerts, rain and the boot sequence. Each tab's widgets come
 * from js/<tab>.js (BO.tabs[id](stack)). */
(function () {
  "use strict";

  var BO = window.BO, C = BO.C, el = BO.el, $ = BO.$;

  /* ---------- Pager: five screens, tabs and the sliding light ---------- */
  function startPager() {
    var pager = $("pager");
    var tabs = [].slice.call(document.querySelectorAll(".tab"));
    var light = document.querySelector(".tab-light");
    var current = -1, queued = false, glitchTimer = 0;

    function select(i) {
      if (i === current) return;
      var first = current === -1;
      current = i;
      tabs.forEach(function (t, n) {
        t.setAttribute("aria-selected", String(n === i));
        t.tabIndex = n === i ? 0 : -1;
      });
      BO.save("screen", i);
      if (!first) glitch();
    }
    // One short glitch per change, whether it came from a tap or a swipe.
    function glitch() {
      if (BO.REDUCE || document.body.classList.contains("glitch")) return;
      document.body.classList.add("glitch");
      clearTimeout(glitchTimer);
      glitchTimer = setTimeout(function () { document.body.classList.remove("glitch"); }, 360);
    }
    // The light follows the swipe itself, so it glides between tabs mid-drag.
    function sync() {
      queued = false;
      var w = pager.clientWidth || 1;
      var pos = Math.max(0, Math.min(tabs.length - 1, pager.scrollLeft / w));
      light.style.setProperty("--pos", pos.toFixed(4));
      select(Math.round(pos));
    }
    function go(i, instant) {
      pager.scrollTo({ left: i * pager.clientWidth, behavior: instant || BO.REDUCE ? "auto" : "smooth" });
    }
    BO.go = go;

    pager.addEventListener("scroll", function () {
      if (!queued) { queued = true; requestAnimationFrame(sync); }
    }, { passive: true });
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { if (i !== current) glitch(); go(i); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = (current + d + tabs.length) % tabs.length;
        go(n); tabs[n].focus();
      });
    });
    // Rotation or resize: stay on the same screen.
    window.addEventListener("resize", function () { go(current, true); }, { passive: true });

    var start = BO.load("screen", 0);
    start = start >= 0 && start < tabs.length ? start : 0;
    select(start);
    light.style.setProperty("--pos", start);
    requestAnimationFrame(function () { go(start, true); sync(); document.body.classList.add("ready"); });
  }

  /* ---------- Pull down at the top of any screen to sync everything ---------- */
  function startPull() {
    var syncing = false;
    [].slice.call(document.querySelectorAll(".screen")).forEach(function (screen) {
      var ptr = screen.querySelector(".ptr");
      var y0 = null, x0 = 0, dy = 0;
      screen.addEventListener("touchstart", function (e) {
        if (screen.scrollTop > 0 || syncing) { y0 = null; return; }
        y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0;
      }, { passive: true });
      screen.addEventListener("touchmove", function (e) {
        if (y0 === null) return;
        var ny = e.touches[0].clientY - y0, nx = e.touches[0].clientX - x0;
        if (Math.abs(nx) > Math.abs(ny) || screen.scrollTop > 0) { y0 = null; ptr.style.transform = ""; ptr.classList.remove("show"); return; }
        dy = Math.max(0, ny);
        ptr.classList.toggle("show", dy > 8);
        ptr.classList.toggle("armed", dy > 70);
        ptr.lastChild.textContent = dy > 70 ? "RELEASE TO SYNC" : "PULL TO SYNC";
        ptr.style.transform = "translateY(" + Math.min(60, dy / 2) + "px)";
      }, { passive: true });
      screen.addEventListener("touchend", function () {
        if (y0 === null) return;
        y0 = null;
        ptr.style.transform = "";
        ptr.classList.remove("armed");
        if (dy > 70) { refresh(); } else ptr.classList.remove("show");
      });
    });
    function refresh() {
      syncing = true;
      document.body.classList.add("syncing");
      [].slice.call(document.querySelectorAll(".ptr")).forEach(function (p) { p.lastChild.textContent = "SYNCING"; });
      BO.refreshAll(true).then(function () {
        syncing = false;
        document.body.classList.remove("syncing");
        [].slice.call(document.querySelectorAll(".ptr")).forEach(function (p) { p.classList.remove("show"); });
      });
    }
    BO.sync = refresh;
  }

  /* ---------- Header: network light and sync state ---------- */
  function startHeader() {
    var net = $("net");
    function update() {
      net.lastChild.textContent = navigator.onLine ? "ONLINE" : "OFFLINE";
      net.classList.toggle("off", !navigator.onLine);
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    BO.on("sync", function (on) { document.body.classList.toggle("busy", on); });
    $("alerts").addEventListener("click", function () { if ($("alerts").classList.contains("on")) BO.go(1); });
  }

  /* ---------- Pinned dock: six buttons on every tab ---------- */
  function startDock() {
    var dock = $("dock");
    C.pinned.slice(0, 6).forEach(function (item) { dock.appendChild(BO.button(item, "dock-btn", "pinned")); });
  }

  /* ---------- Build ---------- */
  ["pulse", "projects", "data", "comms", "tools"].forEach(function (id) {
    var stack = document.querySelector('[data-tab="' + id + '"] .stack');
    if (BO.tabs[id]) BO.tabs[id](stack);
    else stack.appendChild(BO.placeholder("Coming online", "This screen is still being built."));
  });

  BO.rain.mount($("rain"));
  BO.ticker.mount($("tape"));
  BO.alerts.mount($("alerts"));
  startHeader();
  startDock();
  startPager();
  startPull();
  BO.startTicking();
  BO.startSources();
  BO.boot(false);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
  }
})();
