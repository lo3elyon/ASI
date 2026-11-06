/* ছোট্ট-GPT engine — a from-scratch tensor autograd + GPT in plain JavaScript.
   No libraries. Runs in a browser Web Worker or in Node.
   Author: built for Aniruddha Adak (lo3elyon/ASI). MIT. */
(function (root) {
  'use strict';

  // ---------- deterministic RNG ----------
  function RNG(seed) { this.s = seed >>> 0 || 1; }
  RNG.prototype.next = function () { // xorshift32 -> [0,1)
    let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0;
    return this.s / 4294967296;
  };
  RNG.prototype.normal = function () {
    let u = 0, v = 0; while (u === 0) u = this.next(); v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // ---------- Tensor ----------
  let TAPE = null; // array of backward closures while recording
  function T(rows, cols, data) {
    this.r = rows; this.c = cols;
    this.d = data || new Float32Array(rows * cols);
    this.g = null;
  }
  T.prototype.grad = function () { if (!this.g) this.g = new Float32Array(this.d.length); return this.g; };
  function rec(fn) { if (TAPE) TAPE.push(fn); }

  // X(n,k) @ W(k,m) -> (n,m)
  function matmul(X, W) {
    const n = X.r, k = X.c, m = W.c, Y = new T(n, m), x = X.d, w = W.d, y = Y.d;
    for (let i = 0; i < n; i++) {
      const yo = i * m, xo = i * k;
      for (let p = 0; p < k; p++) {
        const a = x[xo + p]; if (a === 0) continue; const wo = p * m;
        for (let j = 0; j < m; j++) y[yo + j] += a * w[wo + j];
      }
    }
    rec(() => {
      const gy = Y.g; if (!gy) return; const gx = X.grad(), gw = W.grad();
      for (let i = 0; i < n; i++) {
        const yo = i * m, xo = i * k;
        for (let p = 0; p < k; p++) {
          const wo = p * m, a = x[xo + p]; let s = 0;
          for (let j = 0; j < m; j++) { const g = gy[yo + j]; s += g * w[wo + j]; gw[wo + j] += a * g; }
          gx[xo + p] += s;
        }
      }
    });
    return Y;
  }
  // add row-vector bias b(1,m)
  function addBias(X, b) {
    const Y = new T(X.r, X.c), m = X.c;
    for (let i = 0; i < X.d.length; i++) Y.d[i] = X.d[i] + b.d[i % m];
    rec(() => { const g = Y.g; if (!g) return; const gx = X.grad(), gb = b.grad();
      for (let i = 0; i < g.length; i++) { gx[i] += g[i]; gb[i % m] += g[i]; } });
    return Y;
  }
  function add(A, B) {
    const Y = new T(A.r, A.c);
    for (let i = 0; i < A.d.length; i++) Y.d[i] = A.d[i] + B.d[i];
    rec(() => { const g = Y.g; if (!g) return; const ga = A.grad(), gb = B.grad();
      for (let i = 0; i < g.length; i++) { ga[i] += g[i]; gb[i] += g[i]; } });
    return Y;
  }
  // tokens + positions embedding: idx(B*T) -> (B*T, C)
  function embed(idx, Tlen, wte, wpe) {
    const N = idx.length, C = wte.c, Y = new T(N, C);
    for (let i = 0; i < N; i++) {
      const to = idx[i] * C, po = (i % Tlen) * C, yo = i * C;
      for (let j = 0; j < C; j++) Y.d[yo + j] = wte.d[to + j] + wpe.d[po + j];
    }
    rec(() => { const g = Y.g; if (!g) return; const gt = wte.grad(), gp = wpe.grad();
      for (let i = 0; i < N; i++) { const to = idx[i] * C, po = (i % Tlen) * C, yo = i * C;
        for (let j = 0; j < C; j++) { gt[to + j] += g[yo + j]; gp[po + j] += g[yo + j]; } } });
    return Y;
  }
  function layernorm(X, gam, bet) {
    const n = X.r, C = X.c, Y = new T(n, C), xh = new Float32Array(n * C), rs = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * C; let mu = 0; for (let j = 0; j < C; j++) mu += X.d[o + j]; mu /= C;
      let v = 0; for (let j = 0; j < C; j++) { const t = X.d[o + j] - mu; v += t * t; } v /= C;
      const r = 1 / Math.sqrt(v + 1e-5); rs[i] = r;
      for (let j = 0; j < C; j++) { const h = (X.d[o + j] - mu) * r; xh[o + j] = h; Y.d[o + j] = h * gam.d[j] + bet.d[j]; }
    }
    rec(() => { const g = Y.g; if (!g) return; const gx = X.grad(), gg = gam.grad(), gb = bet.grad();
      for (let i = 0; i < n; i++) { const o = i * C; let s1 = 0, s2 = 0;
        for (let j = 0; j < C; j++) { const dh = g[o + j] * gam.d[j]; s1 += dh; s2 += dh * xh[o + j];
          gg[j] += g[o + j] * xh[o + j]; gb[j] += g[o + j]; }
        for (let j = 0; j < C; j++) { const dh = g[o + j] * gam.d[j];
          gx[o + j] += rs[i] * (dh - s1 / C - xh[o + j] * s2 / C); } } });
    return Y;
  }
  function gelu(X) {
    const Y = new T(X.r, X.c), k = Math.sqrt(2 / Math.PI), th = new Float32Array(X.d.length);
    for (let i = 0; i < X.d.length; i++) { const x = X.d[i], t = Math.tanh(k * (x + 0.044715 * x * x * x)); th[i] = t; Y.d[i] = 0.5 * x * (1 + t); }
    rec(() => { const g = Y.g; if (!g) return; const gx = X.grad();
      for (let i = 0; i < g.length; i++) { const x = X.d[i], t = th[i];
        const dt = (1 - t * t) * k * (1 + 3 * 0.044715 * x * x);
        gx[i] += g[i] * (0.5 * (1 + t) + 0.5 * x * dt); } });
    return Y;
  }
  // fused causal multi-head attention. QKV(B*T, 3C) -> (B*T, C); returns att probs too
  function attention(QKV, B, Tl, C, H) {
    const hs = C / H, sc = 1 / Math.sqrt(hs), Y = new T(B * Tl, C), q = QKV.d, C3 = 3 * C;
    const P = new Float32Array(B * H * Tl * Tl);
    for (let b = 0; b < B; b++) for (let h = 0; h < H; h++) for (let t = 0; t < Tl; t++) {
      const qo = (b * Tl + t) * C3 + h * hs, po = ((b * H + h) * Tl + t) * Tl;
      let mx = -1e30;
      for (let s = 0; s <= t; s++) { const ko = (b * Tl + s) * C3 + C + h * hs; let d = 0;
        for (let j = 0; j < hs; j++) d += q[qo + j] * q[ko + j]; d *= sc; P[po + s] = d; if (d > mx) mx = d; }
      let z = 0; for (let s = 0; s <= t; s++) { const e = Math.exp(P[po + s] - mx); P[po + s] = e; z += e; }
      const yo = (b * Tl + t) * C + h * hs;
      for (let s = 0; s <= t; s++) { const p = P[po + s] / z; P[po + s] = p; const vo = (b * Tl + s) * C3 + 2 * C + h * hs;
        for (let j = 0; j < hs; j++) Y.d[yo + j] += p * q[vo + j]; }
    }
    rec(() => { const g = Y.g; if (!g) return; const gq = QKV.grad(); const dp = new Float32Array(Tl);
      for (let b = 0; b < B; b++) for (let h = 0; h < H; h++) for (let t = 0; t < Tl; t++) {
        const qo = (b * Tl + t) * C3 + h * hs, po = ((b * H + h) * Tl + t) * Tl, yo = (b * Tl + t) * C + h * hs;
        let dot = 0;
        for (let s = 0; s <= t; s++) { const vo = (b * Tl + s) * C3 + 2 * C + h * hs, p = P[po + s]; let d = 0;
          for (let j = 0; j < hs; j++) { d += g[yo + j] * q[vo + j]; gq[vo + j] += p * g[yo + j]; }
          dp[s] = d; dot += d * p; }
        for (let s = 0; s <= t; s++) { const ds = P[po + s] * (dp[s] - dot) * sc; if (ds === 0) continue;
          const ko = (b * Tl + s) * C3 + C + h * hs;
          for (let j = 0; j < hs; j++) { gq[qo + j] += ds * q[ko + j]; gq[ko + j] += ds * q[qo + j]; } }
      } });
    return { out: Y, probs: P };
  }
  // logits(N,V), targets -> mean CE loss (scalar), gradient seeded on backward
  function crossEntropy(L, tgt) {
    const N = L.r, V = L.c, probs = new Float32Array(N * V); let loss = 0;
    for (let i = 0; i < N; i++) { const o = i * V; let mx = -1e30;
      for (let j = 0; j < V; j++) if (L.d[o + j] > mx) mx = L.d[o + j];
      let z = 0; for (let j = 0; j < V; j++) { const e = Math.exp(L.d[o + j] - mx); probs[o + j] = e; z += e; }
      for (let j = 0; j < V; j++) probs[o + j] /= z;
      loss -= Math.log(probs[o + tgt[i]] + 1e-12); }
    rec(() => { const gl = L.grad();
      for (let i = 0; i < N; i++) { const o = i * V;
        for (let j = 0; j < V; j++) gl[o + j] += (probs[o + j] - (j === tgt[i] ? 1 : 0)) / N; } });
    return loss / N;
  }

  // ---------- GPT ----------
  function GPT(cfg) {
    this.cfg = cfg; const { V, Tctx, C, L } = cfg; const rng = new RNG(cfg.seed || 1337);
    const P = (r, c, std) => { const t = new T(r, c); if (std) for (let i = 0; i < t.d.length; i++) t.d[i] = rng.normal() * std; return t; };
    const ones = (n) => { const t = new T(1, n); t.d.fill(1); return t; };
    this.wte = P(V, C, 0.02); this.wpe = P(Tctx, C, 0.02);
    this.blocks = [];
    for (let l = 0; l < L; l++) this.blocks.push({
      ln1g: ones(C), ln1b: P(1, C), wqkv: P(C, 3 * C, 0.02), bqkv: P(1, 3 * C),
      wo: P(C, C, 0.02 / Math.sqrt(2 * L)), bo: P(1, C),
      ln2g: ones(C), ln2b: P(1, C), w1: P(C, 4 * C, 0.02), b1: P(1, 4 * C),
      w2: P(4 * C, C, 0.02 / Math.sqrt(2 * L)), b2: P(1, C) });
    this.lnfg = ones(C); this.lnfb = P(1, C); this.whead = P(C, V, 0.02);
    this.params = [this.wte, this.wpe];
    for (const b of this.blocks) for (const k of Object.keys(b)) this.params.push(b[k]);
    this.params.push(this.lnfg, this.lnfb, this.whead);
    this.m = this.params.map(p => new Float32Array(p.d.length));
    this.v = this.params.map(p => new Float32Array(p.d.length));
    this.step = 0;
  }
  GPT.prototype.nParams = function () { return this.params.reduce((a, p) => a + p.d.length, 0); };
  GPT.prototype.forward = function (idx, B, Tl, targets) {
    const { C, H } = this.cfg; const atts = [];
    let x = embed(idx, Tl, this.wte, this.wpe);
    for (const b of this.blocks) {
      const a = attention(addBias(matmul(layernorm(x, b.ln1g, b.ln1b), b.wqkv), b.bqkv), B, Tl, C, H);
      atts.push(a.probs);
      x = add(x, addBias(matmul(a.out, b.wo), b.bo));
      x = add(x, addBias(matmul(gelu(addBias(matmul(layernorm(x, b.ln2g, b.ln2b), b.w1), b.b1)), b.w2), b.b2));
    }
    const logits = matmul(layernorm(x, this.lnfg, this.lnfb), this.whead);
    const loss = targets ? crossEntropy(logits, targets) : null;
    return { logits, loss, atts };
  };
  GPT.prototype.trainStep = function (idx, tgt, B, Tl, lr) {
    for (const p of this.params) p.g = null;
    TAPE = []; const out = this.forward(idx, B, Tl, tgt); const tape = TAPE; TAPE = null;
    for (let i = tape.length - 1; i >= 0; i--) tape[i]();
    // global grad-norm clip at 1.0, then AdamW
    let gn = 0; for (const p of this.params) if (p.g) for (let i = 0; i < p.g.length; i++) gn += p.g[i] * p.g[i];
    gn = Math.sqrt(gn); const clip = gn > 1 ? 1 / gn : 1;
    this.step++; const b1 = 0.9, b2 = 0.99, eps = 1e-8, wd = 0.01, t = this.step;
    const c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
    this.params.forEach((p, k) => { if (!p.g) return; const m = this.m[k], v = this.v[k], decay = p.r > 1;
      for (let i = 0; i < p.d.length; i++) { const g = p.g[i] * clip;
        m[i] = b1 * m[i] + (1 - b1) * g; v[i] = b2 * v[i] + (1 - b2) * g * g;
        p.d[i] -= lr * ((m[i] / c1) / (Math.sqrt(v[i] / c2) + eps) + (decay ? wd * p.d[i] : 0)); } });
    return { loss: out.loss, gradNorm: gn };
  };
  // next-token distribution for a context (array of ids); returns probs + attention of last token
  GPT.prototype.predict = function (ctx, temperature) {
    const Tl = Math.min(ctx.length, this.cfg.Tctx); const idx = ctx.slice(ctx.length - Tl);
    const { logits, atts } = this.forward(idx, 1, Tl, null); const V = this.cfg.V, o = (Tl - 1) * V;
    const temp = Math.max(temperature || 1, 1e-3); let mx = -1e30;
    for (let j = 0; j < V; j++) mx = Math.max(mx, logits.d[o + j] / temp);
    const p = new Float32Array(V); let z = 0;
    for (let j = 0; j < V; j++) { p[j] = Math.exp(logits.d[o + j] / temp - mx); z += p[j]; }
    for (let j = 0; j < V; j++) p[j] /= z;
    const H = this.cfg.H; const lastAtt = atts.map(P => { const rows = [];
      for (let h = 0; h < H; h++) rows.push(Array.from(P.subarray((h * Tl + Tl - 1) * Tl, (h * Tl + Tl - 1) * Tl + Tl))); return rows; });
    return { probs: p, att: lastAtt, ctxIdx: idx };
  };
  GPT.prototype.export = function () { return { cfg: this.cfg, step: this.step, w: this.params.map(p => Array.from(p.d, x => Math.round(x * 1e5) / 1e5)) }; };
  GPT.prototype.load = function (o) { o.w.forEach((a, k) => this.params[k].d.set(a)); this.step = o.step || 0; };

  // ---------- Bengali-aware tokenizer (characters; grapheme helpers for display) ----------
  function Tokenizer(text) {
    const set = Array.from(new Set(Array.from(text))).sort();
    this.itos = set; this.stoi = {}; set.forEach((ch, i) => this.stoi[ch] = i);
  }
  Tokenizer.prototype.encode = function (s) { return Array.from(s).filter(c => c in this.stoi).map(c => this.stoi[c]); };
  Tokenizer.prototype.decode = function (a) { return a.map(i => this.itos[i]).join(''); };

  const api = { RNG, T, GPT, Tokenizer, _ops: { matmul, addBias, add, layernorm, gelu, attention, crossEntropy, embed, setTape: (t) => { TAPE = t; }, getTape: () => TAPE } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ChhottoGPT = api;
})(typeof self !== 'undefined' ? self : this);
