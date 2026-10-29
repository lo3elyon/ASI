import { $, $$, esc, pageHero, ytThumb, initials, toast, ICON } from "../util.js";
import { getHistory, clearHistory, exportHistory } from "../core/history.js";

const KIND = { all: ["Everything", "#22d3ee"], video: ["Videos", "#ef4444"], person: ["Researchers", "#22d3ee"], lesson: ["Lessons", "#84cc16"], post: ["Blog posts", "#f59e0b"] };

export async function render(el) {
  let f = "all";
  el.innerHTML = `${pageHero({ img: "cover-history", eyebrow: "Your history", title: "Everything <span class='serif gt'>you have opened.</span>", lead: "Videos, researchers, lessons and blog posts, newest first. It lives only in this browser. Clear it any time, or export it as a JSON file." })}
  <section class="section tight"><div class="wrap">
    <div class="toolbar"><div class="chips" role="group" aria-label="Filter">${Object.entries(KIND).map(([k, [l, c]]) => `<button class="chip ${k === "all" ? "on" : ""}" type="button" data-k="${k}" style="--accent:${c}">${l} <span class="count" data-n="${k}"></span></button>`).join("")}</div>
      <div class="row" style="margin-left:auto"><button class="btn sm" type="button" id="hx">${ICON.dl} Export JSON</button><button class="btn sm ghost" type="button" id="hc">Clear</button></div></div>
    <div id="hl"></div>
  </div></section>`;
  function paint() {
    const all = getHistory();
    Object.keys(KIND).forEach((k) => { const n = $(`[data-n="${k}"]`, el); if (n) n.textContent = k === "all" ? all.length : all.filter((x) => x.type === k).length; });
    const list = all.filter((x) => f === "all" || x.type === f);
    if (!list.length) { $("#hl", el).innerHTML = `<div class="empty-state"><h3>Nothing here yet</h3><p>Open a researcher, play a video, finish a lesson or read a post and it shows up here.</p><div class="row" style="justify-content:center;margin-top:14px"><a class="btn" href="#/watch">Browse videos</a><a class="btn ghost" href="#/researchers">Meet the researchers</a></div></div>`; return; }
    let day = "", out = "";
    list.forEach((x) => {
      const d = new Date(x.t); const dk = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      if (dk !== day) { day = dk; out += `<div class="hist-day">${esc(dk)}</div>`; }
      const c = (KIND[x.type] || KIND.all)[1];
      const th = x.type === "video" ? `<img src="${ytThumb(x.id, "default")}" alt="" loading="lazy" width="64" height="40">` : x.type === "person" && x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" width="64" height="40" referrerpolicy="no-referrer">` : x.type === "person" ? esc(initials(x.title || x.id)) : ({ lesson: "LESSON", post: "POST" }[x.type] || "ITEM");
      const attrs = x.type === "video" ? `data-video="${esc(x.id)}"` : x.type === "person" ? `data-person="${esc(x.id)}"` : "";
      const href = x.type === "post" ? `#/blog/${x.id}` : x.type === "lesson" ? `#/learn/${x.id}` : x.type === "video" ? `#/watch/${x.id}` : `#/researchers/${x.id}`;
      out += `<a class="hist-item" href="${esc(href)}" ${attrs} style="--c:${c}"><span class="th">${th}</span><span style="min-width:0"><b>${esc(x.title || x.id)}</b><span>${esc((KIND[x.type] || ["Item"])[0])}${x.sub ? " · " + esc(x.sub) : ""}${x.played ? " · played" : ""}</span></span><time datetime="${new Date(x.t).toISOString()}">${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time></a>`;
    });
    $("#hl", el).innerHTML = out;
  }
  $$("[data-k]", el).forEach((b) => b.addEventListener("click", () => { f = b.dataset.k; $$("[data-k]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); }));
  $("#hx", el).addEventListener("click", () => { exportHistory(); toast("History exported as JSON."); });
  $("#hc", el).addEventListener("click", () => { if (confirm(f === "all" ? "Clear all of your history in this browser?" : `Clear your ${KIND[f][0].toLowerCase()} history?`)) { clearHistory(f === "all" ? null : f); toast("History cleared."); paint(); } });
  const onH = () => paint();
  window.addEventListener("historychange", onH);
  paint();
  return () => window.removeEventListener("historychange", onH);
}
