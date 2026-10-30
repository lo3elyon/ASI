/* Overlays that sit on top of whatever page is open: the person drawer (?p=id) and the video theater (?v=id).
   The hash route never changes, the page underneath is never re-rendered, and the scroll position is restored exactly.
   Opening pushes a history entry, so Back and Esc close it. Deep links work because the state lives in the query string. */
import { $, $$, esc, researchers, videos, signatories, categories, photoManifest, orgIndex, orgChip, GROUPS, CATS, initials, ytThumb, mountFrame, fmtDur, fmtDate, ICON } from "../util.js";
import { logView } from "./history.js";
import { pauseScroll, resumeScroll, jumpTo } from "./motion.js";
import { ui } from "./sound.js";
import { shareBtn, copyBtn, quoteText, links, SHARE_ICON } from "./share.js";

const root = () => document.getElementById("ovRoot");
const S = { p: null, v: null, q: null, lockY: 0, locked: false, lastFocus: [] };

/* URL helpers: keep the hash, change only ?p and ?v */
function params() { return new URLSearchParams(location.search); }
function urlWith(mut) {
  const q = params(); mut(q);
  const s = q.toString();
  return location.pathname + (s ? "?" + s : "") + location.hash;
}
export function stripOverlayParams() {
  const q = params();
  if (!q.has("p") && !q.has("v")) return;
  history.replaceState(history.state, "", urlWith((x) => { x.delete("p"); x.delete("v"); }));
}

/* Scroll lock that never loses the reader's place */
function lock() {
  if (S.locked) return;
  S.locked = true;
  S.lockY = window.scrollY;
  pauseScroll();
  const sbw = window.innerWidth - document.documentElement.clientWidth;
  const b = document.body.style;
  b.position = "fixed"; b.top = `-${S.lockY}px`; b.left = "0"; b.right = "0"; b.width = "100%";
  if (sbw > 0) b.paddingRight = `${sbw}px`;
  document.documentElement.classList.add("ov-open");
}
function unlock() {
  if (!S.locked) return;
  S.locked = false;
  const b = document.body.style;
  b.position = ""; b.top = ""; b.left = ""; b.right = ""; b.width = ""; b.paddingRight = "";
  document.documentElement.classList.remove("ov-open");
  const html = document.documentElement, prev = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  jumpTo(S.lockY);
  html.style.scrollBehavior = prev;
  resumeScroll();
}
export const scrollLockY = () => (S.locked ? S.lockY : window.scrollY);

function ensureDom() {
  const r = root();
  if ($("#ovP", r)) return;
  r.innerHTML = `
  <div class="ov ov-p" id="ovP" aria-hidden="true"><div class="scrim" data-ovclose="p"></div><div class="pane" role="dialog" aria-modal="true" aria-labelledby="pfName" data-lenis-prevent></div></div>
  <div class="ov ov-v" id="ovV" aria-hidden="true"><div class="scrim" data-ovclose="v"></div><div class="shell" role="dialog" aria-modal="true" aria-labelledby="ovVT">
    <div class="bar"><b id="ovVT"></b><a class="btn sm ghost" id="ovVY" target="_blank" rel="noopener" style="color:#e6f0fa">YouTube ${ICON.ext}</a><button class="icon-btn" type="button" id="ovVSh" aria-label="Copy a link to this video" data-share-url="">${SHARE_ICON}</button><button class="icon-btn" type="button" id="ovVW" aria-label="Wide mode">${ICON.wide}</button><button class="icon-btn" type="button" data-ovclose="v" id="ovVX" aria-label="Close video">${ICON.close}</button></div>
    <div class="stage"><div class="screen" id="ovVS"></div><aside class="side" id="ovVSide" data-lenis-prevent></aside></div></div></div>`;
  r.addEventListener("click", (e) => {
    const c = e.target.closest("[data-ovclose]");
    if (c) { e.preventDefault(); close(c.dataset.ovclose); return; }
    if (e.target.closest("#ovVW")) $("#ovV").classList.toggle("wide");
  });
}

