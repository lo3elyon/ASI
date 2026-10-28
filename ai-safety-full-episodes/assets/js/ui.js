/* AI Safety Full Episodes · ui: icons, toasts, avatars, cards, shelves, level chip, XP animation. */
(function (A) {
  "use strict";
  const { $, esc, fmtTime, fmtDate, fmtShort, initials, avatarGradient, STATE, RM, fold } = A;
  const h = () => A.hist;

  const I = (d, extra) => `<svg viewBox="0 0 24 24" aria-hidden="true"${extra || ""}>${d}</svg>`;
  const ICON = {
    play: I('<path d="M7 4v16l13-8L7 4Z" fill="currentColor" stroke="none"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    check: I('<path d="m5 12 5 5L20 7"/>'),
    queue: I('<path d="M4 6h12M4 12h12M4 18h8M18 15v6M15 18h6"/>'),
    queued: I('<path d="M4 6h12M4 12h12M4 18h8M15 18l2 2 4-4"/>'),
    heart: I('<path d="M12 20s-7-4.5-9-9.2C1.7 7.5 4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8C20 4.5 22.3 7.5 21 10.8 19 15.5 12 20 12 20Z"/>'),
    heartF: I('<path d="M12 20s-7-4.5-9-9.2C1.7 7.5 4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8C20 4.5 22.3 7.5 21 10.8 19 15.5 12 20 12 20Z" fill="currentColor"/>'),
    yt: I('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10.5 9.5 4 2.5-4 2.5v-5Z" fill="currentColor"/>'),
    link: I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    share: I('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    star: I('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"/>'),
    starF: I('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" fill="currentColor"/>'),
    note: I('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>'),
    trash: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    clock: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    grid: I('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
    list: I('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'),
    chev: I('<path d="m9 6 6 6-6 6"/>'),
    filter: I('<path d="M4 5h16l-6 8v5l-4 2v-7L4 5Z"/>'),
    save: I('<path d="M6 4h10l4 4v12H4V4h2Zm2 0v5h8V4M8 20v-6h8v6"/>'),
    shuffle: I('<path d="M4 7h3c4 0 6 10 10 10h3M4 17h3c1.6 0 2.8-1.6 4-3.5M13 9.5C14.2 8 15.4 7 17 7h3M17 4l3 3-3 3M17 14l3 3-3 3"/>'),
    dots: I('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
    eye: I('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
    later: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    flame: I('<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.3 1.6 1.1 2.6 2.3 3.1C11 9 11.3 5.6 12 3Z"/>'),
    spark: I('<path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M5.6 18.4l3.2-3.2M15.2 8.8l3.2-3.2"/>'),
  };

  /* ---------------------------------------------------------------- toasts */
  function toast(html, o) {
    o = o || {};
    if (A.P && A.P.dnd && !o.force && !o.action) return;
    const box = $("#toasts");
    if (!box) return;
    const el = document.createElement("div");
    el.className = "toast " + (o.cls || "") + (o.force ? " toast--force" : "");
    el.setAttribute("role", "status");
    el.innerHTML = `${o.icon ? `<span class="toast__ic">${esc(o.icon)}</span>` : ""}<span class="toast__tx">${html}</span>${o.action ? `<button class="toast__act">${esc(o.action.label)}</button>` : ""}`;
    if (o.action) el.querySelector(".toast__act").onclick = () => { o.action.fn(); el.remove(); };
    if (/toast--badge/.test(o.cls || "")) confetti(40);
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    requestAnimationFrame(() => el.classList.add("is-in"));
    setTimeout(() => { el.classList.remove("is-in"); setTimeout(() => el.remove(), 350); }, o.ms || 3200);
  }
  function confirmBox(msg, okLabel, danger) {
    return new Promise((res) => {
      const m = document.createElement("div");
      m.className = "modal"; m.setAttribute("role", "alertdialog"); m.setAttribute("aria-modal", "true");
      m.innerHTML = `<div class="sheet sheet--sm"><p class="confirm__msg">${msg}</p><div class="confirm__act"><button class="btn btn--ghost" data-v="0">Cancel</button><button class="btn ${danger ? "btn--danger" : "btn--primary"}" data-v="1">${esc(okLabel || "OK")}</button></div></div>`;
      document.body.appendChild(m);
      const done = (v) => { m.remove(); res(v); };
      m.addEventListener("click", (ev) => { const b = ev.target.closest("[data-v]"); if (b) done(b.dataset.v === "1"); else if (ev.target === m) done(false); });
      m.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { ev.stopPropagation(); done(false); } });
      m.querySelector('[data-v="1"]').focus();
    });
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (x) {} ta.remove(); return ok;
    }
  }

  /* ---------------------------------------------------------------- avatars */
  function speakerOf(name) { return STATE.speakers.get(fold(name)) || null; }
  /* every person shows a real photo: curated file → channel avatar file → cropped thumbnail of their best solo episode */
  /* Every speaker shows a real face photo. The only exception is a speaker with no public face at all (an anonymous
   * channel host): they get a neutral silhouette drawn in the current theme accent. Never a text-bearing thumbnail. */
  const NEUTRAL = "assets/speakers/neutral.svg";
  const isNeutral = (src) => !src || /neutral\.svg$/.test(src);
  function photoOf(name) {
    const s = speakerOf(name);
    if (s && s.photo && !isNeutral(s.photo)) return { src: s.photo, thumb: false, neutral: false };
    return { src: NEUTRAL, thumb: false, neutral: true };
  }
  function hasFace(name) { return !photoOf(name).neutral; }
  const SIL = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" fill="var(--surf2)"/><circle cx="32" cy="25" r="11.5" fill="var(--amber)" opacity=".9"/><path d="M10 64c1.6-13.4 10.6-21 22-21s20.4 7.6 22 21Z" fill="var(--amber)" opacity=".9"/></svg>';
  function avatar(name, size, cls) {
    const sz = size || 40;
    const ph = photoOf(name);
    if (ph.neutral) return `<span class="av av--neutral ${cls || ""}" style="--s:${sz}px" role="img" aria-label="${esc(name)}">${SIL}</span>`;
    return `<span class="av ${cls || ""}" style="--s:${sz}px"><img src="${esc(ph.src)}" alt="${esc(name)}" loading="lazy" decoding="async" width="${sz}" height="${sz}"></span>`;
  }
  function artFor(e) { const p = e.stars.find((x) => hasFace(x.name)) || e.people.find((x) => hasFace(x.name)); return p ? speakerOf(p.name).photo : e.thumb; }

  /* ---------------------------------------------------------------- cards */
  function thumbImg(e, eager) { return `<img class="thumb__img" src="${esc(e.thumb)}" alt="${esc("Thumbnail: " + e.title)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="480" height="360">`; }
  /* image load / error handling without inline handlers (CSP-friendly): capture-phase listeners on the document */
  if (typeof document !== "undefined") {
    document.addEventListener("load", (ev) => { const t = ev.target; if (t && t.classList && t.classList.contains("thumb__img")) t.classList.add("is-ld"); }, true);
    document.addEventListener("error", (ev) => {
      const t = ev.target; if (!t || t.tagName !== "IMG") return;
      if (t.classList.contains("thumb__img")) { t.classList.add("is-ld", "is-broken"); return; }
      const av = t.closest && t.closest(".av"); if (av && !t.dataset.fb) { t.dataset.fb = "1"; t.src = NEUTRAL; }
    }, true);
  }
  function whoLine(e, max) {
    const st = e.stars.slice(0, max || 3).map((p) => p.name);
    const more = e.stars.length - st.length;
    return st.join(", ") + (more > 0 ? ` +${more}` : "") || e.channel;
  }
  function showLine(e) { return (e.show && e.show.length < 52 ? e.show : e.channel) || e.channel; }
  function hl(text, q) {
    text = esc(text);
    if (!q) return text;
    const terms = fold(q).split(/\s+/).filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (!terms.length) return text;
    try { return text.replace(new RegExp(`(${terms.join("|")})`, "gi"), "<mark>$1</mark>"); } catch (x) { return text; }
  }
  /* ONE shared card-meta renderer: every card variant (library grid/list, carousels, picks, queue, playlists, notes, history,
   * recently watched, up next, search, explore) takes its upload date and duration from here, so no variant can drop the date. */
  function thumbDate(e) { if (!e || !e.date) return ""; const s = fmtShort(e.date), y = e.date.slice(0, 4); return `<span class="thumb__date" data-date="${esc(e.date)}" title="Uploaded ${esc(fmtDate(e.date, e.approx))}">${esc(s)}<span class="thumb__yr">, ${esc(y)}</span></span>`; }
  function flagBadges(e) { const n = A.isNew && A.isNew(e), c = e && e.classic; return n || c ? `<span class="thumb__flags">${n ? `<span class="thumb__new" title="Added ${esc(fmtDate((e.addedAt || "").slice(0, 10)))}">NEW</span>` : ""}${c ? `<span class="thumb__classic" title="A classic: older than this library\u2019s window, kept for its lasting value">Classic</span>` : ""}</span>` : ""; }
  function thumbBadges(e) { return thumbDate(e) + flagBadges(e) + `<span class="thumb__dur">${esc(e.durStr)}</span>`; }
  function metaDate(e) { return e && e.date ? `<span class="card__date" data-date="${esc(e.date)}">${esc(fmtShort(e.date))}</span>` : ""; }
  function metaCore(e) { return metaDate(e) + `<span>${esc(e.durStr)}</span>`; }
  function cardMeta(e, rest) { return `<p class="card__meta">${metaCore(e)}${rest || ""}</p>`; }
  function metaText(e) { return `${metaDate(e)} · ${esc(e.durStr)}`; }
  function stateBadge(id) {
    const st = h().stateOf(id);
    if (st === "done") return `<span class="ribbon ribbon--done">${ICON.check}${h().isManual(id) ? "Watched on YouTube" : "Watched"}</span>`;
    if (st === "progress") return `<span class="ribbon">${Math.round(h().pctOf(id) * 100)}%</span>`;
    return "";
  }
  function card(e, o) {
    o = o || {};
    const L = h().L;
    const pct = h().pctOf(e.id);
    const q = L.QUEUE.includes(e.id), fav = L.FAVS.has(e.id);
    const reason = o.why ? `<p class="card__why">${ICON.spark}<span>${esc(o.why)}</span></p>` : "";
    const avs = e.stars.slice(0, 4).map((p) => avatar(p.name, 26)).join("");
    const done = h().stateOf(e.id) === "done";
    const rt = (L.RATINGS || {})[e.id];
    const menuBtn = `<button class="iconbtn iconbtn--sm card__menu" data-act="menu" aria-haspopup="menu" aria-label="More actions for ${esc(e.title)}" title="More (right-click)">${ICON.dots}</button>`;
    const doneBtn = `<button class="iconbtn iconbtn--sm card__done ${done ? "is-on" : ""}" data-act="watched" aria-pressed="${done}" aria-label="${done ? "Mark unwatched" : "Mark as watched"}" title="${done ? "Mark unwatched" : "Already watched on YouTube? Mark as watched"}">${ICON.check}</button>`;
    const meta = `<span class="fmtpill fmtpill--${e.fmt}">${esc({ podcast: "Interview", debate: "Debate", panel: "Panel", talk: "Talk", hearing: "Hearing" }[e.fmt] || "Episode")}</span>${metaCore(e)}<span class="lvl lvl--${A.slug(e.level)}">${esc(e.level)}</span>`;
    if (o.list) {
      return `<article class="lrow" data-id="${e.id}" data-fmt="${e.fmt}" draggable="true">
        <button class="lrow__th thumb" data-act="play" aria-label="Play ${esc(e.title)}">${thumbImg(e)}${thumbBadges(e)}${pct ? `<span class="thumb__bar"><i style="width:${Math.round(pct * 100)}%"></i></span>` : ""}</button>
        <div class="lrow__tx">
          <button class="card__title" data-act="open">${hl(e.title, o.q)}</button>
          <p class="card__who"><span class="avs">${avs}</span>${hl(whoLine(e, 4), o.q)}</p>
          <p class="card__meta">${meta}<span>${esc(showLine(e))}</span>${e.views ? `<span>${A.ui.fmtViews(e.views)} views</span>` : ""}</p>
          ${o.snippet ? `<p class="card__snip">${o.snippet}</p>` : ""}${reason}
        </div>
        <div class="lrow__act">${stateBadge(e.id)}
          <button class="iconbtn" data-act="queue" aria-pressed="${q}" aria-label="${q ? "Remove from queue" : "Add to queue"}" title="Queue">${q ? ICON.queued : ICON.queue}</button>
          <button class="iconbtn" data-act="fav" aria-pressed="${fav}" aria-label="${fav ? "Unfavourite" : "Favourite"}" title="Favourite">${fav ? ICON.heartF : ICON.heart}</button>
          ${doneBtn}${menuBtn}
        </div>
      </article>`;
    }
    return `<article class="card" data-id="${e.id}" data-fmt="${e.fmt}" tabindex="-1" draggable="true">
      <button class="thumb" data-act="play" aria-label="Play ${esc(e.title)}">${thumbImg(e, o.eager)}${thumbBadges(e)}${stateBadge(e.id)}<span class="thumb__play">${ICON.play}</span>${pct ? `<span class="thumb__bar"><i style="width:${Math.round(pct * 100)}%"></i></span>` : ""}</button>
      <div class="card__body">
        <button class="card__title" data-act="open" title="${esc(e.title)}">${hl(e.title, o.q)}</button>
        <p class="card__who"><span class="avs">${avs}</span><span class="card__names">${hl(whoLine(e), o.q)}</span></p>
        <p class="card__meta">${meta}</p>${reason}
        <div class="card__act">
          <button class="iconbtn iconbtn--sm" data-act="queue" aria-pressed="${q}" aria-label="${q ? "Remove from queue" : "Add to queue"}" title="${q ? "In queue" : "Add to queue"}">${q ? ICON.queued : ICON.queue}</button>
          <button class="iconbtn iconbtn--sm" data-act="fav" aria-pressed="${fav}" aria-label="${fav ? "Unfavourite" : "Favourite"}" title="Favourite">${fav ? ICON.heartF : ICON.heart}</button>
          ${doneBtn}${rt ? `<span class="card__rt" title="Your rating">★${rt}</span>` : ""}
          <span class="grow"></span><span class="card__show">${esc(showLine(e))}</span>${menuBtn}
        </div>
      </div>
    </article>`;
  }
  function shelf(title, items, o) {
    o = o || {};
    if (!items || !items.length) return "";
    const id = "sh" + Math.random().toString(36).slice(2, 8);
    return `<section class="shelf" aria-labelledby="${id}">
      <div class="shelf__hd"><h2 id="${id}">${o.icon ? `<span class="shelf__ic">${o.icon}</span>` : ""}${title}</h2>${o.sub ? `<p class="shelf__sub">${o.sub}</p>` : ""}<span class="grow"></span>${o.more ? `<a class="shelf__more" href="${o.more}">See all ${ICON.chev}</a>` : ""}
        <div class="shelf__nav"><button class="iconbtn iconbtn--sm" data-scroll="-1" aria-label="Scroll left"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button><button class="iconbtn iconbtn--sm" data-scroll="1" aria-label="Scroll right">${ICON.chev}</button></div></div>
      <div class="shelf__wrap"><div class="shelf__row" data-carousel>${items.map((x) => (x.e ? card(x.e, { why: x.why }) : card(x))).join("")}</div></div>
    </section>`;
  }
  function skeletons(n) { return `<div class="grid">${Array.from({ length: n }, () => `<div class="skel"><div class="skel__img shimmer"></div><div class="skel__line shimmer"></div><div class="skel__line skel__line--s shimmer"></div></div>`).join("")}</div>`; }
  function fmtViews(v) { if (v == null) return ""; if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M"; if (v >= 1e3) return (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + "K"; return String(v); }

  function speakerCard(s) {
    const L = h().L;
    const eps = s.eps.map((id) => STATE.byId.get(id)).filter(Boolean);
    const watched = eps.filter((e) => h().stateOf(e.id) === "done").length;
    const fol = L.FOLLOWS.has(s.k);
    const g = A.groupById(s.group);
    return `<article class="scard" data-k="${esc(s.k)}" style="--g:${g.color}">
      <a class="scard__ph" href="#/speaker/${esc(s.slug)}" aria-label="${esc(s.name)} profile">${avatar(s.name, 96, "av--ring")}</a>
      <div class="scard__tx">
        <a class="scard__name" href="#/speaker/${esc(s.slug)}">${esc(s.name)}</a>
        <p class="scard__org">${esc(s.org || "")}</p>
        <p class="scard__bio">${esc(s.bio || "")}</p>
        <p class="scard__stats"><span><b>${eps.length}</b> ep${eps.length === 1 ? "" : "s"}</span><span><b>${A.hoursStr(s.secs)}</b></span><span title="Completed">watched <b>${watched}</b>/${eps.length}</span></p>
        <div class="scard__bar"><i style="width:${eps.length ? Math.round((watched / eps.length) * 100) : 0}%"></i></div>
      </div>
      <button class="follow ${fol ? "is-on" : ""}" data-follow="${esc(s.k)}" aria-pressed="${fol}">${fol ? ICON.check + "Following" : ICON.plus + "Follow"}</button>
    </article>`;
  }

  /* ---------------------------------------------------------------- level chip + XP */
  function paintLevelChip(Lv) {
    const n = $("#lvlNum"); if (!n) return;
    n.textContent = Lv.n;
    $("#lvlRing").style.strokeDashoffset = String(97.4 * (1 - Lv.frac));
    $("#lvlChip").setAttribute("aria-label", `Level ${Lv.n}, ${Lv.title}. Open profile`);
    $("#lvlChip").title = `Level ${Lv.n} · ${Lv.title} · ${Lv.xp} XP`;
  }
  function xpPop(n) {
    const box = $("#xpfloat"); if (!box || n <= 0 || (A.P && A.P.dnd)) return;
    const el = document.createElement("span");
    el.className = "xp"; el.textContent = `+${n} XP`;
    box.appendChild(el);
    $("#lvlChip") && $("#lvlChip").classList.add("is-pulse");
    setTimeout(() => { el.remove(); $("#lvlChip") && $("#lvlChip").classList.remove("is-pulse"); }, RM ? 600 : 1600);
  }
  function confetti(n) {
    if (RM || (A.P && A.P.dnd) || typeof document === "undefined") return;
    const box = document.createElement("div"); box.className = "confetti"; box.setAttribute("aria-hidden", "true");
    const cols = ["var(--amber)", "var(--teal)", "#22c55e", "#38bdf8", "#fb923c", "#a3e635"];
    for (let i = 0; i < (n || 60); i++) { const c = document.createElement("i"); c.style.left = Math.random() * 100 + "%"; c.style.background = cols[i % cols.length]; c.style.animationDelay = Math.random() * 0.5 + "s"; c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s"; c.style.setProperty("--x", (Math.random() * 2 - 1) * 160 + "px"); c.style.setProperty("--r", Math.random() * 720 + "deg"); box.appendChild(c); }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4200);
  }
  function levelUp(Lv) {
    const m = $("#levelup"); if (!m) return;
    if (A.P && A.P.dnd) return;
    confetti(90);
    $("#levelupBody").innerHTML = `<div class="burst" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 25.7}deg"></i>`).join("")}</div>
      <p class="eyebrow">Level up</p><div class="levelup__num">${Lv.n}</div><h2>${esc(Lv.title)}</h2>
      <p>${Lv.next ? `${Lv.need} XP to <b>${esc(Lv.next)}</b>` : "Top level reached. Respect."}</p><button class="btn btn--primary" data-close>Keep going</button>`;
    m.hidden = false;
    m.onclick = (ev) => { if (ev.target === m || ev.target.closest("[data-close]")) m.hidden = true; };
    setTimeout(() => (m.hidden = true), 6000);
  }

  function animateCount(el, end, fmt) {
    if (!el) return;
    if (RM) { el.textContent = fmt ? fmt(end) : end; return; }
    const t0 = performance.now(), dur = 700;
    (function step(t) { const k = Math.min(1, (t - t0) / dur); const v = end * (1 - Math.pow(1 - k, 3)); el.textContent = fmt ? fmt(v) : Math.round(v); if (k < 1) requestAnimationFrame(step); })(t0);
  }

  A.ui = { thumbDate, flagBadges, thumbBadges, metaDate, metaCore, cardMeta, metaText, ICON, toast, confirmBox, copy, avatar, photoOf, hasFace, artFor, speakerOf, thumbImg, whoLine, showLine, hl, card, shelf, skeletons, fmtViews, speakerCard, paintLevelChip, xpPop, levelUp, animateCount, stateBadge, confetti };
})(window.ASFE);
