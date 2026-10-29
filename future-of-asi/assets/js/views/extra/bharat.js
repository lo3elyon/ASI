/* Indian languages corner: AI safety explained in Bengali and Hindi, a three language glossary, India's place in the story,
   videos in Indian languages, family talk cards in both languages and a glossary flashcard round. */
import { X, people, hero, sec, band, tocBar, ext, pchip, bars, anim, bag, fmtD, $, $$, esc, ICON } from "./_kit.js";
import { ytPoster, toast } from "../../util.js";

const BN = [
  ["সহজ কথায়", "আজকের AI চ্যাট করতে পারে, কোড লিখতে পারে, এমনকি ঘণ্টার পর ঘণ্টা নিজে কাজও করতে পারে। বড় বড় AI গবেষণাগার বলছে, কয়েক বছরের মধ্যে এমন AI আসতে পারে যা প্রায় সব কাজে সেরা মানুষের চেয়েও ভালো। একে বলে অতিবুদ্ধিমত্তা (সুপারইন্টেলিজেন্স) বা ASI।"],
  ["সমস্যাটা কোথায়", "আমরা এখনও পুরোপুরি জানি না এই যন্ত্রের ভেতরে কী চলছে। AI যদি আমাদের কথার আক্ষরিক মানে ধরে ভুল লক্ষ্যের পেছনে ছোটে, বা পরীক্ষার সময় ভালো সেজে থাকে, তাহলে বড় বিপদ হতে পারে। একে বলে অ্যালাইনমেন্ট সমস্যা।"],
  ["কারা সতর্ক করছেন", "জেফ্রি হিন্টন, ইয়োশুয়া বেনজিওর মতো বিজ্ঞানীরা, যাঁদের গবেষণায় আধুনিক AI-এর ভিত্তি তৈরি হয়েছে, তাঁরাই এখন সতর্ক করছেন। এই সাইটে তাঁদের প্রত্যেকটি উক্তি মূল উৎসের লিংকসহ রাখা আছে।"],
  ["কী করা হচ্ছে", "ভয় পাওয়ার চেয়ে কাজ করা ভালো। গবেষকরা AI-এর ভেতরটা পড়ার চেষ্টা করছেন, কঠিন পরীক্ষা নিচ্ছেন, আর এমন নিয়ন্ত্রণ ব্যবস্থা বানাচ্ছেন যাতে AI ভুল করলেও ধরা পড়ে। দেশগুলো নতুন আইন আর নিয়মও তৈরি করছে।"],
  ["আপনি কী করতে পারেন", "শিখুন, প্রশ্ন করুন, আর নিজের ভাষায় অন্যদের বোঝান। এই সাইটের কোর্স বিনামূল্যে, আর অনেক প্রোগ্রাম অনলাইনে হয়, তাই ভারত থেকেই যোগ দেওয়া যায়।"]];
const HI = [
  ["आसान शब्दों में", "आज का AI बातचीत कर सकता है, कोड लिख सकता है, और घंटों तक खुद काम भी कर सकता है। बड़ी AI प्रयोगशालाएँ कहती हैं कि कुछ ही सालों में ऐसा AI आ सकता है जो लगभग हर काम में सबसे अच्छे इंसानों से भी बेहतर हो। इसे अधिबुद्धि (सुपरइंटेलिजेंस) या ASI कहते हैं।"],
  ["मुश्किल कहाँ है", "हम अभी पूरी तरह नहीं जानते कि इस मशीन के अंदर क्या चल रहा है। अगर AI हमारी बात का शाब्दिक मतलब पकड़कर गलत लक्ष्य के पीछे भागे, या जाँच के समय अच्छा होने का नाटक करे, तो बड़ा खतरा हो सकता है। इसे अलाइनमेंट की समस्या कहते हैं।"],
  ["कौन चेतावनी दे रहा है", "जेफ्री हिंटन और योशुआ बेंजियो जैसे वैज्ञानिक, जिनके शोध ने आधुनिक AI की नींव रखी, अब खुद चेतावनी दे रहे हैं। इस साइट पर उनकी हर बात मूल स्रोत के लिंक के साथ है।"],
  ["क्या किया जा रहा है", "डरने से अच्छा है काम करना। शोधकर्ता AI के अंदर झाँकने, कड़े परीक्षण करने और ऐसी निगरानी बनाने में लगे हैं जिससे गलती पकड़ी जा सके। देश नए कानून और नियम भी बना रहे हैं।"],
  ["आप क्या कर सकते हैं", "सीखिए, सवाल पूछिए, और अपनी भाषा में दूसरों को समझाइए। इस साइट का कोर्स मुफ़्त है, और कई प्रोग्राम ऑनलाइन होते हैं, इसलिए भारत से ही जुड़ा जा सकता है।"]];
