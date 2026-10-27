/* AI Safety Full Episodes v2 · recommendations + fuzzy search + filters. */
(function (A) {
  "use strict";
  const { STATE, fold, LENGTHS } = A;
  const h = () => A.hist;

  /* ---------------------------------------------------------------- similarity */
  function similar(a, b) {
    if (a.id === b.id) return { s: -1, why: "" };
    let s = 0; const why = [];
    const shared = a.stars.filter((p) => b.stars.some((q) => q.k === p.k));
    if (shared.length) { s += 6 * shared.length; why.push(`Also with ${shared[0].name}`); }
    const og = a.orgs.filter((o) => b.orgs.includes(o));
    if (og.length) { s += 2.5 * og.length; if (!why.length) why.push(`More from ${og[0]}`); }
    const tg = a.tags.filter((t) => b.tags.includes(t));
    if (tg.length) { s += 1.2 * tg.length; if (!why.length) why.push(`Also about ${tg[0]}`); }
    let kw = 0; a.kw.forEach((w) => { if (b.kw.has(w)) kw++; });
    s += Math.min(6, kw * 0.35);
    if (a.fmt === b.fmt) s += 0.5;
    if (a.show && a.show === b.show) { s += 1.5; if (!why.length) why.push(`Same show: ${a.show.slice(0, 40)}`); }
    if (!why.length) why.push(kw > 3 ? "Similar topics" : "You might like this");
    return { s, why: why[0] };
  }
  function suggestions(a, n, opt) {
    opt = opt || {};
    return STATE.all.map((b) => ({ e: b, ...similar(a, b) }))
      .filter((x) => x.s > 0 && (!opt.unwatched || h().stateOf(x.e.id) !== "done"))
      .sort((x, y) => y.s - x.s || (y.e.date || "").localeCompare(x.e.date || "")).slice(0, n || 8);
  }

  /* ---------------------------------------------------------------- personal score */
  function profile() {
    const sp = new Map(), org = new Map(), tag = new Map(), kw = new Map();
    let levelDone = { Intro: 0, Intermediate: 0, "Deep-dive": 0 };
    STATE.all.forEach((e) => {
      const w = h().watchedOf(e.id);
      if (w < 60) return;
      const wt = Math.min(1, w / Math.max(600, e.dur * 0.5));
      e.stars.forEach((p) => sp.set(p.k, (sp.get(p.k) || 0) + wt));
      e.orgs.forEach((o) => org.set(o, (org.get(o) || 0) + wt));
      e.tags.forEach((t) => tag.set(t, (tag.get(t) || 0) + wt));
      e.kw.forEach((k) => kw.set(k, (kw.get(k) || 0) + wt * 0.15));
      if (h().stateOf(e.id) === "done") levelDone[e.level]++;
    });
    const done = h().doneCount();
    const target = done < 3 ? "Intro" : done < 10 ? "Intermediate" : "Deep-dive";
    return { sp, org, tag, kw, target, levelDone };
  }
  function score(e, P) {
    const L = h().L;
    let s = 0; const why = [];
    const st = h().stateOf(e.id);
    const fol = e.stars.filter((p) => L.FOLLOWS.has(p.k));
    if (fol.length) { s += 8 * fol.length; why.push(`You follow ${fol[0].name}`); }
    let spS = 0, spBest = null;
    e.stars.forEach((p) => { const v = P.sp.get(p.k) || 0; if (v > spS) { spS = v; spBest = p.name; } });
    if (spS) { s += 3 * Math.min(3, spS); if (!why.length) why.push(`More ${spBest}`); }
    let oS = 0, oBest = null; e.orgs.forEach((o) => { const v = P.org.get(o) || 0; if (v > oS) { oS = v; oBest = o; } });
    if (oS) { s += 1.5 * Math.min(3, oS); if (!why.length) why.push(`More from ${oBest}`); }
    let tS = 0, tBest = null; e.tags.forEach((t) => { const v = P.tag.get(t) || 0; tS += v; if (!tBest || v > (P.tag.get(tBest) || 0)) tBest = t; });
    if (tS) { s += Math.min(5, tS * 0.6); if (!why.length && tBest) why.push(`Because you like ${tBest}`); }
    let kS = 0; e.kw.forEach((k) => (kS += P.kw.get(k) || 0)); s += Math.min(3, kS * 0.2);
    if (e.level === P.target) { s += 2; if (!why.length) why.push(`Right for your level (${e.level})`); }
    if (st === "none") s += 2.5; else if (st === "progress") s += 1; else s -= 12;
    const ageDays = (Date.parse("2026-10-28") - Date.parse(e.date || "2026-07-01")) / 864e5;
    s += Math.max(0, 1.5 - ageDays / 60);
    if (e.views) s += Math.min(1.2, Math.log10(e.views) / 5);
    if (!why.length) why.push(st === "none" ? "Unwatched" : "Pick up again");
    return { s, why: why[0] };
  }
  function forYou(n, pool) {
    const P = profile();
    return (pool || STATE.all).map((e) => ({ e, ...score(e, P) })).filter((x) => h().stateOf(x.e.id) !== "done").sort((a, b) => b.s - a.s).slice(0, n || 12);
  }
  function becauseRows(maxRows) {
    const seeds = h().recentlyWatched().slice(0, 6);
    const rows = [], used = new Set();
    for (const s of seeds) {
      if (rows.length >= (maxRows || 2)) break;
      const list = suggestions(s, 14, { unwatched: true }).filter((x) => !used.has(x.e.id)).slice(0, 10);
      if (list.length < 3) continue;
      list.forEach((x) => used.add(x.e.id));
      rows.push({ seed: s, list });
    }
    return rows;
  }
  function fromFollowed(pool) {
    const F = h().L.FOLLOWS;
    if (!F.size) return [];
    return (pool || STATE.all).filter((e) => e.stars.some((p) => F.has(p.k)) && h().stateOf(e.id) !== "done").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }
  function upNext(cur, n) {
    const L = h().L;
    const out = [];
    L.QUEUE.forEach((id) => { const e = STATE.byId.get(id); if (e && (!cur || e.id !== cur.id)) out.push({ e, why: "From your queue", q: true }); });
    if (cur) {
      const P = profile();
      const sim = STATE.all.filter((e) => e.id !== cur.id && h().stateOf(e.id) !== "done" && !L.QUEUE.includes(e.id))
        .map((e) => { const a = similar(cur, e), b = score(e, P); return { e, s: a.s * 1.4 + b.s, why: a.s > 4 ? a.why : b.why }; })
        .sort((a, b) => b.s - a.s);
      sim.slice(0, (n || 8) + 2).forEach((x) => out.push(x));
    }
    return out.slice(0, n || 8);
  }

  /* ---------------------------------------------------------------- fuzzy search */
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const v = new Array(b.length + 1); for (let j = 0; j <= b.length; j++) v[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let prev = v[0]; v[0] = i; let rowMin = v[0];
      for (let j = 1; j <= b.length; j++) { const tmp = v[j]; v[j] = Math.min(v[j] + 1, v[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; rowMin = Math.min(rowMin, v[j]); }
      if (rowMin > max) return max + 1;
    }
    return v[b.length];
  }
  const W = { title: 10, names: 9, show: 4, tags: 5, chapters: 3, claims: 2, summary: 1.5 };
  function searchScore(e, q) {
    const qf = fold(q).trim();
    if (!qf) return 1;
    let s = 0;
    Object.keys(W).forEach((k) => { if (e.hay[k].includes(qf)) s += W[k] * 2; });
    const terms = qf.split(/\s+/).filter(Boolean);
    let matchedAll = true;
    terms.forEach((t) => {
      let best = 0;
      Object.keys(W).forEach((k) => { if (e.hay[k].includes(t)) best = Math.max(best, W[k]); });
      if (!best && t.length >= 4) {
        const max = t.length >= 7 ? 2 : 1;
        if (e.words.some((w) => Math.abs(w.length - t.length) <= max && lev(t, w, max) <= max)) best = 1.2;
        else if (e.words.some((w) => w.startsWith(t.slice(0, Math.max(4, t.length - 2))))) best = 0.8;
      }
      if (!best) matchedAll = false;
      s += best;
    });
    return matchedAll ? s : 0;
  }

  /* ---------------------------------------------------------------- filters */
  function emptyFilter() { return { q: "", month: new Set(), fmt: new Set(), len: new Set(), level: new Set(), org: new Set(), group: new Set(), speaker: new Set(), st: new Set(), followed: false, day: null, tag: null }; }
  const F = emptyFilter();
  function filterToJSON(f) { const o = {}; Object.keys(f).forEach((k) => { o[k] = f[k] instanceof Set ? Array.from(f[k]) : f[k]; }); return o; }
  function filterFromJSON(o) { const f = emptyFilter(); Object.keys(f).forEach((k) => { if (o[k] == null) return; f[k] = f[k] instanceof Set ? new Set(o[k]) : o[k]; }); return f; }
  function setFilter(o) { const nf = filterFromJSON(filterToJSON(o)); Object.keys(F).forEach((k) => (F[k] = nf[k])); }
  function activeCount(f) { f = f || F; return ["month", "fmt", "len", "level", "org", "group", "speaker", "st"].reduce((a, k) => a + f[k].size, 0) + (f.followed ? 1 : 0) + (f.day ? 1 : 0) + (f.tag ? 1 : 0); }

  function matches(e, f, skip) {
    const L = h().L;
    if (skip !== "month" && f.month.size && !f.month.has(e.month)) return false;
    if (skip !== "fmt" && f.fmt.size && !f.fmt.has(e.fmt)) return false;
    if (skip !== "len" && f.len.size && !LENGTHS.some((l) => f.len.has(l.id) && l.test(e.dur))) return false;
    if (skip !== "level" && f.level.size && !f.level.has(e.level)) return false;
    if (skip !== "org" && f.org.size && !e.orgs.some((o) => f.org.has(o)) && !e.orgsMentioned.some((o) => f.org.has(o))) return false;
    if (skip !== "group" && f.group.size && !e.groups.some((g) => f.group.has(g))) return false;
    if (skip !== "speaker" && f.speaker.size && !e.people.some((p) => f.speaker.has(p.k))) return false;
    if (skip !== "st" && f.st.size) {
      const st = h().stateOf(e.id);
      const ok = f.st.has(st) || (f.st.has("fav") && L.FAVS.has(e.id)) || (f.st.has("notes") && (L.NOTES[e.id] || []).length) || (f.st.has("queued") && L.QUEUE.includes(e.id));
      if (!ok) return false;
    }
    if (f.followed && !e.stars.some((p) => L.FOLLOWS.has(p.k))) return false;
    if (f.day && e.date !== f.day) return false;
    if (f.tag && !e.tags.includes(f.tag) && !e.peopleMentioned.includes(f.tag) && !e.orgsMentioned.includes(f.tag)) return false;
    return true;
  }
  const SORTS = [
    { id: "best", label: "Best match" }, { id: "newest", label: "Newest" }, { id: "oldest", label: "Oldest" }, { id: "longest", label: "Longest" },
    { id: "shortest", label: "Shortest" }, { id: "views", label: "Most viewed" }, { id: "unwatched", label: "Unwatched first" }, { id: "foryou", label: "For you" },
  ];
  function results(f, sort) {
    f = f || F;
    let list = STATE.all.filter((e) => matches(e, f)).map((e) => ({ e, m: searchScore(e, f.q) })).filter((x) => x.m > 0);
    const byDate = (a, b) => (b.e.date || "").localeCompare(a.e.date || "");
    sort = sort || (f.q ? "best" : "newest");
    const P = sort === "foryou" ? profile() : null;
    const cmp = {
      best: (a, b) => b.m - a.m || byDate(a, b), newest: byDate, oldest: (a, b) => -byDate(a, b), longest: (a, b) => b.e.dur - a.e.dur, shortest: (a, b) => a.e.dur - b.e.dur,
      views: (a, b) => (b.e.views || -1) - (a.e.views || -1) || byDate(a, b),
      unwatched: (a, b) => (h().stateOf(a.e.id) === "done") - (h().stateOf(b.e.id) === "done") || (h().stateOf(a.e.id) !== "none") - (h().stateOf(b.e.id) !== "none") || byDate(a, b),
      foryou: (a, b) => score(b.e, P).s - score(a.e, P).s,
    }[sort] || byDate;
    return list.sort(cmp).map((x) => x.e);
  }
  function facetCount(f, key, test) { return STATE.all.filter((e) => matches(e, f, key) && test(e)).length; }

  A.recs = { similar, suggestions, profile, score, forYou, becauseRows, fromFollowed, upNext, searchScore, lev, F, emptyFilter, filterToJSON, filterFromJSON, setFilter, activeCount, matches, results, SORTS, facetCount };
})(window.ASFE);