/* Public API */
export function openPerson(id, { push = true } = {}) { if (!id) return; go({ p: id }, push); }
export function openVideo(id, { push = true, queue = null } = {}) { if (!id) return; S.q = queue; go({ v: id }, push); }
export function close(kind) {
  const st = history.state || {};
  const has = kind === "v" ? S.v : S.p;
  if (!has) return;
  if (st.thrOv && st.thrOv[kind]) { history.back(); return; }
  history.replaceState({}, "", urlWith((q) => { q.delete(kind); if (kind === "p") q.delete("v"); }));
  sync();
}
export function closeAll() { const q = params(); if (q.has("p") || q.has("v")) { history.replaceState({}, "", urlWith((x) => { x.delete("p"); x.delete("v"); })); } sync(); }
export const isOpen = () => !!(S.p || S.v);

function go(set, push) {
  const url = urlWith((q) => { Object.entries(set).forEach(([k, v]) => q.set(k, v)); });
  const state = { thrOv: { p: !!(set.p || (history.state?.thrOv?.p && S.p)), v: !!set.v } };
  if (set.p && S.p) state.thrOv.p = true;
  if (push) history.pushState(state, "", url); else history.replaceState(history.state || {}, "", url);
  sync();
}

/* Render from the URL: called on boot, after routes and on popstate */
export async function sync() {
  ensureDom();
  const q = params();
  const p = q.get("p"), v = q.get("v");
  const wasOpen = isOpen();
  if (p !== S.p) { if (p) await renderPerson(p); else hide("p"); S.p = p; }
  if (v !== S.v) { if (v) await renderVideo(v); else hide("v"); S.v = v; }
  if (isOpen()) lock(); else if (wasOpen) unlock();
}

function show(kind) {
  const el = kind === "p" ? $("#ovP") : $("#ovV");
  if (!el.classList.contains("open")) { S.lastFocus.push(document.activeElement); ui("open"); }
  el.classList.add("open"); el.setAttribute("aria-hidden", "false");
  setTimeout(() => { const f = kind === "p" ? $(".close", el) : $("#ovVX"); if (f) f.focus({ preventScroll: true }); }, 30);
}
function hide(kind) {
  const el = kind === "p" ? $("#ovP") : $("#ovV");
  if (!el || !el.classList.contains("open")) return;
  ui("close");
  el.classList.remove("open"); el.setAttribute("aria-hidden", "true");
  if (kind === "v") { $("#ovVS").innerHTML = ""; S.q = null; }
  if (kind === "p" && S.title) { document.title = S.title; S.title = null; }
  const f = S.lastFocus.pop();
  if (f && f.focus && document.contains(f)) f.focus({ preventScroll: true });
}

