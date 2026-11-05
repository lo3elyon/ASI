/* icons35.js: small logos (inline keyword chips and logo chips under 24px) use each organisation's own square icon
   (its site favicon, saved locally as logo-sq-<slug>.png) instead of a squeezed or cropped wordmark. Add-only. */
(function () {
  "use strict";
  var MAP = {"logo-openai.svg": "logo-sq-openai.png", "logo-anthropic.svg": "logo-sq-anthropic.png", "logo-google-deepmind.svg": "logo-sq-google-deepmind.png", "logo-google.svg": "logo-sq-google.png", "logo-meta.svg": "logo-sq-meta.png", "logo-microsoft.svg": "logo-sq-microsoft.png", "logo-xai.svg": "logo-sq-xai.png", "logo-hugging-face.svg": "logo-sq-hugging-face.png", "logo-cohere.png": "logo-sq-cohere.png", "logo-thinking-machines.png": "logo-sq-thinking-machines.png", "logo-numenta.webp": "logo-sq-numenta.png", "logo-fli.png": "logo-sq-fli.png", "logo-cais.png": "logo-sq-cais.png", "logo-miri.png": "logo-sq-miri.png", "logo-uk-aisi.svg": "logo-sq-uk-aisi.png", "logo-eu.svg": "logo-sq-eu.png", "logo-apollo-research.png": "logo-sq-apollo-research.png", "logo-ai-futures-project.png": "logo-sq-ai-futures-project.png", "logo-80000-hours.png": "logo-sq-80000-hours.png", "logo-forethought.svg": "logo-sq-forethought.png", "logo-metr.png": "logo-sq-metr.png", "logo-goodfire.png": "logo-sq-goodfire.png", "logo-center-for-humane-technology.png": "logo-sq-center-for-humane-technology.png", "logo-redwood-research.png": "logo-sq-redwood-research.png", "logo-open-philanthropy.png": "logo-sq-open-philanthropy.png", "logo-far-ai.png": "logo-sq-far-ai.png", "logo-govai.jpg": "logo-sq-govai.png", "logo-cfi-cambridge.png": "logo-sq-cfi-cambridge.png", "logo-simplex.png": "logo-sq-simplex.png", "logo-bluedot.svg": "logo-sq-bluedot.png", "logo-controlai.png": "logo-sq-controlai.png", "logo-mila.png": "logo-sq-mila.png", "logo-chai.png": "logo-sq-chai.png", "logo-cset.png": "logo-sq-cset.png", "logo-transluce.png": "logo-sq-transluce.png", "logo-santa-fe-institute.png": "logo-sq-santa-fe-institute.png", "logo-palisade.svg": "logo-sq-palisade.png", "logo-timaeus.svg": "logo-sq-timaeus.png", "logo-truthful-ai.svg": "logo-sq-truthful-ai.png", "logo-allen-institute.jpg": "logo-sq-allen-institute.png", "logo-cshl.svg": "logo-sq-cshl.png", "logo-mit.svg": "logo-sq-mit.png", "logo-u-toronto.png": "logo-sq-u-toronto.png", "logo-oxford.svg": "logo-sq-oxford.png", "logo-princeton.svg": "logo-sq-princeton.png", "logo-nyu.svg": "logo-sq-nyu.png", "logo-jhu.jpg": "logo-sq-jhu.png", "logo-northeastern.svg": "logo-sq-northeastern.png", "logo-uc-berkeley.svg": "logo-sq-uc-berkeley.png", "logo-cambridge.png": "logo-sq-cambridge.png", "logo-cmu.svg": "logo-sq-cmu.png", "logo-epfl.png": "logo-sq-epfl.png", "logo-u-louisville.png": "logo-sq-u-louisville.png", "logo-u-manchester.png": "logo-sq-u-manchester.png", "logo-u-sussex.png": "logo-sq-u-sussex.png", "logo-ut-austin.svg": "logo-sq-ut-austin.png", "logo-indiana.svg": "logo-sq-indiana.png", "logo-sdsu.svg": "logo-sq-sdsu.png", "logo-ucl.svg": "logo-sq-ucl.png", "logo-us-senate.svg": "logo-sq-us-senate.png", "logo-lex-fridman-podcast.png": "logo-sq-lex-fridman-podcast.png", "logo-dwarkesh-podcast.jpg": "logo-sq-dwarkesh-podcast.png"};
  var small = function (lg) {
    if (lg.closest(".x-kw")) return true;
    if (lg.classList.contains("x25-lg-crop")) return true;
    var m = (lg.getAttribute("style") || "").match(/--x-lg:\s*(\d+)px/); return m ? +m[1] < 24 : false;
  };
  var fix = function (root) {
    if (!root || root.nodeType !== 1) return;
    var imgs = root.tagName === "IMG" ? [root] : root.querySelectorAll(".x-kw img, .x-logo img");
    [].forEach.call(imgs, function (im) {
      var s = im.getAttribute("src") || ""; if (s.indexOf("logo-sq-") > -1) return;
      var f = s.split("?")[0].split("/").pop().replace("logo-openai-mark.svg", "logo-openai.svg"), to = MAP[f]; if (!to) return;
      var lg = im.closest(".x-logo") || im.parentNode; if (!lg || !small(lg)) return;
      im.setAttribute("src", s.replace(/[^\/?]+(\?.*)?$/, to)); im.classList.add("x35-sq"); lg.classList.add("x35-sqw"); lg.classList.remove("x25-lg-crop", "x25-lg-dark", "x25-lg-wide"); if (lg.style) lg.style.removeProperty("--x25-ar"); im.removeAttribute("width"); im.removeAttribute("height");
    });
  };
  var go = function () {
    fix(document.body);
    if ("MutationObserver" in window) new MutationObserver(function (r) { for (var i = 0; i < r.length; i++) for (var j = 0; j < r[i].addedNodes.length; j++) fix(r[i].addedNodes[j]); }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
