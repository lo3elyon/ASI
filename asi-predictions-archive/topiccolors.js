/* topiccolors.js: Batch 5. One fixed colour per topic, assigned by sorted topic slug, on every clickable topic tag
   site-wide; and photo-less people get a gradient avatar in their topic's colour. No violet, purple or pink:
   every hue sits in 0–240 (red → cobalt) or is a brown, olive or slate. Each colour has a light and a dark
   variant (light-dark()), with text at 4.8:1 or more on its own tint and hover tint in both themes. */
(function () {
  "use strict";
  var doc = document;
  /* name, light: bg, hover, border, text · dark: bg, hover, border, text · avatar gradient (white text ≥ 4.6:1) */
  var PAL = [["red","#fbeae9","#f6c9c6","#d44035","#a7241b","#3d1c1a","#5f2926","#c94036","#ec8f89","#af261d","#883416"],["vermilion","#fceee8","#f8d2c4","#db5d2f","#9f3914","#3e2319","#613423","#cf5a30","#ef9e80","#b64116","#8d4b11"],["orange","#fdf2e7","#fadcc2","#e27e27","#924b0c","#402a17","#644020","#d67a29","#f4ae71","#b35b0f","#895f0b"],["amber","#fef6e7","#fce8c0","#e8a621","#885d07","#413316","#664e1e","#db9e24","#f7c45f","#9b6a08","#6f6106"],["gold","#fdf9e7","#faf1c2","#e2c327","#7b680a","#403917","#645920","#d6b929","#f1d650","#84700b","#575a07"],["yellow","#fcfce9","#f7f7c5","#d7d732","#6b6b0f","#3d3d19","#606024","#cccc33","#e7e755","#787811","#43500b"],["olive","#f6f7ee","#e7e9d2","#a3ab5e","#626732","#323423","#4d5034","#9ca35c","#c4ca91","#72783a","#4c5a2b"],["lime","#f4fbea","#e2f3c8","#93cc3d","#4b6d17","#2e3b1c","#475c28","#8dc23d","#b1e06c","#567e1b","#2f5813"],["green","#ecf9ec","#cdeece","#4ebc51","#256f27","#1f3720","#2e5630","#4db250","#85d687","#2d8630","#216331"],["emerald","#eafbf3","#c8f3df","#3dcc89","#187248","#1c3b2c","#285c44","#3dc284","#70e1ac","#1c8252","#145d49"],["teal","#e9fbf9","#c7f5ef","#37d2bd","#147164","#1b3c38","#265e57","#38c7b4","#67e4d4","#178274","#10565b"],["cyan","#e8fafc","#c3f1f8","#2cc5dd","#0e6d7c","#18393e","#225a62","#2ebbd1","#68dcee","#107d8e","#0b4765"],["sky","#e7f6fd","#c2e7fa","#27a4e2","#0c6592","#173240","#204e64","#299cd6","#71c8f4","#0f7cb3","#0b4689"],["azure","#e8f2fc","#c3dcf8","#2c7fdd","#1359aa","#182a3e","#224062","#2e7ad1","#7eb4f1","#1461b8","#10328e"],["blue","#e9eefc","#c5d4f7","#3264d7","#1b4dc0","#19243d","#243660","#3361cc","#87a5ee","#1947b3","#14208a"],["cobalt","#eaecfb","#c8cdf3","#3d4bcc","#2837bd","#1c1f3b","#282e5c","#3d4ac2","#929ae8","#2431a8","#1c3a82"],["brown","#f8f1ed","#ecdbd0","#b37b56","#7f5234","#352921","#533f32","#aa7755","#d4af96","#915d3b","#70562e"],["slate","#f0f2f5","#d8dde4","#718398","#4d5d6f","#272b30","#3b4249","#6d7e92","#a8b4c2","#546578","#41485d"],["pine","#eef6f1","#d3e8da","#61a879","#366847","#243329","#364f3e","#5fa075","#9acbaa","#428057","#32624c"]];
  var SLUGS = ["superintelligence", "control", "alignment", "ai-risk", "intelligence-explosion", "forecasting", "policy", "labs", "neuroscience",
    "deep-learning", "transformers", "scaling", "interpretability", "ai-agents", "ethics", "robotics", "fiction", "skeptics", "milestones"].sort();
  /* sorted index i takes palette slot (i·7) mod 19: stable across reloads, and neighbours in a list sit far apart in hue */
  var IDX = {}; SLUGS.forEach(function (s, i) { IDX[s] = (i * 7) % PAL.length; });
  var AL = { "control-problem": "control", "risk-statement": "ai-risk", risk: "ai-risk", safety: "ai-risk", singularity: "intelligence-explosion",
    forecasts: "forecasting", "agi-timelines": "forecasting", timelines: "forecasting", "policy-governance": "policy", governance: "policy",
    lab: "labs", "mind-brain": "neuroscience", neuro: "neuroscience", brain: "neuroscience", llms: "transformers", llm: "transformers",
    agents: "ai-agents", culture: "fiction", skeptic: "skeptics", milestone: "milestones" };
  /* the archive's own filter chips use short keys */
  var ARCH = { control: "control", safety: "alignment", time: "forecasting", neuro: "neuroscience", skeptic: "skeptics", mile: "milestones" };
  /* a person's topic, by people.json group */
  var GRP = { alignment: "alignment", governance: "policy", policy: "policy", pioneer: "superintelligence", "lab-leader": "labs", "in-lab": "labs",
    neuroscience: "neuroscience", critic: "skeptics", optimist: "skeptics", forecasting: "forecasting", interpretability: "interpretability",
    doomer: "ai-risk", evals: "ai-risk", theory: "intelligence-explosion", control: "control", "deep-learning": "deep-learning",
    fiction: "fiction", communicator: "fiction", philosophy: "ethics", hci: "ethics" };

  var canon = function (s) {
    s = String(s || "").toLowerCase().replace(/^#\/topic\//, "").replace(/[?#].*$/, "");
    s = AL[s] || s;
    return s in IDX ? s : null;
  };
  var ld = function (a, b) { return "light-dark(" + a + "," + b + ")"; };
  var paint = function (el, slug) {
    if (el.dataset.tc === slug && el.classList.contains("x-tc")) return;
    var p = PAL[IDX[slug]], st = el.style;
    st.setProperty("--tc-bg", ld(p[1], p[5])); st.setProperty("--tc-hv", ld(p[2], p[6]));
    st.setProperty("--tc-bd", ld(p[3], p[7])); st.setProperty("--tc-tx", ld(p[4], p[8]));
    el.dataset.tc = slug; el.classList.add("x-tc");
  };

  var read = function (id) { try { return (window.Hark && Hark.data(id)) || null; } catch (e) { return null; } };
  var PBY = null, EPIDS = null;
  var people = function () {
    if (PBY) return PBY;
    PBY = {}; (read("d-people") || []).forEach(function (p) { PBY[p.id] = p; });
    EPIDS = {}; (read("d-entries") || []).forEach(function (r) { EPIDS[r.id] = r.people_ids || []; });
    return PBY;
  };
  var hashSlug = function (s) { var h = 0; s = String(s || "?"); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return SLUGS[h % SLUGS.length]; };
  /* a person's topic slug for an avatar: from the person it links to, the group on its card, or its entry card */
  var personSlug = function (el) {
    var P = people(), a = el.closest('a[href^="#/person/"]'), pid = a && a.getAttribute("href").slice(9);
    if (!pid) { var m = /^#\/person\/([^/?#]+)/.exec(location.hash); if (m && el.closest(".x-pv__head")) pid = m[1]; }
    if (!pid) { var c = el.closest('.x-card[id^="e-"]'); if (c) pid = (EPIDS[c.id.slice(2)] || [])[0]; }
    var p = pid && P[pid], g = (p && p.group) || ((el.closest("[data-g]") || {}).dataset || {}).g;
    return GRP[g] || hashSlug(pid || el.textContent);
  };
  var avatar = function (el) {
    if (el.classList.contains("x-av--logo")) return;
    if (el.classList.contains("x-av") && el.querySelector("img")) { el.classList.remove("x-tcav"); return; }
    if (el.classList.contains("x-tcav")) return;
    var p = PAL[IDX[personSlug(el)]];
    el.style.setProperty("--av1", p[9]); el.style.setProperty("--av2", p[10]);
    el.classList.add("x-tcav");
  };

  var SKIP = ".nav, .foot, .x-cp, [role='listbox']";
  var scan = function (r) {
    if (!r || !r.querySelectorAll) return;
    var q = function (sel, fn) { if (r.matches && r.matches(sel)) fn(r); r.querySelectorAll(sel).forEach(fn); };
    q('a[href^="#/topic/"]', function (a) { if (a.closest(SKIP)) return; var s = canon(a.getAttribute("href")); if (s) paint(a, s); });
    q("#topicChips [data-topic]", function (b) { var s = ARCH[b.dataset.topic] || canon(b.dataset.topic); if (s) paint(b, s); });
    q(".x-hi__tag[data-tag]", function (b) { var s = canon(b.dataset.tag); if (s) paint(b, s); });
    q("span.x-kw--t[data-tc]", function (b) { var s = canon(b.dataset.tc); if (s) paint(b, s); });
    q('select[data-f="topic"]', function (sel) {
      sel.querySelectorAll("option").forEach(function (o) { var s = canon(o.value); if (s) paint(o, s); });
      var s = canon(sel.value);
      if (s) paint(sel, s); else { sel.classList.remove("x-tc"); delete sel.dataset.tc; }
    });
    q(".x-pav__ini, .x-pg__ini, .x-av", avatar);
  };

  /* an avatar photo that fails for good (logos.js has no fallback left) shows initials in the topic gradient */
  doc.addEventListener("error", function (ev) {
    var im = ev.target; if (!im || im.tagName !== "IMG") return;
    var host = im.closest(".x-av, .x-pg__person, .x-pav"); if (!host) return;
    setTimeout(function () {
      if (host.classList.contains("x-pg__person") && im.isConnected && !(im.getAttribute("data-fb") || "").replace("[]", "")) {
        var n = (host.textContent || "").trim(), s = doc.createElement("span");
        s.className = "x-pg__ini"; s.setAttribute("aria-hidden", "true");
        s.textContent = n.split(/\s+/).filter(function (w) { return /^[A-Za-z]/.test(w); }).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("") || "?";
        im.replaceWith(s);
      }
      scan(host.parentNode || host);
    }, 0);
  }, true);
  doc.addEventListener("change", function (ev) { var t = ev.target; if (t && t.matches && t.matches('select[data-f="topic"]')) scan(t.parentNode); });

  scan(doc.body);
  if ("MutationObserver" in window) new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var add = list[i].addedNodes;
      for (var j = 0; j < add.length; j++) if (add[j].nodeType === 1) scan(add[j]);
      if (list[i].removedNodes.length && list[i].target.nodeType === 1 && list[i].target.matches(".x-av")) avatar(list[i].target);
    }
  }).observe(doc.body, { childList: true, subtree: true });

  window.XTopicColor = { slugs: SLUGS.slice(), canon: canon, of: function (s) { s = canon(s); return s ? PAL[IDX[s]] : null; } };
})();
