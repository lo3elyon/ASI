/* ছোট্ট-GPT v2 additions: story mode, embedding map, attention grid, confidence writer,
   temperature compare, model builder, glossary, quiz, motion, themes, shortcuts, toasts. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CG = () => window.CG;
  const X = (window.CG_X = window.CG_X || []);
  const post = m => CG() && CG().W.postMessage(m);
  const show = ch => ch === ' ' ? '␣' : ch === '\n' ? '↵' : (/[\u0981-\u0983\u09BC-\u09CD\u09D7]/.test(ch) ? '◌' + ch : ch);
  const cls = ch => /[\u0985-\u0994]/.test(ch) ? 0 : /[\u0995-\u09B9\u09DC-\u09DF\u09CE]/.test(ch) ? 1 : /[\u0981-\u0983\u09BC-\u09D7]/.test(ch) ? 2 : 3;
  const COL = ['#f4a62a', '#2fbf8a', '#38bdf8', '#ef5b4c'];
  const fit = (c, h) => { const d = devicePixelRatio || 1, w = c.clientWidth; c.width = w * d; c.height = h * d; const g = c.getContext('2d'); g.scale(d, d); return [g, w, h]; };
  function toast(t) { const d = document.createElement('div'); d.textContent = t; $('#toast').appendChild(d); setTimeout(() => d.remove(), 4200); }

  /* ---------- simple-language boxes for the v1 sections ---------- */
  const SIMPLE = {
    train: 'সহজ কথায়: <b>Loss</b> হলো মডেলের "ভুলের মাপ"। শুরুতে মডেল কিছুই জানে না, তাই loss বেশি (≈৪.৪)। যত পড়ে, তত কম ভুল করে, loss নামতে থাকে। নিচের দিকে নামা লাইন মানেই শেখা হচ্ছে।',
    probe: 'সহজ কথায়: তুমি যা লিখবে, মডেল তার পরের অক্ষরের জন্য প্রতিটা সম্ভাব্য অক্ষরকে একটা নম্বর (সম্ভাবনা) দেয়। সবচেয়ে লম্বা বারটাই তার প্রথম পছন্দ।',
    write: 'সহজ কথায়: <b>Temperature</b> কম রাখলে মডেল নিরাপদ, চেনা শব্দ লেখে; বেশি রাখলে সাহসী, নতুন কিন্তু ভুলভাল শব্দ বানায়।',
    byo: 'সহজ কথায়: অন্য যেকোনো লেখা দিলে মডেল একদম নতুন করে সেই লেখার ধরন শিখবে। তোমার নিজের লেখা দিয়ে দেখো, কেমন "তোমার মতো" লেখে!',
    how: 'সহজ কথায়: ChatGPT, Gemini, Claude সব এই একই নকশায় তৈরি, শুধু লক্ষ-কোটি গুণ বড়।'
  };
  const ADV = {
    train: 'L = −(1/N) Σ log p(xₜ₊₁ | x≤ₜ)   ·   AdamW: m←β₁m+(1−β₁)g, v←β₂v+(1−β₂)g², θ←θ−η(m̂/(√v̂+ε)+λθ)\nwarmup: η·min(1, step/100) · clip ‖g‖ ≤ 1',
    probe: 'p = softmax(logits / T) over V characters; attention: softmax(QKᵀ/√d_h + causal mask) V per head',
  };
  Object.entries(SIMPLE).forEach(([id, t]) => { const s = document.getElementById(id); if (!s) return; const sub = s.querySelector('.sub') || s.querySelector('h2');
    const d = document.createElement('div'); d.className = 'simple'; d.innerHTML = t; sub.after(d);
    if (ADV[id]) { const a = document.createElement('div'); a.className = 'adv'; a.textContent = ADV[id]; d.after(a); } });

  /* ---------- nav, progress, reveal, theme, mode, ripple ---------- */
  const secs = $$('section[id]');
  addEventListener('scroll', () => { const h = document.documentElement; $('#prog').style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
    let cur = ''; secs.forEach(s => { if (s.getBoundingClientRect().top < 140) cur = s.id; });
    $$('#secnav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + cur)); }, { passive: true });
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .08 });
  $$('section').forEach(s => { s.classList.add('reveal'); io.observe(s); });
  const setTheme = l => { document.body.classList.toggle('light', l); $('#themeB').textContent = l ? '☾' : '☀︎'; localStorage.setItem('cg-theme', l ? 'light' : 'dark'); };
  setTheme(localStorage.getItem('cg-theme') === 'light');
  $('#themeB').onclick = () => setTheme(!document.body.classList.contains('light'));
  const setMode = m => { document.body.classList.toggle('mode-simple', m === 'simple'); document.body.classList.toggle('mode-adv', m === 'adv');
    $$('#modeT button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); localStorage.setItem('cg-mode', m); };
  $$('#modeT button').forEach(b => b.onclick = () => setMode(b.dataset.m)); setMode(localStorage.getItem('cg-mode') || 'simple');
  document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || RM) return; const r = b.getBoundingClientRect(), s = document.createElement('span');
    const d = Math.max(r.width, r.height); s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`; b.appendChild(s); setTimeout(() => s.remove(), 600); });
  const leaf = $('.leaf'); if (leaf && !RM) { leaf.addEventListener('mousemove', e => { const r = leaf.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    leaf.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`; }); leaf.addEventListener('mouseleave', () => leaf.style.transform = 'rotate(1.2deg)'); }

  /* ---------- drifting Bengali letters background ---------- */
  if (!RM) { const c = $('#bgfx'), L = 'অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ'.split(''); let g, W, H, P = [];
    const rs = () => { c.width = W = innerWidth; c.height = H = innerHeight; g = c.getContext('2d'); P = Array.from({ length: 38 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: .15 + Math.random() * .35, s: 14 + Math.random() * 26, ch: L[Math.random() * L.length | 0], a: Math.random() * .12 + .03 })); };
    rs(); addEventListener('resize', rs); let last = 0;
    (function f(t) { requestAnimationFrame(f); if (t - last < 33 || document.hidden) return; last = t; g.clearRect(0, 0, W, H);
      const light = document.body.classList.contains('light'); P.forEach(p => { p.y -= p.v; if (p.y < -30) { p.y = H + 30; p.x = Math.random() * W; }
        g.fillStyle = (light ? 'rgba(120,80,20,' : 'rgba(47,191,138,') + p.a + ')'; g.font = p.s + 'px "Tiro Bangla"'; g.fillText(p.ch, p.x, p.y); }); })(0); }

  /* ---------- milestone toasts ---------- */
  const marks = [3.5, 3, 2.5, 2.2, 2, 1.8, 1.6]; let passed = new Set(), ema = null;
  X.push(m => { if (m.type === 'ready') { passed = new Set(); ema = null; }
    if (m.type !== 'progress') return; ema = ema == null ? m.loss : ema * .9 + m.loss * .1;
    marks.forEach(k => { if (ema < k && !passed.has(k)) { passed.add(k); if (m.step > 5) toast(`🎉 loss < ${k} at step ${m.step}: ${k > 2.6 ? 'অক্ষর চিনছে' : k > 2.1 ? 'শব্দ বানাচ্ছে' : 'কবিতার ছন্দ আসছে!'}`); } }); });

  /* ---------- 0. story mode ---------- */
  const STEPS = [
    ['১. লেখা', 'Text', 'মডেলটা শুধু শেষ ৩২টা অক্ষর দেখতে পায়। এটাই তার "context window"।'],
    ['২. সংখ্যা', 'Tokens → ids', 'কম্পিউটার অক্ষর বোঝে না, তাই প্রতিটা অক্ষরের একটা নম্বর আছে (vocabulary-র index)।'],
    ['৩. ভেক্টর', 'Embedding', 'প্রতিটা নম্বর থেকে ৬৪টা সংখ্যার একটা তালিকা বের হয়। এটাই অক্ষরের "অর্থ", যা মডেল ট্রেনিংয়ে শিখেছে। নীল = ঋণাত্মক, সোনালি = ধনাত্মক।'],
    ['৪. মনোযোগ', 'Attention', 'শেষ অক্ষরটা আগের অক্ষরগুলোর দিকে তাকায়। মোটা বাঁক মানে বেশি মনোযোগ (সব head-এর গড়, শেষ layer)।'],
    ['৫. সম্ভাবনা', 'Probabilities', 'সব হিসেব শেষে মডেল প্রতিটা সম্ভাব্য পরের অক্ষরকে একটা সম্ভাবনা দেয়।'],
    ['৬. বাছাই', 'Sample', 'সম্ভাবনা অনুযায়ী একটা অক্ষর বেছে নেয়, লেখার শেষে জোড়ে, তারপর আবার প্রথম ধাপ থেকে। এভাবেই পুরো কবিতা লেখা হয়!']];
  let sIdx = 0, sData = null, sAuto = null;
  const stepsEl = $('#steps'), dots = $('#sdots');
  STEPS.forEach((s, i) => { const b = document.createElement('button'); b.innerHTML = `${s[0]} <span class="note">${s[1]}</span>`; b.onclick = () => go(i); stepsEl.appendChild(b); dots.appendChild(document.createElement('span')); });
  function go(i) { sIdx = (i + STEPS.length) % STEPS.length; $$('#steps button').forEach((b, k) => b.classList.toggle('on', k === sIdx)); $$('#sdots span').forEach((b, k) => b.classList.toggle('on', k === sIdx)); renderStep(); }
  function renderStep() {
    const st = $('#stage'), s = STEPS[sIdx]; st.innerHTML = `<h4>${s[0]} · ${s[1]}</h4><p>${s[2]}</p>`;
    if (!sData) { st.innerHTML += '<p class="note">মডেল লোড হচ্ছে…</p>'; return; }
    const d = sData, box = document.createElement('div'); st.appendChild(box);
    if (sIdx === 0 || sIdx === 1) { box.className = 'chips'; d.chars.forEach((c, i) => { const e = document.createElement('div'); e.className = 'chip'; e.style.animationDelay = i * 35 + 'ms';
      e.innerHTML = `${show(c)}${sIdx === 1 ? `<small>${d.ids[i]}</small>` : ''}`; if (i === d.chars.length - 1) e.style.borderColor = 'var(--saffron)'; box.appendChild(e); }); }
    if (sIdx === 2) { const last = d.chars[d.chars.length - 1]; box.innerHTML = `<div class="chip" style="display:inline-block">${show(last)}<small>id ${d.ids[d.ids.length - 1]}</small></div> → 64 numbers`;
      const v = document.createElement('div'); v.className = 'vec'; const mx = Math.max(...d.emb.map(Math.abs)) || 1;
      d.emb.forEach((x, i) => { const e = document.createElement('i'); const a = Math.abs(x) / mx; e.style.background = x > 0 ? `rgba(244,166,42,${.15 + .85 * a})` : `rgba(56,189,248,${.15 + .85 * a})`; e.title = x.toFixed(3); e.style.animationDelay = i * 12 + 'ms'; v.appendChild(e); });
      box.appendChild(v); }
    if (sIdx === 3) { const L = d.att[d.att.length - 1], n = d.chars.length, avg = new Array(n).fill(0); L.forEach(h => h.forEach((w, i) => avg[i] += w / L.length));
      const W = 900, H = 230, step = W / (n + 1), mx = Math.max(...avg);
      let svg = `<svg class="arcs" viewBox="0 0 ${W} ${H}">`; const xe = step * n, y0 = 190;
      avg.forEach((w, i) => { if (i === n - 1) return; const x = step * (i + 1), r = (xe - x) / 2, a = w / mx;
        svg += `<path d="M${xe} ${y0} A ${r} ${Math.min(r, 170)} 0 0 0 ${x} ${y0}" fill="none" stroke="rgba(47,191,138,${(.1 + .9 * a).toFixed(2)})" stroke-width="${(1 + 9 * a).toFixed(1)}" style="stroke-dasharray:1200;stroke-dashoffset:${RM ? 0 : 1200};animation:dash 1.2s ${i * 30}ms forwards"/>`; });
      d.chars.forEach((c, i) => { svg += `<text x="${step * (i + 1)}" y="${y0 + 30}" text-anchor="middle" font-size="22" font-family="Tiro Bangla" fill="${i === n - 1 ? '#f4a62a' : 'currentColor'}">${show(c).replace('<', '&lt;')}</text>`; });
      svg += `<style>@keyframes dash{to{stroke-dashoffset:0}}</style></svg>`; box.innerHTML = svg; }
    if (sIdx === 4) { box.className = 'bars'; const mx = d.top[0][1]; d.top.forEach(([c, p], i) => { const e = document.createElement('div'); e.className = 'b';
      e.innerHTML = `<div class="ch">${show(c)}</div><div><div class="fill" style="width:0"></div></div><div>${(p * 100).toFixed(1)}%</div>`; box.appendChild(e);
      setTimeout(() => e.querySelector('.fill').style.width = (p / mx * 100) + '%', 80 + i * 90); }); }
    if (sIdx === 5) { const c = d.top[0][0]; box.innerHTML = `<div class="winner">${show(c)}</div><p style="text-align:center;font-family:'Tiro Bangla';font-size:22px">${$('#storyIn').value.replace(/</g, '&lt;')}<span style="color:var(--saffron)">${c === '\n' ? '↵' : c}</span></p><div class="row" style="justify-content:center"><button id="sAppend">➕ যোগ করো, আবার চালাও</button></div>`;
      $('#sAppend').onclick = () => { $('#storyIn').value += c; storyRun(0); }; }
  }
  function storyRun(to) { post({ type: 'story', text: $('#storyIn').value }); if (to != null) go(to); }
  X.push(m => { if (m.type === 'story') { sData = m; renderStep(); } if (m.type === 'ready') setTimeout(() => storyRun(), 50); });
  $('#storyGo').onclick = () => storyRun(0); $('#sNext').onclick = () => go(sIdx + 1); $('#sPrev').onclick = () => go(sIdx - 1);
  $('#storyAuto').onclick = () => { if (sAuto) { clearInterval(sAuto); sAuto = null; $('#storyAuto').textContent = '▶ Autoplay'; return; }
    $('#storyAuto').textContent = '⏸ Stop'; go(0); sAuto = setInterval(() => { if (sIdx === 5) { const c = sData && sData.top[0][0]; if (c) { $('#storyIn').value += c; storyRun(0); } } else go(sIdx + 1); }, 2600); };
  go(0);

  /* ---------- embedding map ---------- */
  let ePts = null, eFrom = null, eT0 = 0, eHover = -1, eLast = 0;
  function eDraw() {
    const c = $('#emb'), [g, w, h] = fit(c, 460); if (!ePts) return; const k = Math.min(1, (performance.now() - eT0) / 600), ease = 1 - Math.pow(1 - k, 3);
    const P = ePts.pts.map((p, i) => eFrom && eFrom[i] ? [eFrom[i][0] + (p[0] - eFrom[i][0]) * ease, eFrom[i][1] + (p[1] - eFrom[i][1]) * ease] : p);
    const xs = ePts.pts.map(p => p[0]), ys = ePts.pts.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sx = x => 30 + (x - x0) / ((x1 - x0) || 1) * (w - 60), sy = y => 30 + (y - y0) / ((y1 - y0) || 1) * (h - 60);
    eDraw.map = P.map(p => [sx(p[0]), sy(p[1])]);
    P.forEach((p, i) => { const ch = ePts.vocab[i], x = sx(p[0]), y = sy(p[1]), col = COL[cls(ch)];
      g.fillStyle = col + '33'; g.beginPath(); g.arc(x, y, i === eHover ? 20 : 15, 0, 7); g.fill();
      g.fillStyle = col; g.font = (i === eHover ? 26 : 19) + 'px "Tiro Bangla"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(show(ch), x, y); });
    if (k < 1) requestAnimationFrame(eDraw);
  }
  X.push(m => { if (m.type === 'embeds') { eFrom = ePts ? (eDraw.raw || ePts.pts) : null; ePts = m; eT0 = performance.now(); $('#embNote').textContent = 'step ' + m.step + ' · ' + m.vocab.length + ' characters'; requestAnimationFrame(eDraw); }
    if (m.type === 'ready') { ePts = null; setTimeout(() => post({ type: 'embeds' }), 80); }
    if (m.type === 'progress' && $('#embAuto').checked && performance.now() - eLast > 2500) { eLast = performance.now(); post({ type: 'embeds' }); } });
  $('#embB').onclick = () => post({ type: 'embeds' });
  $('#emb').addEventListener('mousemove', e => { if (!eDraw.map) return; const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = -1, bd = 400;
    eDraw.map.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; best = i; } });
    if (best !== eHover) { eHover = best; eDraw(); } const tip = $('#tip'); if (best >= 0) { const ch = ePts.vocab[best]; tip.style.display = 'block'; tip.style.left = e.clientX + 12 + 'px'; tip.style.top = e.clientY + 12 + 'px';
      tip.textContent = `${show(ch)}  U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}  · ${['vowel', 'consonant', 'sign', 'other'][cls(ch)]}`; } else tip.style.display = 'none'; });
  $('#emb').addEventListener('mouseleave', () => { $('#tip').style.display = 'none'; eHover = -1; eDraw(); });
  addEventListener('resize', () => ePts && eDraw());

  /* ---------- full attention grid ---------- */
  let gData = null;
  function gridHeads(L, H) { const s = $('#gridHead'), v = s.value; s.innerHTML = ''; for (let l = 0; l < L; l++) for (let h = 0; h < H; h++) s.add(new Option(`Layer ${l + 1} · Head ${h + 1}`, l + '-' + h)); if (v) s.value = v; }
  function gridDraw() { if (!gData) return; const c = $('#gridC'), n = gData.n, [g, w] = fit(c, Math.min(560, c.clientWidth)), h = Math.min(560, c.clientWidth);
    const pad = 34, cell = (Math.min(w, h) - pad) / n; const [l, hh] = $('#gridHead').value.split('-').map(Number), H = gData.H, avg = $('#gridAvg').checked;
    const val = (t, s) => { if (s > t) return 0; if (!avg) return gData.att[l][((hh * n) + t) * n + s]; let a = 0; for (let L = 0; L < gData.att.length; L++) for (let k = 0; k < H; k++) a += gData.att[L][((k * n) + t) * n + s]; return a / (H * gData.att.length); };
    gridDraw.geo = { pad, cell, n, val };
    for (let t = 0; t < n; t++) for (let s = 0; s < n; s++) { const v = val(t, s); g.fillStyle = s > t ? 'rgba(127,127,127,.06)' : `rgba(47,191,138,${(.05 + .95 * Math.sqrt(v)).toFixed(3)})`; g.fillRect(pad + s * cell, pad + t * cell, cell - 1, cell - 1); }
    g.fillStyle = getComputedStyle(document.body).color; g.font = Math.min(16, cell * .8) + 'px "Tiro Bangla"'; g.textAlign = 'center'; g.textBaseline = 'middle';
    gData.ctx.forEach((ch, i) => { g.fillText(show(ch), pad + i * cell + cell / 2, pad / 2); g.fillText(show(ch), pad / 2, pad + i * cell + cell / 2); }); }
  X.push(m => { if (m.type === 'fullatt') { gData = m; gridHeads(m.att.length, m.H); gridDraw(); } if (m.type === 'ready') { gridHeads(m.cfg.L, m.cfg.H); setTimeout(() => post({ type: 'fullatt', text: $('#gridIn').value }), 120); } });
  $('#gridB').onclick = () => post({ type: 'fullatt', text: $('#gridIn').value }); $('#gridIn').oninput = () => post({ type: 'fullatt', text: $('#gridIn').value });
  $('#gridHead').onchange = gridDraw; $('#gridAvg').onchange = gridDraw;
  $('#gridC').addEventListener('mousemove', e => { const G = gridDraw.geo; if (!G) return; const r = e.target.getBoundingClientRect(), s = Math.floor((e.clientX - r.left - G.pad) / G.cell), t = Math.floor((e.clientY - r.top - G.pad) / G.cell), tip = $('#tip');
    if (s < 0 || t < 0 || s >= G.n || t >= G.n) { tip.style.display = 'none'; return; } tip.style.display = 'block'; tip.style.left = e.clientX + 12 + 'px'; tip.style.top = e.clientY + 12 + 'px';
    tip.textContent = s > t ? `${show(gData.ctx[t])} can't see the future` : `${show(gData.ctx[t])} → ${show(gData.ctx[s])}: ${(G.val(t, s) * 100).toFixed(1)}%`; });
  $('#gridC').addEventListener('mouseleave', () => $('#tip').style.display = 'none');
  addEventListener('resize', gridDraw);

  /* ---------- confidence writer + temperature compare ---------- */
  const confCol = p => p > .8 ? '#2fbf8a55' : p > .4 ? '#a3e63544' : p > .1 ? '#f4a62a55' : '#ef5b4c66';
  let cTimer = null;
  $('#cT').oninput = () => $('#cTv').textContent = (+$('#cT').value).toFixed(2);
  function cWrite() { post({ type: 'stream', text: $('#cIn').value, n: 200, temp: +$('#cT').value, id: 'conf' }); }
  $('#cB').onclick = cWrite;
  $('#cMulti').onclick = () => { $('#cols3').style.display = 'grid'; [[.4, 't1'], [.8, 't2'], [1.3, 't3']].forEach(([t, id]) => { $('#' + id).textContent = '…'; post({ type: 'stream', text: $('#cIn').value, n: 160, temp: t, id }); }); };
  X.push(m => { if (m.type !== 'stream') return;
    if (m.id !== 'conf') { const o = $('#' + m.id); o.textContent = $('#cIn').value + m.chars.map(c => c[0]).join(''); return; }
    clearInterval(cTimer); const out = $('#cOut'); out.innerHTML = ''; const p0 = document.createElement('span'); p0.textContent = $('#cIn').value; p0.style.color = 'var(--saffron)'; out.appendChild(p0);
    let i = 0; const ents = []; const sp = $('#spark');
    const tick = () => { if (i >= m.chars.length) { clearInterval(cTimer); return; } const [ch, p, en] = m.chars[i++]; const s = document.createElement('span'); s.textContent = ch; s.style.background = confCol(p); s.title = `p = ${(p * 100).toFixed(1)}% · H = ${en.toFixed(2)}`; out.appendChild(s); ents.push(en);
      const [g, w, h] = fit(sp, 60); g.strokeStyle = '#f4a62a'; g.lineWidth = 2; g.beginPath(); ents.forEach((v, k) => { const x = k / (m.chars.length - 1) * w, y = h - 4 - v / 4.5 * (h - 8); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      const ps = m.chars.slice(0, i).map(c => c[1]); $('#cAvg').textContent = (ps.reduce((a, b) => a + b, 0) / ps.length * 100).toFixed(0) + '%'; $('#cEnt').textContent = (ents.reduce((a, b) => a + b, 0) / ents.length).toFixed(2);
      $('#cSure').textContent = ps.filter(p => p > .8).length; $('#cWild').textContent = ps.filter(p => p < .1).length; };
    if (RM) { while (i < m.chars.length) tick(); } else cTimer = setInterval(tick, 28); });

  /* ---------- model builder ---------- */
  const HS = [1, 2, 4, 8], CS = [32, 48, 64, 96], TS = [16, 32, 48];
  const bcfg = () => ({ L: +$('#bL').value, H: HS[+$('#bH').value], C: CS[+$('#bC').value], Tctx: TS[+$('#bT').value] });
  function bUpd() { const c = bcfg(), V = 84; $('#kL').textContent = c.L; $('#kH').textContent = c.H; $('#kC').textContent = c.C; $('#kT').textContent = c.Tctx;
    const p = V * c.C + c.Tctx * c.C + c.L * (12 * c.C * c.C + 13 * c.C) + 2 * c.C + c.C * V; $('#bP').textContent = p.toLocaleString('en-IN');
    const cost = c.L * (12 * c.C * c.C * c.Tctx + 2 * c.Tctx * c.Tctx * c.C) + c.C * V * c.Tctx, base = 2 * (12 * 64 * 64 * 32 + 2 * 32 * 32 * 64) + 64 * 84 * 32;
    $('#bSpeed').textContent = `≈${(cost / base).toFixed(2)}× the default's work per step`; $('#bBar').style.width = Math.min(100, p / 400000 * 100) + '%';
    $('#bCmp').textContent = `GPT-2 small is ${(124e6 / p).toFixed(0)}× bigger · head size ${c.C / c.H}`; }
  ['bL', 'bH', 'bC', 'bT'].forEach(id => $('#' + id).oninput = bUpd); bUpd();
  $('#bBuild').onclick = () => { if (!CG()) return; window.CG_CFG = bcfg(); CG().init(CG().mode === 'byo' ? $('#byoText').value : CG().corpus, null); toast('🧱 নতুন মডেল তৈরি! Lab-এ ▶ চাপো'); location.hash = 'train'; };
  $('#bDefault').onclick = () => { $('#bL').value = 2; $('#bH').value = 2; $('#bC').value = 2; $('#bT').value = 1; bUpd(); window.CG_CFG = null; CG() && CG().init(CG().corpus, CG().pre); };

  /* ---------- glossary ---------- */
  const GL = [['টোকেন', 'Token', 'মডেলের পড়ার একক। এখানে প্রতিটা অক্ষর একটা টোকেন; বড় LLM-এ শব্দের টুকরো।'], ['এমবেডিং', 'Embedding', 'প্রতিটা টোকেনের জন্য শেখা সংখ্যার তালিকা, যা তার "অর্থ" ধরে রাখে।'],
    ['অ্যাটেনশন', 'Attention', 'কোন আগের টোকেন এখন কতটা জরুরি, তা ঠিক করার কৌশল।'], ['হেড', 'Head', 'একসাথে চলা কয়েকটা আলাদা অ্যাটেনশন, প্রত্যেকে আলাদা জিনিস খোঁজে।'],
    ['লস', 'Loss', 'মডেল কতটা ভুল করছে তার মাপ। কম = ভালো।'], ['গ্রেডিয়েন্ট', 'Gradient', 'কোন ওজন কোনদিকে একটু বদলালে loss কমবে, তার দিকনির্দেশ।'],
    ['ব্যাকপ্রপ', 'Backprop', 'শেষ থেকে শুরু পর্যন্ত গ্রেডিয়েন্ট হিসেব করার নিয়ম (chain rule)।'], ['টেম্পারেচার', 'Temperature', 'লেখার সাহস। কম = নিরাপদ, বেশি = সৃজনশীল।'],
    ['কনটেক্সট', 'Context window', 'একবারে মডেল কতটা আগের লেখা দেখতে পায়। এখানে ৩২ অক্ষর।'], ['প্যারামিটার', 'Parameters', 'মডেলের শেখা সব সংখ্যা। এখানে ~১.১ লক্ষ, GPT-4-এ লক্ষ কোটি।'],
    ['ওভারফিটিং', 'Overfitting', 'মুখস্থ করা কিন্তু না বোঝা: train loss কমে, val loss বাড়ে।'], ['এনট্রপি', 'Entropy', 'মডেল কতটা অনিশ্চিত তার মাপ।']];
  GL.forEach(([b, e, t]) => { const d = document.createElement('div'); d.className = 'flip'; d.innerHTML = `<div class="in"><div class="f"><b>${b}</b><span>${e}</span></div><div class="b">${t}</div></div>`; d.onclick = () => d.classList.toggle('on'); $('#glc').appendChild(d); });

  /* ---------- quiz ---------- */
  const QZ = [['শুরুতে loss প্রায় ৪.৪ কেন?', ['মডেল ভাঙা', 'ln(84): ৮৪টা অক্ষরের মধ্যে এলোমেলো আন্দাজ', 'কবিতা কঠিন'], 1, 'এলোমেলো আন্দাজে প্রতিটা অক্ষরের সম্ভাবনা ১/৮৪, আর −ln(১/৮৪) ≈ ৪.৪৩।'],
    ['GPT ভবিষ্যতের অক্ষর দেখতে পারে না কেন?', ['causal mask', 'মেমরি কম', 'বাংলা ভাষার নিয়ম'], 0, 'Attention grid-এ উপরের ত্রিভুজ ফাঁকা: causal mask ভবিষ্যৎ ঢেকে রাখে।'],
    ['Temperature বাড়ালে কী হয়?', ['লেখা বেশি নিশ্চিত হয়', 'লেখা বেশি এলোমেলো ও সৃজনশীল হয়', 'ট্রেনিং দ্রুত হয়'], 1, 'logits-কে বড় সংখ্যা দিয়ে ভাগ করলে সম্ভাবনাগুলো সমান হয়ে যায়।'],
    ['val loss বাড়ছে কিন্তু train loss কমছে, মানে?', ['ওভারফিটিং', 'বাগ', 'ভালো শেখা'], 0, 'মডেল মুখস্থ করছে, নতুন লেখায় ভালো করছে না।'],
    ['এই পুরো মডেল কোথায় চলছে?', ['Google-এর সার্ভারে', 'তোমার নিজের ব্রাউজারে', 'OpenAI API-তে'], 1, 'সব হিসেব তোমার ল্যাপটপের Web Worker-এ, কিছুই বাইরে যায় না।']];
  let score = 0; $('#qn').textContent = QZ.length;
  QZ.forEach(([q, opts, ok, why]) => { const d = document.createElement('div'); d.className = 'q'; d.innerHTML = `<b>${q}</b><div class="opts"></div><div class="why">${why}</div>`;
    opts.forEach((o, i) => { const b = document.createElement('button'); b.textContent = o; b.onclick = () => { if (d.classList.contains('done')) return; d.classList.add('done'); b.classList.add(i === ok ? 'ok' : 'no'); d.querySelectorAll('button')[ok].classList.add('ok');
      if (i === ok) { score++; $('#qs').textContent = score; if (score === QZ.length) toast('🏆 পুরো নম্বর! তুমি এখন LLM বোঝো।'); } }; d.querySelector('.opts').appendChild(b); }); $('#qz').appendChild(d); });

  /* ---------- keyboard ---------- */
  $('#helpB').onclick = () => $('#help').classList.add('on'); $('#helpX').onclick = () => $('#help').classList.remove('on');
  addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return; const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); const s = $('#bStart'); (s.disabled ? $('#bPause') : s).click(); }
    else if (k === 'g') cWrite(); else if (k === 'e') post({ type: 'embeds' }); else if (k === 's') go(sIdx + 1);
    else if (k === 't') $('#themeB').click(); else if (k === '?') $('#help').classList.toggle('on'); else if (k === 'escape') $('#help').classList.remove('on'); });
})();
