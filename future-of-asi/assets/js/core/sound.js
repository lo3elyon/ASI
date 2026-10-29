/* Optional soft UI sounds and an ambient pad, made with WebAudio. Off by default. No audio files. */
import { store } from "../util.js";

let ac = null, master = null, pad = null;
const on = () => document.documentElement.classList.contains("snd");

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}

export function ui(kind = "tick") {
  if (!on()) return;
  const a = ctx(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  const f = { tick: 880, open: 520, close: 392, success: 660, error: 220, flip: 740 }[kind] || 660;
  o.type = kind === "error" ? "triangle" : "sine";
  o.frequency.setValueAtTime(f, t);
  if (kind === "open" || kind === "success") o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.12);
  if (kind === "close") o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(kind === "tick" ? 0.035 : 0.06, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "success" ? 0.5 : 0.18));
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.6);
  if (kind === "success") { const o2 = a.createOscillator(), g2 = a.createGain(); o2.frequency.value = f * 1.25; g2.gain.setValueAtTime(0.0001, t + 0.1); g2.gain.exponentialRampToValueAtTime(0.04, t + 0.14); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); o2.connect(g2); g2.connect(master); o2.start(t + 0.1); o2.stop(t + 0.8); }
}

function startPad() {
  const a = ctx(); if (!a || pad) return;
  const out = a.createGain(); out.gain.setValueAtTime(0.0001, a.currentTime); out.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 3);
  const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 0.4;
  const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.05; lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  const notes = [110, 164.81, 220, 277.18, 329.63];
  const oscs = notes.map((n, i) => { const o = a.createOscillator(); o.type = i % 2 ? "sine" : "triangle"; o.frequency.value = n; o.detune.value = (i - 2) * 4; const g = a.createGain(); g.gain.value = 0.18 / (i + 1); o.connect(g); g.connect(lp); o.start(); return o; });
  lp.connect(out); out.connect(master);
  pad = { out, oscs, lfo };
}
function stopPad() {
  if (!pad || !ac) return;
  const p = pad; pad = null;
  p.out.gain.cancelScheduledValues(ac.currentTime);
  p.out.gain.setValueAtTime(p.out.gain.value, ac.currentTime);
  p.out.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
  setTimeout(() => { p.oscs.forEach((o) => o.stop()); p.lfo.stop(); }, 1400);
}

export function setSound(v) {
  const prefs = store.get("prefs", {});
  prefs.sound = v ? "on" : "off"; store.set("prefs", prefs);
  document.documentElement.classList.toggle("snd", v);
  if (v) { startPad(); ui("success"); } else stopPad();
  syncButtons();
}
export function syncButtons() {
  const v = on();
  const b = document.getElementById("soundBtn");
  if (b) { b.setAttribute("aria-pressed", v); b.setAttribute("aria-label", v ? "Sound on. Turn off sounds and music" : "Sound off. Turn on soft sounds and ambient music"); }
  const s = document.getElementById("soundSw"); if (s) s.setAttribute("aria-checked", v);
}
export function initSound() {
  syncButtons();
  const toggle = () => setSound(!on());
  document.getElementById("soundBtn")?.addEventListener("click", toggle);
  document.getElementById("soundSw")?.addEventListener("click", toggle);
  // A saved "on" preference still needs a user gesture before audio can start.
  if (on()) { const go = () => { startPad(); removeEventListener("pointerdown", go); removeEventListener("keydown", go); }; addEventListener("pointerdown", go); addEventListener("keydown", go); }
  document.addEventListener("click", (e) => { if (!on()) return; const t = e.target.closest("button, .chip, a.btn"); if (t && !t.closest("#soundBtn")) ui("tick"); }, true);
}