/* Person drawer */
async function renderPerson(id) {
  const [ppl, vids, sig, cats, man] = await Promise.all([researchers(), videos(), signatories(), categories(), photoManifest(), orgIndex()]);
  const pane = $("#ovP .pane");
  const p = ppl.find((x) => x.id === id);
  if (!p) {
    const s = sig.list.find((x) => x.researcher_id === id) || sig.list.find((x) => x.slug === id);
    const ph = s && s.photo ? `<img src="${esc(s.photo)}" alt="Portrait of ${esc(s.name)}" width="420" height="525" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'pf-ini',textContent:'${esc(initials(s.name))}'}))">` : `<div class="pf-ini" aria-hidden="true">${esc(initials(s ? s.name : "?"))}</div>`;
    pane.innerHTML = s ? `<button class="icon-btn close" type="button" data-ovclose="p" aria-label="Close">${ICON.close}</button>
      <div class="pf-hero" style="--c:#10b981"><div class="pf-ph">${ph}</div><div style="min-width:0"><div class="pf-cats"><span class="tag" style="--c:#10b981">Pacing the Frontier signer</span></div><h2 id="pfName">${esc(s.name)}</h2><p class="muted" style="margin:0">${esc([s.title, s.employer].filter(Boolean).join(", "))}</p></div></div>
      <div class="pf-body">${s.comment ? `<div class="sigbox"><div class="eyebrow" style="color:var(--teal)">Why they signed</div><p style="margin:8px 0 0;font-family:var(--f-serif);font-style:italic;font-size:18px">&ldquo;${esc(s.comment)}&rdquo;</p></div>` : ""}${s.photo_credit ? `<p class="muted" style="font-size:12px">Photo: ${esc(s.photo_credit)}</p>` : ""}<p><a href="#/pacing?q=${encodeURIComponent(s.name)}">See every signer ${ICON.arrow}</a></p></div>`
      : `<button class="icon-btn close" type="button" data-ovclose="p" aria-label="Close">${ICON.close}</button><div class="pf-body" style="padding-top:60px"><h2 id="pfName">Profile not found</h2><p class="muted">This person is not in the dataset yet.</p></div>`;
    show("p"); return;
  }
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const G = GROUPS[p.group] || { label: p.group, c: "#22d3ee" };
  const c0 = (p.categories.map((c) => catById[c]).find(Boolean) || G).c;
  const vById = Object.fromEntries(vids.map((v) => [v.id, v]));
  const vs = [...new Set([...(p.video_ids || []), ...vids.filter((v) => v.people.includes(p.id)).map((v) => v.id)])].map((v) => vById[v]).filter(Boolean).slice(0, 12);
  const signer = sig.list.find((s) => s.researcher_id === p.id);
  const mf = man && man[p.id];
  const credit = (mf && (mf.credit || mf.source_url)) || p.photo_credit;
  const related = ppl.filter((x) => x.id !== p.id).map((x) => ({ x, s: x.categories.filter((c) => p.categories.includes(c)).length * 2 + (x.org && x.org === p.org ? 3 : 0) + (x.region && x.region === p.region ? 0.5 : 0) })).filter((r) => r.s > 1).sort((a, b) => b.s - a.s).slice(0, 8).map((r) => r.x);
  const careerRows = p.career.length ? p.career : [];
  const leftY = p.left_lab && p.left_lab.year;
  pane.style.setProperty("--c", c0);
  pane.innerHTML = `<button class="icon-btn close" type="button" data-ovclose="p" aria-label="Close profile">${ICON.close}</button>
  <div class="pf-hero" style="--c:${c0}">
    <div class="pf-ph">${p.photo ? `<img src="${esc(p.photo)}" alt="Portrait of ${esc(p.name)}" width="420" height="525" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'pf-ini',textContent:'${esc(initials(p.name))}'}))">` : `<div class="pf-ini" aria-hidden="true">${esc(initials(p.name))}</div>`}</div>
    <div style="min-width:0;position:relative">
      <div class="pf-cats">${p.categories.map((c) => catById[c]).filter(Boolean).map((c) => `<span class="tag" style="--c:${c.c}">${esc(c.label)}</span>`).join("") || `<span class="tag" style="--c:${G.c}">${esc(G.label)}</span>`}</div>
      <h2 id="pfName">${esc(p.name)}</h2>
      <p class="muted" style="margin:0">${esc([p.role, p.org].filter(Boolean).join(", "))}</p>
      ${p.org || p.former_orgs.length ? `<div class="orgrow">${p.org ? orgChip(p.org) : ""}${p.former_orgs.filter((o) => o && o !== p.org).map((o) => orgChip(o).replace('<span class="orgchip">', '<span class="orgchip" style="opacity:.8" title="Former">')).join("")}</div>` : ""}
      ${p.country || p.region ? `<p class="muted mono" style="margin:6px 0 0;font-size:12px;letter-spacing:.08em">${esc([p.country, p.region && p.region !== p.country && !(p.region === "UK" && /united kingdom|^uk$/i.test(p.country || "")) && !(p.region === "India" && /india/i.test(p.country || "")) && !(p.region === "China" && /china/i.test(p.country || "")) ? p.region : ""].filter(Boolean).join(" · ").toUpperCase())}</p>` : ""}
      <div class="r4-acts">${shareBtn(links.person(p.id), { label: "Share profile", aria: `Copy a link to ${p.name}'s profile`, title: p.name })}<a class="r4-share" href="#/compare?ids=${esc(p.id)}"><span>Compare with others</span></a></div>
    </div>
  </div>
  <div class="pf-body" style="--c:${c0}">
    ${p.warning ? `<div class="warnbox"><div class="eyebrow">Their warning, in one line</div><p>${esc(p.warning)}</p></div>` : ""}
    <div class="pf-kv">
      <div><small>p(doom)</small><b>${p.pdoom ? esc(p.pdoom) : "No number given"}</b>${p.pdoom_source ? `<br><a href="${esc(p.pdoom_source)}" target="_blank" rel="noopener" style="font-size:12.5px">source ${ICON.ext}</a>` : ""}</div>
      <div><small>Timeline</small><b>${p.agi_year ? esc(p.agi_year) : "No public year"}</b></div>
      ${p.citations ? `<div><small>Citations</small><b>${esc(p.citations)}</b>${p.scholar_url ? `<br><a href="${esc(p.scholar_url)}" target="_blank" rel="noopener" style="font-size:12.5px">Google Scholar ${ICON.ext}</a>` : ""}</div>` : ""}
      ${p.former_orgs.length ? `<div><small>Former orgs</small><b>${esc(p.former_orgs.join(", "))}</b></div>` : ""}
    </div>
    ${p.left_lab ? `<div class="leftbox"><div class="eyebrow">Left ${esc(p.left_lab.org || "a lab")}${leftY ? ` in ${esc(leftY)}` : ""}</div>${p.left_lab.reason ? `<p style="margin:8px 0 0">${esc(p.left_lab.reason)}</p>` : ""}${p.left_lab.source ? `<a href="${esc(p.left_lab.source)}" target="_blank" rel="noopener" style="font-size:12.5px">source ${ICON.ext}</a>` : ""}</div>` : ""}
    ${signer ? `<div class="sigbox"><div class="eyebrow" style="color:var(--teal)">Signed Pacing the Frontier</div>${signer.comment ? `<p style="margin:8px 0 0;font-family:var(--f-serif);font-style:italic;font-size:18px">&ldquo;${esc(signer.comment)}&rdquo;</p>` : `<p style="margin:8px 0 0">${esc([signer.title, signer.employer].filter(Boolean).join(", "))}</p>`}<a href="#/pacing" style="font-size:13px">See every signer ${ICON.arrow}</a></div>` : ""}
    ${p.bio ? `<h3>Who they are</h3><p style="color:var(--text-2)">${esc(p.bio)}</p>` : ""}
    ${p.background ? `<h3>Background</h3><p style="color:var(--text-2)">${esc(p.background)}</p>` : ""}
    ${careerRows.length ? `<h3>Career path</h3><div class="career"><ul>${careerRows.map((c) => `<li class="${p.left_lab && c.org && p.left_lab.org && c.org.includes(p.left_lab.org) && /left|depart/i.test(c.role || "") ? "left" : ""}"><span class="y">${esc(c.year || "")}</span><b>${esc(c.role || "")}</b><span>${esc(c.org || "")}</span></li>`).join("")}</ul></div>` : ""}
    ${p.focus.length ? `<h3>Focus</h3><div class="chips">${p.focus.map((f) => `<span class="chip">${esc(f)}</span>`).join("")}</div>` : ""}
    ${p.quotes.length ? `<h3>In their words</h3>${p.quotes.map((q) => `<figure class="quote"><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><cite>${esc(q.source || "")}${q.date ? `, ${esc(q.date)}` : ""} ${q.url ? `<a href="${esc(q.url)}" target="_blank" rel="noopener">source ${ICON.ext}</a>` : ""}</cite>${copyBtn(quoteText(q, p), { label: "Copy quote", aria: "Copy this quote with its source", msg: "Quote copied with its source.", cls: "sm" })}</figure>`).join("")}` : ""}
    ${p.key_papers.length ? `<h3>Key papers</h3><div class="reflist">${p.key_papers.map((k) => refRow(k, "paper")).join("")}</div>` : ""}
    ${p.books.length ? `<h3>Books</h3><div class="reflist">${p.books.map((k) => refRow(k, "book")).join("")}</div>` : ""}
    ${p.courses.length ? `<h3>Courses and talks</h3><div class="reflist">${p.courses.map((k) => refRow(k, "course")).join("")}</div>` : ""}
    ${vs.length ? `<h3>Watch them</h3><div class="vgrid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${vs.map((v) => `<a class="card hov vcard" href="#/watch/${v.id}" data-video="${v.id}" style="color:var(--text)"><div class="th"><img src="${ytThumb(v.id)}" alt="" loading="lazy" width="320" height="180" onload="this.classList.add('ld')">${v.duration ? `<span class="dur">${esc(fmtDur(v.duration))}</span>` : ""}<span class="play"><span>${ICON.play}</span></span></div><div class="meta"><b>${esc(v.title)}</b><span>${esc(v.channel)}</span></div></a>`).join("")}</div>` : ""}
    ${p.links.length || p.socials.length || p.homepage ? `<h3>Read more</h3><div class="chips">${p.homepage ? `<a class="chip" href="${esc(p.homepage)}" target="_blank" rel="noopener">Homepage ${ICON.ext}</a>` : ""}${[...p.links, ...p.socials].map((l) => `<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || "Link")} ${ICON.ext}</a>`).join("")}</div>` : ""}
    ${related.length ? `<h3>Related people</h3><div class="relgrid">${related.map((r) => `<a href="#/researchers/${r.id}" data-person="${r.id}">${r.photo ? `<span class="avatar"><img src="${esc(r.photo)}" alt="" loading="lazy" width="40" height="40" referrerpolicy="no-referrer"></span>` : `<span class="avatar">${esc(initials(r.name))}</span>`}<span>${esc(r.name)}</span></a>`).join("")}</div>` : ""}
    ${credit ? `<p class="muted" style="font-size:12px;margin-top:28px">Photo: ${esc(String(credit).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"))}${mf && mf.source_url ? ` <a href="${esc(mf.source_url)}" target="_blank" rel="noopener">source</a>` : ""}</p>` : ""}
  </div>`;
  if (!S.title) S.title = document.title;
  document.title = `${p.name}: ${p.role || "AI safety voice"} · Threshold`;
  show("p");
  pane.scrollTop = 0;
  logView("person", p.id, p.name, { sub: [p.role, p.org].filter(Boolean).join(", "), img: p.photo || "" });
}
function refRow(k, kind) {
  const inner = `<span class="yr">${esc(k.year || kind)}</span><span>${esc(k.title)}</span>${k.url ? ICON.ext : "<span></span>"}`;
  return k.url ? `<a href="${esc(k.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div>${inner}</div>`;
}

