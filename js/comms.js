/* Comms tab: one-tap Messages, FaceTime, WhatsApp, Mail (iOS app links),
 * the Gmail unread count (/api/google) and big tiles for favorite people. */
(function () {
  "use strict";

  var BO = window.BO, C = BO.C, el = BO.el;

  function channelsCard() {
    var c = BO.card("comms.apps", { title: "Channels", icon: "chat", open: true });
    var grid = el("div", { class: "keys" });
    C.comms.forEach(function (item) { grid.appendChild(BO.button(item, "key", "comms")); });
    c.body.append(grid);
    c.summary(C.comms.length + " links");
    c.state("ok", "IOS APP LINKS");
    return c.node;
  }

  function gmailCard() {
    var c = BO.card("comms.gmail", { title: "Gmail", icon: "mail", open: true });
    var num = el("b", { class: "mail-num" });
    var sub = el("span", { class: "label" });
    var box = el("div");
    var link = el("a", Object.assign({ class: "mail" }, BO.linkAttrs(C.gmailUrl)), [num, sub]);
    c.body.append(box);
    BO.feed("google", 2 * 60 * 1000, function (res) {
      box.textContent = "";
      var d = res && res.data;
      if (!res) { box.appendChild(BO.loading("CHECKING MAIL")); BO.showState(c, null); return; }
      if (d && d.configured === false) {
        box.appendChild(BO.needsEnv(d.missing, "Gmail"));
        c.state("idle", "NOT CONNECTED"); c.summary("--");
        return;
      }
      BO.showState(c, res);
      if (!d || !d.gmail) return;
      if (d.gmail.error) { box.appendChild(BO.placeholder("Gmail", "Couldn't read the inbox: " + d.gmail.error)); c.summary("--"); return; }
      box.appendChild(link);
      BO.num(num, BO.compact(d.gmail.unread));
      sub.textContent = "unread in inbox · " + BO.compact(d.gmail.unreadThreads) + " threads · tap to open";
      link.classList.toggle("hot", d.gmail.unread > 0);
      c.summary(d.gmail.unread + " unread");
      BO.ticker.set("gmail", [{ text: "GMAIL " + d.gmail.unread + " UNREAD", level: d.gmail.unread > 50 ? "warn" : "info" }]);
    });
    return c.node;
  }

  /* ---------- Favorite people ---------- */
  function digits(v) { return String(v || "").replace(/[^\d+]/g, ""); }
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  }
  function contactTile(p) {
    if (!p.name) {
      return el("button", { class: "contact unset", type: "button", onclick: function () {
        BO.toast("Add a favorite in config.js → contacts: name, phone, whatsapp, email.");
      } }, [el("span", { class: "avatar", text: "+" }), el("b", { text: "Add favorite" }), el("span", { class: "tag", text: "set up" })]);
    }
    var phone = digits(p.phone), wa = digits(p.whatsapp).replace(/^\+/, "");
    var actions = [];
    if (phone) {
      actions.push(el("a", { class: "act", href: "tel:" + phone, "aria-label": "Call " + p.name }, [BO.icon("call")]));
      actions.push(el("a", { class: "act", href: "sms:" + phone, "aria-label": "Text " + p.name }, [BO.icon("chat")]));
      actions.push(el("a", { class: "act", href: "facetime:" + phone, "aria-label": "FaceTime " + p.name }, [BO.icon("camera")]));
    }
    if (wa) actions.push(el("a", { class: "act", href: "whatsapp://send?phone=" + wa, "aria-label": "WhatsApp " + p.name }, [BO.icon("phone")]));
    if (p.email) actions.push(el("a", { class: "act", href: "mailto:" + encodeURIComponent(p.email).replace("%40", "@"), "aria-label": "Email " + p.name }, [BO.icon("mail")]));
    // The big tile itself calls (or the first thing it can do).
    var primary = actions[0] ? actions[0].getAttribute("href") : null;
    return el("div", { class: "contact" }, [
      el(primary ? "a" : "div", { class: "contact-main", href: primary }, [el("span", { class: "avatar", text: initials(p.name) }), el("b", { text: p.name })]),
      el("div", { class: "acts" }, actions),
    ]);
  }
  function favoritesCard() {
    var c = BO.card("comms.people", { title: "Favorites", icon: "user", open: true });
    var grid = el("div", { class: "contacts" });
    C.contacts.forEach(function (p) { grid.appendChild(contactTile(p)); });
    c.body.append(grid);
    var set = C.contacts.filter(function (p) { return p.name; }).length;
    c.summary(set ? set + " people" : "set up");
    c.state(set ? "ok" : "idle", set ? "TAP A TILE TO CALL" : "ADD PEOPLE IN CONFIG.JS → CONTACTS");
    return c.node;
  }

  BO.tabs.comms = function (stack) {
    stack.append(channelsCard(), gmailCard(), favoritesCard());
  };
})();
