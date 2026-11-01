// AI Safety Researcher Library: vanilla ES module, no build step, no idle loops.
const $ = (s, el = document) => el.querySelector(s);
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const PAGE = 48;
const app = $('#app');
const root = document.documentElement;

let M, RS = [], VS = [], RBY = {}, VBY = {}, DET = null, detP = null;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------- personal store (localStorage only) ---------- */
const SKEY = 'asrl.v1';
let S = { w: {}, l: [], h: [] };
try { const x = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (x && typeof x === 'object') S = { w: x.w || {}, l: x.l || [], h: x.h || [] }; } catch (e) { /* ignore */ }
const save = () => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
const isW = (id) => !!S.w[id];
const isL = (id) => S.l.includes(id);

/* ---------- data ---------- */
async function load() {
  const [r, v] = await Promise.all([fetch('data/researchers.json').then(ok), fetch('data/videos.json').then(ok)]);
  M = r.meta;
  RS = r.r.map((a, i) => ({ i, slug: a[0], name: a[1], org: a[2], role: a[3], g: a[4], bio: a[5], kf: a[6], t: a[7], links: a[8], host: a[9], ini: a[10], vids: [] }));
  RS.forEach((x) => { RBY[x.slug] = x; const p = x.name.split(' '); x.last = norm(p[p.length - 1]); });
  VS = v.map((a, i) => ({ i, id: a[0], title: a[1], ch: M.channels[a[2]], date: a[3], ap: a[4], sec: a[5], f: a[6], sp: a[7], t: a[8], lv: a[9], p: a[10], tr: a[11], rank: a[12] }));
  VS.forEach((x) => {
    VBY[x.id] = x; x.year = +x.date.slice(0, 4);
    x.sp.forEach((s) => RS[s].vids.push(x.i));
    x.gs = new Set(x.sp.map((s) => RS[s].g));
    x.hay = norm([x.title, x.ch, x.sp.map((s) => RS[s].name).join(' '), x.t.map((t) => M.labels[t]).join(' ')].join(' '));
  });
  RS.forEach((x) => { x.hay = norm([x.name, x.org, x.role, x.bio, x.t.map((t) => M.labels[t]).join(' ')].join(' ')); });
}
function ok(r) { if (!r.ok) throw new Error(r.status); return r.json(); }
function loadDet() {
  if (DET) return Promise.resolve(DET);
  if (!detP) detP = fetch('data/details.json').then(ok).then((d) => {
    DET = d; VS.forEach((x) => { x.hay += ' ' + norm(d[x.i][0]); }); return d;
  });
  return detP;
}

/* ---------- formatting ---------- */
const dur = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`; };
const fdate = (v) => v.ap ? '~' + v.date.slice(0, 4) : `${+v.date.slice(8, 10)} ${MONTHS[+v.date.slice(5, 7) - 1]} ${v.date.slice(0, 4)}`;
const fmt = (f) => M.formats[f][0].toUpperCase() + M.formats[f].slice(1);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const img = (slug, size, cls = 'av') => `<img class="${cls}" src="photos/${esc(slug)}.jpg" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
const topicLink = (t) => `<a class="chip" href="#/videos?t=${encodeURIComponent(M.topics[t])}">${esc(M.labels[t])}</a>`;
const TI = () => { if (!TI.m) { TI.m = {}; M.topics.forEach((t, i) => { TI.m[t] = i; }); } return TI.m; };

function vcard(v) {
  const g = v.sp.length ? RS[v.sp[0]].g : 0;
  const names = v.sp.slice(0, 3).map((s) => RS[s].name).join(', ') + (v.sp.length > 3 ? ` +${v.sp.length - 3}` : '');
  const w = isW(v.id) ? '<span class="wd" title="Watched">Watched</span>' : '';
  return `<article class="vc g${g}"><a class="vl" href="#/v/${esc(v.id)}"><span class="th"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" width="320" height="180" loading="lazy" decoding="async"><span class="du">${dur(v.sec)}</span>${w}</span><span class="vb"><span class="vt">${esc(v.title)}</span><span class="vm"><span class="avs">${v.sp.slice(0, 4).map((s) => img(RS[s].slug, 28)).join('')}</span><span class="vn">${esc(names)}</span></span><span class="pills"><span class="pill">${fmt(v.f)}</span><span class="pill lv${v.lv}">${M.levels[v.lv]}</span><span class="dt">${fdate(v)}</span></span></span></a></article>`;
}
function rcard(r) {
  return `<a class="rc g${r.g}" href="#/r/${esc(r.slug)}">${img(r.slug, 96, 'ph')}<span class="rn">${esc(r.name)}</span><span class="ro">${esc(r.org)}</span><span class="rg">${esc(M.groups[r.g][2])} · ${plural(r.vids.length, 'video')}${r.host ? ' · Host' : ''}</span></a>`;
}

