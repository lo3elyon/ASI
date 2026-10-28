/* AI Safety Full Episodes · Binge mode: in Theater, one episode after another. The line-up comes from your queue, then Today's
 * picks, then the current Browse filter (when one is set), then Up next. A slim "Up next in 5 s" bar (play now / cancel), a queue
 * rail inside the theater, shuffle, repeat (off / one / all) and Shift+N / Shift+P for next / previous. Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const { $, esc, STATE } = A;
  const h = () => A.hist, L = () => A.hist.L, P = () => A.P;
  const KEY = "binge:v1";
  const B = Object.assign({ on: false, shuffle: false, repeat: "off", seed: 1 }, A.store.get(KEY, {}) || {});
  B.played = []; // ids played in this sitting (for Shift+P)
  B.skip = new Set(); // removed from the line-up for this sitting
  const save = () => A.store.set(KEY, { on: B.on, shuffle: B.shuffle, repeat: B.repeat, seed: B.seed });
  const isOn = () => !!B.on;

  function rng(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function pickIds() { try { const d = A.picks && A.picks.today && A.picks.today(); return d ? d.items.filter((it) => it.st !== "discarded" && it.st !== "binned").map((it) => it.id) : []; } catch (e) { return []; } }
  function filterIds() { try { if (!A.recs.activeCount() && !A.recs.F.q) return []; return A.recs.results().slice(0, 40).map((x) => x.e.id); } catch (e) { return []; } }
  /* the line-up after the current episode: each source in order, no repeats, finished episodes left out (except queued ones) */
  function lineup(cur, n) {
    const curId = cur ? cur.id : null, seen = new Set([curId]), out = [];
    const add = (id, src, keepDone) => { if (!id || seen.has(id) || B.skip.has(id) || !STATE.byId.has(id)) return; if (!keepDone && h().stateOf(id) === "done") return; seen.add(id); out.push({ id, src }); };
    (L().QUEUE || []).forEach((id) => add(id, "Queue", true));
    pickIds().forEach((id) => add(id, "Today's picks"));
    filterIds().forEach((id) => add(id, "Your filter"));
    if (cur) A.recs.upNext(cur, 20).forEach((x) => add(x.e.id, "Up next"));
    let list = out;
    if (B.shuffle) { const r = rng(B.seed + (curId ? curId.charCodeAt(0) : 0)); list = out.slice(); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } }
    return list.slice(0, n || 12);
  }
  function nextId(cur) {
    if (B.repeat === "one" && cur) return cur.id;
    const l = lineup(cur, 1);
    if (l.length) return l[0].id;
    if (B.repeat === "all" && B.played.length) return B.played.find((id) => id !== (cur && cur.id)) || B.played[0];
    return null;
  }
  function go(id, how) {
    if (!id) { A.ui.toast("The binge line-up is empty. Queue something or turn on Repeat all.", { icon: "🍿" }); return false; }
    hideCd();
    const cur = P().cur; if (cur && how !== "prev" && B.played[B.played.length - 1] !== cur.id) B.played.push(cur.id);
    A.player.play(id, { keepMini: P().mode !== "theater", mini: P().mode !== "theater" });
    return true;
  }
  function next() { return go(nextId(P().cur), "next"); }
  function prev() {
    const cur = P().cur;
    while (B.played.length && cur && B.played[B.played.length - 1] === cur.id) B.played.pop();
    const id = B.played.pop();
    if (!id) { A.ui.toast("Nothing earlier in this binge", { ms: 1400 }); return false; }
    return go(id, "prev");
  }
  /* called by the player when an episode ends: in Theater with Binge on it takes over from the 10 s autoplay countdown */
  function onEnded() {
    if (!B.on || P().mode !== "theater" || !P().cur) return false;
    const id = nextId(P().cur); if (!id) { A.ui.toast("Binge finished: nothing left in the line-up", { icon: "🏁" }); return true; }
    if (document.hidden) { go(id); return true; }
    showCd(id, 5);
    return true;
  }
  let cdT = null;
  function showCd(id, secs) {
    const e = STATE.byId.get(id); if (!e) return;
    let el = $("#bingeCd");
    const host = $("#dockVideo") || document.body;
    if (!el) { el = document.createElement("div"); el.id = "bingeCd"; el.className = "bcd"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); host.appendChild(el); }
    let left = secs;
    const paint = () => { el.innerHTML = `<span class="bcd__ring" style="--p:${((secs - left) / secs * 100).toFixed(0)}"><b>${left}</b></span><span class="bcd__tx"><small>Up next in ${left}s</small><b>${esc(e.title)}</b></span><button type="button" class="btn btn--primary btn--sm" data-bcd="go">Play now</button><button type="button" class="btn btn--ghost btn--sm" data-bcd="cancel">Cancel</button>`; };
    paint(); el.hidden = false; el.dataset.id = id;
    clearInterval(cdT);
    cdT = setInterval(() => { left--; if (left <= 0) { go(id); return; } paint(); }, 1000);
  }
  function hideCd() { clearInterval(cdT); cdT = null; const el = $("#bingeCd"); if (el) el.hidden = true; }
  document.addEventListener("click", (ev) => {
    const c = ev.target.closest && ev.target.closest("[data-bcd]");
    if (c) { ev.stopPropagation(); const el = $("#bingeCd"); if (c.dataset.bcd === "go" && el) go(el.dataset.id); else { hideCd(); A.ui.toast("Binge paused for this one", { ms: 1400 }); } return; }
    const b = ev.target.closest && ev.target.closest("[data-binge]");
    if (!b) return;
    ev.preventDefault();
    const k = b.dataset.binge;
    if (k === "toggle") { B.on = !B.on; save(); A.ui.toast(B.on ? "Binge on: episodes play one after another in Theater" : "Binge off", { icon: "🍿", ms: 1800 }); }
    if (k === "shuffle") { B.shuffle = !B.shuffle; B.seed = (Date.now() % 100000) + 1; save(); }
    if (k === "repeat") { B.repeat = { off: "all", all: "one", one: "off" }[B.repeat] || "off"; save(); }
    if (k === "next") next();
    if (k === "prev") prev();
    if (k === "play") go(b.dataset.id);
    if (k === "drop") { B.skip.add(b.dataset.id); }
    paintRail();
  });
  /* the rail inside the theater, under the video */
  function paintRail() {
    const th = $("#theater"); if (!th) return;
    let r = $("#bingeRail");
    if (!r) { r = document.createElement("section"); r.id = "bingeRail"; r.className = "brail"; r.setAttribute("aria-label", "Binge line-up"); const info = $("#thInfo"); if (info && info.parentNode) info.parentNode.insertBefore(r, info); else return; }
    const cur = P().cur, list = cur ? lineup(cur, 10) : [];
    const rep = { off: "Repeat off", all: "Repeat all", one: "Repeat one" }[B.repeat];
    r.innerHTML = `<div class="brail__hd"><button type="button" class="chip ${B.on ? "is-on" : ""}" data-binge="toggle" aria-pressed="${B.on}">🍿 Binge ${B.on ? "on" : "off"}</button>
      <button type="button" class="iconbtn iconbtn--sm" data-binge="prev" aria-label="Previous episode (Shift+P in Binge)" title="Previous (Shift+P)"><svg viewBox="0 0 24 24"><path d="M6 5v14M18 6l-9 6 9 6z"/></svg></button>
      <button type="button" class="iconbtn iconbtn--sm" data-binge="next" aria-label="Next episode (Shift+N)" title="Next (Shift+N)"><svg viewBox="0 0 24 24"><path d="M18 5v14M6 6l9 6-9 6z"/></svg></button>
      <button type="button" class="chip ${B.shuffle ? "is-on" : ""}" data-binge="shuffle" aria-pressed="${B.shuffle}">Shuffle</button>
      <button type="button" class="chip ${B.repeat !== "off" ? "is-on" : ""}" data-binge="repeat" aria-label="${rep} (click to change)">${rep}</button>
      <span class="muted brail__src">${list.length ? `${list.length} lined up from your queue, Today's picks${A.recs.activeCount() ? ", your filter" : ""} and Up next` : "Nothing lined up"}</span></div>
      ${list.length ? `<ol class="brail__row">${list.map((x, i) => { const e = STATE.byId.get(x.id); return `<li class="brail__it"><button type="button" class="brail__play" data-binge="play" data-id="${x.id}" title="${esc(e.title)}">${A.ui.thumbImg(e)}<span class="brail__n">${i + 1}</span><span class="brail__tx"><b>${esc(e.title)}</b><small>${esc(x.src)} · ${esc(e.durStr)}</small></span></button><button type="button" class="iconbtn iconbtn--sm brail__x" data-binge="drop" data-id="${x.id}" aria-label="Skip ${esc(e.title)} in this binge" title="Skip in this binge">✕</button></li>`; }).join("")}</ol>` : ""}`;
  }
  document.addEventListener("asfe:play", () => setTimeout(paintRail, 0));
  A.binge = { isOn, on: isOn, lineup, nextId, next, prev, onEnded, paintRail, showCd, hideCd, state: () => B, set: (o) => { Object.assign(B, o || {}); save(); paintRail(); } };
})(window.ASFE);
