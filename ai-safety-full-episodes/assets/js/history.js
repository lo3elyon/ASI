/* AI Safety Full Episodes · history: strict watch history, library state (queue, favourites, notes, follows), XP, levels, badges. */
(function (A) {
  "use strict";
  const { store, STATE, fold, dayKey, clamp } = A;

  const HKEY = "history:v3";
  const BUCKET = 1; // seconds per coverage cell: a 1-second bitset (fix6); stores before fix6 used 10-second slices
  const OLD_BUCKET = 10;
  const STAT0 = { chapterJumps: 0, pipSec: 0, audioSec: 0, pipUses: 0, seeks: 0, fsSec: 0, zenSec: 0, manualMarks: 0, bookmarks: 0, shares: 0 };
  function freshHistory() { const t = Date.now(); return { v: 3, created: t, eps: {}, daily: {}, manualDaily: {}, stats: Object.assign({}, STAT0), fix4: t, fix5: t, fix6: t, xpCarry: 0 }; }

  const L = {};
  function loadState() {
    A.migration = A.migrate();
    let H = store.get(HKEY, null);
    if (!H || typeof H.eps !== "object") H = freshHistory();
    H.v = 3;
    H.daily = H.daily || {};
    H.manualDaily = H.manualDaily || {};
    H.stats = Object.assign({}, STAT0, H.stats || {});
    L.H = H;
    const unit0 = H.fix6 ? BUCKET : OLD_BUCKET;
    if (!H.fix4) { try { repairHistory(H, unit0); } catch (e) {} H.fix4 = Date.now(); store.set(HKEY, H); }
    if (!H.fix5) { try { H.fix5n = recoverCoverage(H, unit0).sessions; } catch (e) {} H.fix5 = Date.now(); store.set(HKEY, H); }
    L.NOTES = store.get("notes:v3", {}) || {};
    L.FAVS = new Set(store.get("favs:v3", []) || []);
    L.QUEUE = store.get("queue:v3", []) || [];
    L.SETTINGS = Object.assign({ autoplay: true, speed: 1, vol: 100, muted: false, dailyGoal: 30, autoSkipHearing: true, captions: false, nativeControls: false, accent: "amber", motion: "auto", celebrations: true }, store.get("settings:v3", {}) || {});
    L.PLAYLISTS = store.get("playlists:v3", []) || [];
    L.LATER = store.get("later:v3", []) || [];
    L.RATINGS = store.get("ratings:v3", {}) || {};
    L.UTAGS = store.get("utags:v3", {}) || {};
    L.EARNED = store.get("badges:v3", {}) || {};
    L.FOLLOWS = new Set(store.get("follows:v3", []) || []);
    L.SAVED = store.get("savedFilters:v3", []) || [];
    L.PREFS = Object.assign({ layout: "grid", month: "all", name: "", sort: "newest" }, store.get("prefs:v3", {}) || {});
    L.XPSEEN = store.get("xpSeen:v3", 0) || 0;
  }
  /* runs once the episode data is in (durations, speakers and months feed XP): the one-time exact-seconds migration */
  function afterData() {
    const H = L.H;
    if (H && !H.fix6) {
      // exact 1-second coverage: XP before/after so a level already reached is never taken away (the difference is kept as
      // a fixed carry; rewatching and the old 90 % rule stop adding from here on)
      let before = 0; try { before = xp(); } catch (e) {}
      try { H.fix6n = migrateExact(H); } catch (e) {}
      H.fix6 = Date.now(); H.xpCarry = 0;
      let after = 0; try { after = xp(); } catch (e) {}
      H.xpCarry = Math.max(0, Math.round(before - after));
      store.set(HKEY, H);
    }
  }
  function saveH() { store.set(HKEY, L.H); }
  function saveAll() {
    saveH();
    store.set("notes:v3", L.NOTES); store.set("favs:v3", Array.from(L.FAVS)); store.set("queue:v3", L.QUEUE);
    store.set("settings:v3", L.SETTINGS); store.set("badges:v3", L.EARNED); store.set("follows:v3", Array.from(L.FOLLOWS));
    store.set("savedFilters:v3", L.SAVED); store.set("prefs:v3", L.PREFS);
    saveLib();
  }
  function saveLib() { store.set("playlists:v3", L.PLAYLISTS); store.set("later:v3", L.LATER); store.set("ratings:v3", L.RATINGS); store.set("utags:v3", L.UTAGS); }
  const savePrefs = () => store.set("prefs:v3", L.PREFS);

  /* coverage bitset (base64) */
  function covDecode(str, n) {
    const out = new Uint8Array(Math.ceil(n / 8));
    if (!str) return out;
    try { const bin = atob(str); for (let i = 0; i < bin.length && i < out.length; i++) out[i] = bin.charCodeAt(i); } catch (e) {}
    return out;
  }
  function covEncode(bytes) { let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
  function covCount(bytes, n) { let c = 0; for (let i = 0; i < n; i++) if (bytes[i >> 3] & (1 << (i & 7))) c++; return c; }
  /* exact progress: one bit per second of the episode (cell i = media seconds [i, i+1)); 100 % / complete only when every
   * second is covered, except the final ≤ 1 s cell that YouTube may not report before ENDED */
  const nSec = (dur) => Math.max(1, Math.ceil(Number(dur) || 1));
  function covComplete(bytes, n) { for (let i = 0; i < n - 1; i++) if (!(bytes[i >> 3] & (1 << (i & 7)))) return false; return n > 1 || !!(bytes[0] & 1); }
  /* recompute covN / pct / full / done from the bitset; a played record is "done" only when complete, a manual full mark stays done */
  function settle(r) {
    if (!r) return r;
    const n = nSec(r.dur), b = covDecode(r.cov, n);
    r.covN = covCount(b, n);
    const full = r.covN > 0 && covComplete(b, n);
    if (r.manual && !r.manual.partial) { r.full = true; r.pct = 1; r.done = true; return r; }
    r.full = full; r.pct = full ? 1 : clamp(r.covN / n, 0, 1);
    if (full && !r.done) { r.done = true; r.doneAt = r.doneAt || r.last || Date.now(); }
    if (!full && r.done) { r.done = false; r.doneAt = 0; }
    return r;
  }
  /* unique seconds really played here (a manual mark's logged seconds are not "played") */
  function playedSec(r) { if (!r) return 0; if (r.manual && !r.manual.partial) return Math.max(0, (r.manual.prev && r.manual.prev.covN) || 0); return r.covN || 0; }
  /* "89.7%": exact share with one decimal, floored (never rounded up); "100%" only when complete */
  function pctText(r) {
    if (!r) return "0%";
    if (r.full || (r.manual && !r.manual.partial)) return "100%";
    const p = Math.floor(clamp((r.covN || 0) / nSec(r.dur), 0, 1) * 1000) / 10;
    if (p >= 100) return "99.9%";
    if (p === 0 && (r.covN || 0) > 0) return "<0.1%";
    return (r.covN || 0) ? p.toFixed(1) + "%" : "0%";
  }
  /* bar width in %: floored to 0.1 so a bar never looks fuller than the truth */
  function pctWidth(r) { if (!r) return 0; if (r.full || (r.manual && !r.manual.partial)) return 100; return Math.min(99.9, Math.floor(clamp((r.covN || 0) / nSec(r.dur), 0, 1) * 1000) / 10); }
  const mmss = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : String(m).padStart(2, "0")) + ":" + String(x).padStart(2, "0"); };
  const hhmmss = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h + ":" + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0"); };
  /* tooltip: "12:34 of 1:02:03 watched (unique) · 20.2%" (+ how it was marked) */
  function covTip(id) {
    const r = L.H.eps[id]; const e = STATE.byId && STATE.byId.get(id); const dur = (r && r.dur) || (e && e.dur) || 0;
    if (!r) return `00:00 of ${hhmmss(dur)} watched (unique)`;
    const man = r.manual && !r.manual.partial;
    return `${mmss(playedSec(r))} of ${hhmmss(dur)} watched (unique) · ${man ? "Marked watched" : r.full ? "Watched 100%" : pctText(r)}` + (r.lgN ? ` · ${r.lgN} earlier 10-s part${r.lgN === 1 ? "" : "s"} not verified to the second` : "");
  }
  /* "Watched 100%" (every second played) vs "Marked watched" (a manual mark) */
  function doneLabel(id) { const r = L.H.eps[id]; if (!r || !r.done) return ""; return r.manual ? "Marked watched" : "Watched 100%"; }
  /* 1-second migration (fix6) of the old 10-second slices. A second counts only when a stored session evidences it: a manual
   * session [a, b] (declared by the user), or a played session whose advance b−a fits steady playback at 1×–2× over its
   * credited seconds (± 10 % + 15 s), so no seek is hidden inside. A slice with no evidenced second is kept (r.lg, shown
   * in the tooltip) but never counted, so nothing is rounded up. watched becomes the unique seconds; the old total moves
   * to spent. done only at 100 % (or a manual full mark). */
  function evidence(r, withManual) {
    const iv = []; const dur = r.dur || 0;
    (Array.isArray(r.sessions) ? r.sessions : []).forEach((x) => {
      if (!x) return; const a = Math.max(0, Number(x.a) || 0), b = Math.min(dur || Infinity, Number(x.b) || 0);
      if (!(b > a)) return;
      if (x.src === "manual") { if (withManual) iv.push([a, b]); return; }
      const adv = b - a, w = Number(x.w) || 0;
      if (adv >= w * 0.9 - 15 && adv <= w * 2 * 1.1 + 15) iv.push([a, b]);
    });
    return iv;
  }
  function conv10(cov, dur, iv) {
    const n10 = Math.max(1, Math.ceil((dur || 1) / OLD_BUCKET)), n = nSec(dur), b10 = covDecode(cov, n10), out = new Uint8Array(Math.ceil(n / 8)), lg = new Uint8Array(Math.ceil(n10 / 8));
    let lgN = 0;
    for (let i = 0; i < n10; i++) {
      if (!(b10[i >> 3] & (1 << (i & 7)))) continue;
      let got = 0;
      for (let k = i * OLD_BUCKET; k < Math.min(n, (i + 1) * OLD_BUCKET); k++) { const mid = k + 0.5; if (iv.some(([a, b]) => mid >= a && mid <= b)) { out[k >> 3] |= 1 << (k & 7); got++; } }
      if (!got) { lg[i >> 3] |= 1 << (i & 7); lgN++; }
    }
    return { cov: covEncode(out), covN: covCount(out, n), lg: lgN ? covEncode(lg) : "", lgN };
  }
  function migrateExact(H) {
    const out = { eps: 0, secs: 0, legacy: 0, uncompleted: 0, kept: 0 };
    Object.keys(H.eps || {}).forEach((id) => {
      const r = H.eps[id]; if (!r || typeof r !== "object") return;
      const e = STATE.byId && STATE.byId.get(id); if (!r.dur && e && e.dur) r.dur = e.dur;
      const dur = r.dur || 0, wasDone = !!r.done, n = nSec(dur);
      const old = Math.max(0, Number(r.watched) || 0);
      if (r.manual && !r.manual.partial) {
        const pv = r.manual.prev || {}; const c = conv10(pv.cov, dur, evidence(r, false));
        r.manual.prev = Object.assign({}, pv, { cov: c.cov, covN: c.covN, watched: c.covN, pct: clamp(c.covN / n, 0, 1), done: false, doneAt: 0 });
        r.cov = covEncode(fullCov(n)); r.covN = n;
        r.spent = Math.max(0, old - (Number(r.manual.add) || 0));
        r.manual.add = Math.max(0, n - c.covN); r.watched = n;
        out.kept++;
      } else {
        const c = conv10(r.cov, dur, evidence(r, true));
        r.cov = c.cov; r.covN = c.covN; if (c.lgN) { r.lg = c.lg; r.lgN = c.lgN; out.legacy += c.lgN; }
        r.spent = old - (r.manual ? Number(r.manual.add) || 0 : 0);
        r.watched = c.covN + (r.manual ? 0 : 0);
        if (r.manual) { const pv = r.manual.prev || {}; const cp = conv10(pv.cov, dur, evidence(r, false)); r.manual.prev = Object.assign({}, pv, { cov: cp.cov, covN: cp.covN, watched: cp.covN, pct: clamp(cp.covN / n, 0, 1), done: false, doneAt: 0 }); r.manual.add = Math.max(0, c.covN - cp.covN); }
        out.secs += c.covN;
      }
      (r.sessions || []).forEach((x) => { if (x && x.src !== "manual" && x.n == null) x.legacy = 1; });
      settle(r);
      if (wasDone && !r.done) out.uncompleted++;
      out.eps++;
    });
    return out;
  }

  function rec(id, create) {
    if (!L.H.eps[id] && create) L.H.eps[id] = { pos: 0, dur: 0, watched: 0, spent: 0, cov: "", covN: 0, pct: 0, done: false, doneAt: 0, first: 0, last: 0, sessions: [] };
    return L.H.eps[id] || null;
  }
  const pctOf = (id) => { const r = L.H.eps[id]; return r ? r.pct || 0 : 0; };
  function stateOf(id) { const r = L.H.eps[id]; if (!r || ((r.watched || 0) < 20 && !r.done && !(r.lgN > 0))) return "none"; return r.done ? "done" : "progress"; }
  const watchedOf = (id) => ((L.H.eps[id] || {}).watched || 0);
  const totalWatched = () => Object.values(L.H.eps).reduce((a, r) => a + (r.watched || 0), 0);
  const doneCount = () => Object.values(L.H.eps).filter((r) => r.done).length;
  const noteCount = () => Object.values(L.NOTES).reduce((a, l) => a + (l || []).length, 0);
  function streaks() {
    const days = new Set(Object.keys(L.H.daily).filter((k) => L.H.daily[k] >= 60));
    let cur = 0; const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { cur++; d.setDate(d.getDate() - 1); }
    const sorted = Array.from(days).sort();
    let best = 0, run = 0, prev = null;
    sorted.forEach((k) => { const t = Date.parse(k + "T12:00:00"); run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = t; });
    return { cur, best, days: days.size };
  }
  function watchedSecFor(pred) { return STATE.all.filter(pred).reduce((a, e) => a + watchedOf(e.id), 0); }
  function heardSpeakers(minSec) {
    const set = new Set();
    STATE.all.forEach((e) => { if (watchedOf(e.id) >= (minSec || 300)) e.stars.forEach((p) => set.add(p.k)); });
    return set;
  }
  function doneByDay() {
    const m = {};
    Object.values(L.H.eps).forEach((r) => { if (r.done && r.doneAt) { const k = dayKey(r.doneAt); m[k] = (m[k] || 0) + 1; } });
    return m;
  }
  const uniq = (list) => { const seen = new Set(); return list.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))); };
  function inProgress() {
    return uniq(STATE.all).filter((e) => stateOf(e.id) === "progress").sort((a, b) => (L.H.eps[b.id].last || 0) - (L.H.eps[a.id].last || 0));
  }
  function recentlyWatched() {
    return uniq(STATE.all).filter((e) => watchedOf(e.id) >= 60).sort((a, b) => (L.H.eps[b.id].last || 0) - (L.H.eps[a.id].last || 0));
  }


  /* ------------------------------------------------------------ honest per-session numbers
   * "reached" = the furthest position actually PLAYED (from the 10-second slice coverage), never a seek target;
   * a session's a/b are the real playback positions at its start/end. Sessions recorded before this fix are
   * repaired once by repairHistory(): 0-second, negative and end-before-start sessions are fixed or merged, a lone
   * end slice left by scrubbing to the end is dropped, and "completed" is kept only at 90 %+ coverage or a manual mark. */
  function nBOf(r, unit) { return Math.max(1, Math.ceil(((r && r.dur) || 1) / (unit || BUCKET))); }
  /* memoised by coverage string: History asks for it once per session row */
  const lastMemo = new Map();
  function lastSlice(r) { const n = nBOf(r), key = n + ":" + (r.cov || ""); const hit = lastMemo.get(key); if (hit !== undefined) return hit; const b = covDecode(r.cov, n); let out = -1; for (let i = n - 1; i >= 0; i--) if (b[i >> 3] & (1 << (i & 7))) { out = i; break; } if (lastMemo.size > 2000) lastMemo.clear(); lastMemo.set(key, out); return out; }
  function furthestPlayed(r) {
    if (!r) return 0;
    if (r.manual && !r.manual.partial) return r.dur || 0;
    const i = lastSlice(r); if (i < 0) return 0;
    return Math.min(r.dur || Infinity, (i + 1) * BUCKET);
  }
  function sessReach(r, s) {
    if (!s) return 0;
    if (s.src === "manual") return Math.max(0, s.b || 0);
    const fp = furthestPlayed(r);
    const m = s.m != null ? s.m : Math.min(s.b || 0, (s.a || 0) + (s.w || 0) * 2 + BUCKET);
    return Math.max(0, Math.min(m, r && r.cov ? fp : Infinity, (r && r.dur) || Infinity));
  }
  function repairHistory(H, unit) {
    unit = unit || BUCKET;
    const out = { sessionsFixed: 0, merged: 0, dropped: 0, uncompleted: 0, slices: 0 };
    Object.keys(H.eps || {}).forEach((id) => {
      const r = H.eps[id]; if (!r || typeof r !== "object") return;
      const n = nBOf(r, unit), dur = r.dur || 0;
      // a lone slice at the very end with nothing before it = scrubbed to the end and the video ended
      if (!(r.manual && !r.manual.partial) && r.cov) {
        const b = covDecode(r.cov, n), on = (i) => i >= 0 && i < n && !!(b[i >> 3] & (1 << (i & 7)));
        for (let i = n - 1; i >= Math.max(0, n - 3); i--) if (on(i) && !on(i - 1) && !on(i + 1)) { b[i >> 3] &= ~(1 << (i & 7)); out.slices++; }
        r.cov = covEncode(b); r.covN = covCount(b, n); r.pct = clamp(r.covN / n, 0, 1);
      }
      let ss = (Array.isArray(r.sessions) ? r.sessions : []).filter((x) => x && typeof x === "object").map((x) => Object.assign({}, x));
      const before = ss.length;
      ss = ss.filter((x) => x.src === "manual" || (Number(x.w) || 0) >= 1);
      out.dropped += before - ss.length;
      ss.forEach((x) => {
        ["s", "e", "w", "a", "b"].forEach((k) => { x[k] = Math.max(0, Number(x[k]) || 0); });
        if (x.e < x.s) x.e = x.s;
        if (x.src !== "manual") {
          let fixed = false;
          if (dur && x.a > dur) { x.a = Math.floor(dur); fixed = true; }
          if (x.b < x.a || (dur && x.b > dur)) { x.b = Math.floor(Math.min(dur || Infinity, x.a + x.w)); fixed = true; }
          if (x.m == null) { x.m = Math.floor(Math.min(x.b, x.a + x.w * 2 + unit)); fixed = true; }
          if (fixed) out.sessionsFixed++;
        }
      });
      ss.sort((p, q) => p.s - q.s);
      const merged = [];
      ss.forEach((x) => {
        const p = merged[merged.length - 1];
        if (p && p.src !== "manual" && x.src !== "manual" && (x.s === p.s || x.s <= p.e + 60e3)) {
          if (x.s === p.s && x.e === p.e) p.w = Math.max(p.w, x.w); else p.w += x.w;
          p.e = Math.max(p.e, x.e); p.b = x.b; p.m = Math.max(p.m || 0, x.m || 0); out.merged++;
        } else merged.push(x);
      });
      r.sessions = merged.slice(-200);
      // completion is settled at 1-second precision (settle / migrateExact): only 100 % or a manual mark
      if (!(r.pos >= 0) || (dur && r.pos > dur)) r.pos = Math.min(Math.max(0, Number(r.pos) || 0), dur || 0);
    });
    return out;
  }
  /* One-time recovery (H.fix5) for sessions recorded while the watch clock lost track of YouTube's cached position
   * (Oct 28 – Nov 2 2026 builds): the session still holds where playback started (a), where it ended (b), the seconds
   * credited (w) and its wall-clock span (s→e), but the coverage slices and part of the seconds were dropped. A session
   * counts as one continuous stretch only when its advance b−a matches steady playback at a standard speed over its
   * wall-clock span or over its credited seconds; then its slices a…b are marked, "reached" is set to b, the missing
   * seconds (advance ÷ speed − w) are added back to it, the episode total and that day, and "completed" follows the
   * usual 90 % rule. It only ever adds: nothing is removed, manual marks are untouched, a session with a pause + seek
   * inside it does not match and is left alone. */
  const SPEEDS5 = [1, 1.25, 1.5, 1.75, 2];
  function recoverCoverage(H, unit) {
    unit = unit || OLD_BUCKET;
    const out = { eps: 0, sessions: 0, slices: 0, secs: 0, completed: 0 };
    Object.keys(H.eps || {}).forEach((id) => {
      const r = H.eps[id]; if (!r || typeof r !== "object" || !r.dur || (r.manual && !r.manual.partial)) return;
      const n = nBOf(r, unit), b = covDecode(r.cov, n); let touched = false, lastE = 0;
      (Array.isArray(r.sessions) ? r.sessions : []).forEach((x) => {
        if (!x || x.src === "manual") return;
        const a = Math.max(0, Number(x.a) || 0), e = Math.min(r.dur, Number(x.b) || 0), adv = e - a, w = Number(x.w) || 0;
        const span = Math.max(0, ((Number(x.e) || 0) - (Number(x.s) || 0)) / 1000);
        if (!(adv >= 20)) return;
        const fits = (base, lo, hi) => SPEEDS5.find((v) => base > 0 && adv >= base * v * lo - 15 && adv <= base * v * hi + 15);
        const v = fits(w, 0.92, 1.08) || fits(span, 0.9, 1.05);
        if (!v) return;
        let added = 0;
        for (let i = Math.floor(a / unit); i <= Math.floor(e / unit) && i < n; i++) if (!(b[i >> 3] & (1 << (i & 7)))) { b[i >> 3] |= 1 << (i & 7); added++; }
        const miss = Math.max(0, adv / v - w);
        if (miss >= 1) {
          x.w = w + miss; r.watched = (Number(r.watched) || 0) + miss; out.secs += miss;
          const dk = dayKey(Number(x.e) || Number(x.s) || Date.now()); if (H.daily) H.daily[dk] = (H.daily[dk] || 0) + miss;
        }
        if (added || miss >= 1) { out.sessions++; out.slices += added; touched = true; }
        x.m = Math.max(Number(x.m) || 0, Math.floor(e));
        lastE = Math.max(lastE, Number(x.e) || 0);
      });
      if (!touched) return;
      out.eps++;
      r.cov = covEncode(b); r.covN = covCount(b, n); r.pct = clamp(r.covN / n, 0, 1); void lastE;
      if (!r.done && r.covN >= n) { r.done = true; r.doneAt = lastE || Date.now(); out.completed++; } // every slice: no 90 % rule
    });
    return out;
  }
  /* one entry per episode, newest first: total watched, furthest played, coverage, status, last watched */
  function episodeSummary(id) {
    const r = L.H.eps[id]; if (!r) return null;
    const ss = r.sessions || [];
    return { id, watched: playedSec(r), spent: r.spent || 0, reach: furthestPlayed(r), pct: r.pct || 0, pctText: pctText(r), status: r.done ? (r.manual ? "marked" : "completed") : "progress", last: r.last || Math.max(0, ...ss.map((x) => x.e || 0)), sessions: ss.length };
  }

  const manualCount = () => Object.values(L.H.eps).filter((r) => r.manual && r.done).length;
  const goalSec = () => Math.max(5, Number(L.SETTINGS.dailyGoal) || 30) * 60;
  const goalDays = () => Object.values(L.H.daily).filter((v) => v >= goalSec()).length;
  const todaySec = () => L.H.daily[dayKey(Date.now())] || 0;

  /* ------------------------------------------------------------ "already watched on YouTube" marks
   * A manual mark writes a full-completion record (watched = duration, 100 %, completed) with source "manual".
   * It counts toward stats, XP, badges and the heatmap on the day it was marked (tracked separately in manualDaily
   * so the heatmap can label it). The record keeps a snapshot of what was there before, so "Mark unwatched" is exact. */
  function fullCov(nB, upTo) { const b = new Uint8Array(Math.ceil(nB / 8)); for (let i = 0; i < Math.min(nB, upTo == null ? nB : upTo); i++) b[i >> 3] |= 1 << (i & 7); return b; }
  function addDay(map, day, v) { map[day] = Math.max(0, (map[day] || 0) + v); if (map[day] < 0.5) delete map[day]; }
  function markWatched(id, o) {
    o = o || {};
    const e = STATE.byId.get(id); if (!e) return false;
    const r = rec(id, true);
    const upTo = o.upTo != null ? Math.max(0, Number(o.upTo) || 0) : null;
    if (upTo == null && r.done) return false;
    if (r.manual) unmarkWatched(id, { keepEmpty: true, silent: true });
    const dur = r.dur || e.dur || 0;
    const now = o.at || Date.now(), day = dayKey(now);
    const prev = { watched: r.watched, pct: r.pct, done: r.done, doneAt: r.doneAt, cov: r.cov, covN: r.covN, pos: r.pos, full: !!r.full };
    const nB = nSec(dur);
    const target = upTo == null ? dur : Math.min(dur || upTo, upTo);
    const old = covDecode(r.cov, nB), add0 = fullCov(nB, Math.ceil(target / BUCKET));
    for (let i = 0; i < old.length; i++) old[i] |= add0[i];
    const add = Math.max(0, target - (r.watched || 0));
    r.dur = dur; r.cov = covEncode(old); r.covN = covCount(old, nB); r.pct = upTo == null ? 1 : clamp(r.covN / nB, 0, 1);
    r.watched = (r.watched || 0) + add;
    if (upTo == null) { if (!r.done) { r.done = true; r.doneAt = now; } r.full = true; } // a partial mark completes only at 100 %
    r.pos = upTo == null ? dur : target;
    r.last = now; if (!r.first) r.first = now;
    r.sessions = r.sessions || [];
    r.sessions.push({ s: now, e: now, w: add, a: 0, b: Math.floor(target), src: "manual" });
    r.manual = { at: now, add, day, prev, partial: upTo != null, src: o.src || "manual" };
    if (upTo != null) settle(r);
    addDay(L.H.daily, day, add); addDay(L.H.manualDaily, day, add);
    L.H.stats.manualMarks = (L.H.stats.manualMarks || 0) + 1;
    if (!o.batch) { saveH(); checkAwards(); }
    if (A.player && A.player.reloadCov) A.player.reloadCov(id);
    return true;
  }
  function unmarkWatched(id, o) {
    o = o || {};
    const r = L.H.eps[id]; if (!r) return false;
    if (r.manual) {
      const m = r.manual;
      Object.assign(r, m.prev);
      r.sessions = (r.sessions || []).filter((x) => !(x.src === "manual" && x.s === m.at));
      addDay(L.H.daily, m.day, -m.add); addDay(L.H.manualDaily, m.day, -m.add);
      delete r.manual;
    } else if (r.done) {
      // completed by real playback: keep the real seconds (they happened) but reset completion and coverage
      r.done = false; r.doneAt = 0; r.cov = ""; r.covN = 0; r.pct = 0; r.full = false; r.pos = 0; r.reset = Date.now();
    } else return false;
    if (!o.keepEmpty && (r.watched || 0) < 1 && !(r.sessions || []).length) delete L.H.eps[id];
    if (!o.batch) { saveH(); checkAwards(true); }
    if (A.player && A.player.reloadCov) A.player.reloadCov(id);
    return true;
  }
  function bulkMark(ids) { const done = ids.filter((id) => markWatched(id, { batch: true })); saveH(); checkAwards(); return done; }
  function bulkUnmark(ids) { const done = ids.filter((id) => unmarkWatched(id, { batch: true })); saveH(); checkAwards(true); return done; }
  const isManual = (id) => !!(L.H.eps[id] && L.H.eps[id].manual);

  /* ------------------------------------------------------------ playlists, watch later, ratings, personal tags */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function createPlaylist(name, ids) { const p = { id: uid(), name: String(name || "New playlist").slice(0, 80), ids: (ids || []).filter((x) => STATE.byId.has(x)), created: Date.now() }; L.PLAYLISTS.push(p); saveLib(); checkAwards(); return p; }
  const playlist = (pid) => L.PLAYLISTS.find((p) => p.id === pid) || null;
  function renamePlaylist(pid, name) { const p = playlist(pid); if (p) { p.name = String(name).slice(0, 80) || p.name; saveLib(); } }
  function deletePlaylist(pid) { L.PLAYLISTS = L.PLAYLISTS.filter((p) => p.id !== pid); saveLib(); }
  function addToPlaylist(pid, id) { const p = playlist(pid); if (!p || p.ids.includes(id)) return false; p.ids.push(id); saveLib(); checkAwards(); return true; }
  function removeFromPlaylist(pid, id) { const p = playlist(pid); if (p) { p.ids = p.ids.filter((x) => x !== id); saveLib(); } }
  function movePlaylist(pid, from, to) { const p = playlist(pid); if (!p || to < 0 || to >= p.ids.length) return; const [x] = p.ids.splice(from, 1); p.ids.splice(to, 0, x); saveLib(); }
  function toggleLater(id) { const i = L.LATER.indexOf(id); if (i >= 0) L.LATER.splice(i, 1); else L.LATER.unshift(id); saveLib(); return i < 0; }
  function rate(id, n) { n = Math.round(Number(n) || 0); if (n < 1 || n > 5 || L.RATINGS[id] === n) delete L.RATINGS[id]; else L.RATINGS[id] = n; saveLib(); checkAwards(); return L.RATINGS[id] || 0; }
  function setTags(id, tags) { const t = Array.from(new Set((tags || []).map((x) => String(x).trim().slice(0, 32)).filter(Boolean))).slice(0, 12); if (t.length) L.UTAGS[id] = t; else delete L.UTAGS[id]; saveLib(); }
  function queueNext(id) { const q = L.QUEUE.filter((x) => x !== id); q.unshift(id); setQueue(q); }

  /* ------------------------------------------------------------ levels */
  const LEVELS = [
    [0, "Novice"], [60, "Curious Listener"], [180, "Safety Apprentice"], [400, "Alignment Scholar"], [700, "Eval Analyst"], [1100, "Interpretability Initiate"],
    [1600, "Frontier Analyst"], [2300, "Control Researcher"], [3200, "Governance Strategist"], [4300, "Red-Team Lead"], [5700, "Policy Architect"], [7500, "Superalignment Sage"],
  ];
  const godfathers = ["Geoffrey Hinton", "Yoshua Bengio", "Stuart Russell"];
  const monthsWithMins = (min) => A.MONTH_LIST.slice(1).filter((m) => watchedSecFor((e) => e.month === m.id) >= min * 60).length;
  const bestMonthDone = () => Math.max(0, ...A.MONTH_LIST.slice(1).map((m) => STATE.all.filter((e) => e.month === m.id && stateOf(e.id) === "done").length));
  function orgGroupsWatched() { const s = new Set(); STATE.all.forEach((e) => { if (watchedOf(e.id) >= 600) e.groups.forEach((g) => s.add(g)); }); s.delete("hosts"); return s.size; }
  function orgsWatched() { const s = new Set(); STATE.all.forEach((e) => { if (watchedOf(e.id) >= 300) e.orgs.forEach((o) => s.add(o)); }); return s.size; }
  const sessUnique = (s) => (s.n != null ? s.n : s.w || 0); // new unique seconds (older sessions: credited seconds)
  function maxSession() { let m = 0; Object.values(L.H.eps).forEach((r) => (r.sessions || []).forEach((s) => (m = Math.max(m, sessUnique(s))))); return m; }
  function nightOwl() { return Object.values(L.H.eps).some((r) => (r.sessions || []).some((s) => { const h = new Date(s.s).getHours(); return h < 4 && sessUnique(s) >= 120; })) ? 1 : 0; }
  const mins = (s) => s / 60;
  const BADGES = [
    { id: "first", icon: "▶️", name: "First Frame", desc: "Watch one minute of any episode", prog: () => [Object.values(L.H.eps).some((r) => r.watched >= 60) ? 1 : 0, 1] },
    { id: "complete1", icon: "🏁", name: "Full Episode", desc: "Complete an episode (every second played, or marked as watched)", prog: () => [Math.min(1, doneCount()), 1] },
    { id: "complete10", icon: "🏆", name: "Ten Complete", desc: "Complete 10 episodes", prog: () => [Math.min(10, doneCount()), 10] },
    { id: "complete50", icon: "👑", name: "Half Century", desc: "Complete 50 episodes", prog: () => [Math.min(50, doneCount()), 50] },
    { id: "hour1", icon: "⏱️", name: "One Hour In", desc: "Watch 1 hour in total", prog: () => [Math.min(60, mins(totalWatched())), 60] },
    { id: "hour5", icon: "🔥", name: "Five Hours", desc: "Watch 5 hours in total", prog: () => [Math.min(300, mins(totalWatched())), 300] },
    { id: "hour20", icon: "🛰️", name: "Deep Diver", desc: "Watch 20 hours in total", prog: () => [Math.min(1200, mins(totalWatched())), 1200] },
    { id: "hour100", icon: "🌌", name: "Centurion", desc: "Watch 100 hours in total", prog: () => [Math.min(6000, mins(totalWatched())), 6000] },
    { id: "monthly", icon: "🗓️", name: "Monthly Completionist", desc: "Complete 10 episodes from a single month", prog: () => [Math.min(10, bestMonthDone()), 10] },
    { id: "seasons", icon: "🍂", name: "Four Months", desc: "Watch 30+ minutes from each of four different months", prog: () => [monthsWithMins(30), 4] },
    { id: "collector", icon: "🗣️", name: "Speaker Collector", desc: "Hear 20 different researchers (5+ minutes each)", prog: () => [Math.min(20, heardSpeakers(300).size), 20] },
    { id: "voices10", icon: "🎙️", name: "Many Voices", desc: "Hear 10 different researchers (5+ minutes each)", prog: () => [Math.min(10, heardSpeakers(300).size), 10] },
    { id: "orgs", icon: "🧭", name: "Org Explorer", desc: "Watch 10+ minutes from 6 different speaker groups", prog: () => [Math.min(6, orgGroupsWatched()), 6] },
    { id: "orgs12", icon: "🗺️", name: "Org Cartographer", desc: "Hear speakers from 12 different organisations", prog: () => [Math.min(12, orgsWatched()), 12] },
    { id: "formats", icon: "🧩", name: "Every Format", desc: "Watch 10+ minutes of a podcast, debate, panel, talk and hearing", prog: () => [A.FORMATS.filter((f) => watchedSecFor((e) => e.fmt === f.id) >= 600).length, A.FORMATS.length] },
    { id: "godfathers", icon: "🎓", name: "The Godfathers", desc: "10+ minutes each of Hinton, Bengio and Russell", prog: () => [godfathers.filter((g) => watchedSecFor((e) => e.names.includes(g)) >= 600).length, 3] },
    { id: "streak3", icon: "📅", name: "Three in a Row", desc: "Watch on 3 days in a row", prog: () => [Math.min(3, streaks().best), 3] },
    { id: "streak7", icon: "⚡", name: "Seven-Day Streak", desc: "Watch on 7 days in a row", prog: () => [Math.min(7, streaks().best), 7] },
    { id: "night", icon: "🌙", name: "Night Owl", desc: "Watch 2+ minutes between 00:00 and 04:00", prog: () => [nightOwl(), 1] },
    { id: "marathon", icon: "🏃", name: "Marathon", desc: "Watch 2 hours in a single session", prog: () => [Math.min(120, mins(maxSession())), 120] },
    { id: "binge", icon: "🍿", name: "Binge", desc: "Complete 3 episodes in one day", prog: () => [Math.min(3, Math.max(0, ...Object.values(doneByDay()))), 3] },
    { id: "jumper", icon: "🦘", name: "Chapter Jumper", desc: "Jump to 25 chapters or claims", prog: () => [Math.min(25, L.H.stats.chapterJumps), 25] },
    { id: "notes5", icon: "📝", name: "Note Taker", desc: "Write 5 timestamped notes", prog: () => [Math.min(5, noteCount()), 5] },
    { id: "notes25", icon: "🗂️", name: "Archivist", desc: "Write 25 timestamped notes", prog: () => [Math.min(25, noteCount()), 25] },
    { id: "follow5", icon: "⭐", name: "Following Along", desc: "Follow 5 researchers", prog: () => [Math.min(5, L.FOLLOWS.size), 5] },
    { id: "curator", icon: "📚", name: "Curator", desc: "Queue 5 episodes or favourite 5", prog: () => [Math.min(5, Math.max(L.QUEUE.length, L.FAVS.size)), 5] },
    { id: "pip", icon: "🪟", name: "Always on Top", desc: "Keep listening for 10 minutes in the pop-out player", prog: () => [Math.min(10, mins(L.H.stats.pipSec)), 10] },
    { id: "audio", icon: "🎧", name: "Ears Only", desc: "Listen for 30 minutes in audio mode", prog: () => [Math.min(30, mins(L.H.stats.audioSec)), 30] },
    { id: "catchup", icon: "✔️", name: "Catching Up", desc: "Mark 10 episodes you already saw on YouTube as watched", prog: () => [Math.min(10, manualCount()), 10] },
    { id: "critic", icon: "⭐", name: "Critic", desc: "Rate 10 episodes", prog: () => [Math.min(10, Object.keys(L.RATINGS).length), 10] },
    { id: "playlister", icon: "🎚️", name: "Playlist Maker", desc: "Build a playlist with 5 episodes", prog: () => [Math.min(5, Math.max(0, ...L.PLAYLISTS.map((p) => p.ids.length))), 5] },
    { id: "cinema", icon: "🎬", name: "Cinema Mode", desc: "Watch 30 minutes in fullscreen", prog: () => [Math.min(30, mins(L.H.stats.fsSec)), 30] },
    { id: "zen", icon: "🧘", name: "Deep Focus", desc: "Watch 30 minutes in Focus mode", prog: () => [Math.min(30, mins(L.H.stats.zenSec)), 30] },
    { id: "goal3", icon: "🎯", name: "Goal Getter", desc: "Hit your daily goal on 3 days", prog: () => [Math.min(3, goalDays()), 3] },
    { id: "deep", icon: "🤿", name: "Deep End", desc: "Complete a Deep-dive episode", prog: () => [STATE.all.some((e) => e.level === "Deep-dive" && stateOf(e.id) === "done") ? 1 : 0, 1] },
  ];
  function xp() {
    const m = Math.floor(totalWatched() / 60);
    const badges = BADGES.filter((b) => { const [c, t] = b.prog(); return c >= t; }).length;
    return m + doneCount() * 50 + noteCount() * 5 + badges * 30 + Math.min(200, L.H.stats.chapterJumps * 2) + L.FOLLOWS.size * 5 + Math.max(0, Number(L.H.xpCarry) || 0);
  }
  function levelInfo(x) {
    let i = 0;
    for (let k = 0; k < LEVELS.length; k++) if (x >= LEVELS[k][0]) i = k;
    const cur = LEVELS[i], nxt = LEVELS[i + 1];
    const frac = nxt ? (x - cur[0]) / (nxt[0] - cur[0]) : 1;
    return { n: i + 1, title: cur[1], next: nxt ? nxt[1] : null, need: nxt ? nxt[0] - x : 0, frac: clamp(frac, 0, 1), xp: x, max: LEVELS.length };
  }
  let lastLevel = null, lastXP = null;
  function checkAwards(silent) {
    const fresh = [];
    BADGES.forEach((b) => { const [c, t] = b.prog(); if (c >= t && !L.EARNED[b.id]) { L.EARNED[b.id] = Date.now(); fresh.push(b); } });
    if (fresh.length) store.set("badges:v3", L.EARNED);
    const x = xp();
    const Lv = levelInfo(x);
    if (!silent && A.ui) {
      fresh.forEach((b, i) => setTimeout(() => A.ui.toast(`Badge unlocked: <b>${A.esc(b.name)}</b>`, { icon: b.icon, cls: "toast--badge", ms: 5000 }), i * 650));
      if (lastXP != null && x > lastXP) A.ui.xpPop(x - lastXP);
      if (lastLevel && Lv.n > lastLevel) A.ui.levelUp(Lv);
    }
    lastLevel = Lv.n; lastXP = x;
    if (A.ui) A.ui.paintLevelChip(Lv);
    if (A.feat && A.feat.paintGoal) A.feat.paintGoal();
    return Lv;
  }

  /* ------------------------------------------------------------ library actions */
  function toggleFav(id) { L.FAVS.has(id) ? L.FAVS.delete(id) : L.FAVS.add(id); store.set("favs:v3", Array.from(L.FAVS)); checkAwards(); return L.FAVS.has(id); }
  function toggleQueue(id) { const i = L.QUEUE.indexOf(id); if (i >= 0) L.QUEUE.splice(i, 1); else L.QUEUE.push(id); store.set("queue:v3", L.QUEUE); checkAwards(); return i < 0; }
  function setQueue(ids) { L.QUEUE = ids.filter((id, i) => STATE.byId.has(id) && ids.indexOf(id) === i); store.set("queue:v3", L.QUEUE); }
  function toggleFollow(k) { L.FOLLOWS.has(k) ? L.FOLLOWS.delete(k) : L.FOLLOWS.add(k); store.set("follows:v3", Array.from(L.FOLLOWS)); checkAwards(); return L.FOLLOWS.has(k); }
  function addNote(id, t, text) {
    (L.NOTES[id] = L.NOTES[id] || []).push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: Math.floor(t || 0), text: String(text).slice(0, 2000), at: Date.now() });
    store.set("notes:v3", L.NOTES); checkAwards();
  }
  function delNote(id, nid) { L.NOTES[id] = (L.NOTES[id] || []).filter((n) => n.id !== nid); if (!L.NOTES[id].length) delete L.NOTES[id]; store.set("notes:v3", L.NOTES); }
  function bumpStat(k, v) { L.H.stats[k] = (L.H.stats[k] || 0) + (v == null ? 1 : v); }
  function clearOne(id) { delete L.H.eps[id]; saveH(); }
  function exportAll() { return { app: "ai-safety-full-episodes", schema: 3, exportedAt: new Date().toISOString(), history: L.H, notes: L.NOTES, favs: Array.from(L.FAVS), queue: L.QUEUE, badges: L.EARNED, follows: Array.from(L.FOLLOWS), savedFilters: L.SAVED, prefs: L.PREFS, settings: L.SETTINGS, playlists: L.PLAYLISTS, later: L.LATER, ratings: L.RATINGS, tags: L.UTAGS }; }
  /* imported files are untrusted: keep only known keys, valid YouTube ids, finite numbers and clipped strings */
  const IDRX = /^[\w-]{11}$/;
  const num = (v, d) => { v = Number(v); return Number.isFinite(v) && v >= 0 ? v : d || 0; };
  const str = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").slice(0, n || 200);
  const isObj = (o) => o && typeof o === "object" && !Array.isArray(o);
  function cleanRec(r) {
    if (!isObj(r)) return null;
    const out = { pos: num(r.pos), dur: num(r.dur), watched: Math.min(num(r.watched), 86400 * 3), cov: /^[A-Za-z0-9+/=]{0,40000}$/.test(r.cov || "") ? r.cov || "" : "", spent: Math.min(num(r.spent), 86400 * 30), ...(/^[A-Za-z0-9+/=]{1,4000}$/.test(r.lg || "") ? { lg: r.lg, lgN: num(r.lgN) } : {}), covN: num(r.covN), pct: Math.min(1, num(r.pct)), done: !!r.done, doneAt: num(r.doneAt), first: num(r.first), last: num(r.last),
      sessions: (Array.isArray(r.sessions) ? r.sessions : []).slice(-200).filter(isObj).map((x) => ({ s: num(x.s), e: num(x.e), w: num(x.w), a: num(x.a), b: num(x.b), ...(x.m != null ? { m: num(x.m) } : {}), ...(x.n != null ? { n: num(x.n) } : {}), ...(x.rw ? { rw: 1 } : {}), ...(x.legacy ? { legacy: 1 } : {}), ...(x.src === "manual" ? { src: "manual" } : {}) })) };
    if (isObj(r.manual)) out.manual = { at: num(r.manual.at), add: num(r.manual.add), day: /^\d{4}-\d{2}-\d{2}$/.test(r.manual.day) ? r.manual.day : dayKey(Date.now()), partial: !!r.manual.partial, src: "manual", prev: isObj(r.manual.prev) ? { watched: num(r.manual.prev.watched), pct: Math.min(1, num(r.manual.prev.pct)), done: !!r.manual.prev.done, doneAt: num(r.manual.prev.doneAt), cov: /^[A-Za-z0-9+/=]{0,40000}$/.test(r.manual.prev.cov || "") ? r.manual.prev.cov || "" : "", covN: num(r.manual.prev.covN), pos: num(r.manual.prev.pos) } : { watched: 0, pct: 0, done: false, doneAt: 0, cov: "", covN: 0, pos: 0 } };
    return out;
  }
  const cleanDays = (d) => { const o = {}; if (isObj(d)) Object.keys(d).forEach((k) => { if (/^\d{4}-\d{2}-\d{2}$/.test(k)) o[k] = Math.min(num(d[k]), 86400); }); return o; };
  const cleanIds = (a) => (Array.isArray(a) ? a : []).filter((x) => typeof x === "string" && IDRX.test(x)).slice(0, 2000);
  function sanitizeBackup(d) {
    if (!isObj(d)) throw new Error("Not a backup file");
    const hh = d.history;
    if (!isObj(hh) || !isObj(hh.eps)) throw new Error("No history in file");
    const H = freshHistory();
    Object.keys(hh.eps).forEach((id) => { if (IDRX.test(id)) { const r = cleanRec(hh.eps[id]); if (r) H.eps[id] = r; } });
    if (hh.fix6) { repairHistory(H, BUCKET); Object.values(H.eps).forEach(settle); H.xpCarry = Math.min(num(hh.xpCarry), 1e6); }
    else { repairHistory(H, OLD_BUCKET); recoverCoverage(H, OLD_BUCKET); migrateExact(H); } // an older backup: 10-s slices → exact seconds
    H.fix4 = H.fix5 = H.fix6 = Date.now();
    H.created = num(hh.created, Date.now()) || Date.now(); H.daily = cleanDays(hh.daily); H.manualDaily = cleanDays(hh.manualDaily);
    if (isObj(hh.stats)) Object.keys(STAT0).forEach((k) => (H.stats[k] = num(hh.stats[k])));
    const notes = {};
    if (isObj(d.notes)) Object.keys(d.notes).forEach((id) => { if (IDRX.test(id) && Array.isArray(d.notes[id])) notes[id] = d.notes[id].filter(isObj).slice(0, 500).map((n) => ({ id: str(n.id, 24).replace(/[^\w]/g, "") || uid(), t: Math.floor(num(n.t)), text: str(n.text, 2000), at: num(n.at, Date.now()) })); });
    const ratings = {}; if (isObj(d.ratings)) Object.keys(d.ratings).forEach((id) => { const n = Math.round(num(d.ratings[id])); if (IDRX.test(id) && n >= 1 && n <= 5) ratings[id] = n; });
    const tags = {}; if (isObj(d.tags)) Object.keys(d.tags).forEach((id) => { if (IDRX.test(id) && Array.isArray(d.tags[id])) tags[id] = d.tags[id].slice(0, 12).map((t) => str(t, 32)).filter(Boolean); });
    const badges = {}; if (isObj(d.badges)) Object.keys(d.badges).forEach((k) => { if (/^[a-z0-9]{2,20}$/.test(k)) badges[k] = num(d.badges[k]); });
    const playlists = (Array.isArray(d.playlists) ? d.playlists : []).filter(isObj).slice(0, 100).map((p) => ({ id: str(p.id, 24).replace(/[^\w]/g, "") || uid(), name: str(p.name, 80) || "Playlist", ids: cleanIds(p.ids), created: num(p.created, Date.now()) }));
    const follows = (Array.isArray(d.follows) ? d.follows : []).filter((x) => typeof x === "string").map((x) => str(x, 80)).slice(0, 500);
    const prefs = {}; if (isObj(d.prefs)) { if (typeof d.prefs.name === "string") prefs.name = str(d.prefs.name, 40); ["layout", "month", "sort"].forEach((k) => { if (typeof d.prefs[k] === "string" && /^[\w-]{1,20}$/.test(d.prefs[k])) prefs[k] = d.prefs[k]; }); }
    return { H, notes, favs: cleanIds(d.favs), queue: cleanIds(d.queue), badges, follows, playlists, later: cleanIds(d.later), ratings, tags, prefs };
  }
  function importAll(d) {
    const c = sanitizeBackup(d);
    L.H = c.H; L.NOTES = c.notes; L.FAVS = new Set(c.favs); L.QUEUE = c.queue; L.EARNED = c.badges; L.FOLLOWS = new Set(c.follows);
    L.PLAYLISTS = c.playlists; L.LATER = c.later; L.RATINGS = c.ratings; L.UTAGS = c.tags; L.PREFS = Object.assign(L.PREFS, c.prefs);
    saveAll();
    return c;
  }
  /* CSV: one row per session. Import accepts any CSV with an "id" (or YouTube url) column plus optional "percent"/"completed"/"position" columns. */
  function csvCell(v) { v = String(v == null ? "" : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCSV(rows) {
    const head = ["id", "title", "speakers", "source", "session_start", "session_end", "seconds_watched", "from_sec", "to_sec", "percent_covered", "completed", "url"];
    return [head.join(",")].concat(rows.map((x) => [x.e.id, x.e.title, x.e.stars.map((p) => p.name).join("; "), x.s.src === "manual" ? "manual" : "played", new Date(x.s.s).toISOString(), new Date(x.s.e).toISOString(), Math.round(x.s.w), x.s.a, x.s.b, pctText(x.r).replace(/[<%]/g, ""), x.r.done ? "true" : "false", x.e.url].map(csvCell).join(","))).join("\n");
  }
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    text = String(text).slice(0, 2e6);
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim()));
  }
  function importCSV(text) {
    const rows = parseCSV(text); if (rows.length < 2) throw new Error("No rows in CSV");
    const hd = rows[0].map((x) => x.trim().toLowerCase());
    const ci = (names) => hd.findIndex((x) => names.includes(x));
    const iId = ci(["id", "video_id", "videoid", "youtube_id"]), iUrl = ci(["url", "link"]), iPct = ci(["percent_covered", "percent", "pct"]), iDone = ci(["completed", "done", "watched"]), iPos = ci(["to_sec", "position", "pos", "watched_up_to"]);
    if (iId < 0 && iUrl < 0) throw new Error("CSV needs an id or url column");
    const best = new Map();
    rows.slice(1).forEach((r) => {
      let id = iId >= 0 ? (r[iId] || "").trim() : "";
      if (!IDRX.test(id) && iUrl >= 0) id = ((r[iUrl] || "").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1] || "";
      if (!IDRX.test(id) || !STATE.byId.has(id)) return;
      const done = iDone >= 0 ? /^(true|yes|1|y|x|✓)$/i.test((r[iDone] || "").trim()) : iPct < 0 && iPos < 0;
      const pct = iPct >= 0 ? num(parseFloat(r[iPct])) : 0;
      const pos = iPos >= 0 ? num(parseFloat(r[iPos])) : 0;
      const prev = best.get(id) || { done: false, pct: 0, pos: 0 };
      best.set(id, { done: prev.done || done || pct >= 100, pct: Math.max(prev.pct, pct), pos: Math.max(prev.pos, pos) });
    });
    let full = 0, part = 0;
    best.forEach((v, id) => { if (v.done) { if (markWatched(id, { batch: true })) full++; } else if (v.pos > 0 || v.pct > 0) { const e = STATE.byId.get(id); const up = v.pos || (e.dur * v.pct) / 100; if (up > 0 && markWatched(id, { batch: true, upTo: up })) part++; } });
    saveH(); checkAwards();
    return { full, part, rows: rows.length - 1 };
  }
  function resetAll() { L.H = freshHistory(); L.NOTES = {}; L.FAVS = new Set(); L.QUEUE = []; L.EARNED = {}; L.FOLLOWS = new Set(); L.PLAYLISTS = []; L.LATER = []; L.RATINGS = {}; L.UTAGS = {}; saveAll(); }

  A.hist = {
    L, afterData, BUCKET, OLD_BUCKET, nSec, covComplete, settle, playedSec, pctText, pctWidth, covTip, doneLabel, migrateExact, conv10, evidence, mmss, hhmmss, loadState, saveH, saveAll, savePrefs, covDecode, covEncode, covCount, rec, pctOf, stateOf, watchedOf, totalWatched, doneCount, noteCount, streaks,
    watchedSecFor, heardSpeakers, inProgress, recentlyWatched, doneByDay, LEVELS, BADGES, xp, levelInfo, checkAwards, toggleFav, toggleQueue, setQueue, toggleFollow,
    addNote, delNote, bumpStat, clearOne, exportAll, importAll, resetAll, freshHistory, saveLib, sanitizeBackup, exportCSV, importCSV, parseCSV,
    markWatched, unmarkWatched, furthestPlayed, sessReach, repairHistory, recoverCoverage, episodeSummary, bulkMark, bulkUnmark, isManual, manualCount, goalSec, goalDays, todaySec,
    createPlaylist, playlist, renamePlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, movePlaylist, toggleLater, rate, setTags, queueNext,
  };
})(window.ASFE);