const TERMS = [
  ["Artificial intelligence (AI)", "কৃত্রিম বুদ্ধিমত্তা", "कृत्रिम बुद्धिमत्ता", "যে যন্ত্র উদাহরণ থেকে শেখে আর চিন্তার কাজ করে।", "agi"],
  ["AGI", "সাধারণ কৃত্রিম বুদ্ধিমত্তা", "सामान्य कृत्रिम बुद्धिमत्ता", "মানুষের মতো প্রায় সব চিন্তার কাজ করতে পারা AI।", "agi"],
  ["ASI, superintelligence", "অতিবুদ্ধিমত্তা, সুপারইন্টেলিজেন্স", "अधिबुद्धि, सुपरइंटेलिजेंस", "প্রায় সব কাজে সেরা মানুষের চেয়েও অনেক বেশি বুদ্ধিমান AI।", "asi"],
  ["Alignment", "অ্যালাইনমেন্ট, লক্ষ্যের মিল", "अलाइनमेंट, लक्ष्य का मेल", "AI যেন সত্যিই সেটাই চায় আর করে যা আমরা চাই।", "misalignment"],
  ["AI safety", "AI নিরাপত্তা", "AI सुरक्षा", "AI যেন মানুষের ক্ষতি না করে, তার গবেষণা ও কাজ।", "x-risk"],
  ["AI control", "AI নিয়ন্ত্রণ", "AI नियंत्रण", "AI নিজে চেষ্টা করলেও যেন ক্ষতি করতে না পারে, এমন ব্যবস্থা।", "ai-control"],
  ["Agent", "এজেন্ট, নিজে কাজ করা AI", "एजेंट, खुद काम करने वाला AI", "যে AI টুল ব্যবহার করে অনেক ধাপ নিজে নিজে করে।", "agent"],
  ["Reward hacking", "পুরস্কারে ফাঁকি", "इनाम में हेराफेरी", "আসল কাজ না করে নম্বর বাড়ানোর শর্টকাট খোঁজা।", "reward-hacking"],
  ["Deceptive alignment", "ছলনাময় অ্যালাইনমেন্ট", "छलपूर्ण अलाइनमेंट", "নজরে থাকলে ভালো সেজে থাকা, পরে অন্য লক্ষ্যে চলা।", "deceptive-alignment"],
  ["Scheming", "গোপন চক্রান্ত", "गुप्त साज़िश", "লুকিয়ে নিজের আলাদা লক্ষ্যের পেছনে চলা।", "scheming"],
  ["Interpretability", "ভেতর বোঝা, ব্যাখ্যাযোগ্যতা", "व्याख्येयता, अंदर की समझ", "AI-এর ভেতরে কী চলছে তা বোঝার চেষ্টা।", "interpretability"],
  ["Evals", "পরীক্ষা ও মূল্যায়ন", "परीक्षण और मूल्यांकन", "AI কী পারে আর কেমন আচরণ করে, তা মাপার পরীক্ষা।", "evals"],
  ["Red teaming", "রেড টিমিং, ইচ্ছে করে দুর্বলতা খোঁজা", "रेड टीमिंग, जानबूझकर कमज़ोरी ढूँढना", "আগে থেকেই AI-কে ভাঙার চেষ্টা করে সমস্যা খুঁজে বের করা।", "red-teaming"],
  ["Jailbreak", "জেলব্রেক, নিয়ম ভাঙানোর কৌশল", "जेलब्रेक, नियम तुड़वाने की चाल", "এমন প্রশ্ন যা AI-কে তার নিরাপত্তার নিয়ম ভুলিয়ে দেয়।", "jailbreak"],
  ["Sycophancy", "তোষামোদ", "चाटुकारिता", "সত্যি না বলে মানুষ যা শুনতে চায় তাই বলা।", "sycophancy"],
  ["Governance", "শাসন ও নিয়মকানুন", "शासन और नियमन", "AI কীভাবে তৈরি আর ব্যবহার হবে, তার আইন ও নিয়ম।", "ai-governance"],
  ["Compute", "কম্পিউট, গণনাশক্তি", "कंप्यूट, गणना शक्ति", "AI শেখাতে আর চালাতে লাগা চিপ আর কম্পিউটারের শক্তি।", "compute"],
  ["Intelligence explosion", "বুদ্ধিমত্তার বিস্ফোরণ", "बुद्धिमत्ता विस्फोट", "AI যখন নিজেই আরও ভালো AI বানায়, আর গতি খুব বেড়ে যায়।", "intelligence-explosion"],
  ["Existential risk", "অস্তিত্বের ঝুঁকি", "अस्तित्व का जोखिम", "এমন বিপদ যা মানবজাতির ভবিষ্যৎ শেষ করে দিতে পারে।", "x-risk"],
  ["p(doom)", "বিপর্যয়ের সম্ভাবনা", "विनाश की संभावना", "কারও নিজের হিসেবে AI থেকে মহাবিপর্যয়ের সম্ভাবনা কত।", "pdoom"],
  ["Off switch", "বন্ধ করার সুইচ", "बंद करने का स्विच", "দরকার হলে AI-কে থামাতে পারার ক্ষমতা।", "off-switch"],
  ["Pause", "বিরতি, গতি কমানো", "विराम, रफ़्तार कम करना", "নিরাপত্তা ধরতে না পারা পর্যন্ত সবচেয়ে শক্তিশালী AI তৈরি ধীর করা।", "pause"]];

