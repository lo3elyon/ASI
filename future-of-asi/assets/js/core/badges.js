/* Alignment 101 badge emblems: one original SVG emblem per badge, drawn once into an inline sprite.
   Each has its own frame shape, glyph, colour and glow. Locked badges are shown greyscale by CSS. */
const C = { cyan: ["#22d3ee", "#0e7490"], teal: ["#14b8a6", "#0f5f57"], amber: ["#f59e0b", "#92400e"], sky: ["#0ea5e9", "#075985"], emerald: ["#10b981", "#065f46"],
  orange: ["#f97316", "#9a3412"], blue: ["#3b82f6", "#1e3a8a"], red: ["#ef4444", "#7f1d1d"], lime: ["#84cc16", "#3f6212"], yellow: ["#eab308", "#854d0e"] };

/* Frames (100 x 100) */
const F = {
  circle: '<circle cx="50" cy="50" r="40"/>',
  hex: '<path d="M50 8 86 29v42L50 92 14 71V29z"/>',
  oct: '<path d="M34 10h32l24 24v32L66 90H34L10 66V34z"/>',
  shield: '<path d="M50 8 84 20v28c0 22-14 37-34 44C30 85 16 70 16 48V20z"/>',
  diamond: '<path d="M50 6 94 50 50 94 6 50z"/>',
  squircle: '<rect x="12" y="12" width="76" height="76" rx="24"/>',
  pent: '<path d="M50 7 92 38 76 88H24L8 38z"/>',
  burst: '<path d="M50 4l9 14 16-5 1 17 16 6-9 14 9 14-16 6-1 17-16-5-9 14-9-14-16 5-1-17-16-6 9-14-9-14 16-6 1-17 16 5z"/>',
  arch: '<path d="M18 92V44a32 32 0 0 1 64 0v48z"/>',
  flame: '<path d="M50 6c6 16 30 26 30 52a30 30 0 0 1-60 0c0-14 8-22 14-30 2 10 8 14 12 14-4-14 0-26 4-36z"/>',
  crest: '<path d="M50 6 88 22v24c0 24-16 40-38 48C28 86 12 70 12 46V22z"/><path d="M28 70c-8-6-12-16-12-26M72 70c8-6 12-16 12-26" fill="none" stroke-width="3"/>',
  ring2: '<circle cx="50" cy="50" r="42"/><circle cx="50" cy="50" r="33" fill="none" stroke-width="2"/>',
};
/* Glyphs drawn on top, in light strokes */
const G = {
  "first-step": '<path d="M30 70h14V58h12V46h12V34"/><path d="m62 28 8 6-8 6"/>',
  "hands-on": '<circle cx="50" cy="50" r="10"/><path d="M50 26v8M50 66v8M26 50h8M66 50h8M33 33l6 6M61 61l6 6M67 33l-6 6M39 61l-6 6"/>',
  doer: '<path d="m52 24-16 28h14l-4 24 18-30H50z"/><path d="m30 74 6 6 10-12" opacity=".8"/>',
  "threshold-seer": '<path d="M36 74V52a14 14 0 0 1 28 0v22"/><path d="M28 56s8-12 22-12 22 12 22 12-8 12-22 12-22-12-22-12z" opacity=".55"/><circle cx="50" cy="56" r="5" fill="#f0fdfa"/>',
  "token-whisperer": '<path d="M26 32h48v28H46l-12 10v-10h-8z"/><circle cx="38" cy="46" r="3" fill="#f0fdfa"/><circle cx="50" cy="46" r="3" fill="#f0fdfa"/><circle cx="62" cy="46" r="3" fill="#f0fdfa"/>',
  "loophole-hunter": '<circle cx="45" cy="45" r="15"/><path d="m56 56 14 14"/><path d="M38 45c4-6 10-6 14 0s-10 6-14 0" opacity=".8"/>',
  "neuron-detective": '<circle cx="32" cy="36" r="5"/><circle cx="32" cy="64" r="5"/><circle cx="68" cy="50" r="6"/><circle cx="50" cy="28" r="4"/><circle cx="50" cy="72" r="4"/><path d="M37 37l26 11M37 63l26-11M37 36l9-6M37 64l9 6M54 30l10 15M54 70l10-15"/>',
  "blue-team-captain": '<path d="M50 24 66 30v14c0 12-7 19-16 23-9-4-16-11-16-23V30z"/><path d="m50 36 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#f0fdfa" stroke="none"/>',
  "smoke-detector": '<circle cx="50" cy="54" r="6" fill="#f0fdfa"/><path d="M38 42a17 17 0 0 1 24 0M30 34a28 28 0 0 1 40 0" /><path d="M36 70h28" opacity=".7"/>',
  "treaty-weaver": '<circle cx="50" cy="50" r="20"/><path d="M30 50h40M50 30c8 6 8 34 0 40M50 30c-8 6-8 34 0 40"/><path d="M24 70c10-6 42-6 52 0" opacity=".7"/>',
  futurecaster: '<path d="M26 70 42 54l10 8 22-26"/><path d="M64 34h10v10"/><circle cx="42" cy="54" r="3" fill="#f0fdfa"/><circle cx="52" cy="62" r="3" fill="#f0fdfa"/>',
  "steady-hand": '<path d="M24 52h12l6-12 8 24 6-16 4 4h16"/><path d="M34 70c10 6 22 6 32 0" opacity=".7"/>',
  "threshold-guardian": '<path d="M38 72V40h24v32"/><path d="M34 40V30h6v4h6v-4h8v4h6v-4h6v10z"/><path d="M47 72V60a3 3 0 0 1 6 0v12"/>',
  "streak-7": '<text x="50" y="66" text-anchor="middle" font-family="Space Grotesk, Inter, sans-serif" font-weight="700" font-size="34" fill="#f0fdfa" stroke="none">7</text>',
  "streak-30": '<text x="50" y="65" text-anchor="middle" font-family="Space Grotesk, Inter, sans-serif" font-weight="700" font-size="28" fill="#f0fdfa" stroke="none">30</text><path d="M32 76h36" opacity=".7"/>',
  "threshold-keeper": '<circle cx="38" cy="52" r="10"/><path d="M48 52h26M66 52v8M72 52v6"/><path d="m30 30 6 6 6-8 6 8 6-6v10H30z" fill="#f0fdfa" stroke="none" opacity=".9"/>',
  generic: '<path d="m50 28 6 14 15 1-12 10 4 15-13-8-13 8 4-15-12-10 15-1z"/>',
};
export const BADGE_ART = {
  "first-step": ["circle", "cyan"], "hands-on": ["hex", "teal"], doer: ["oct", "amber"], "threshold-seer": ["arch", "sky"],
  "token-whisperer": ["squircle", "emerald"], "loophole-hunter": ["diamond", "orange"], "neuron-detective": ["hex", "blue"],
  "blue-team-captain": ["shield", "red"], "smoke-detector": ["ring2", "lime"], "treaty-weaver": ["pent", "yellow"],
  futurecaster: ["burst", "cyan"], "steady-hand": ["circle", "teal"], "threshold-guardian": ["crest", "emerald"],
  "streak-7": ["flame", "amber"], "streak-30": ["flame", "orange"], "threshold-keeper": ["burst", "lime"],
};
const known = (id) => (BADGE_ART[id] ? id : null);
export const badgeColor = (id, fallback) => (BADGE_ART[id] ? C[BADGE_ART[id][1]][0] : fallback);

