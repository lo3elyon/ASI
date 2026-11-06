// node pretrain.js corpus.txt seconds -> checkpoint.json (int8-quantised weights, same cfg as the page)
const E = require('./engine.js'); const fs = require('fs');
const text = fs.readFileSync(process.argv[2] || 'corpus.txt', 'utf8'); const secs = +(process.argv[3] || 600);
const tok = new E.Tokenizer(text); const all = tok.encode(text); const cut = Math.floor(all.length * 0.92);
const data = all.slice(0, cut), val = all.slice(cut);
const cfg = { V: tok.itos.length, Tctx: 32, C: 64, H: 4, L: 2, seed: 1337 };
const m = new E.GPT(cfg); const r = new E.RNG(7); const B = 16, Tl = 32, t0 = Date.now();
const batch = (src) => { const idx = [], tg = []; for (let b = 0; b < B; b++) { const o = Math.floor(r.next() * (src.length - Tl - 1)); for (let t = 0; t < Tl; t++) { idx.push(src[o + t]); tg.push(src[o + t + 1]); } } return { idx, tg }; };
let s = 0, ema = null; const log = [];
while ((Date.now() - t0) / 1000 < secs) {
  const frac = (Date.now() - t0) / 1000 / secs; const lr = 3e-3 * Math.min(1, (s + 1) / 100) * (0.1 + 0.9 * 0.5 * (1 + Math.cos(Math.PI * frac)));
  const { idx, tg } = batch(data); const o = m.trainStep(idx, tg, B, Tl, lr); s++; ema = ema == null ? o.loss : ema * 0.98 + o.loss * 0.02;
  if (s % 250 === 0) { const v = batch(val); const vl = m.forward(v.idx, B, Tl, v.tg).loss; log.push([s, +ema.toFixed(3), +vl.toFixed(3)]); console.log(s, ema.toFixed(3), vl.toFixed(3)); }
}
const q = m.params.map(p => { let mx = 0; for (const x of p.d) mx = Math.max(mx, Math.abs(x)); const sc = (mx || 1) / 127;
  const b = Buffer.alloc(p.d.length); p.d.forEach((x, i) => b.writeInt8(Math.max(-127, Math.min(127, Math.round(x / sc))), i)); return { s: sc, q: b.toString('base64') }; });
fs.writeFileSync('checkpoint.json', JSON.stringify({ cfg, step: m.step, w: q }));
fs.writeFileSync('pretrain-log.json', JSON.stringify(log));
// sample with quantised weights to verify
const m2 = new E.GPT(cfg); m2.load({ step: m.step, w: q.map(t => { const b = Buffer.from(t.q, 'base64'); return Float32Array.from(b, (v) => (v > 127 ? v - 256 : v) * t.s); }) });
let ctx = tok.encode('আমার'); for (let i = 0; i < 300; i++) { const { probs } = m2.predict(ctx, 0.75); let x = r.next(), k = 0; for (; k < probs.length - 1; k++) { x -= probs[k]; if (x <= 0) break; } ctx.push(k); }
console.log('steps', m.step, '\n' + tok.decode(ctx));
