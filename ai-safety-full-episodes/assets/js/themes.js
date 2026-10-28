/* AI Safety Full Episodes · themes: full palettes developers and researchers love (GitHub, Dracula, Nord, Solarized,
 * One Dark, Tokyo Night, Catppuccin, Gruvbox, Monokai, Material Ocean, Rosé Pine, VS Code Dark+, Graphite, OLED black,
 * Paper white) plus accent-only colours on top of the default dark/light look. Each palette sets background, surfaces,
 * text, muted text, borders, two accents and the focus ring; every one is contrast-checked (WCAG AA: text and muted
 * text at least 4.5:1 on the background and surface, accents and focus ring at least 3:1). Search, favourites,
 * auto-by-time-of-day and a custom accent picker. Amber stays the default. Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const { $, $$, esc } = A;
  const VARS = ["--bg", "--bg2", "--surf", "--surf2", "--solid", "--line", "--line2", "--tx", "--tx2", "--mut", "--amber", "--amber2", "--teal", "--teal2", "--focus"];
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem("asfe:" + k); if (v === null) localStorage.removeItem("asfe:" + k); else localStorage.setItem("asfe:" + k, v); } catch (e) { return null; } };

  /* ---------------------------------------------------------------- colour maths */
  const hex = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const toHex = (rgb) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r}, ${g}, ${b}, ${a})`; };
  function lum(h) { return hex(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  /* nudge a colour toward the text colour until it meets the ratio (used only if a palette value falls short) */
  function ensure(c, bgs, ratio, toward) { let out = c, t = 0; while (bgs.some((b) => contrast(out, b) < ratio) && t < 1) { t += 0.05; out = mix(c, toward, t); } return out; }

  /* ---------------------------------------------------------------- palettes */
  function mk(id, name, mode, c, o) {
    const light = mode === "light";
    const tx = c.tx, bgs = [c.bg, c.solid];
    const v = {
      "--bg": c.bg, "--bg2": c.bg2, "--solid": c.solid, "--surf": rgba(c.solid, light ? 0.8 : 0.72), "--surf2": rgba(c.solid, light ? 0.95 : 0.9),
      "--line": rgba(c.line, light ? 0.9 : 0.85), "--line2": mix(c.line, tx, 0.22),
      "--tx": ensure(tx, bgs, 7, light ? "#000000" : "#ffffff"), "--tx2": ensure(c.tx2, bgs, 4.5, tx), "--mut": ensure(c.mut, bgs, 4.5, tx),
      "--amber": ensure(c.a1, bgs, 3, tx), "--amber2": ensure(c.a1b || mix(c.a1, light ? "#000000" : "#ffffff", 0.2), bgs, 3, tx),
      "--teal": ensure(c.a2, bgs, 3, tx), "--teal2": ensure(c.a2b || mix(c.a2, light ? "#000000" : "#ffffff", 0.2), bgs, 3, tx),
    };
    v["--focus"] = v["--amber"];
    return Object.assign({ id, name, mode, kind: "palette", vars: v, sw: [c.bg, c.solid, c.tx, c.a1, c.a2] }, o || {});
  }
  function acc(id, name, a1, a1b, a2, a2b, o) { return Object.assign({ id, name, kind: "accent", vars: { "--amber": a1, "--amber2": a1b, "--teal": a2, "--teal2": a2b, "--focus": a1 }, sw: [a1, a2] }, o || {}); }
  const THEMES = [
    acc("amber", "Amber (default)", "#f59e0b", "#fbbf24", "#14b8a6", "#2dd4bf", { def: true }),
    acc("teal", "Teal", "#14b8a6", "#2dd4bf", "#f59e0b", "#fbbf24"), acc("emerald", "Emerald", "#10b981", "#34d399", "#38bdf8", "#7dd3fc"),
    acc("sky", "Sky", "#38bdf8", "#7dd3fc", "#34d399", "#6ee7b7"), acc("coral", "Coral", "#fb7154", "#fda48f", "#fbbf24", "#fcd34d"),
    acc("lime", "Lime", "#84cc16", "#a3e635", "#14b8a6", "#2dd4bf"), acc("violet", "Violet (optional)", "#8b5cf6", "#a78bfa", "#22d3ee", "#67e8f9", { opt: true }),
    acc("rose", "Rose (optional)", "#f43f5e", "#fb7185", "#f59e0b", "#fbbf24", { opt: true }),
    acc("indigo", "Indigo", "#6366f1", "#818cf8", "#14b8a6", "#2dd4bf"), acc("blue", "Blue", "#3b82f6", "#60a5fa", "#f59e0b", "#fbbf24"),
    acc("cyan", "Cyan", "#06b6d4", "#22d3ee", "#f59e0b", "#fbbf24"), acc("orange", "Orange", "#f97316", "#fb923c", "#14b8a6", "#2dd4bf"),
    acc("red", "Red", "#ef4444", "#f87171", "#14b8a6", "#2dd4bf"),
    mk("graphite", "Monochrome Graphite", "dark", { bg: "#111214", bg2: "#18191c", solid: "#1e1f23", tx: "#ececec", tx2: "#c4c4c4", mut: "#9d9d9d", line: "#34363b", a1: "#b4b4b4", a1b: "#e4e4e4", a2: "#8f8f8f" }),
    mk("black", "Pure Black (OLED)", "dark", { bg: "#000000", bg2: "#000000", solid: "#0b0b0b", tx: "#f4f4f4", tx2: "#cfcfcf", mut: "#a0a0a0", line: "#262626", a1: "#f59e0b", a1b: "#fbbf24", a2: "#14b8a6" }),
    mk("paper", "Paper White", "light", { bg: "#fbfaf7", bg2: "#f1eee7", solid: "#ffffff", tx: "#16171a", tx2: "#3b3d42", mut: "#5d6068", line: "#dcd7cc", a1: "#b45309", a1b: "#92400e", a2: "#0f766e" }),
    mk("github-dark", "GitHub Dark", "dark", { bg: "#0d1117", bg2: "#010409", solid: "#161b22", tx: "#e6edf3", tx2: "#c9d1d9", mut: "#8b949e", line: "#30363d", a1: "#2f81f7", a1b: "#58a6ff", a2: "#3fb950" }),
    mk("github-light", "GitHub Light", "light", { bg: "#ffffff", bg2: "#f6f8fa", solid: "#ffffff", tx: "#1f2328", tx2: "#424a53", mut: "#59636e", line: "#d0d7de", a1: "#0969da", a1b: "#0550ae", a2: "#1a7f37" }),
    mk("dracula", "Dracula", "dark", { bg: "#282a36", bg2: "#21222c", solid: "#343746", tx: "#f8f8f2", tx2: "#e2e2dc", mut: "#a9b1d6", line: "#44475a", a1: "#bd93f9", a1b: "#d6bcfa", a2: "#50fa7b" }),
    mk("nord", "Nord", "dark", { bg: "#2e3440", bg2: "#272c36", solid: "#3b4252", tx: "#eceff4", tx2: "#d8dee9", mut: "#b0b8c6", line: "#4c566a", a1: "#88c0d0", a1b: "#8fbcbb", a2: "#a3be8c" }),
    mk("solarized-dark", "Solarized Dark", "dark", { bg: "#002b36", bg2: "#00212b", solid: "#073642", tx: "#fdf6e3", tx2: "#eee8d5", mut: "#93a1a1", line: "#0f4d5c", a1: "#b58900", a1b: "#d7a700", a2: "#2aa198" }),
    mk("solarized-light", "Solarized Light", "light", { bg: "#fdf6e3", bg2: "#eee8d5", solid: "#fffbf0", tx: "#073642", tx2: "#2c4a52", mut: "#53676d", line: "#e0d8bf", a1: "#946f00", a1b: "#7a5c00", a2: "#1d7f78" }),
    mk("one-dark", "One Dark", "dark", { bg: "#282c34", bg2: "#21252b", solid: "#2f343e", tx: "#e6e9ef", tx2: "#c3c8d1", mut: "#9ea5b1", line: "#3e4451", a1: "#61afef", a1b: "#8cc4f4", a2: "#98c379" }),
    mk("tokyo-night", "Tokyo Night", "dark", { bg: "#1a1b26", bg2: "#16161e", solid: "#24283b", tx: "#c0caf5", tx2: "#a9b1d6", mut: "#8e97c0", line: "#2f334d", a1: "#7aa2f7", a1b: "#9ab8ff", a2: "#9ece6a" }),
    mk("catppuccin-mocha", "Catppuccin Mocha", "dark", { bg: "#1e1e2e", bg2: "#181825", solid: "#313244", tx: "#cdd6f4", tx2: "#bac2de", mut: "#a6adc8", line: "#45475a", a1: "#cba6f7", a1b: "#e0c8ff", a2: "#94e2d5" }),
    mk("catppuccin-latte", "Catppuccin Latte", "light", { bg: "#eff1f5", bg2: "#e6e9ef", solid: "#ffffff", tx: "#4c4f69", tx2: "#5c5f77", mut: "#5f6278", line: "#ccd0da", a1: "#8839ef", a1b: "#7028d4", a2: "#137e85" }),
    mk("gruvbox", "Gruvbox", "dark", { bg: "#282828", bg2: "#1d2021", solid: "#32302f", tx: "#ebdbb2", tx2: "#d5c4a1", mut: "#b3a48f", line: "#504945", a1: "#fabd2f", a1b: "#fcd679", a2: "#8ec07c" }),
    mk("monokai", "Monokai", "dark", { bg: "#272822", bg2: "#1e1f1c", solid: "#31322c", tx: "#f8f8f2", tx2: "#e6e6dc", mut: "#b0aa8f", line: "#49483e", a1: "#a6e22e", a1b: "#c4f05f", a2: "#66d9ef" }),
    mk("material-ocean", "Material Ocean", "dark", { bg: "#0f111a", bg2: "#090b10", solid: "#1a1c25", tx: "#e6e9f0", tx2: "#a6accd", mut: "#8f93a8", line: "#272a3a", a1: "#80cbc4", a1b: "#a7e0db", a2: "#ffcb6b" }),
    mk("rose-pine", "Rosé Pine (optional)", "dark", { bg: "#191724", bg2: "#1f1d2e", solid: "#26233a", tx: "#e0def4", tx2: "#c8c5e0", mut: "#9d99b8", line: "#3a3653", a1: "#ebbcba", a1b: "#f3d5d3", a2: "#9ccfd8" }, { opt: true }),
    mk("vscode-dark", "VS Code Dark+", "dark", { bg: "#1e1e1e", bg2: "#181818", solid: "#252526", tx: "#d4d4d4", tx2: "#cccccc", mut: "#a0a0a0", line: "#3c3c3c", a1: "#3794ff", a1b: "#75beff", a2: "#4ec9b0" }),
  ];
  const byId = new Map(THEMES.map((t) => [t.id, t]));

  /* ---------------------------------------------------------------- contrast report */
  function audit(t) {
    const v = t.vars, bgs = t.kind === "palette" ? [v["--bg"], v["--solid"]] : null;
    if (!bgs) { const bgD = ["#070b12", "#101827"]; return { ok: [v["--amber"], v["--teal"]].every((c) => bgD.every((b) => contrast(c, b) >= 3)), min: Math.min(...[v["--amber"], v["--teal"]].flatMap((c) => bgD.map((b) => contrast(c, b)))) }; }
    const r = { tx: Math.min(...bgs.map((b) => contrast(v["--tx"], b))), tx2: Math.min(...bgs.map((b) => contrast(v["--tx2"], b))), mut: Math.min(...bgs.map((b) => contrast(v["--mut"], b))), acc: Math.min(...bgs.map((b) => contrast(v["--amber"], b))), acc2: Math.min(...bgs.map((b) => contrast(v["--teal"], b))) };
    r.ok = r.tx >= 4.5 && r.tx2 >= 4.5 && r.mut >= 4.5 && r.acc >= 3 && r.acc2 >= 3;
    return r;
  }

  /* ---------------------------------------------------------------- apply + persist (boot.js re-applies the saved vars before first paint) */
  const root = () => document.documentElement;
  function clearVars() { VARS.forEach((k) => root().style.removeProperty(k)); }
  function setVars(v) { Object.keys(v).forEach((k) => root().style.setProperty(k, v[k])); }
  function current() { return LS("palette") || LS("accent") || "amber"; }
  function apply(id, o) {
    o = o || {};
    const t = id === "custom" ? custom(LS("customAccent") || "#f59e0b") : byId.get(id) || byId.get("amber");
    clearVars();
    if (t.kind === "palette") {
      root().setAttribute("data-palette", t.id); root().setAttribute("data-theme", t.mode);
      setVars(t.vars);
      if (!o.preview) { LS("palette", t.id); LS("paletteVars", JSON.stringify({ mode: t.mode, vars: t.vars })); LS(t.mode === "light" ? "autoDay" : "autoNight", t.id); }
    } else {
      root().removeAttribute("data-palette");
      if (!o.keepMode) { const pref = root().getAttribute("data-theme-pref") || "system"; const dark = pref === "dark" || (pref === "system" && !(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)); root().setAttribute("data-theme", dark ? "dark" : "light"); }
      root().setAttribute("data-accent", t.id === "custom" ? "custom" : t.id);
      if (t.id !== "amber") setVars(t.vars);
      if (!o.preview) { LS("palette", null); LS("paletteVars", t.id === "amber" ? null : JSON.stringify({ mode: null, vars: t.vars })); LS("accent", t.id); }
    }
    const m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", (t.vars && t.vars["--bg"]) || (root().getAttribute("data-theme") === "light" ? "#f5f7fa" : "#070b12"));
    $$("[data-thset]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.thset === t.id)));
    $$("[data-accent-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.accentSet === t.id)));
    return t;
  }
  function custom(c) {
    if (!/^#[0-9a-f]{6}$/i.test(c)) c = "#f59e0b";
    return { id: "custom", name: "Custom accent", kind: "accent", vars: { "--amber": c, "--amber2": mix(c, "#ffffff", 0.25), "--teal": "#14b8a6", "--teal2": "#2dd4bf", "--focus": c }, sw: [c, "#14b8a6"] };
  }
  /* auto by time of day: a light palette 07:00 to 18:59, a dark one otherwise (the last light and dark ones you picked) */
  function autoTick() {
    if (LS("themeAuto") !== "1") return;
    const hr = new Date().getHours(); const day = hr >= 7 && hr < 19;
    const id = day ? LS("autoDay") || "paper" : LS("autoNight") || "amber";
    const cur = root().getAttribute("data-palette") || root().getAttribute("data-accent") || "amber";
    if (cur !== id) { const keep = { day: LS("autoDay"), night: LS("autoNight") }; apply(id); if (keep.day) LS("autoDay", keep.day); if (keep.night) LS("autoNight", keep.night); if (!day && id === "amber") root().setAttribute("data-theme", "dark"); }
  }
  setInterval(autoTick, 10 * 60e3);

  /* ---------------------------------------------------------------- picker */
  const favs = () => { try { return JSON.parse(LS("themeFavs") || "[]"); } catch (e) { return []; } };
  function tile(t, cur, fv) {
    const v = t.vars, a = audit(t);
    const bg = t.kind === "palette" ? v["--bg"] : "var(--bg)", sf = t.kind === "palette" ? v["--solid"] : "var(--solid)", tx = t.kind === "palette" ? v["--tx"] : "var(--tx)";
    return `<div class="tht__w"><button type="button" class="tht" data-thset="${t.id}" aria-pressed="${cur === t.id}" title="${esc(t.name)}${a.ok ? " · WCAG AA" : ""}">
      <span class="tht__pv" style="background:${bg}"><i style="background:${tx}"></i><i style="background:${t.kind === "palette" ? v["--mut"] : "var(--mut)"}"></i><em style="background:linear-gradient(135deg, ${v["--amber"]} 50%, ${v["--teal"]} 50%)"></em><u style="background:${sf};box-shadow:inset 3px 0 0 ${v["--amber"]}"></u></span>
      <b>${esc(t.name)}</b><small>${t.kind === "palette" ? (t.mode === "light" ? "Light palette" : "Dark palette") : "Accent"}${a.ok ? " · AA ✓" : ""}</small></button>
      <button type="button" class="tht__fav" data-thfav="${t.id}" aria-pressed="${fv.includes(t.id)}" aria-label="${fv.includes(t.id) ? "Remove from" : "Add to"} favourite themes">${fv.includes(t.id) ? "★" : "☆"}</button></div>`;
  }
  let q = "";
  function gridHTML() {
    const cur = root().getAttribute("data-palette") || (LS("accent") || "amber"), fv = favs();
    const f = (t) => !q || (t.name + " " + t.id + " " + (t.mode || "accent")).toLowerCase().includes(q.toLowerCase());
    const fav = THEMES.filter((t) => fv.includes(t.id) && f(t));
    const pal = THEMES.filter((t) => t.kind === "palette" && f(t)), ac = THEMES.filter((t) => t.kind === "accent" && f(t));
    return (fav.length ? `<p class="thp__sec">★ Favourites</p>${fav.map((t) => tile(t, cur, fv)).join("")}` : "") +
      (ac.length ? `<p class="thp__sec">Accent colours (default look)</p>${ac.map((t) => tile(t, cur, fv)).join("")}` : "") +
      (pal.length ? `<p class="thp__sec">Full palettes</p>${pal.map((t) => tile(t, cur, fv)).join("")}` : "") +
      (!fav.length && !pal.length && !ac.length ? `<p class="muted">No theme matches “${esc(q)}”.</p>` : "");
  }
  function pickerHTML() {
    return `<div class="thp" id="themePicker"><div class="thp__bar"><input class="input input--sm" type="search" id="thQ" placeholder="Search themes (Nord, Dracula, light…)" value="${esc(q)}" aria-label="Search themes">
      <label class="switch"><input type="checkbox" id="thAuto" ${LS("themeAuto") === "1" ? "checked" : ""}><span></span>Auto by time of day</label>
      <label class="thp__custom">Custom accent <input type="color" id="thCustom" value="${esc(LS("customAccent") || "#f59e0b")}" aria-label="Pick a custom accent colour"></label><small class="muted" id="thCustomNote"></small>
      <button type="button" class="btn btn--sm btn--ghost" data-thset="amber">Reset to amber</button></div>
      <div class="thp__grid" id="thGrid" role="group" aria-label="Themes">${gridHTML()}</div></div>`;
  }
  document.addEventListener("click", (ev) => {
    const fb = ev.target.closest && ev.target.closest("[data-thfav]");
    if (fb) { ev.stopPropagation(); const id = fb.dataset.thfav; const f = favs(); const i = f.indexOf(id); i >= 0 ? f.splice(i, 1) : f.push(id); LS("themeFavs", JSON.stringify(f)); const g = $("#thGrid"); if (g) g.innerHTML = gridHTML(); A.fx && i < 0 && A.fx.celebrate("rate", fb, true); return; }
    const b = ev.target.closest && ev.target.closest("[data-thset]"); if (!b) return;
    ev.preventDefault();
    const y = window.scrollY, t = apply(b.dataset.thset);
    if (window.scrollY !== y) window.scrollTo(0, y);
    if (LS("themeAuto") === "1" && ev.isTrusted) { LS("themeAuto", null); const a = $("#thAuto"); if (a) a.checked = false; }
    A.ui && A.ui.toast(`Theme: ${esc(t.name.replace(" (optional)", ""))}`, { ms: 1200 });
  });
  document.addEventListener("input", (ev) => {
    if (ev.target.id === "thQ") { q = ev.target.value; const g = $("#thGrid"); if (g) g.innerHTML = gridHTML(); }
    if (ev.target.id === "thCustom") { const c = ev.target.value; LS("customAccent", c); apply("custom"); const bg = getComputedStyle(root()).getPropertyValue("--bg").trim() || "#070b12"; const r = /^#/.test(bg) ? contrast(c, bg) : 3; const n = $("#thCustomNote"); if (n) n.textContent = r < 3 ? `Low contrast (${r.toFixed(1)}:1), try a brighter colour` : `${r.toFixed(1)}:1 contrast ✓`; }
  });
  document.addEventListener("change", (ev) => { if (ev.target.id === "thAuto") { LS("themeAuto", ev.target.checked ? "1" : null); if (ev.target.checked) autoTick(); } });

  /* init: re-sync attributes with what boot.js applied */
  (function init() {
    const p = LS("palette"); if (p && byId.has(p)) apply(p); else { const a = LS("accent"); if (a === "custom") apply("custom", { keepMode: true }); else if (a && byId.has(a) && a !== "amber") apply(a, { keepMode: true }); }
    autoTick();
  })();

  A.themes = { THEMES, apply, audit, contrast, pickerHTML, gridHTML, current, custom };
})(window.ASFE);
