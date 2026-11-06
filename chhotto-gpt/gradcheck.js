const E=require('./engine.js');
const cfg={V:7,Tctx:5,C:8,H:2,L:2,seed:3};
const m=new E.GPT(cfg);
// perturb biases/gains so they're non-trivial
const r=new E.RNG(9); for(const p of m.params) for(let i=0;i<p.d.length;i++) p.d[i]+= (r.next()-.5)*0.3;
const B=2,Tl=5, idx=[], tgt=[]; for(let i=0;i<B*Tl;i++){idx.push(Math.floor(r.next()*7));tgt.push(Math.floor(r.next()*7));}
for(const p of m.params) p.g=null;
E._ops.setTape([]); const out=m.forward(idx,B,Tl,tgt); const tape=E._ops.getTape(); E._ops.setTape(null);
for(let i=tape.length-1;i>=0;i--) tape[i]();
// float64 not available; use eps
let worst=0;
m.params.forEach((p,k)=>{ for(let t=0;t<4;t++){ const i=Math.floor(r.next()*p.d.length); const o=p.d[i];
  p.d[i]=o+1e-2; const lp=m.forward(idx,B,Tl,tgt).loss; p.d[i]=o-1e-2; const lm=m.forward(idx,B,Tl,tgt).loss; p.d[i]=o;
  const num=(lp-lm)/2e-2, an=p.g?p.g[i]:0; const rel=Math.abs(num-an)/Math.max(1e-3,Math.abs(num)+Math.abs(an)); if(rel>worst)worst=rel;
  if(rel>0.05) console.log('param',k,i,num,an); }});
console.log('loss',out.loss,'worst rel err',worst);
