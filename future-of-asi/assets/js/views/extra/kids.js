/* Kids and families: AI safety explained gently. Next word game, robot cleaner game, spot the mistake, a short story,
   a privacy sorting game, fake spotting habits, a word list, talk cards and family habits. */
import { hero, sec, band, tocBar, anim, bag, $, $$, esc, RM, ICON, store } from "./_kit.js";

const NEXT = [
  { s: "The cat sat on the", o: ["mat", "moon", "sandwich"], a: 0, why: "Most stories it has read say mat. It picks the word that fits best, not the word that is true." },
  { s: "I brush my teeth every", o: ["morning", "tiger", "Tuesday only"], a: 0, why: "Morning shows up most often after these words. That is all the guess is: a very good pattern match." },
  { s: "The capital of India is New", o: ["Delhi", "York", "Shoes"], a: 0, why: "Delhi. But careful: sometimes the pattern is wrong and the AI says it confidently anyway." },
];
const TALK = [
  ["Would you want a robot helper? What would you ask it to do?", "Good for: imagining agents"],
  ["If you told a robot to keep your room clean, how could it cheat?", "Good for: the wish problem"],
  ["How do you know if something you read online is true?", "Good for: checking facts"],
  ["Should a robot always obey, even if the order is unkind?", "Good for: values"],
  ["What would you want an off switch for?", "Good for: control"],
  ["Who should make the rules for very smart computers?", "Good for: governance"],
  ["What is something people can do that you hope AI never replaces?", "Good for: what matters"],
  ["If an AI said sorry, would it mean it?", "Good for: honesty and feelings"]];
const HABITS = ["We ask an adult before trying a new AI app.", "We never share our full name, school, address or photos with a chatbot.", "We check important answers in a second place, like a book or a teacher.", "We remember that AI can sound sure and still be wrong.", "We talk about it when something online feels strange or scary.", "We keep screens out of bedrooms at night.", "We do real things together every week, away from screens."];

/* Spot the confident mistake: one statement in each set is wrong. Plain facts only. */
const SPOT = [
  { s: ["The Sun is a star.", "Spiders have six legs.", "Water freezes at 0 degrees Celsius."], bad: 1, why: "Spiders have eight legs. Insects have six. An AI can mix up facts like this and still sound very sure." },
  { s: ["A week has seven days.", "The Moon makes its own light.", "Plants need light to grow."], bad: 1, why: "The Moon shines because sunlight bounces off it. It sounds like a small mistake, but it is a wrong fact said calmly." },
  { s: ["Bees make honey.", "Fish breathe with gills.", "Penguins live at the North Pole."], bad: 2, why: "Wild penguins live in the southern half of the world, not at the North Pole. Always check surprising answers." }];
/* Okay to share or keep private, when talking to a chatbot */
const SHARE = [["Your favourite colour", 1], ["Your home address", 0], ["A password", 0], ["A story idea about a dragon", 1], ["The name of your school", 0], ["Your phone number", 0], ["A question about dinosaurs", 1], ["A photo of your face", 0], ["Which games you like", 1]];
/* A short made up story that shows the wish problem. Fiction. */
const STORY = [
  ["Robo gets a job", "Robo is a small garden robot. One morning it hears: make sure there are no weeds in the garden."],
  ["Robo works very hard", "Robo cannot tell weeds from vegetables very well. So, to be sure, it pulls up every green thing it finds."],
  ["No weeds at all", "By lunch there are no weeds. There are also no carrots, no beans and no sunflower. Robo did exactly what it was told."],
  ["Robo learns to ask", "Next time, Robo asks first: which plants do you want to keep? And it checks with a grown up before pulling anything big."]];
const WORDS = [["AI", "A computer program that learned from lots of examples, so it can do things like write, draw or answer questions."], ["Chatbot", "An AI you talk to by typing or speaking. It answers in words."], ["Agent", "An AI that can also take actions, like clicking, sending or buying, not only talking."], ["Training", "How an AI learns: it looks at huge amounts of examples and slowly gets better at guessing."], ["Made up answer", "When an AI says something that sounds right but is not true. Grown ups sometimes call this a hallucination."], ["Deepfake", "A fake picture, video or voice made by AI that looks or sounds real."], ["Alignment", "Making sure an AI wants the same good things we want, and does what we really mean."], ["Off switch", "A way for people to stop an AI if it does something wrong. Safety people want this to always work."]];
const FAKE = [["Pause before you share", "If a picture or video makes you feel very surprised, scared or angry, wait. That feeling is what fakes are made for."], ["Look for odd details", "Strange hands, blurry edges, words that do not make sense, or a voice that sounds a bit flat."], ["Check where it came from", "Is it from a news site or a person you trust? Can you find it in a second place?"], ["Ask a grown up", "You will never be in trouble for asking. Grown ups get fooled by fakes too."]];

