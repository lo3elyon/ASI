/* Viewing history for everything a visitor opens: videos, researchers, lessons, blog posts. Stored only in localStorage. */
import { store } from "../util.js";

const KEY = "hist2";
const MAX = 600;

function migrate() {
  if (store.get("histMigrated", false)) return;
  const out = store.get(KEY, []);
  store.get("history", []).forEach((x) => x && x.id && out.push({ type: "video", id: x.id, title: "", t: x.t || Date.now() }));
  store.get("seenPeople", []).forEach((id) => out.push({ type: "person", id, title: "", t: Date.now() - 1000 }));
  const c = store.get("course", null);
  if (c && c.done) Object.keys(c.done).forEach((id) => out.push({ type: "lesson", id, title: "", t: Date.now() - 2000 }));
  out.sort((a, b) => b.t - a.t);
  store.set(KEY, out.slice(0, MAX));
  store.set("histMigrated", true);
}

export function logView(type, id, title = "", extra = {}) {
  if (!id) return;
  migrate();
  const list = store.get(KEY, []).filter((x) => !(x.type === type && x.id === id));
  list.unshift({ type, id, title, t: Date.now(), ...extra });
  store.set(KEY, list.slice(0, MAX));
  if (type === "video") { const h = store.get("history", []).filter((x) => x.id !== id); h.unshift({ id, t: Date.now() }); store.set("history", h.slice(0, 300)); }
  if (type === "person") { const s = store.get("seenPeople", []); if (!s.includes(id)) store.set("seenPeople", [...s, id].slice(-300)); }
  window.dispatchEvent(new CustomEvent("historychange"));
}
export function getHistory() { migrate(); return store.get(KEY, []); }
export function clearHistory(type) {
  if (!type) { store.set(KEY, []); store.set("history", []); store.set("seenPeople", []); }
  else { store.set(KEY, getHistory().filter((x) => x.type !== type)); if (type === "video") store.set("history", []); if (type === "person") store.set("seenPeople", []); }
  window.dispatchEvent(new CustomEvent("historychange"));
}
export function exportHistory() {
  const data = { exported: new Date().toISOString(), site: "https://lo3elyon.github.io/ASI/future-of-asi/", items: getHistory() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `threshold-history-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