/* Video theater: poster first, YouTube loads only after a click */
async function renderVideo(id) {
  const [vids, ppl] = await Promise.all([videos(), researchers()]);
  const byId = Object.fromEntries(vids.map((v) => [v.id, v]));
  const pById = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const v = byId[id] || { id, title: "Video", channel: "", people: [], category: "explainer", level: "", summary: "" };
  $("#ovVT").textContent = v.title;
  $("#ovVY").href = `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`;
  $("#ovVSh").dataset.shareUrl = links.video(v.id); $("#ovVSh").dataset.shareTitle = v.title;
  $("#ovVS").innerHTML = `<div class="yt"><button class="yt-poster" type="button" data-theater-play="${esc(v.id)}" aria-label="Play ${esc(v.title)}"><img src="${ytThumb(v.id, "hqdefault")}" alt="" width="480" height="360"><span class="pb"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span><span class="cap">Click to play. YouTube loads only now, in privacy enhanced mode.</span></button></div>`;
  $("#ovVS [data-theater-play]").onclick = (e) => {
    mountFrame($("#ovVS .yt"), v.id, v.title);
    logView("video", v.id, v.title, { sub: v.channel, played: true });
  };
  const people = v.people.map((p) => pById[p]).filter(Boolean);
  const queue = S.q;
  const next = (queue && queue.includes(id) ? queue.slice(queue.indexOf(id) + 1) : vids.filter((x) => x.id !== id && (x.category === v.category || x.people.some((p) => v.people.includes(p)))).map((x) => x.id)).slice(0, 8).map((x) => byId[x]).filter(Boolean);
  const C = CATS[v.category] || { label: v.category, c: "#22d3ee" };
  $("#ovVSide").innerHTML = `<div class="row"><span class="tag" style="--c:${C.c}">${esc(C.label)}</span>${v.level ? `<span class="tag" style="--c:#8aa0b8">${esc(v.level)}</span>` : ""}${v.duration ? `<span class="count">${esc(fmtDur(v.duration))}</span>` : ""}</div>
    <div><b style="font-size:17px">${esc(v.title)}</b><p style="margin-top:6px">${esc(v.channel)}${v.date ? ` · ${esc(fmtDate(v.date))}` : ""}</p></div>${v.summary ? `<p>${esc(v.summary)}</p>` : ""}
    ${people.length ? `<div class="chips">${people.map((p) => `<a class="chip" href="#/researchers/${p.id}" data-person="${p.id}">${esc(p.name)}</a>`).join("")}</div>` : ""}
    ${next.length ? `<div class="eyebrow" style="margin-top:8px">${queue ? "Up next in this collection" : "Up next"}</div><div class="upnext">${next.map((n) => `<button type="button" data-next="${n.id}"><img src="${ytThumb(n.id, "mqdefault")}" alt="" loading="lazy" width="320" height="180"><span>${esc(n.title)}<br><span style="color:#8aa0b8">${esc(n.channel)}</span></span></button>`).join("")}</div>` : ""}`;
  $$("[data-next]", $("#ovVSide")).forEach((b) => (b.onclick = () => { const keep = S.q; history.replaceState(history.state, "", urlWith((q) => q.set("v", b.dataset.next))); S.q = keep; S.v = null; sync(); }));
  show("v");
  logView("video", v.id, v.title, { sub: v.channel });
}

