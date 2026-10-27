/* AI Safety Full Episodes v2 · history: strict watch history, library state (queue, favourites, notes, follows), XP, levels, badges. */
(function (A) {
  "use strict";
  const { store, STATE, fold, dayKey, clamp } = A;

  const HKEY = "history:v2";
  const BUCKET = 10; // seconds per coverage slice
  function freshHistory() { return { v: 2, created: Date.now(), eps: {}, daily: {}, stats: { chapterJumps: 0, pipSec: 0, audioSec: 0, pipUses: 0, seeks: 0 } }; }

  const L = {};
  function loadState() {
    A.migration = A.migrate();
    let H = store.get(HKEY, null);
    if (!H || typeof H.eps !== "object") H = freshHistory();
    H.v = 2;
    H.daily = H.daily || {};
    H.stats = Object.assign({ chapterJumps: 0, pipSec: 0, audioSec: 0, pipUses: 0, seeks: 0 }, H.stats || {});
    L.H = H;
    L.NOTES = store.get("notes:v2", {}) || {};
    L.FAVS = new Set(store.get("favs:v2", []) || []);
    L.QUEUE = store.get("queue:v2", []) || [];
    L.SETTINGS = Object.assign({ autoplay: true, speed: 1, vol: 100, muted: false }, store.get("settings:v2", {}) || {});
    L.EARNED = store.get("badges:v2", {}) || {};
    L.FOLLOWS = new Set(store.get("follows:v2", []) || []);
    L.SAVED = store.get("savedFilters:v2", []) || [];
    L.PREFS = Object.assign({ layout: "grid", month: "all", name: "", sort: "newest" }, store.get("prefs:v2", {}) || {});
    L.XPSEEN = store.get("xpSeen:v2", 0) || 0;
  }
  function saveH() { store.set(HKEY, L.H); }
  function saveAll() {
    saveH();
    store.set("notes:v2", L.NOTES); store.set("favs:v2", Array.from(L.FAVS)); store.set("queue:v2", L.QUEUE);
    store.set("settings:v2", L.SETTINGS); store.set("badges:v2", L.EARNED); store.set("follows:v2", Array.from(L.FOLLOWS));
    store.set("savedFilters:v2", L.SAVED); store.set("prefs:v2", L.PREFS);
  }
  const savePrefs = () => store.set("prefs:v2", L.PREFS);

  /* coverage bitset (base64) */
  function covDecode(str, n) {
    const out = new Uint8Array(Math.ceil(n / 8));
    if (!str) return out;
    try { const bin = atob(str); for (let i = 0; i < bin.length && i < out.length; i++) out[i] = bin.charCodeAt(i); } catch (e) {}
    return out;
  }
  function covEncode(bytes) { let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
  function covCount(bytes, n) { let c = 0; for (let i = 0; i < n; i++) if (bytes[i >> 3] & (1 << (i & 7))) c++; return c; }

  function rec(id, create) {
    if (!L.H.eps[id] && create) L.H.eps[id] = { pos: 0, dur: 0, watched: 0, cov: "", covN: 0, pct: 0, done: false, doneAt: 0, first: 0, last: 0, sessions: [] };
    return L.H.eps[id] || null;
  }
  const pctOf = (id) => { const r = L.H.eps[id]; return r ? r.pct || 0 : 0; };
  function stateOf(id) { const r = L.H.eps[id]; if (!r || (r.watched < 20 && !r.done)) return "none"; return r.done ? "done" : "progress"; }
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
  function inProgress() {
    return STATE.all.filter((e) => stateOf(e.id) === "progress").sort((a, b) => (L.H.eps[b.id].last || 0) - (L.H.eps[a.id].last || 0));
  }
  function recentlyWatched() {
    return STATE.all.filter((e) => watchedOf(e.id) >= 60).sort((a, b) => (L.H.eps[b.id].last || 0) - (L.H.eps[a.id].last || 0));
  }

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
  function maxSession() { let m = 0; Object.values(L.H.eps).forEach((r) => (r.sessions || []).forEach((s) => (m = Math.max(m, s.w || 0)))); return m; }
  function nightOwl() { return Object.values(L.H.eps).some((r) => (r.sessions || []).some((s) => { const h = new Date(s.s).getHours(); return h < 4 && s.w >= 120; })) ? 1 : 0; }
  const mins = (s) => s / 60;
  const BADGES = [
    { id: "first", icon: "▶️", name: "First Frame", desc: "Watch one minute of any episode", prog: () => [Object.values(L.H.eps).some((r) => r.watched >= 60) ? 1 : 0, 1] },
    { id: "complete1", icon: "🏁", name: "Full Episode", desc: "Complete an episode (90% actually played)", prog: () => [Math.min(1, doneCount()), 1] },
    { id: "complete10", icon: "🏆", name: "Ten Complete", desc: "Complete 10 episodes", prog: () => [Math.min(10, doneCount()), 10] },
    { id: "complete50", icon: "👑", name: "Half Century", desc: "Complete 50 episodes", prog: () => [Math.min(50, doneCount()), 50] },
    { id: "hour1", icon: "⏱️", name: "One Hour In", desc: "Watch 1 hour in total", prog: () => [Math.min(60, mins(totalWatched())), 60] },
    { id: "hour5", icon: "🔥", name: "Five Hours", desc: "Watch 5 hours in total", prog: () => [Math.min(300, mins(totalWatched())), 300] },
    { id: "hour20", icon: "🛰️", name: "Deep Diver", desc: "Watch 20 hours in total", prog: () => [Math.min(1200, mins(totalWatched())), 1200] },
    { id: "hour100", icon: "🌌", name: "Centurion", desc: "Watch 100 hours in total", prog: () => [Math.min(6000, mins(totalWatched())), 6000] },
    { id: "monthly", icon: "🗓️", name: "Monthly Completionist", desc: "Complete 10 episodes from a single month", prog: () => [Math.min(10, bestMonthDone()), 10] },
    { id: "seasons", icon: "🍂", name: "Four Months", desc: "Watch 30+ minutes from each of July, August, September and October", prog: () => [monthsWithMins(30), 4] },
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
    { id: "deep", icon: "🤿", name: "Deep End", desc: "Complete a Deep-dive episode", prog: () => [STATE.all.some((e) => e.level === "Deep-dive" && stateOf(e.id) === "done") ? 1 : 0, 1] },
  ];
  function xp() {
    const m = Math.floor(totalWatched() / 60);
    const badges = BADGES.filter((b) => { const [c, t] = b.prog(); return c >= t; }).length;
    return m + doneCount() * 50 + noteCount() * 5 + badges * 30 + Math.min(200, L.H.stats.chapterJumps * 2) + L.FOLLOWS.size * 5;
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
    if (fresh.length) store.set("badges:v2", L.EARNED);
    const x = xp();
    const Lv = levelInfo(x);
    if (!silent && A.ui) {
      fresh.forEach((b, i) => setTimeout(() => A.ui.toast(`Badge unlocked: <b>${A.esc(b.name)}</b>`, { icon: b.icon, cls: "toast--badge", ms: 5000 }), i * 650));
      if (lastXP != null && x > lastXP) A.ui.xpPop(x - lastXP);
      if (lastLevel && Lv.n > lastLevel) A.ui.levelUp(Lv);
    }
    lastLevel = Lv.n; lastXP = x;
    if (A.ui) A.ui.paintLevelChip(Lv);
    return Lv;
  }

  /* ------------------------------------------------------------ library actions */
  function toggleFav(id) { L.FAVS.has(id) ? L.FAVS.delete(id) : L.FAVS.add(id); store.set("favs:v2", Array.from(L.FAVS)); checkAwards(); return L.FAVS.has(id); }
  function toggleQueue(id) { const i = L.QUEUE.indexOf(id); if (i >= 0) L.QUEUE.splice(i, 1); else L.QUEUE.push(id); store.set("queue:v2", L.QUEUE); checkAwards(); return i < 0; }
  function setQueue(ids) { L.QUEUE = ids.filter((id, i) => STATE.byId.has(id) && ids.indexOf(id) === i); store.set("queue:v2", L.QUEUE); }
  function toggleFollow(k) { L.FOLLOWS.has(k) ? L.FOLLOWS.delete(k) : L.FOLLOWS.add(k); store.set("follows:v2", Array.from(L.FOLLOWS)); checkAwards(); return L.FOLLOWS.has(k); }
  function addNote(id, t, text) {
    (L.NOTES[id] = L.NOTES[id] || []).push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: Math.floor(t || 0), text: String(text).slice(0, 2000), at: Date.now() });
    store.set("notes:v2", L.NOTES); checkAwards();
  }
  function delNote(id, nid) { L.NOTES[id] = (L.NOTES[id] || []).filter((n) => n.id !== nid); if (!L.NOTES[id].length) delete L.NOTES[id]; store.set("notes:v2", L.NOTES); }
  function bumpStat(k, v) { L.H.stats[k] = (L.H.stats[k] || 0) + (v == null ? 1 : v); }
  function clearOne(id) { delete L.H.eps[id]; saveH(); }
  function exportAll() { return { app: "ai-safety-full-episodes", schema: 2, exportedAt: new Date().toISOString(), history: L.H, notes: L.NOTES, favs: Array.from(L.FAVS), queue: L.QUEUE, badges: L.EARNED, follows: Array.from(L.FOLLOWS), savedFilters: L.SAVED, prefs: L.PREFS, settings: L.SETTINGS }; }
  function importAll(d) {
    if (!d || typeof d !== "object") throw new Error("Not a backup file");
    let h = d.history;
    if (!h || typeof h.eps !== "object") throw new Error("No history in file");
    h = Object.assign(freshHistory(), h, { v: 2 });
    L.H = h; L.NOTES = d.notes || {}; L.FAVS = new Set(d.favs || []); L.QUEUE = d.queue || []; L.EARNED = d.badges || {};
    L.FOLLOWS = new Set(d.follows || []); L.SAVED = d.savedFilters || []; L.PREFS = Object.assign(L.PREFS, d.prefs || {});
    saveAll();
  }
  function resetAll() { L.H = freshHistory(); L.NOTES = {}; L.FAVS = new Set(); L.QUEUE = []; L.EARNED = {}; L.FOLLOWS = new Set(); saveAll(); }

  A.hist = {
    L, BUCKET, loadState, saveH, saveAll, savePrefs, covDecode, covEncode, covCount, rec, pctOf, stateOf, watchedOf, totalWatched, doneCount, noteCount, streaks,
    watchedSecFor, heardSpeakers, inProgress, recentlyWatched, doneByDay, LEVELS, BADGES, xp, levelInfo, checkAwards, toggleFav, toggleQueue, setQueue, toggleFollow,
    addNote, delNote, bumpStat, clearOne, exportAll, importAll, resetAll, freshHistory,
  };
})(window.ASFE);
