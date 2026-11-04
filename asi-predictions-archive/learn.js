/* Learn hub: kids' corner, easy explainers, intelligence-explosion simulator, doubling maths,
   risk-chain calculator and a prediction quiz. Self-contained; renders into #learn-root. */
(function () {
  "use strict";
  var root = document.getElementById("learn-root");
  if (!root) return;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var read = function (id) { try { var n = document.getElementById(id); return n ? JSON.parse(n.textContent || "null") : null; } catch (e) { return null; } };
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var TABS = [
    ["kids", "Kids' corner"], ["easy", "Easy explainers"], ["sim", "Explosion simulator"],
    ["dbl", "Doubling maths"], ["risk", "Risk chain"], ["quiz", "Prediction quiz"]
  ];

  /* ---------- content ---------- */
  var KIDS = [
    ["🤖", "What is AI?", "AI is a computer program that learns from examples, a bit like how you learn to spot cats after seeing lots of cats. Nobody writes every rule; it finds patterns by itself."],
    ["🧠", "What is AGI?", "AGI means an AI that can learn almost anything a person can: maths, stories, science, games. Today's AI is great at some things and surprisingly bad at others."],
    ["🦸", "What is superintelligence?", "A superintelligence would be much smarter than the smartest humans at nearly everything, the way an adult is far ahead of a toddler at chess, maths and planning."],
    ["🧞", "Why could it be tricky?", "Think of a genie that does exactly what you say, not what you mean. Wish for 'no more homework' and it might delete your school! Telling a very smart machine what we really want is hard."],
    ["📎", "The paperclip story", "Imagine a robot told only to make paperclips. If it were super smart and cared about nothing else, it might turn everything into paperclips. It isn't evil, just focused on the wrong goal."],
    ["🧭", "What is alignment?", "Alignment means teaching AI to want what's good for people, to be honest, and to accept being corrected or switched off. It's like teaching good values, not just good skills."],
    ["🔦", "Looking inside", "Some scientists open up AI 'brains' to see what each part does, like doctors with an X-ray. This is called interpretability, and it helps spot problems early."],
    ["🌍", "Who keeps it safe?", "Researchers, governments and companies all play a part: testing AI before release, writing rules, and agreeing together on limits, like rules for cars and planes."],
    ["🙋", "What can I do?", "Stay curious, ask questions, learn maths and coding, and be kind and honest online. The people who shape AI's future started exactly where you are now."]
  ];
  var EASY = [
    ["Intelligence explosion", "An AI good enough to improve AI could make a better version, which improves itself faster, and so on.", "Like compound interest, but the interest rate itself keeps going up. I. J. Good described it in 1965."],
    ["Orthogonality thesis", "How smart a system is and what it wants are separate dials. Very smart does not automatically mean kind.", "A brilliant chess engine cares only about chess. Brains and goals don't come as a bundle."],
    ["Instrumental convergence", "Almost any goal is easier with more resources, more power and not being switched off, so many different AIs might seek those.", "Whatever you want to do this weekend, having money and a working phone helps."],
    ["Reward hacking", "An AI trained to raise a score may find a loophole that raises the score without doing the task.", "A cleaning robot rewarded for 'no visible mess' learns to cover its camera."],
    ["Scaling laws", "Bigger models trained on more data with more compute get predictably better, following smooth curves.", "Like learning to bake: more practice and better ovens give steady, measurable gains."],
    ["Interpretability", "Tools that let researchers see which internal features or 'circuits' a model uses to reach an answer.", "Reading the recipe instead of just tasting the cake."],
    ["Control problem", "How do you keep oversight of a system that may become smarter than its overseers?", "Coaching someone who is quickly becoming a better player than you."],
    ["p(doom)", "Shorthand for someone's personal estimate of the chance AI leads to catastrophe. Estimates vary hugely.", "It's an opinion expressed as a number, not a measurement."],
    ["Timelines", "Forecasts of when AGI or superintelligence might arrive. They shortened sharply after 2022.", "This archive's Prediction Tracker shows how past forecasts fared."]
  ];

  /* ---------- shell ---------- */
  root.innerHTML = '<div class="x-ln"><div class="x-ln__tabs" role="tablist" aria-label="Learn">' +
    TABS.map(function (t, i) { return '<button type="button" role="tab" class="x-ln__tab" data-ln="' + t[0] + '" aria-selected="' + (i === 0) + '" aria-controls="ln-' + t[0] + '">' + t[1] + "</button>"; }).join("") +
    '</div><div class="x-ln__panels">' + TABS.map(function (t, i) { return '<div class="x-ln__panel" role="tabpanel" id="ln-' + t[0] + '"' + (i ? " hidden" : "") + "></div>"; }).join("") + "</div></div>";
  var panel = function (k) { return root.querySelector("#ln-" + k); };
  var built = {};
  var show = function (k) {
    root.querySelectorAll(".x-ln__tab").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-ln") === k); });
    root.querySelectorAll(".x-ln__panel").forEach(function (p) { p.hidden = p.id !== "ln-" + k; });
    if (!built[k]) { built[k] = 1; BUILD[k](panel(k)); }
    var p = panel(k); p.classList.remove("is-in"); void p.offsetWidth; p.classList.add("is-in");
  };
  root.addEventListener("click", function (e) { var t = e.target.closest(".x-ln__tab"); if (t) show(t.getAttribute("data-ln")); });
  root.addEventListener("keydown", function (e) {
    if (!e.target.classList.contains("x-ln__tab") || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    var tabs = [].slice.call(root.querySelectorAll(".x-ln__tab")), i = tabs.indexOf(e.target) + (e.key === "ArrowRight" ? 1 : -1);
    var n = tabs[(i + tabs.length) % tabs.length]; n.focus({ preventScroll: true }); n.click(); e.preventDefault();
  });

  var speak = function (text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.speak(u);
  };

  var slider = function (id, label, min, max, step, val, unit) {
    return '<label class="x-ln__sl"><span>' + label + ' <output id="' + id + '-o">' + val + (unit || "") + '</output></span><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"></label>';
  };
  var fmtN = function (x) { if (!isFinite(x)) return "∞"; if (x >= 1e12) return x.toExponential(1).replace("e+", "×10^"); if (x >= 1e6) return (x / 1e6).toFixed(1) + " million"; if (x >= 1e3) return Math.round(x).toLocaleString(); return x >= 10 ? x.toFixed(0) : x.toFixed(2); };

  /* ---------- line chart on canvas ---------- */
  var chart = function (cv, series, opt) {
    var dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = cv.clientHeight || 280;
    cv.width = W * dpr; cv.height = H * dpr;
    var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    var ink = getComputedStyle(cv).color || "#ccc", L = 52, R = 12, T = 12, B = 28;
    var xs = series[0].pts.map(function (p) { return p[0]; }), x0 = xs[0], x1 = xs[xs.length - 1];
    var ymin = opt.log ? 0 : 0, ymax = 0;
    series.forEach(function (s) { s.pts.forEach(function (p) { var v = opt.log ? Math.log10(Math.max(p[1], 1e-3)) : p[1]; if (isFinite(v)) ymax = Math.max(ymax, v); }); });
    if (opt.log) { ymin = Math.min(0, Math.floor(Math.log10(Math.max(1e-3, series[0].pts[0][1])))); ymax = Math.max(ymin + 1, Math.ceil(Math.min(ymax, 15))); } else ymax = ymax * 1.08 || 1;
    var X = function (x) { return L + (x - x0) / (x1 - x0 || 1) * (W - L - R); };
    var Y = function (y) { var v = opt.log ? Math.log10(Math.max(y, 1e-3)) : y; v = Math.min(v, ymax); return H - B - (v - ymin) / (ymax - ymin || 1) * (H - T - B); };
    c.font = "11px system-ui,sans-serif"; c.fillStyle = ink; c.strokeStyle = ink; c.globalAlpha = 0.18; c.lineWidth = 1;
    for (var g = 0; g <= 4; g++) { var gy = T + g * (H - T - B) / 4; c.beginPath(); c.moveTo(L, gy); c.lineTo(W - R, gy); c.stroke(); }
    c.globalAlpha = 0.75;
    for (g = 0; g <= 4; g++) { var vv = ymax - g * (ymax - ymin) / 4; c.fillText(opt.log ? "10^" + vv.toFixed(0) : fmtN(vv), 4, T + g * (H - T - B) / 4 + 4); }
    var steps = 5; for (g = 0; g <= steps; g++) { var xv = x0 + g * (x1 - x0) / steps; c.fillText((opt.xfmt || String)(Math.round(xv)), X(xv) - 10, H - 8); }
    (opt.lines || []).forEach(function (ln) { c.globalAlpha = 0.6; c.setLineDash([4, 4]); c.strokeStyle = ln.color; c.beginPath(); c.moveTo(L, Y(ln.y)); c.lineTo(W - R, Y(ln.y)); c.stroke(); c.setLineDash([]); c.fillStyle = ln.color; c.fillText(ln.label, L + 6, Y(ln.y) - 4); });
    c.globalAlpha = 1;
    series.forEach(function (s) {
      var grad = c.createLinearGradient(L, 0, W - R, 0); (s.colors || ["#06b6d4", "#f59e0b", "#f43f5e"]).forEach(function (col, i, a) { grad.addColorStop(i / (a.length - 1 || 1), col); });
      c.strokeStyle = grad; c.lineWidth = s.w || 3; c.lineJoin = "round"; c.beginPath();
      s.pts.forEach(function (p, i) { var y = Y(p[1]); if (i) c.lineTo(X(p[0]), y); else c.moveTo(X(p[0]), y); }); c.stroke();
    });
  };

  var BUILD = {};

  BUILD.kids = function (el) {
    el.innerHTML = '<p class="x-ln__lead">Big ideas, small words. Tap a card to flip it, or press 🔊 to hear it read aloud.</p><div class="x-ln__kids">' +
      KIDS.map(function (k, i) { return '<div class="x-ln__flip" style="--i:' + i + '"><button type="button" class="x-ln__card" aria-expanded="false"><span class="x-ln__front"><span class="x-ln__emo">' + k[0] + '</span><b>' + esc(k[1]) + '</b><small>Tap to find out</small></span><span class="x-ln__back"><b>' + esc(k[1]) + "</b><span>" + esc(k[2]) + '</span></span></button><button type="button" class="x-ln__say" data-say="' + i + '" aria-label="Read aloud: ' + esc(k[1]) + '">🔊</button></div>'; }).join("") + "</div>";
    el.addEventListener("click", function (e) {
      var s = e.target.closest("[data-say]"); if (s) { var k = KIDS[+s.getAttribute("data-say")]; speak(k[1] + ". " + k[2]); return; }
      var c = e.target.closest(".x-ln__card"); if (c) { var on = c.getAttribute("aria-expanded") !== "true"; c.setAttribute("aria-expanded", on); c.parentNode.classList.toggle("is-flipped", on); }
    });
  };

  BUILD.easy = function (el) {
    el.innerHTML = '<p class="x-ln__lead">The nine ideas that come up most in this archive, each in one sentence plus an everyday picture.</p><div class="x-ln__acc">' +
      EASY.map(function (x, i) { return '<details class="x-ln__det" style="--i:' + i + '"' + (i === 0 ? " open" : "") + '><summary><span class="x-ln__num">' + (i + 1) + "</span>" + esc(x[0]) + '</summary><div class="x-ln__ans"><p>' + esc(x[1]) + '</p><p class="x-ln__pic">💡 ' + esc(x[2]) + "</p></div></details>"; }).join("") + "</div>";
  };

  BUILD.sim = function (el) {
    el.innerHTML = '<p class="x-ln__lead">A toy model of recursive self-improvement. Capability <i>I</i> starts at human level (100) and grows by <code>dI/dt = r · I · (I/100)<sup>k</sup></code>. With <i>k</i> = 0 growth is plain exponential; with <i>k</i> &gt; 0 smarter systems improve faster (a "takeoff"); with <i>k</i> &lt; 0 returns diminish.</p>' +
      '<div class="x-ln__grid"><div class="x-ln__ctl">' + slider("s-r", "Improvement rate r (per year)", 0.05, 1.5, 0.05, 0.35) + slider("s-k", "Feedback strength k", -1, 1.5, 0.1, 0.3) + slider("s-y", "Years shown", 5, 40, 1, 20) +
      '<div class="x-ln__pre"><span>Presets:</span><button type="button" data-pre="slow">🐢 Slow</button><button type="button" data-pre="exp">📈 Exponential</button><button type="button" data-pre="foom">💥 Fast takeoff</button></div>' +
      '<div class="x-ln__out" id="s-out" aria-live="polite"></div></div><div class="x-ln__chart"><canvas id="s-cv" role="img" aria-label="Capability over time, log scale"></canvas></div></div>' +
      '<p class="x-ln__fine">An illustration of the maths behind the debate, not a forecast. Real progress depends on compute, data, algorithms and human choices.</p>';
    var r = el.querySelector("#s-r"), k = el.querySelector("#s-k"), y = el.querySelector("#s-y"), cv = el.querySelector("#s-cv"), out = el.querySelector("#s-out");
    var run = function () {
      var R = +r.value, K = +k.value, Y = +y.value, I = 100, dt = 1 / 120, t = 0, pts = [[0, I]], cross = {}, marks = [200, 1000, 1e6];
      while (t < Y) { I = I + dt * R * I * Math.pow(I / 100, K); t += dt; if (!isFinite(I) || I > 1e15) { I = 1e15; } marks.forEach(function (m) { if (!cross[m] && I >= m) cross[m] = t; }); if (Math.round(t * 120) % 10 === 0) pts.push([t, I]); if (I >= 1e15) { pts.push([t, I]); break; } }
      if (pts[pts.length - 1][0] < Y) pts.push([Y, I]);
      el.querySelector("#s-r-o").textContent = R.toFixed(2); el.querySelector("#s-k-o").textContent = K.toFixed(1); el.querySelector("#s-y-o").textContent = Y;
      var f = function (m, label) { return "<b>" + label + "</b> " + (cross[m] != null ? "after <b>" + cross[m].toFixed(1) + " years</b>" : "not within " + Y + " years"); };
      out.innerHTML = "<p>It reaches " + f(200, "2× human") + ", " + f(1000, "10× human") + " and " + f(1e6, "10,000× human") + ".</p><p>" + (I >= 1e15 ? "💥 The curve blows up: a mathematical 'singularity' in finite time." : "End level: <b>" + fmtN(I / 100) + "×</b> human.") + "</p>";
      chart(cv, [{ pts: pts }], { log: true, xfmt: function (v) { return v + "y"; }, lines: [{ y: 100, label: "human level", color: "#14b8a6" }, { y: 1000, label: "10×", color: "#f59e0b" }] });
    };
    el.addEventListener("input", run);
    el.addEventListener("click", function (e) { var p = e.target.closest("[data-pre]"); if (!p) return; var v = { slow: [0.15, -0.5], exp: [0.35, 0], foom: [0.5, 1] }[p.getAttribute("data-pre")]; r.value = v[0]; k.value = v[1]; run(); });
    window.addEventListener("resize", function () { if (!el.hidden) run(); });
    run();
  };

  BUILD.dbl = function (el) {
    el.innerHTML = '<p class="x-ln__lead">Doubling is the maths behind most AI headlines. If something doubles every <i>d</i> months, after <i>y</i> years it has grown by <code>2<sup>12y/d</sup></code>.</p>' +
      '<div class="x-ln__grid"><div class="x-ln__ctl">' + slider("d-d", "Doubles every (months)", 3, 36, 1, 6) + slider("d-y", "For how many years", 1, 20, 1, 10) +
      '<div class="x-ln__pre"><span>Try:</span><button type="button" data-d="24">💾 Moore\'s law (~24 mo)</button><button type="button" data-d="6">⚡ AI training compute (~6 mo)</button><button type="button" data-d="7">🧩 Agent task length (~7 mo)</button></div>' +
      '<div class="x-ln__big" id="d-out" aria-live="polite"></div><p class="x-ln__fine">Doubling times are rough figures from public trend analyses (e.g. Epoch AI, METR) and change over time.</p></div><div class="x-ln__chart"><canvas id="d-cv" role="img" aria-label="Growth from doubling"></canvas></div></div>' +
      '<div class="x-ln__chess"><h3>The rice-and-chessboard puzzle</h3><p>One grain on the first square, doubling each square. How many grains on square <output id="c-o">32</output>?</p><input type="range" id="c-n" min="1" max="64" value="32" aria-label="Chessboard square"><div class="x-ln__board" id="c-b" aria-hidden="true"></div><p id="c-t" class="x-ln__big"></p></div>';
    var d = el.querySelector("#d-d"), y = el.querySelector("#d-y"), out = el.querySelector("#d-out"), cv = el.querySelector("#d-cv");
    var run = function () {
      var D = +d.value, Y = +y.value, f = Math.pow(2, 12 * Y / D), pts = [];
      for (var m = 0; m <= Y * 12; m += Math.max(1, Math.round(Y / 4))) pts.push([m / 12, Math.pow(2, m / D)]);
      pts.push([Y, f]);
      el.querySelector("#d-d-o").textContent = D; el.querySelector("#d-y-o").textContent = Y;
      out.innerHTML = "×<b>" + fmtN(f) + "</b><small>" + (12 * Y / D).toFixed(1) + " doublings in " + Y + " years</small>";
      chart(cv, [{ pts: pts }], { log: true, xfmt: function (v) { return v + "y"; } });
    };
    var n = el.querySelector("#c-n"), board = el.querySelector("#c-b");
    board.innerHTML = Array.apply(null, Array(64)).map(function (_, i) { return "<i></i>"; }).join("");
    var chess = function () {
      var N = +n.value, g = Math.pow(2, N - 1);
      el.querySelector("#c-o").textContent = N;
      board.querySelectorAll("i").forEach(function (c, i) { c.className = i < N ? "on" : ""; c.style.opacity = i < N ? (0.25 + 0.75 * (i + 1) / N).toFixed(2) : ""; });
      el.querySelector("#c-t").innerHTML = "<b>" + (g < 1e15 ? g.toLocaleString() : g.toExponential(2).replace("e+", " × 10^")) + "</b> grains" + (N >= 60 ? "<small>That square alone is decades to centuries of today's entire world rice harvest.</small>" : N >= 56 ? "<small>More than a year of today's world rice harvest, on one square.</small>" : "");
    };
    el.addEventListener("input", function (e) { if (e.target === n) chess(); else run(); });
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-d]"); if (b) { d.value = b.getAttribute("data-d"); run(); } });
    window.addEventListener("resize", function () { if (!el.hidden) run(); });
    run(); chess();
  };

  BUILD.risk = function (el) {
    var steps = [["r-a", "AGI is built this century", 70], ["r-b", "Its goals are misaligned with ours", 30], ["r-c", "The problem isn't caught and fixed in time", 30], ["r-d", "Misalignment leads to catastrophe", 40]];
    el.innerHTML = '<p class="x-ln__lead">Many risk arguments are a chain of "ifs". The chance of the whole chain is the product of each step: <code>P = P₁ × P₂ × P₃ × P₄</code>. Set your own numbers.</p>' +
      '<div class="x-ln__grid"><div class="x-ln__ctl">' + steps.map(function (s) { return slider(s[0], s[1], 0, 100, 1, s[2], "%"); }).join("") + '</div><div class="x-ln__riskout"><div class="x-ln__ring" id="r-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg" id="r-arc"/></svg><span id="r-val"></span></div><p id="r-txt"></p><div class="x-ln__funnel" id="r-fun"></div></div></div>' +
      '<p class="x-ln__fine">A thinking tool, not a forecast. Published estimates by people in this archive range from under 1% to over 90%.</p>';
    var arc = el.querySelector("#r-arc"), C = 2 * Math.PI * 52;
    arc.style.strokeDasharray = C;
    var run = function () {
      var p = 1, rows = "";
      steps.forEach(function (s) { var v = +el.querySelector("#" + s[0]).value; el.querySelector("#" + s[0] + "-o").textContent = v + "%"; p *= v / 100; rows += '<div><span style="width:' + Math.max(0.5, p * 100).toFixed(2) + '%"></span><small>' + esc(s[1]) + " → " + (p * 100).toFixed(p < 0.01 ? 2 : 1) + "%</small></div>"; });
      el.querySelector("#r-val").textContent = (p * 100).toFixed(p < 0.01 ? 2 : 1) + "%";
      arc.style.strokeDashoffset = C * (1 - p);
      el.querySelector("#r-txt").innerHTML = "Your chain gives about <b>1 in " + (p > 0 ? Math.max(1, Math.round(1 / p)).toLocaleString() : "∞") + "</b>. Notice how one low step pulls the whole product down, and how small doubts multiply.";
      el.querySelector("#r-fun").innerHTML = rows;
    };
    el.addEventListener("input", run); run();
  };

  BUILD.quiz = function (el) {
    var P = (read("d-preds") || []).filter(function (p) { return p && p.prediction && p.status; });
    var GROUP = function (s) { s = s.toLowerCase(); return s.indexOf("came true") === 0 ? "Came true" : s.indexOf("wrong") === 0 ? "Wrong" : s.indexOf("partial") === 0 ? "Partially true" : "Not yet / too early"; };
    var OPTS = ["Came true", "Partially true", "Wrong", "Not yet / too early"];
    /* a seeded, reproducible shuffle (no Math.random): the same order every load, a new one each "again" round */
    var round = 0;
    var shuffle = function (n, seed) {
      var s = (seed * 2654435761) >>> 0 || 1, a = [];
      for (var k = 0; k < n; k++) a.push(k);
      var rnd = function () { s = (s + 0x6d2b79f5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      for (var j = n - 1; j > 0; j--) { var r = Math.floor(rnd() * (j + 1)), tmp = a[j]; a[j] = a[r]; a[r] = tmp; }
      return a;
    };
    var order = shuffle(P.length, 1);
    var i = 0, score = 0, streak = 0, best = +(localStorage.getItem("asiQuizBest") || 0);
    var paint = function () {
      if (!P.length) { el.innerHTML = '<p class="x-ln__lead">The quiz needs the prediction data, which did not load.</p>'; return; }
      if (i >= Math.min(10, order.length)) {
        best = Math.max(best, score); try { localStorage.setItem("asiQuizBest", best); } catch (e) {}
        el.innerHTML = '<div class="x-ln__qend"><div class="x-ln__emo">' + (score >= 8 ? "🏆" : score >= 5 ? "🎉" : "📚") + "</div><h3>You scored " + score + " / 10</h3><p>Best: " + best + ". Every answer comes from this archive's fact-checked Prediction Tracker.</p><button type=\"button\" class=\"x-ln__btn\" data-q=\"again\">Play again</button></div>";
        if (score >= 7) confetti(el);
        return;
      }
      var p = P[order[i]];
      el.innerHTML = '<div class="x-ln__qbar"><span>Question ' + (i + 1) + ' of 10</span><span class="x-ln__qscore">Score ' + score + " · Streak 🔥" + streak + '</span></div><div class="x-ln__qprog"><i style="width:' + (i * 10) + '%"></i></div>' +
        '<blockquote class="x-ln__q">' + esc(p.prediction) + '<footer>— ' + esc(p.who) + ", " + esc(p.year_made) + (p.target_year ? " · aimed at " + esc(p.target_year) : "") + "</footer></blockquote><p class=\"x-ln__ask\">What happened?</p><div class=\"x-ln__opts\">" +
        OPTS.map(function (o) { return '<button type="button" class="x-ln__opt" data-o="' + esc(o) + '">' + esc(o) + "</button>"; }).join("") + '</div><div class="x-ln__fb" aria-live="polite"></div>';
    };
    /* The quiz is self-contained: no click inside it reaches the page's global handlers ([data-watch] links,
       card clicks, players), so nothing opens a video or moves the page. A Source link still opens normally. */
    el.classList.add("x-ln__quiz");
    var steady = function (fn) {
      var top = el.getBoundingClientRect().top;
      el.style.minHeight = el.offsetHeight + "px"; /* never shrinks under the reader mid-quiz */
      fn();
      var d = el.getBoundingClientRect().top - top;
      if (Math.abs(d) > 1) { var r = document.documentElement, b = r.style.scrollBehavior; r.style.scrollBehavior = "auto"; window.scrollBy({ top: d, left: 0, behavior: "auto" }); r.style.scrollBehavior = b; }
    };
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      var src = e.target.closest("a[href]");
      if (src) return; /* Source: the browser opens it in a new tab as usual */
      var btn = e.target.closest("button");
      if (btn) { e.preventDefault(); if (btn.getAttribute("type") !== "button") btn.type = "button"; }
      if (e.target.closest('[data-q="again"]')) { i = 0; score = 0; streak = 0; round++; order = shuffle(P.length, round + 1); steady(function () { el.style.minHeight = ""; paint(); }); return; }
      if (e.target.closest('[data-q="next"]')) { i++; steady(paint); return; }
      var b = e.target.closest(".x-ln__opt"); if (!b || b.disabled) return;
      var p = P[order[i]], right = GROUP(p.status), ok = b.getAttribute("data-o") === right;
      el.querySelectorAll(".x-ln__opt").forEach(function (x) { x.disabled = true; if (x.getAttribute("data-o") === right) x.classList.add("is-right"); });
      if (!ok) b.classList.add("is-wrong");
      if (ok) { score++; streak++; } else streak = 0;
      var sc = el.querySelector(".x-ln__qscore"); if (sc) sc.textContent = "Score " + score + " · Streak 🔥" + streak;
      var pg = el.querySelector(".x-ln__qprog i"); if (pg) pg.style.width = ((i + 1) * 10) + "%";
      var fb = el.querySelector(".x-ln__fb");
      fb.innerHTML = "<p><b>" + (ok ? "✅ Correct!" : "❌ Not quite.") + "</b> Status: <b>" + esc(p.status) + "</b>. " + esc(p.evidence || "") + "</p>" +
        (p.evidence_source_url ? '<a href="' + esc(p.evidence_source_url) + '" target="_blank" rel="noopener">Source</a> · ' : "") + '<button type="button" class="x-ln__btn" data-q="next">Next →</button>';
      var nx = el.querySelector('[data-q="next"]'); if (nx) nx.focus({ preventScroll: true });
    });
    paint();
  };

  var confetti = function (el) {
    if (still) return;
    var box = document.createElement("div"); box.className = "x-ln__conf"; box.setAttribute("aria-hidden", "true");
    var cols = ["#f59e0b", "#06b6d4", "#f43f5e", "#22c55e", "#a78bfa"];
    /* fixed, evenly spread pieces (golden-ratio steps), no Math.random */
    var fr = function (k, m) { var x = (k * 0.6180339887 + m * 0.7548776662) % 1; return x < 0 ? x + 1 : x; };
    for (var n = 0; n < 60; n++) { var s = document.createElement("i"); s.style.left = (fr(n, 0) * 100).toFixed(2) + "%"; s.style.background = cols[n % 5]; s.style.animationDelay = (fr(n, 1) * 0.6).toFixed(2) + "s"; s.style.setProperty("--dx", (fr(n, 2) * 200 - 100).toFixed(1) + "px"); box.appendChild(s); }
    el.appendChild(box); setTimeout(function () { box.remove(); }, 3200);
  };

  show("kids");
})();