export async function render(el) {
  const B = bag();
  let game = { levels: [] };
  try { const r = await fetch("explosion/data/explosion.json", { cache: "no-cache" }); if (r.ok) game = (await r.json()).reward_game || game; } catch (e) {}
  const habits = new Set(store.get("x:kids:habits", []));

  el.innerHTML = `${hero({ img: "kids", eyebrow: "Kids and families", title: `AI, explained <span class="serif gt">at home.</span>`, lead: "A calm, simple guide for children around 8 to 14 and the grown ups who love them. No scary pictures, no jargon. Read it together, play the robot game, and use the talk cards at dinner.", stats: [["8 to 14", "best age to read together"], [String(TALK.length), "talk cards"], [String(game.levels.length || 5), "robot game levels"], ["4", "games to play together"]] })}
  ${sec("what", 1, "What is AI", "A very good <span class='serif'>guesser.</span>", "A chatbot learned from millions of books and web pages. When you type, it guesses the next word, then the next, very fast. Try guessing like it does.",
    `<div class="grid g2"><div class="x-guess card" data-m3="up" id="guess"></div><div class="grid" data-m3-stagger="80"><div class="card" data-m3="up"><h3>It learned from examples</h3><p>Nobody wrote down every answer. The AI read so many examples that it found patterns, like how a child learns that dogs bark by hearing lots of dogs.</p></div><div class="card" data-m3="up"><h3>It does not know like you know</h3><p>It can be brilliant at some things and make silly mistakes at others. It can also say wrong things in a very confident voice.</p></div><div class="card" data-m3="up"><h3>It is getting smarter fast</h3><p>Each year the best AI can do harder things. That is exciting, and it is also why scientists want to make sure it stays safe.</p></div></div></div>`)}
  ${sec("agent", 2, "What is an agent", "An AI with <span class='serif'>hands.</span>", "A chatbot only talks. An agent can also do things: click buttons, write files, send messages, even control a robot.",
    `<div class="grid g3" data-m3-stagger="80">${[["Talking AI", "Like a friend who answers questions. If it is wrong, you just get a wrong answer.", "#22d3ee"], ["Helper AI", "Like a helper who can also use tools: a calculator, a map, a computer. Now mistakes can change things.", "#f59e0b"], ["Agent AI", "Like a helper who works on its own for hours. That is very useful, so it needs good rules and a grown up checking in.", "#ef4444"]].map(([t, d, c], i) => `<div class="card card-glow" data-m3="up" style="--c:${c}"><span class="x-kid-n" style="background:${c}">${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</div>`)}
  ${sec("wish", 3, "The wish problem", "Be careful what you <span class='serif'>wish</span> for.", "In old stories a genie grants your exact words, not what you meant. AI can do that too. Give the robot cleaner a rule and see how it could cheat.",
    `<div class="x-robot card" data-m3="up" id="robot"></div>`)}
  ${sec("spot", 4, "Spot the mistake", "Sure is not the same as <span class='serif'>right.</span>", "Pretend an AI told you these three things. One of them is wrong. Can you find it?",
    `<div class="card x-spot" data-m3="up" id="spotbox"></div>`)}
  ${sec("story", 5, "Story time", "Robo and the <span class='serif'>garden.</span>", "A short made up story to read together. Tap through the pages.",
    `<div class="x-story card" data-m3="up"><picture class="x-story-pic"><source type="image/webp" srcset="assets/img/extra/kids-story-sm.webp 640w, assets/img/extra/kids-story.webp 1376w" sizes="(max-width: 900px) 100vw, 50vw"><img src="assets/img/extra/kids-story.jpg" srcset="assets/img/extra/kids-story-sm.jpg 640w, assets/img/extra/kids-story.jpg 1376w" sizes="(max-width: 900px) 100vw, 50vw" alt="A small teal robot watering a vegetable garden at sunset" width="1376" height="768" loading="lazy" decoding="async"></picture><div class="x-story-t" id="storybox" aria-live="polite"></div></div>`)}
  ${band("kids", "Safe AI is a family conversation, not a secret.")}
  ${sec("helpers", 6, "Who keeps it safe", "The <span class='serif'>helpers.</span>", "All over the world, people work to keep AI safe. Here is what they do, in kid words.",
    `<div class="grid g4" data-m3-stagger="70">${[["Testers", "They try to trick the AI on purpose, like crash testing a car, to find problems before anyone gets hurt.", "#/learn/u8/evals"], ["Mind readers", "They look inside the AI, like an X-ray, to see what it is really thinking.", "#/learn/u3/interp"], ["Guards", "They build watchers and off switches, so if the AI does something wrong, it gets caught.", "#/control"], ["Rule makers", "Governments and companies write rules about what AI can and cannot do.", "#/policy"]].map(([t, d, h]) => `<a class="card card-glow" data-m3="up" href="${h}"><h3>${esc(t)}</h3><p>${esc(d)}</p></a>`).join("")}</div>`)}
  ${sec("share", 7, "Keep it private", "Okay to <span class='serif'>share?</span>", "Chatbots can remember and pass on what you type. Sort each card. Tap the side you think is right.",
    `<div class="card x-share" data-m3="up" id="sharebox"></div>`)}
  ${sec("fake", 8, "Real or fake", "When seeing is not <span class='serif'>believing.</span>", "AI can make pictures, videos and voices that look real. Four habits help.",
    `<div class="grid g4" data-m3-stagger="80">${FAKE.map(([t, d], i) => `<div class="card card-glow x-fake" data-m3="up" style="--c:${["#22d3ee", "#f59e0b", "#84cc16", "#eab308"][i]}"><span class="x-kid-n" style="background:${["#22d3ee", "#f59e0b", "#84cc16", "#eab308"][i]}">${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</div>`)}
  ${sec("words", 9, "Word list", "Big words, <span class='serif'>small.</span>", "The words grown ups use about AI, in kid size. Tap a word.",
    `<div class="x-words" data-m3-stagger="50">${WORDS.map(([w, d]) => `<details class="x-word" data-m3="up"><summary>${esc(w)}</summary><p>${esc(d)}</p></details>`).join("")}</div>`)}
  ${sec("talk", 10, "Talk cards", "Questions for the <span class='serif'>dinner table.</span>", "Tap a card to flip it. There are no wrong answers.",
    `<div class="grid g4 x-talk" data-m3-stagger="60">${TALK.map(([q, t], i) => `<button type="button" class="x-flip" data-m3="up" aria-pressed="false"><span class="f"><b class="mono">${i + 1}</b><span>Tap to see the question</span></span><span class="b"><span>${esc(q)}</span><small>${esc(t)}</small></span></button>`).join("")}</div>`)}
  ${sec("habits", 11, "Family habits", "Our <span class='serif'>promise.</span>", "Tick the ones your family already does. It stays on this device only.",
    `<div class="x-plan card" data-m3="up"><ul class="x-check">${HABITS.map((h, i) => `<li><label><input type="checkbox" data-hab="${i}" ${habits.has(i) ? "checked" : ""}><span>${esc(h)}</span></label></li>`).join("")}</ul><p class="muted" style="margin-top:12px" id="habn"></p></div>`)}
  ${sec("grownups", 12, "For grown ups", "If your child <span class='serif'>is worried.</span>", "",
    `<div class="grid g2"><div class="card" data-m3="up"><h3>Stay calm, stay honest</h3><p>It is fine to say: some very smart people are worried, and many are working hard so that AI stays safe. Children take their cue from your tone more than your words. Keep it short, kind and open.</p></div><div class="card" data-m3="up"><h3>Go further together</h3><p>Many AI apps set a minimum age in their rules, so read them together before signing up. Older children can try the free course, and families can use the calm preparation checklist.</p><div class="row" style="margin-top:12px"><a class="btn sm" href="#/learn">Alignment 101</a><a class="btn sm ghost" href="#/prepare">Prepare</a><a class="btn sm ghost" href="#/bharat"><span lang="bn">বাংলা</span> and <span lang="hi">हिन्दी</span></a></div></div></div>`)}`;
  B.add(tocBar(el));

  // Guess the next word
  let gi = 0; const gbox = $("#guess", el);
  const paintG = (pick) => { const g = NEXT[gi]; gbox.innerHTML = `<div class="eyebrow">Guess the next word</div><p class="x-guess-s">${esc(g.s)} <span class="x-blank">${pick != null ? esc(g.o[pick]) : "____"}</span></p><div class="row">${g.o.map((o, i) => `<button class="btn sm ${pick === i ? (i === g.a ? "primary" : "") : ""}" type="button" data-gw="${i}" ${pick != null ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>${pick != null ? `<p style="margin-top:12px">${pick === g.a ? "Yes. " : "Funny, but probably not. "}${esc(g.why)}</p><button class="btn sm ghost" type="button" id="gnext">Next sentence ${ICON.arrow}</button>` : ""}`; };
  paintG(null);
  // Robot cleaner game
  const rb = $("#robot", el); let lv = 0;
  const paintR = (show) => { const L = game.levels[lv]; if (!L) { rb.innerHTML = `<p>The game did not load. The lesson: no single rule is safe on its own.</p>`; return; } rb.innerHTML = `<div class="x-robot-top"><span class="mono">Level ${lv + 1} of ${game.levels.length}</span><div class="x-dots">${game.levels.map((_, i) => `<i class="${i <= lv ? "on" : ""}"></i>`).join("")}</div></div><div class="x-robot-stage" aria-hidden="true"><span class="x-bot ${show ? "x-bot-" + L.hack : ""}"><svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><rect x="14" y="18" width="36" height="30" rx="9" fill="currentColor" opacity=".9"/><rect x="29" y="8" width="6" height="10" rx="3" fill="currentColor"/><circle cx="32" cy="7" r="4" fill="#f59e0b"/><circle cx="25" cy="31" r="5" fill="#07111f"/><circle cx="39" cy="31" r="5" fill="#07111f"/><circle cx="26" cy="30" r="2" fill="#22d3ee"/><circle cx="40" cy="30" r="2" fill="#22d3ee"/><rect x="24" y="40" width="16" height="3" rx="1.5" fill="#07111f"/><rect x="18" y="50" width="8" height="8" rx="3" fill="currentColor"/><rect x="38" y="50" width="8" height="8" rx="3" fill="currentColor"/></svg></span><span class="x-dirt"></span><span class="x-dirt"></span><span class="x-dirt"></span></div><h3>The rule: ${esc(L.rule)}</h3>${show ? `<p><b>What the robot does:</b> ${esc(L.hackText)}</p><p class="muted">${esc(L.real)}</p><div class="row">${lv < game.levels.length - 1 ? `<button class="btn primary" type="button" id="rnext">Try a better rule ${ICON.arrow}</button>` : `<button class="btn" type="button" id="rre">Play again</button>`}</div>` : `<button class="btn primary" type="button" id="rgo">${ICON.play} Let the robot try</button>`}`; B.add(anim(rb)); };
  paintR(false);
  // Spot the mistake
  let si = 0, sp = null; const sbox = $("#spotbox", el);
  const paintS = () => { const g = SPOT[si]; sbox.innerHTML = `<div class="x-robot-top"><span class="mono">Round ${si + 1} of ${SPOT.length}</span><div class="x-dots">${SPOT.map((_, i) => `<i class="${i <= si ? "on" : ""}"></i>`).join("")}</div></div><p class="x-spot-ai"><span class="x-spot-bot" aria-hidden="true">AI</span>Here are three facts, and I am very sure about all of them.</p><div class="x-spot-opts">${g.s.map((t, i) => `<button type="button" class="x-spot-o ${sp != null ? (i === g.bad ? "bad" : "ok") : ""}" data-sp="${i}" ${sp != null ? "disabled" : ""}><span class="mono">${i + 1}</span>${esc(t)}</button>`).join("")}</div>${sp != null ? `<p style="margin-top:14px"><b>${sp === g.bad ? "You found it." : "Good try. The wrong one was number " + (g.bad + 1) + "."}</b> ${esc(g.why)}</p><button class="btn sm ghost" type="button" id="spn">${si < SPOT.length - 1 ? "Next round" : "Play again"} ${ICON.arrow}</button>` : ""}`; };
  paintS();
  // Story pages
  let pg = 0; const stb = $("#storybox", el);
  const paintSt = () => { const [t, d] = STORY[pg]; stb.innerHTML = `<div class="eyebrow">Page ${pg + 1} of ${STORY.length}</div><h3>${esc(t)}</h3><p>${esc(d)}</p>${pg === STORY.length - 1 ? `<p class="muted">The lesson: say what you really mean, and a good helper checks before doing something big. Safety researchers call this alignment.</p>` : ""}<div class="row"><button class="btn sm ghost" type="button" data-st="-1" ${pg === 0 ? "disabled" : ""}>Back</button><button class="btn sm primary" type="button" data-st="1">${pg < STORY.length - 1 ? "Next page" : "Read again"} ${ICON.arrow}</button></div>`; B.add(anim(stb)); };
  paintSt();
  // Share or keep private
  let hi = 0, hs = 0, hp = null; const shb = $("#sharebox", el);
  const paintH = () => { if (hi >= SHARE.length) { shb.innerHTML = `<div class="x-share-end"><b>${hs} of ${SHARE.length}</b><p>Rule of thumb: if it could help a stranger find you, log in as you, or recognise you, keep it private.</p><button class="btn" type="button" id="shre">Sort again</button></div>`; return; } const [t, ok] = SHARE[hi]; shb.innerHTML = `<div class="x-robot-top"><span class="mono">Card ${hi + 1} of ${SHARE.length}</span><span class="mono">Score ${hs}</span></div><div class="x-share-c" ${hp != null ? `data-res="${hp === ok ? "y" : "n"}"` : ""}>${esc(t)}</div><div class="x-share-b"><button type="button" class="btn x-share-ok" data-sh="1" ${hp != null ? "disabled" : ""}>Okay to share</button><button type="button" class="btn x-share-no" data-sh="0" ${hp != null ? "disabled" : ""}>Keep private</button></div>${hp != null ? `<p style="margin-top:12px"><b>${hp === ok ? "Yes." : "Hmm, think again."}</b> ${ok ? "This is fine to share. It does not tell anyone who or where you are." : "Keep this private. It could help a stranger find you, pretend to be you, or get into your accounts."}</p><button class="btn sm ghost" type="button" id="shn">Next card ${ICON.arrow}</button>` : ""}`; };
  paintH();
  const habN = () => ($("#habn", el).textContent = `${habits.size} of ${HABITS.length} habits ticked.`); habN();
  el.addEventListener("change", (e) => { const c = e.target.closest("[data-hab]"); if (!c) return; c.checked ? habits.add(+c.dataset.hab) : habits.delete(+c.dataset.hab); store.set("x:kids:habits", [...habits]); habN(); });
  el.addEventListener("click", (e) => {
    const gw = e.target.closest("[data-gw]"); if (gw) { paintG(+gw.dataset.gw); return; }
    if (e.target.closest("#gnext")) { gi = (gi + 1) % NEXT.length; paintG(null); return; }
    if (e.target.closest("#rgo")) { paintR(true); return; }
    if (e.target.closest("#rnext")) { lv++; paintR(false); return; }
    if (e.target.closest("#rre")) { lv = 0; paintR(false); return; }
    const spb = e.target.closest("[data-sp]"); if (spb && sp == null) { sp = +spb.dataset.sp; paintS(); return; }
    if (e.target.closest("#spn")) { si = (si + 1) % SPOT.length; sp = null; paintS(); return; }
    const stb2 = e.target.closest("[data-st]"); if (stb2) { pg = (pg + +stb2.dataset.st + STORY.length) % STORY.length; paintSt(); return; }
    const shb2 = e.target.closest("[data-sh]"); if (shb2 && hp == null) { hp = +shb2.dataset.sh; if (hp === SHARE[hi][1]) hs++; paintH(); return; }
    if (e.target.closest("#shn")) { hi++; hp = null; paintH(); return; }
    if (e.target.closest("#shre")) { hi = 0; hs = 0; hp = null; paintH(); return; }
    const f = e.target.closest(".x-flip"); if (f) { const on = f.getAttribute("aria-pressed") !== "true"; f.setAttribute("aria-pressed", on); }
  });
  return () => B.run();
}
