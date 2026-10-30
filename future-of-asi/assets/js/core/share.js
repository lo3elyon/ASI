/* Share and copy (Round 4). One small helper for deep links to people, videos, papers, quotes and pages.
   Phones get the system share sheet when it exists; everywhere else the link is copied and a toast says so.
   Any element with data-share-url (and optional data-share-title) or data-copy-text works through one click listener. */
import { toast, esc } from "../util.js";

export const ABS = "https://lo3elyon.github.io/ASI/future-of-asi/";
export const links = {
  person: (id) => `${ABS}r/${encodeURIComponent(id)}/`,
  video: (id) => `${ABS}?v=${encodeURIComponent(id)}#/watch`,
  paper: (id) => `${ABS}#/papers/${encodeURIComponent(id)}`,
  concept: (id) => `${ABS}#/concepts/${encodeURIComponent(id)}`,
  route: (hash) => ABS + String(hash || "").replace(/^\.?\/?/, ""),
};

const SHARE_IC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
const COPY_IC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>';
export const SHARE_ICON = SHARE_IC;

/* Copy text with the async clipboard, falling back to a hidden textarea */
export async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
  try {
    const t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy"); t.remove();
    return ok;
  } catch (e) { return false; }
}

const coarse = () => window.matchMedia && matchMedia("(pointer: coarse)").matches;

/* Share a link: native sheet on touch devices, otherwise copy */
export async function shareLink(url, title = "Threshold", msg = "Link copied.") {
  if (navigator.share && coarse()) {
    try { await navigator.share({ url, title }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  const ok = await copyText(url);
  toast(ok ? msg : `Copy did not work here. The link is ${url}`);
}
export async function copyWithToast(text, msg = "Copied.") {
  const ok = await copyText(text);
  toast(ok ? msg : "Copy did not work in this browser.");
}

/* Markup helpers. label is visible text; aria gives the full name for screen readers. */
const nm = (label, aria) => (String(aria).toLowerCase().startsWith(String(label).toLowerCase()) ? aria : `${label}: ${aria}`);
export function shareBtn(url, { label = "Share", aria = "Copy a link", title = "", cls = "" } = {}) {
  aria = nm(label, aria);
  return `<button type="button" class="r4-share ${cls}" data-share-url="${esc(url)}"${title ? ` data-share-title="${esc(title)}"` : ""} aria-label="${esc(aria)}">${SHARE_IC}<span>${esc(label)}</span></button>`;
}
export function copyBtn(text, { label = "Copy", aria = "Copy", msg = "Copied.", cls = "" } = {}) {
  aria = nm(label, aria);
  return `<button type="button" class="r4-share ${cls}" data-copy-text="${esc(text)}" data-copy-msg="${esc(msg)}" aria-label="${esc(aria)}">${COPY_IC}<span>${esc(label)}</span></button>`;
}
/* Text for one quote: the exact words, who said it, where, and links */
export function quoteText(q, p) {
  return `"${q.text}"\n${p.name}${q.source ? ", " + q.source : ""}${q.date ? ", " + q.date : ""}${q.url ? "\nSource: " + q.url : ""}\nProfile: ${links.person(p.id)}`;
}

let wired = false;
export function initShare() {
  if (wired) return; wired = true;
  document.addEventListener("click", (e) => {
    const s = e.target.closest && e.target.closest("[data-share-url]");
    if (s) { e.preventDefault(); e.stopPropagation(); shareLink(s.dataset.shareUrl, s.dataset.shareTitle || document.title, s.dataset.shareMsg || "Link copied."); return; }
    const c = e.target.closest && e.target.closest("[data-copy-text]");
    if (c) { e.preventDefault(); e.stopPropagation(); copyWithToast(c.dataset.copyText, c.dataset.copyMsg || "Copied."); }
  }, true);
}