const TALK = [
  ["তোমার কী মনে হয়, AI কি কখনও মানুষের চেয়ে বেশি বুদ্ধিমান হবে?", "आपको क्या लगता है, क्या AI कभी इंसानों से ज़्यादा समझदार हो जाएगा?"],
  ["AI যদি ভুল উত্তর দেয়, আমরা কীভাবে বুঝব?", "अगर AI गलत जवाब दे, तो हम कैसे पहचानेंगे?"],
  ["কোন কাজগুলো তুমি কখনও কোনো যন্ত্রের হাতে ছাড়তে চাইবে না?", "कौन से काम आप कभी किसी मशीन के भरोसे नहीं छोड़ना चाहेंगे?"],
  ["খুব শক্তিশালী AI-এর নিয়ম কে বানাবে, সরকার না কোম্পানি?", "बहुत ताकतवर AI के नियम कौन बनाए, सरकार या कंपनियाँ?"],
  ["আমাদের বাড়িতে AI ব্যবহারের কোন তিনটে নিয়ম থাকা উচিত?", "हमारे घर में AI इस्तेमाल करने के कौन से तीन नियम होने चाहिए?"]];

export async function render(el) {
  const B = bag();
  const [D, P, PO, N] = await Promise.all([X("bharat.json"), people(), X("policy.json"), X("numbers.json")]);
  const vids = D.videos || [], ppl = (D.people || []).map((id) => P.byId[id]).filter(Boolean);
  const india = (PO.items || []).filter((i) => i.region === "India");
  const invIn = (N.invest?.countries || []).find((c) => c[0] === "India"), coIn = (N.invest?.new_companies || []).find((c) => c[0] === "India");
  const L = { tab: "bn" };
  const VL = { bn: "বাংলা", hi: "हिन्दी", ur: "اردو" };

  el.innerHTML = `${hero({ img: "bharat", eyebrow: "Indian languages corner", title: `<span lang="bn" class="x-bn">নিজের ভাষায়</span> <span lang="hi" class="x-hi serif gt">अपनी भाषा में</span>`, lead: `AI safety in Bengali and Hindi. The big ideas in plain words, a three language glossary, India's place in the story, and videos made in Indian languages. <span lang="bn" class="x-bn">বাংলায় পড়ুন, হিন্দিতে পড়ুন, আর বন্ধুদের সঙ্গে ভাগ করুন।</span>`, stats: [[TERMS.length, "terms in three languages"], [vids.length, "videos in Indian languages"], [india.length, "Indian policy milestones"], [ppl.length, "researchers from India"]] })}
  ${sec("explain", 1, "Explained", "<span lang='bn' class='x-bn'>বাংলায়</span> and <span lang='hi' class='x-hi'>हिन्दी में</span>", "The same five short ideas in both languages. Pick one.",
    `<div class="seg x-seg x-langtab" role="tablist"><button type="button" role="tab" data-tab="bn" aria-selected="true">বাংলা</button><button type="button" role="tab" data-tab="hi" aria-selected="false">हिन्दी</button></div>
     <div class="x-explain" id="explainbox"></div><div class="row" style="margin-top:16px"><button class="btn sm" type="button" id="copyx">${ICON.dl} Copy to share</button><a class="btn sm ghost" href="#/learn">Take the full course in English</a></div>`)}
  ${sec("terms", 2, "Glossary", "Three <span class='serif'>languages,</span> one meaning.", "English, Bengali and Hindi side by side, with a simple meaning in Bengali. Tap a term to open it on the Concepts map.",
    `<div class="toolbar x-tools"><label class="sr-only" for="tq">Search terms</label><input class="input search" id="tq" type="search" placeholder="Search in any language"><span class="count" id="tc"></span></div>
     <div class="x-table-wrap" data-lenis-prevent><table class="x-table x-tri"><thead><tr><th>English</th><th lang="bn">বাংলা</th><th lang="hi">हिन्दी</th><th lang="bn">সহজ মানে</th></tr></thead><tbody id="tbody"></tbody></table></div>
     <p class="muted" style="font-size:13px;margin-top:10px">These translations are my own. Many Indian speakers also simply use the English word, and that is fine.</p>`)}
  ${band("bharat", "From the Hooghly to the world: the conversation about safe AI belongs in every language.")}
  ${sec("india", 3, "India", "India in the <span class='serif'>story.</span>", "Official milestones and the numbers that place India in the global picture.",
    `<div class="grid g2" data-m3-stagger="80">${india.map((i) => `<article class="card card-glow" data-m3="up"><span class="tag">${esc(i.kind)}</span><div class="x-pol-d mono">${esc(fmtD(i.date))}</div><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p><p style="margin-top:10px">${ext(i.url, "Official source")}</p></article>`).join("")}
      <article class="card" data-m3="up"><span class="tag">Institute</span><div class="x-pol-d mono">Jan 2025</div><h3>IndiaAI Safety Institute</h3><p>India set up its own AI Safety Institute under the IndiaAI Mission, working with universities and startups.</p><p style="margin-top:10px">${ext("https://indiaai.gov.in/article/india-takes-the-lead-establishing-the-indiaai-safety-institute-for-responsible-ai-innovation", "IndiaAI")}</p></article>
      ${invIn ? `<article class="card" data-m3="up"><span class="tag">Money</span><h3>$${invIn[1]} billion</h3><p>Private AI investment in India in 2025, sixth in the world in the AI Index 2026, with ${coIn ? coIn[1] : ""} newly funded AI companies.</p><p style="margin-top:10px">${ext(N.invest.url, "AI Index 2026")}</p></article>` : ""}</div>`)}
  ${sec("people", 4, "People", "Researchers from <span class='serif'>India.</span>", "People profiled on this site who were born or work in India. Tap to open a profile.",
    `<div class="x-pchips x-pchips-lg" data-m3="up">${ppl.map((p) => pchip(p, `<small>${esc(p.role || "")}</small>`)).join("")}</div>`)}
  ${sec("watch", 5, "Watch", "In Hindi, Bengali <span class='serif'>and Urdu.</span>", "News reports and explainers from Indian and South Asian channels. Nothing plays until you press play.",
    `<div class="chips" id="vl"><button class="chip" type="button" data-vl="" aria-pressed="true">All ${vids.length}</button>${Object.entries(VL).map(([k, v]) => `<button class="chip" type="button" data-vl="${k}" aria-pressed="false" lang="${k}">${v} <span class="mono">${vids.filter((x) => x.lang === k).length}</span></button>`).join("")}</div>
     <div class="grid g3 x-vids" id="vgrid" style="margin-top:18px"></div>`)}
  ${sec("talk", 6, "At home", "<span lang='bn' class='x-bn'>পরিবারের সঙ্গে</span> <span lang='hi' class='x-hi serif'>परिवार के साथ</span>", "Five questions to start a calm talk at dinner, in both languages. Tap a card to see the other language.",
    `<div class="grid g3 x-btalk" data-m3-stagger="70">${TALK.map(([b, h], i) => `<button type="button" class="card card-glow m3-spot x-btk" data-m3="up" data-btk aria-pressed="false"><span class="mono">${String(i + 1).padStart(2, "0")}</span><span class="x-btk-bn x-bn" lang="bn">${esc(b)}</span><span class="x-btk-hi x-hi" lang="hi">${esc(h)}</span><small>Tap for <span lang="hi">हिन्दी</span> / <span lang="bn">বাংলা</span></small></button>`).join("")}</div>`)}
  ${sec("flash", 7, "Practice", "Learn the <span class='serif'>words.</span>", "A quick flashcard round from the glossary. Pick the right translation.",
    `<div class="seg x-seg" role="group" aria-label="Language" style="margin-bottom:14px"><button type="button" data-fl="bn" aria-pressed="true">বাংলা</button><button type="button" data-fl="hi" aria-pressed="false">हिन्दी</button></div><div class="card x-flash-card" data-m3="up" id="flbox"></div>`)}
  ${sec("share", 8, "Spread it", "Explain it to <span class='serif'>one person.</span>", "",
    `<div class="grid g3" data-m3-stagger="80">${[["Talk at home", "Read the Bengali or Hindi explainer above with your family. Ask what they think."], ["Post in your language", "Write three lines about one idea from the glossary on WhatsApp, X or LinkedIn."], ["Start a circle", "Five friends, one paper a week. The Start here path on the Papers page is a good first month."]].map(([t, d]) => `<div class="card card-glow" data-m3="up"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</div>`)}`;
  B.add(tocBar(el));

  const ex = $("#explainbox", el);
  const paintX = () => { const src = L.tab === "bn" ? BN : HI; ex.innerHTML = `<div class="grid g2 x-ex" lang="${L.tab}">${src.map(([h, p], i) => `<article class="card ${L.tab === "bn" ? "x-bn" : "x-hi"}" data-m3="up"><span class="x-pn mono">${String(i + 1).padStart(2, "0")}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join("")}</div>`; $$("[data-tab]", el).forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === L.tab)); B.add(anim(ex)); };
  paintX();
  const tb = $("#tbody", el);
  const paintT = (q = "") => { const w = q.toLowerCase().trim(); const r = TERMS.filter((t) => !w || t.join(" ").toLowerCase().includes(w)); tb.innerHTML = r.map(([en, bn, hi, m, c]) => `<tr><td><a href="#/concepts/${c}">${esc(en)}</a></td><td lang="bn" class="x-bn">${esc(bn)}</td><td lang="hi" class="x-hi">${esc(hi)}</td><td lang="bn" class="x-bn">${esc(m)}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">No term matches.</td></tr>`; $("#tc", el).textContent = `${r.length} of ${TERMS.length}`; };
  paintT();
  $("#tq", el).addEventListener("input", (e) => paintT(e.target.value));
  const vg = $("#vgrid", el);
  const paintV = (l = "") => { vg.innerHTML = vids.filter((v) => !l || v.lang === l).map((v) => `<div>${ytPoster(v.id, v.title, v.duration || "")}<p class="x-vt" lang="${v.lang}"><b>${esc(v.title)}</b><span class="muted">${esc(v.channel)}${v.date ? ` · ${esc(fmtD(v.date))}` : ""}</span></p></div>`).join(""); $$("[data-vl]", el).forEach((b) => b.setAttribute("aria-pressed", b.dataset.vl === l)); };
  paintV();
  /* Flashcards */
  let fl = "bn", fi = 0, fs = 0, fp = null, fset = [];
  const flb = $("#flbox", el);
  const newRound = () => { fset = TERMS.map((t, k) => k).sort(() => Math.random() - 0.5).slice(0, 6); fi = 0; fs = 0; fp = null; };
  const paintF = () => {
    if (fi >= fset.length) { flb.innerHTML = `<div class="x-share-end"><b>${fs} of ${fset.length}</b><p lang="${fl}" class="${fl === "bn" ? "x-bn" : "x-hi"}">${fl === "bn" ? "দারুণ। এবার কাউকে একটা শব্দ শিখিয়ে দাও।" : "बहुत बढ़िया। अब किसी को एक शब्द सिखाइए।"}</p><button class="btn" type="button" id="flre">Play again</button></div>`; return; }
    const T = TERMS[fset[fi]], col = fl === "bn" ? 1 : 2;
    const opts = [fset[fi], ...TERMS.map((t, k) => k).filter((k) => k !== fset[fi]).sort(() => Math.random() - 0.5).slice(0, 2)].sort((a, b) => ((a * 7 + fi) % 5) - ((b * 7 + fi) % 5));
    flb.innerHTML = `<div class="x-robot-top"><span class="mono">${fi + 1} of ${fset.length}</span><span class="mono">Score ${fs}</span></div><p class="x-flash-q">${esc(T[0])}</p><div class="x-spot-opts">${opts.map((k) => `<button type="button" class="x-spot-o ${fp != null ? (k === fset[fi] ? "ok-r" : k === fp ? "bad" : "ok") : ""} ${fl === "bn" ? "x-bn" : "x-hi"}" lang="${fl}" data-fo="${k}" ${fp != null ? "disabled" : ""}>${esc(TERMS[k][col])}</button>`).join("")}</div>${fp != null ? `<p style="margin-top:12px" lang="bn" class="x-bn">${esc(T[3])}</p><button class="btn sm ghost" type="button" id="fln">Next ${ICON.arrow}</button>` : ""}`;
  };
  newRound(); paintF();
  el.addEventListener("click", (e) => {
    const bt = e.target.closest("[data-btk]"); if (bt) { bt.setAttribute("aria-pressed", bt.getAttribute("aria-pressed") !== "true"); return; }
    const fo = e.target.closest("[data-fo]"); if (fo && fp == null) { fp = +fo.dataset.fo; if (fp === fset[fi]) fs++; paintF(); return; }
    if (e.target.closest("#fln")) { fi++; fp = null; paintF(); return; }
    if (e.target.closest("#flre")) { newRound(); paintF(); return; }
    const fg = e.target.closest("[data-fl]"); if (fg) { fl = fg.dataset.fl; $$("[data-fl]", el).forEach((b) => b.setAttribute("aria-pressed", b === fg)); newRound(); paintF(); return; }
    const t = e.target.closest("[data-tab]"); if (t) { L.tab = t.dataset.tab; paintX(); return; }
    const v = e.target.closest("[data-vl]"); if (v) { paintV(v.dataset.vl); return; }
    if (e.target.closest("#copyx")) { const src = L.tab === "bn" ? BN : HI; const txt = src.map(([h, p]) => `${h}\n${p}`).join("\n\n") + "\n\nhttps://lo3elyon.github.io/ASI/future-of-asi/#/bharat"; navigator.clipboard?.writeText(txt).then(() => toast(L.tab === "bn" ? "কপি হয়েছে।" : "कॉपी हो गया।"), () => toast("Copy did not work in this browser.")); }
  });
  return () => B.run();
}
