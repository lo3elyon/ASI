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
