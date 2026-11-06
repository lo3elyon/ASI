"""chhotto_gpt.py - a 1-block Bengali GPT in pure NumPy, under 100 lines, with hand-written backprop.
Usage: python train.py corpus.txt   (trains, then writes Tagore-flavoured Bengali)"""
import sys, numpy as np
text = open(sys.argv[1] if len(sys.argv) > 1 else "corpus.txt", encoding="utf-8").read()
chars = sorted(set(text)); V = len(chars); stoi = {c: i for i, c in enumerate(chars)}
data = np.array([stoi[c] for c in text]); T, C, B, LR, STEPS = 32, 64, 16, 3e-3, 3000
rng = np.random.default_rng(0); n = lambda *s: rng.normal(0, 0.02, s)
P = dict(wte=n(V, C), wpe=n(T, C), wq=n(C, C), wk=n(C, C), wv=n(C, C), wo=n(C, C),
         w1=n(C, 4 * C), b1=np.zeros(4 * C), w2=n(4 * C, C), b2=np.zeros(C), wh=n(C, V))
M = {k: np.zeros_like(v) for k, v in P.items()}; S = {k: np.zeros_like(v) for k, v in P.items()}
mask = np.triu(np.full((T, T), -1e9), 1)

def ln(x):  # parameter-free LayerNorm, returns output and cache
    mu, var = x.mean(-1, keepdims=True), x.var(-1, keepdims=True); r = 1 / np.sqrt(var + 1e-5)
    return (x - mu) * r, r
def ln_back(dy, y, r):
    return r * (dy - dy.mean(-1, keepdims=True) - y * (dy * y).mean(-1, keepdims=True))
def softmax(z):
    z = np.exp(z - z.max(-1, keepdims=True)); return z / z.sum(-1, keepdims=True)

def forward(idx, tgt=None):
    t = idx.shape[1]; x0 = P["wte"][idx] + P["wpe"][:t]
    h1, r1 = ln(x0); q, k, v = h1 @ P["wq"], h1 @ P["wk"], h1 @ P["wv"]
    att = softmax(q @ k.transpose(0, 2, 1) / np.sqrt(C) + mask[:t, :t]); a = att @ v
    x1 = x0 + a @ P["wo"]; h2, r2 = ln(x1); u = h2 @ P["w1"] + P["b1"]; g = np.maximum(u, 0)
    x2 = x1 + g @ P["w2"] + P["b2"]; h3, r3 = ln(x2); logits = h3 @ P["wh"]
    if tgt is None: return logits
    p = softmax(logits); loss = -np.log(np.take_along_axis(p, tgt[..., None], -1) + 1e-9).mean()
    return loss, (idx, x0, h1, r1, q, k, v, att, a, h2, r2, u, g, h3, r3, p, tgt)

def backward(c):
    idx, x0, h1, r1, q, k, v, att, a, h2, r2, u, g, h3, r3, p, tgt = c; G = {}
    dl = p.copy(); np.put_along_axis(dl, tgt[..., None], np.take_along_axis(dl, tgt[..., None], -1) - 1, -1)
    dl /= tgt.size; G["wh"] = np.einsum("btc,btv->cv", h3, dl)
    dx2 = ln_back(dl @ P["wh"].T, h3, r3)
    G["w2"] = np.einsum("bti,btc->ic", g, dx2); G["b2"] = dx2.sum((0, 1))
    du = (dx2 @ P["w2"].T) * (u > 0); G["w1"] = np.einsum("btc,bti->ci", h2, du); G["b1"] = du.sum((0, 1))
    dx1 = dx2 + ln_back(du @ P["w1"].T, h2, r2)
    G["wo"] = np.einsum("btc,btd->cd", a, dx1); da = dx1 @ P["wo"].T
    datt = da @ v.transpose(0, 2, 1); dv = att.transpose(0, 2, 1) @ da
    ds = att * (datt - (datt * att).sum(-1, keepdims=True)) / np.sqrt(C)
    dq, dk = ds @ k, ds.transpose(0, 2, 1) @ q
    G["wq"], G["wk"], G["wv"] = (np.einsum("btc,btd->cd", h1, d) for d in (dq, dk, dv))
    dx0 = dx1 + ln_back(dq @ P["wq"].T + dk @ P["wk"].T + dv @ P["wv"].T, h1, r1)
    G["wte"] = np.zeros_like(P["wte"]); np.add.at(G["wte"], idx, dx0); G["wpe"] = dx0.sum(0)
    return G

def adam(G, t):
    for k in P:
        M[k] = 0.9 * M[k] + 0.1 * G[k]; S[k] = 0.99 * S[k] + 0.01 * G[k] ** 2
        P[k] -= LR * (M[k] / (1 - 0.9 ** t)) / (np.sqrt(S[k] / (1 - 0.99 ** t)) + 1e-8)

def generate(prompt, n=300, temp=0.8):
    ids = [stoi[c] for c in prompt if c in stoi] or [0]
    for _ in range(n):
        pr = softmax(forward(np.array([ids[-T:]]))[0, -1] / temp); ids.append(rng.choice(V, p=pr))
    return "".join(chars[i] for i in ids)

if __name__ == "__main__":
    print(f"vocab {V} | params {sum(v.size for v in P.values()):,} | chars {len(data):,}")
    for step in range(1, STEPS + 1):
        o = rng.integers(0, len(data) - T - 1, B); X = np.stack([data[i:i + T] for i in o])
        Y = np.stack([data[i + 1:i + T + 1] for i in o]); loss, cache = forward(X, Y); adam(backward(cache), step)
        if step % 250 == 0: print(f"step {step:5d}  loss {loss:.3f}  |  {generate('আমার', 60)!r}")
    print(generate("তোমার", 400))