/* Global wiring */
export function initOverlays() {
  ensureDom();
  window.addEventListener("popstate", () => sync());
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const pl = e.target.closest("[data-play]");
    if (pl) { e.preventDefault(); import("../util.js").then((u) => u.playPoster(pl, (vid) => logView("video", vid, pl.getAttribute("aria-label")?.replace(/^Play video: /, "") || "", { played: true }))); return; }
    const pe = e.target.closest("[data-person]");
    if (pe) { e.preventDefault(); openPerson(pe.dataset.person); return; }
    const vi = e.target.closest("[data-video]");
    if (vi) { e.preventDefault(); openVideo(vi.dataset.video, { queue: vi.dataset.queue ? vi.dataset.queue.split(",") : null }); return; }
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    const h = a.getAttribute("href");
    let m = h.match(/^#\/researchers\/([a-z0-9-]+)$/i);
    if (m) { e.preventDefault(); openPerson(m[1]); return; }
    m = h.match(/^#\/watch\/([A-Za-z0-9_-]{6,})$/);
    if (m && m[1] !== "c") { e.preventDefault(); openVideo(m[1]); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen() && !document.getElementById("palette").classList.contains("open")) { e.preventDefault(); close(S.v ? "v" : "p"); }
    if (e.key === "Tab" && isOpen()) {
      const box = S.v ? $("#ovV .shell") : $("#ovP .pane");
      const f = $$("a[href],button:not([disabled]),iframe,input", box).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { f[0].focus(); e.preventDefault(); }
    }
  });
}
