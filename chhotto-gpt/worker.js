/* Training worker: keeps the UI smooth while the transformer learns. */
importScripts('engine.js');
const E = self.ChhottoGPT;
let model = null, tok = null, data = null, running = false, cfg = null, opts = { lr: 3e-3, B: 8 }, rng = new E.RNG(42);
let lastSample = -1, valData = null;

function batch(src, B, Tl) {
  const idx = [], tg = [];
  for (let b = 0; b < B; b++) { const o = Math.floor(rng.next() * (src.length - Tl - 1));
    for (let t = 0; t < Tl; t++) { idx.push(src[o + t]); tg.push(src[o + t + 1]); } }
  return { idx, tg };
}
function sample(prompt, n, temp) {
  let ctx = tok.encode(prompt); if (!ctx.length) ctx = [tok.stoi['\n'] || 0];
  const out = [];
  for (let i = 0; i < n; i++) { const { probs } = model.predict(ctx, temp); let r = rng.next(), k = 0;
    for (; k < probs.length - 1; k++) { r -= probs[k]; if (r <= 0) break; }
    ctx.push(k); out.push(k); }
  return tok.decode(out);
}
function valLoss() {
  if (!valData || valData.length < cfg.Tctx + 2) return null;
  const { idx, tg } = batch(valData, 8, cfg.Tctx); return model.forward(idx, 8, cfg.Tctx, tg).loss;
}
function loop() {
  if (!running) return;
  const t0 = performance.now(); let n = 0, ls = 0, gn = 0;
  const lr = opts.lr * Math.min(1, (model.step + 1) / 100); // warmup
  while (performance.now() - t0 < 250) { const { idx, tg } = batch(data, opts.B, cfg.Tctx);
    const r = model.trainStep(idx, tg, opts.B, cfg.Tctx, lr); ls += r.loss; gn += r.gradNorm; n++; }
  const msg = { type: 'progress', step: model.step, loss: ls / n, gradNorm: gn / n, sps: n / ((performance.now() - t0) / 1000) };
  if (model.step - lastSample >= 50 || lastSample < 0) { lastSample = model.step; msg.val = valLoss(); msg.sample = sample(opts.seedText || '', 90, 0.8); }
  postMessage(msg);
  setTimeout(loop, 0);
}
onmessage = (e) => {
  const m = e.data;
  if (m.type === 'init') {
    tok = new E.Tokenizer(m.text); const all = tok.encode(m.text); const cut = Math.floor(all.length * 0.92);
    data = all.slice(0, cut); valData = all.slice(cut);
    cfg = Object.assign({ V: tok.itos.length, Tctx: 32, C: 64, H: 4, L: 2, seed: 1337 }, m.cfg || {}, { V: tok.itos.length });
    model = new E.GPT(cfg); lastSample = -1;
    if (m.checkpoint && m.checkpoint.cfg.V === cfg.V) model.load(m.checkpoint);
    postMessage({ type: 'ready', params: model.nParams(), vocab: tok.itos, cfg, chars: all.length, step: model.step });
  } else if (m.type === 'start') { if (!running) { running = true; loop(); } }
  else if (m.type === 'pause') running = false;
  else if (m.type === 'opts') Object.assign(opts, m.opts);
  else if (m.type === 'predict') {
    const ctx = tok.encode(m.text); if (!ctx.length) { postMessage({ type: 'predicted', empty: true }); return; }
    const r = model.predict(ctx, m.temp || 1);
    const top = Array.from(r.probs).map((p, i) => [tok.itos[i], p]).sort((a, b) => b[1] - a[1]).slice(0, 12);
    postMessage({ type: 'predicted', top, att: r.att, ctx: r.ctxIdx.map(i => tok.itos[i]), id: m.id });
  } else if (m.type === 'generate') {
    postMessage({ type: 'generated', text: sample(m.text, m.n || 200, m.temp || 0.8), id: m.id });
  } else if (m.type === 'export') postMessage({ type: 'exported', ckpt: model.export() });
};

/* ===== v2 additions: embeddings map, full attention, streaming, confidence ===== */
(function () {
  const base = onmessage;
  function pca2(M, rows, cols) { // 2 principal components by power iteration
    const mu = new Float32Array(cols);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) mu[j] += M[i * cols + j] / rows;
    const X = new Float32Array(rows * cols);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) X[i * cols + j] = M[i * cols + j] - mu[j];
    const comps = [];
    for (let c = 0; c < 2; c++) {
      let v = new Float32Array(cols).map((_, j) => Math.sin(j * 1.7 + c * 3.1 + 1));
      for (let it = 0; it < 40; it++) {
        const xv = new Float32Array(rows);
        for (let i = 0; i < rows; i++) { let s = 0; for (let j = 0; j < cols; j++) s += X[i * cols + j] * v[j]; xv[i] = s; }
        const nv = new Float32Array(cols);
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) nv[j] += X[i * cols + j] * xv[i];
        for (const p of comps) { let d = 0; for (let j = 0; j < cols; j++) d += nv[j] * p[j]; for (let j = 0; j < cols; j++) nv[j] -= d * p[j]; }
        let n = 0; for (let j = 0; j < cols; j++) n += nv[j] * nv[j]; n = Math.sqrt(n) || 1; v = nv.map(x => x / n);
      }
      comps.push(v);
    }
    const pts = [];
    for (let i = 0; i < rows; i++) { let a = 0, b = 0; for (let j = 0; j < cols; j++) { a += X[i * cols + j] * comps[0][j]; b += X[i * cols + j] * comps[1][j]; } pts.push([a, b]); }
    return pts;
  }
  onmessage = (e) => {
    const m = e.data;
    if (m.type === 'embeds') {
      postMessage({ type: 'embeds', pts: pca2(model.wte.d, cfg.V, cfg.C), vocab: tok.itos, step: model.step });
    } else if (m.type === 'fullatt') {
      const ctx = tok.encode(m.text).slice(-cfg.Tctx); if (ctx.length < 2) return;
      const out = model.forward(ctx, 1, ctx.length, null);
      postMessage({ type: 'fullatt', att: out.atts.map(P => Array.from(P)), H: cfg.H, n: ctx.length, ctx: ctx.map(i => tok.itos[i]) });
    } else if (m.type === 'stream') {
      let ctx = tok.encode(m.text); if (!ctx.length) ctx = [tok.stoi['\n'] || 0];
      const outs = [];
      for (let i = 0; i < (m.n || 160); i++) { const { probs } = model.predict(ctx, m.temp || 0.8); let r = rng.next(), k = 0;
        for (; k < probs.length - 1; k++) { r -= probs[k]; if (r <= 0) break; }
        let ent = 0; for (const p of probs) if (p > 0) ent -= p * Math.log(p);
        ctx.push(k); outs.push([tok.itos[k], probs[k], ent]); }
      postMessage({ type: 'stream', chars: outs, id: m.id });
    } else if (m.type === 'story') {
      const ctx = tok.encode(m.text).slice(-cfg.Tctx); if (!ctx.length) return;
      const r = model.predict(ctx, 1);
      const emb = Array.from(model.wte.d.subarray(ctx[ctx.length - 1] * cfg.C, ctx[ctx.length - 1] * cfg.C + cfg.C));
      const top = Array.from(r.probs).map((p, i) => [tok.itos[i], p]).sort((a, b) => b[1] - a[1]).slice(0, 6);
      postMessage({ type: 'story', ids: ctx, chars: ctx.map(i => tok.itos[i]), emb, att: r.att, top });
    } else base(e);
  };
})();