/* ---------- router ---------- */
let fwd = false; const scrollMem = new Map(); let lastHash = location.hash;
document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (a) fwd = true; });
function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || '', arg: parts[1] || '', q: new URLSearchParams(qs || '') };
}
function route() {
  scrollMem.set(lastHash, window.scrollY); lastHash = location.hash;
  const r = parse();
  const views = { '': home, videos, researchers, r: profile, v: video, paths, path, glossary, me, about };
  const fn = views[r.name] || notFound;
  document.querySelectorAll('[data-nav]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === r.name || (r.name === 'r' && a.dataset.nav === 'researchers') || (r.name === 'v' && a.dataset.nav === 'videos') || (r.name === 'path' && a.dataset.nav === 'paths')));
  if (fn === home) { root.classList.remove('rt'); app.innerHTML = ''; document.title = 'AI Safety Researcher Library: learn from the researchers themselves'; }
  else { root.classList.add('rt'); fn(r); }
  root.classList.add('ready');
  const y = fwd ? 0 : (scrollMem.get(location.hash) || 0); fwd = false;
  window.scrollTo(0, y);
}
const setTitle = (t) => { document.title = `${t} · AI Safety Researcher Library`; };
function home() { /* static prerendered markup in #pre */ }
function notFound() { setTitle('Not found'); app.innerHTML = `<section class="wrap sec"><h1>Page not found</h1><p><a href="#/">Go to the home page</a></p></section>`; }

/* ---------- videos ---------- */
function opts(list, sel, all) { return `<option value="">${all}</option>` + list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === sel ? ' selected' : ''}>${esc(l)}</option>`).join(''); }
function topicOpts(minN = 3) {
  const c = new Array(M.topics.length).fill(0); VS.forEach((v) => v.t.forEach((t) => c[t]++));
  return M.topics.map((t, i) => [t, `${M.labels[i]} (${c[i]})`, c[i]]).filter((x) => x[2] >= minN).sort((a, b) => a[1].localeCompare(b[1]));
}
function yearOpts() {
  const ys = [...new Set(VS.map((v) => v.year))].sort((a, b) => b - a);
  const ds = [...new Set(ys.map((y) => Math.floor(y / 10) * 10))];
  return [...ds.map((d) => ['d' + d, `${d}s`]), ...ys.map((y) => ['y' + y, String(y)])];
}
const DURS = [['s', 'Under 30 min'], ['m', '30–60 min'], ['l', '1–2 hours'], ['x', 'Over 2 hours']];
const SORTS = [['new', 'Newest'], ['old', 'Oldest'], ['long', 'Longest'], ['short', 'Shortest'], ['rel', 'Best match']];
let vstate = null;
function videos(r) {
  setTitle('Videos');
  const q = r.q;
  const st = { q: q.get('q') || '', g: q.get('g') || '', t: q.get('t') || '', f: q.get('f') || '', l: q.get('l') || '', p: q.get('p') || '', y: q.get('y') || '', d: q.get('d') || '', s: q.get('s') || '' };
  vstate = st;
  app.innerHTML = `<section class="wrap sec"><div class="ph1"><h1>Videos</h1><p class="sub">${VS.length} full appearances. Filter by who is speaking, what they cover and how deep it goes.</p></div>
  <form class="filters" id="vf" role="search">
   <label class="fs"><span class="vh">Search videos</span><input type="search" name="q" value="${esc(st.q)}" placeholder="Search titles, people, topics, summaries" autocomplete="off"></label>
   <label><span>Group</span><select name="g">${opts(M.groups.map((g, i) => [i, g[1]]), st.g, 'All groups')}</select></label>
   <label><span>Topic</span><select name="t">${opts(topicOpts(), st.t, 'All topics')}</select></label>
   <label><span>Format</span><select name="f">${opts(M.formats.map((f, i) => [i, fmt(i)]), st.f, 'All formats')}</select></label>
   <label><span>Level</span><select name="l">${opts(M.levels.map((l, i) => [i, l]), st.l, 'All levels')}</select></label>
   <label><span>Path</span><select name="p">${opts(M.paths.map((p, i) => [i, p.n]), st.p, 'Any path')}</select></label>
   <label><span>Year</span><select name="y">${opts(yearOpts(), st.y, 'Any year')}</select></label>
   <label><span>Length</span><select name="d">${opts(DURS, st.d, 'Any length')}</select></label>
   <label><span>Sort</span><select name="s">${opts(SORTS, st.s, st.q ? 'Best match' : 'Newest')}</select></label>
   <button class="btn sm" type="button" data-act="reset">Reset</button>
  </form>
  <p class="count" id="vc"></p><div class="grid vg" id="vr"></div><p class="more"><button class="btn" type="button" id="vm" hidden>Load more</button></p></section>`;
  const f = $('#vf'); f.addEventListener('submit', (e) => e.preventDefault());
  f.addEventListener('change', (e) => { if (e.target.name && e.target.name !== 'q') { st[e.target.name] = e.target.value; syncV(); } });
  const qi = f.elements.namedItem('q'); let tm; qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { st.q = qi.value.trim(); if (st.q) loadDet().then(() => syncV()); syncV(); }, 220); });
  f.addEventListener('click', (e) => { if (e.target.dataset.act === 'reset') { location.hash = '#/videos'; } });
  if (st.q) loadDet().then(() => runV(st, 0));
  runV(st, 0);
}
function syncV() {
  const st = vstate; const p = new URLSearchParams();
  Object.entries(st).forEach(([k, v]) => { if (v !== '') p.set(k, v); });
  const h = '#/videos' + (p.toString() ? '?' + p : '');
  history.replaceState(null, '', h); lastHash = h; runV(st, 0);
}
function filterV(st) {
  const toks = norm(st.q).split(/\s+/).filter(Boolean);
  const tIdx = st.t ? TI()[st.t] : null;
  let out = VS.filter((v) => {
    if (st.g !== '' && !v.gs.has(+st.g)) return false;
    if (tIdx != null && !v.t.includes(tIdx)) return false;
    if (st.f !== '' && v.f !== +st.f) return false;
    if (st.l !== '' && v.lv !== +st.l) return false;
    if (st.p !== '' && !v.p.includes(+st.p)) return false;
    if (st.y) { const n = +st.y.slice(1); if (st.y[0] === 'y' ? v.year !== n : Math.floor(v.year / 10) * 10 !== n) return false; }
    if (st.d) { const m = v.sec / 60; if ((st.d === 's' && m >= 30) || (st.d === 'm' && (m < 30 || m > 60)) || (st.d === 'l' && (m <= 60 || m > 120)) || (st.d === 'x' && m <= 120)) return false; }
    if (toks.length && !toks.every((t) => v.hay.includes(t))) return false;
    return true;
  });
  const s = st.s || (toks.length ? 'rel' : 'new');
  const cmp = { new: (a, b) => b.date.localeCompare(a.date), old: (a, b) => a.date.localeCompare(b.date), long: (a, b) => b.sec - a.sec, short: (a, b) => a.sec - b.sec };
  if (s === 'rel' && toks.length) {
    const sc = (v) => { const t = norm(v.title); return toks.reduce((n, k) => n + (t.includes(k) ? 3 : 0), 0) - v.rank / 1000; };
    out = out.map((v) => [sc(v), v]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
  } else out.sort(cmp[s] || cmp.new);
  return out;
}
function runV(st, from) {
  const res = filterV(st); const grid = $('#vr'); if (!grid) return;
  const slice = res.slice(from, from + PAGE).map(vcard).join('');
  if (from === 0) grid.innerHTML = slice || '<p class="empty">No videos match these filters. Try removing one.</p>'; else grid.insertAdjacentHTML('beforeend', slice);
  $('#vc').textContent = `${res.length} video${res.length === 1 ? '' : 's'}${st.q && !DET ? ' (searching titles, people and topics; summaries loading…)' : ''}`;
  const more = $('#vm'); const next = from + PAGE;
  more.hidden = next >= res.length; more.onclick = () => runV(st, next);
}

/* ---------- researchers ---------- */
function researchers(r) {
  setTitle('Researchers');
  const q = r.q; const st = { q: q.get('q') || '', g: q.get('g') || '', o: q.get('o') || '', t: q.get('t') || '', h: q.get('h') || '' };
  const orgs = {}; RS.forEach((x) => { orgs[x.org] = (orgs[x.org] || 0) + 1; });
  const orgList = Object.entries(orgs).filter((x) => x[1] >= 2).sort((a, b) => a[0].localeCompare(b[0])).map(([o, n]) => [o, `${o} (${n})`]);
  const tc = {}; RS.forEach((x) => x.t.forEach((t) => { tc[t] = (tc[t] || 0) + 1; }));
  const tList = Object.entries(tc).filter((x) => x[1] >= 3).map(([t, n]) => [M.topics[t], `${M.labels[t]} (${n})`]).sort((a, b) => a[1].localeCompare(b[1]));
  app.innerHTML = `<section class="wrap sec"><div class="ph1"><h1>Researchers</h1><p class="sub">${RS.length} people whose own words you can learn from, including the podcast hosts who interview them.</p></div>
  <form class="filters" id="rf" role="search">
   <label class="fs"><span class="vh">Search researchers</span><input type="search" name="q" value="${esc(st.q)}" placeholder="Search names, organisations, topics" autocomplete="off"></label>
   <label><span>Group</span><select name="g">${opts(M.groups.map((g, i) => [i, g[1]]), st.g, 'All groups')}</select></label>
   <label><span>Organisation</span><select name="o">${opts(orgList, st.o, 'All organisations')}</select></label>
   <label><span>Topic</span><select name="t">${opts(tList, st.t, 'All topics')}</select></label>
   <label><span>Hosts</span><select name="h">${opts([['0', 'Hide hosts'], ['1', 'Hosts only']], st.h, 'Show everyone')}</select></label>
  </form>
  <nav class="az" aria-label="Jump to letter" id="az"></nav><p class="count" id="rc"></p><div class="grid rg" id="rr"></div></section>`;
  const f = $('#rf'); f.addEventListener('submit', (e) => e.preventDefault());
  const sync = () => { const p = new URLSearchParams(); Object.entries(st).forEach(([k, v]) => { if (v) p.set(k, v); }); const h = '#/researchers' + (p.toString() ? '?' + p : ''); history.replaceState(null, '', h); lastHash = h; runR(st); };
  f.addEventListener('change', (e) => { if (e.target.name && e.target.name !== 'q') { st[e.target.name] = e.target.value; sync(); } });
  const qi = f.elements.namedItem('q'); let tm; qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { st.q = qi.value.trim(); sync(); }, 200); });
  $('#az').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const el = document.getElementById('L-' + b.dataset.l); if (el) el.scrollIntoView({ block: 'start' }); });
  runR(st);
}
function runR(st) {
  const toks = norm(st.q).split(/\s+/).filter(Boolean); const tIdx = st.t ? TI()[st.t] : null;
  const res = RS.filter((x) => (st.g === '' || x.g === +st.g) && (!st.o || x.org === st.o) && (tIdx == null || x.t.includes(tIdx)) && (st.h !== '0' || !x.host) && (st.h !== '1' || x.host) && (!toks.length || toks.every((t) => x.hay.includes(t))));
  const seen = new Set();
  $('#rr').innerHTML = res.map((x) => { const L = x.last[0].toUpperCase(); const id = seen.has(L) ? '' : (seen.add(L), ` id="L-${L}"`); return rcard(x).replace('<a ', `<a${id} `); }).join('') || '<p class="empty">Nobody matches. Try a broader search.</p>';
  $('#rc').textContent = plural(res.length, 'researcher');
  $('#az').innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => `<button type="button" data-l="${l}"${seen.has(l) ? '' : ' disabled'}>${l}</button>`).join('');
}

/* ---------- profile ---------- */
const LINKN = { site: 'Website', x: 'X', scholar: 'Google Scholar' };
function profile(r) {
  const x = RBY[r.arg]; if (!x) return notFound();
  setTitle(x.name);
  const sort = r.q.get('s') || 'imp';
  const all = x.vids.map((i) => VS[i]);
  const sorter = { imp: (a, b) => a.rank - b.rank || b.date.localeCompare(a.date), new: (a, b) => b.date.localeCompare(a.date), old: (a, b) => a.date.localeCompare(b.date) };
  all.sort(sorter[sort] || sorter.imp);
  const links = Object.entries(x.links || {}).filter(([, u]) => /^https:\/\//.test(u)).map(([k, u]) => `<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(LINKN[k] || k)}</a>`).join('');
  const watched = all.filter((v) => isW(v.id)).length;
  app.innerHTML = `<section class="wrap sec prof g${x.g}"><a class="back" href="#/researchers">← All researchers</a>
  <div class="phd">${img(x.slug, 200, 'big')}<div><p class="kicker gk">${esc(M.groups[x.g][1])}${x.host ? ' · Host' : ''}</p><h1>${esc(x.name)}</h1><p class="role">${esc(x.role)}${x.org ? ' · ' + esc(x.org) : ''}</p><p class="bio">${esc(x.bio)}</p>${links ? `<p class="links">${links}</p>` : ''}</div></div>
  <div class="cols2"><div class="box"><h2 class="h3">Known for</h2><ul class="kf">${x.kf.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div><div class="box"><h2 class="h3">Topics</h2><p class="chips">${x.t.map(topicLink).join('')}</p></div></div>
  <div class="sh"><h2>${plural(all.length, 'video')}${watched ? ` <span class="sub">· ${watched} watched</span>` : ''}</h2>
  <label class="inl"><span>Sort</span><select id="ps">${[['imp', 'Most important'], ['new', 'Newest'], ['old', 'Oldest']].map(([v, l]) => `<option value="${v}"${v === sort ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
  <div class="grid vg" id="pv"></div><p class="more"><button class="btn" type="button" id="pm" hidden>Load more</button></p></section>`;
  $('#ps').addEventListener('change', (e) => { location.hash = `#/r/${encodeURIComponent(x.slug)}?s=${e.target.value}`; });
  let n = 0; const step = () => { $('#pv').insertAdjacentHTML('beforeend', all.slice(n, n + 24).map(vcard).join('')); n += 24; $('#pm').hidden = n >= all.length; };
  $('#pm').onclick = step; step();
}

/* ---------- video page + lite player ---------- */
const PLAY = '<svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true"><path d="M66.5 7.7a8.5 8.5 0 00-6-6C55.3.3 34 .3 34 .3s-21.3 0-26.5 1.4a8.5 8.5 0 00-6 6C.1 12.9.1 24 .1 24s0 11.1 1.4 16.3a8.5 8.5 0 006 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 006-6C67.9 35.1 67.9 24 67.9 24s0-11.1-1.4-16.3z" fill="#c4302b"/><path d="M45 24L27 14v20z" fill="#fff"/></svg>';
function video(r) {
  const v = VBY[r.arg]; if (!v) return notFound();
  setTitle(v.title);
  const pathK = r.q.get('path'); const pth = pathK ? M.paths.find((p) => p.k === pathK) : null;
  let nav = '';
  if (pth) { const k = pth.v.indexOf(v.i); const pv = pth.v[k - 1], nx = pth.v[k + 1];
    nav = `<nav class="pnav" aria-label="Path navigation"><a href="#/path/${pth.k}">${esc(pth.n)}: ${k + 1} of ${pth.v.length}</a>${pv != null ? `<a href="#/v/${VS[pv].id}?path=${pth.k}">← Previous</a>` : ''}${nx != null ? `<a href="#/v/${VS[nx].id}?path=${pth.k}">Next →</a>` : ''}</nav>`; }
  app.innerHTML = `<section class="wrap sec vp">${nav}<div class="vpg"><div>
  <div class="yt" data-id="${esc(v.id)}"><button class="fac" type="button" data-play aria-label="Play: ${esc(v.title)}"><img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" width="480" height="360" decoding="async">${PLAY}</button></div>
  <h1 class="vh1">${esc(v.title)}</h1>
  <p class="meta"><span>${esc(v.ch)}</span><span>${fdate(v)}${v.ap ? ' (approximate)' : ''}</span><span>${dur(v.sec)}</span><span class="pill">${fmt(v.f)}</span><span class="pill lv${v.lv}">${M.levels[v.lv]}</span></p>
  <p class="acts"><button class="btn sm" type="button" data-act="w" aria-pressed="${isW(v.id)}">${isW(v.id) ? '✓ Watched' : 'Mark watched'}</button><button class="btn sm" type="button" data-act="l" aria-pressed="${isL(v.id)}">${isL(v.id) ? '✓ In Watch later' : 'Watch later'}</button><a class="btn sm" href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener noreferrer">Open on YouTube</a></p>
  <div id="det" class="det"><p class="sk t"></p><p class="sk t"></p></div>
  <h2 class="h3">Topics</h2><p class="chips">${v.t.map(topicLink).join('')}</p>
  ${v.p.length ? `<h2 class="h3">In learning paths</h2><p class="chips">${v.p.map((p) => `<a class="chip" href="#/path/${M.paths[p].k}">${esc(M.paths[p].n)}</a>`).join('')}</p>` : ''}
  </div><aside><h2 class="h3">Speakers</h2><div class="spk">${v.sp.map((s) => { const x = RS[s]; return `<a class="sp g${x.g}" href="#/r/${esc(x.slug)}">${img(x.slug, 56, 'ph')}<span><b>${esc(x.name)}</b><small>${esc(x.org)}${x.host ? ' · Host' : ''}</small></span></a>`; }).join('')}</div>
  <p class="ver">${v.tr ? 'Speakers checked against the transcript.' : 'Speakers checked against the YouTube title and description.'}</p></aside></div>
  <div class="sh"><h2>Related videos</h2></div><div class="grid vg">${related(v).map(vcard).join('')}</div></section>`;
  loadDet().then((d) => { const el = $('#det'); if (!el || VBY[parse().arg] !== v) return; const [sum, why] = d[v.i]; el.innerHTML = `<p class="sum">${esc(sum)}</p>${why ? `<p class="why"><b>Why watch:</b> ${esc(why)}</p>` : ''}`; }).catch(() => { const el = $('#det'); if (el) el.textContent = ''; });
}
function related(v) {
  const sp = new Set(v.sp), tp = new Set(v.t);
  return VS.filter((x) => x !== v).map((x) => [x.sp.reduce((n, s) => n + (sp.has(s) && !RS[s].host ? 5 : 0), 0) + x.t.reduce((n, t) => n + (tp.has(t) ? 1 : 0), 0) - x.rank / 500, x]).filter((a) => a[0] > 0.5).sort((a, b) => b[0] - a[0]).slice(0, 8).map((a) => a[1]);
}
function play(btn) {
  const box = btn.closest('.yt'); if (!box) return;
  document.querySelectorAll('.yt iframe').forEach((f) => f.remove());
  const id = box.dataset.id; const v = VBY[id];
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1&origin=${encodeURIComponent(location.origin)}`;
  f.title = v ? v.title : 'YouTube video'; f.referrerPolicy = 'strict-origin-when-cross-origin';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; f.allowFullscreen = true;
  f.width = 560; f.height = 315;
  btn.hidden = true; box.appendChild(f); f.focus();
  S.h = [[id, Date.now()], ...S.h.filter((x) => x[0] !== id)].slice(0, 100); save();
}
app.addEventListener('click', (e) => {
  const p = e.target.closest('[data-play]'); if (p) { play(p); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const id = parse().arg; const act = a.dataset.act;
  if (act === 'w' && VBY[id]) { if (S.w[id]) delete S.w[id]; else S.w[id] = Date.now(); save(); a.setAttribute('aria-pressed', isW(id)); a.textContent = isW(id) ? '✓ Watched' : 'Mark watched'; }
  else if (act === 'l' && VBY[id]) { S.l = isL(id) ? S.l.filter((x) => x !== id) : [id, ...S.l]; save(); a.setAttribute('aria-pressed', isL(id)); a.textContent = isL(id) ? '✓ In Watch later' : 'Watch later'; }
  else if (act === 'pw') { const vid = a.dataset.id; if (S.w[vid]) delete S.w[vid]; else S.w[vid] = Date.now(); save(); route(); }
});

/* ---------- learning paths ---------- */
function paths() {
  setTitle('Learning paths');
  app.innerHTML = `<section class="wrap sec"><div class="ph1"><h1>Learning paths</h1><p class="sub">Ordered playlists from beginner to advanced. Tick videos off as you go; progress stays in this browser.</p></div>
  <div class="grid pg">${M.paths.map((p, i) => { const done = p.v.filter((x) => isW(VS[x].id)).length; const hrs = Math.round(p.v.reduce((n, x) => n + VS[x].sec, 0) / 360) / 10; return `<a class="pc p${i}" href="#/path/${p.k}"><span class="pn">${i + 1}</span><h2>${esc(p.n)}</h2><p>${esc(p.d)}</p><span class="pm">${plural(p.v.length, 'video')} · ${hrs} h</span><span class="prog" aria-hidden="true"><span class="w${Math.round((done / p.v.length) * 10)}"></span></span><span class="pm">${done} of ${p.v.length} watched</span></a>`; }).join('')}</div></section>`;
}
function path(r) {
  const i = M.paths.findIndex((p) => p.k === r.arg); if (i < 0) return notFound();
  const p = M.paths[i]; setTitle(p.n);
  const done = p.v.filter((x) => isW(VS[x].id)).length;
  app.innerHTML = `<section class="wrap sec"><a class="back" href="#/paths">← All paths</a><div class="ph1"><h1>${esc(p.n)}</h1><p class="sub">${esc(p.d)}</p><p class="count">${done} of ${p.v.length} watched</p><span class="prog big" aria-hidden="true"><span class="w${Math.round((done / p.v.length) * 10)}"></span></span></div>
  <ol class="pl">${p.v.map((x, n) => { const v = VS[x]; const w = isW(v.id); return `<li class="${w ? 'done' : ''}"><span class="n">${n + 1}</span><a class="plk" href="#/v/${esc(v.id)}?path=${p.k}"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" width="160" height="90" loading="lazy" decoding="async"><span><b>${esc(v.title)}</b><small>${esc(v.sp.slice(0, 3).map((s) => RS[s].name).join(', '))} · ${dur(v.sec)} · ${M.levels[v.lv]}</small></span></a><button class="ck" type="button" data-act="pw" data-id="${esc(v.id)}" aria-pressed="${w}" aria-label="${w ? 'Mark as not watched' : 'Mark as watched'}: ${esc(v.title)}">${w ? '✓' : ''}</button></li>`; }).join('')}</ol></section>`;
}

/* ---------- glossary ---------- */
function glossary() {
  setTitle('Glossary');
  const c = new Array(M.topics.length).fill(0); VS.forEach((v) => v.t.forEach((t) => c[t]++));
  app.innerHTML = `<section class="wrap sec"><div class="ph1"><h1>Glossary</h1><p class="sub">Key AI safety terms in plain English, each linked to videos that cover them.</p></div>
  <dl class="gl">${M.gloss.map((g) => { const vids = VS.filter((v) => v.t.includes(g.t)).sort((a, b) => a.lv - b.lv || a.rank - b.rank).slice(0, 3); return `<div class="gi" id="g-${esc(M.topics[g.t])}"><dt>${esc(g.n)}</dt><dd><p>${esc(g.d)}</p><p class="gv">${vids.map((v) => `<a href="#/v/${esc(v.id)}">${esc(v.title)}</a>`).join('')}</p><a class="btn sm" href="#/videos?t=${encodeURIComponent(M.topics[g.t])}">All ${plural(c[g.t], 'video')}</a></dd></div>`; }).join('')}</dl></section>`;
}

/* ---------- my list ---------- */
function me() {
  setTitle('My list');
  const later = S.l.map((id) => VBY[id]).filter(Boolean);
  const watched = Object.entries(S.w).sort((a, b) => b[1] - a[1]).map(([id]) => VBY[id]).filter(Boolean);
  const hist = S.h.map(([id, t]) => [VBY[id], t]).filter((x) => x[0]);
  const sec = (t, list, empty) => `<div class="sh"><h2>${t} <span class="sub">(${list.length})</span></h2></div>${list.length ? `<div class="grid vg">${list.slice(0, 48).map(vcard).join('')}</div>` : `<p class="empty">${empty}</p>`}`;
  app.innerHTML = `<section class="wrap sec"><div class="ph1"><h1>My list</h1><p class="sub">Saved only in this browser. Nothing is sent anywhere. Export a backup to move it to another device.</p>
  <p class="acts"><button class="btn sm" type="button" id="ex">Export</button><label class="btn sm"><input type="file" id="im" accept="application/json" class="vh">Import</label><button class="btn sm" type="button" id="clr">Clear everything</button></p><p id="msg" class="count" role="status"></p></div>
  ${sec('Watch later', later, 'Use “Watch later” on any video page to save it here.')}
  ${sec('Watched', watched, 'Videos you mark as watched appear here and count towards path progress.')}
  <div class="sh"><h2>History <span class="sub">(${hist.length})</span></h2></div>${hist.length ? `<ol class="hist">${hist.slice(0, 50).map(([v, t]) => `<li><a href="#/v/${esc(v.id)}">${esc(v.title)}</a> <small>${new Date(t).toLocaleString()}</small></li>`).join('')}</ol>` : '<p class="empty">Videos you play appear here.</p>'}</section>`;
  $('#ex').onclick = () => { const b = new Blob([JSON.stringify({ app: 'ai-safety-researcher-library', ...S }, null, 1)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'researcher-library-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); };
  $('#im').onchange = (e) => { const file = e.target.files[0]; if (!file) return; file.text().then((t) => { const x = JSON.parse(t); if (!x || typeof x !== 'object') throw new Error('bad');
    const w = {}; Object.entries(x.w || {}).forEach(([k, v]) => { if (VBY[k] && typeof v === 'number') w[k] = v; });
    S = { w: { ...S.w, ...w }, l: [...new Set([...(x.l || []).filter((k) => VBY[k]), ...S.l])], h: [...(x.h || []).filter((a) => Array.isArray(a) && VBY[a[0]]), ...S.h].slice(0, 100) }; save(); me(); $('#msg').textContent = 'Imported.'; }).catch(() => { $('#msg').textContent = 'That file could not be read.'; }); };
  $('#clr').onclick = () => { if (confirm('Clear watched, watch later and history in this browser?')) { S = { w: {}, l: [], h: [] }; save(); me(); } };
}

/* ---------- about ---------- */
function about() {
  setTitle('About');
  const by = (fn, n) => { const c = new Array(n).fill(0); fn(c); return c; };
  const gc = by((c) => RS.forEach((x) => c[x.g]++), M.groups.length);
  const fc = by((c) => VS.forEach((v) => c[v.f]++), M.formats.length);
  const ap = VS.filter((v) => v.ap).length, tr = VS.filter((v) => v.tr).length;
  const yrs = VS.map((v) => v.year);
  const src = (u) => /^https:\/\//.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(new URL(u).hostname.replace(/^www\./, ''))}</a>` : (u ? esc(u) : 'initials, no verified photo yet');
  app.innerHTML = `<section class="wrap sec narrow"><h1>About this library</h1>
  <p class="lede2">A free, fast place to learn AI safety directly from the researchers: ${VS.length} videos with ${RS.length} people, ${Math.min(...yrs)}–${Math.max(...yrs)}.</p>
  <h2>What is included</h2><ul class="kf"><li><b>Full appearances only.</b> Complete talks, lectures, podcast episodes, interviews, debates, panels and hearings of at least about 10 minutes. No clips, shorts, reaction channels or AI-narrated re-uploads.</li><li><b>Researchers speak in their own voice.</b> Each video is listed under the people who actually speak in it at length.</li><li><b>Checked.</b> Who speaks was verified from YouTube metadata and descriptions (${VS.length - tr} videos) or from the transcript (${tr} videos).</li><li><b>Honest dates.</b> ${ap} videos have an approximate date, shown with a ~ (for example “~2023”).</li></ul>
  <div class="cols2"><div class="box"><h2 class="h3">Researchers by group</h2><ul class="tbl">${M.groups.map((g, i) => `<li><span>${esc(g[1])}</span><b>${gc[i]}</b></li>`).join('')}</ul></div><div class="box"><h2 class="h3">Videos by format</h2><ul class="tbl">${M.formats.map((f, i) => `<li><span>${fmt(i)}</span><b>${fc[i]}</b></li>`).join('')}</ul></div></div>
  <h2>Also see</h2><p><a class="btn" href="../ai-safety-full-episodes/">AI Safety Full Episodes app</a> a separate streaming-style library of recent full AI safety episodes.</p>
  <h2>Privacy and speed</h2><p>No accounts, no trackers, no cookies from this site. Videos load from youtube-nocookie.com only when you press play. Your watched list, watch later and history stay in your browser's local storage.</p>
  <h2>Photo credits</h2><p class="sub">Photos come from Wikimedia Commons, researchers' own or institutional pages, or a clean frame from one of their own videos. Five people without a verified photo are shown with initials.</p>
  <ul class="cred">${RS.map((x) => `<li><a href="#/r/${esc(x.slug)}">${esc(x.name)}</a>: ${src((M.credits.find((c) => c[0] === x.slug) || [])[1])}</li>`).join('')}</ul>
  <h2>Who made this</h2><p>Built by Aniruddha Adak. <a class="gh2" href="https://github.com/lo3elyon/ASI" target="_blank" rel="noopener noreferrer">Source on GitHub</a></p></section>`;
}

/* ---------- theme ---------- */
$('#theme').addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('asrl.theme', root.dataset.theme); } catch (e) { /* ignore */ }
});

/* ---------- boot ---------- */
window.addEventListener('hashchange', route);
load().then(route).catch(() => {
  root.classList.add('rt', 'ready');
  app.innerHTML = '<section class="wrap sec"><h1>Could not load the library</h1><p>Check your connection, then <button class="btn sm" type="button" id="rt">try again</button></p></section>';
  $('#rt').onclick = () => location.reload();
});
export { VS, RS, filterV, related };