function symbol(id) {
  const [shape, col] = BADGE_ART[id] || ["oct", "cyan"];
  const [a, b] = C[col];
  const sid = id.replace(/[^a-z0-9-]/gi, "");
  return `<symbol id="bdg-${sid}" viewBox="0 0 100 100">
    <defs><linearGradient id="bdg-g-${sid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="bdg-h-${sid}" cx=".32" cy=".24" r=".7"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".5" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>
    <g fill="url(#bdg-g-${sid})" stroke="${a}" stroke-width="2.5" stroke-linejoin="round">${F[shape]}</g>
    <g fill="url(#bdg-h-${sid})" stroke="none">${F[shape].replace(/fill="none"[^/]*/g, "")}</g>
    <g fill="none" stroke="#f0fdfa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".95">${G[id] || G.generic}</g>
  </symbol>`;
}
export function ensureSprite() {
  if (document.getElementById("thrBadges")) return;
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.id = "thrBadges"; s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
  s.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  s.innerHTML = Object.keys(BADGE_ART).concat(["generic"]).map(symbol).join("");
  document.body.appendChild(s);
}
export function emblem(id, label = "") {
  ensureSprite();
  const sid = known(id) || "generic";
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${String(label).replace(/"/g, "&quot;")} emblem"><use href="#bdg-${sid}"/></svg>`;
}
