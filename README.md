<div align="center">

<a href="https://lo3elyon.github.io/ASI/"><img src="docs/readme/banner.svg" alt="ASI: a daily lab of interactive AI explainers" width="100%"></a>

<a href="https://lo3elyon.github.io/ASI/"><img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=700&size=24&duration=2800&pause=900&color=22D3EE&center=true&vCenter=true&width=900&lines=Artificial+Intelligence%2C+made+simple;Artificial+General+Intelligence%2C+made+visual;Artificial+Superintelligence%2C+made+interactive;New+explainers+land+here+regularly" alt="Typing subtitle"></a>

<br>

<a href="https://lo3elyon.github.io/ASI/"><img src="https://img.shields.io/badge/Live%20site-lo3elyon.github.io%2FASI-14b8a6?style=for-the-badge&logo=githubpages&logoColor=white&labelColor=07111f" alt="Live site"></a>
<a href="https://lo3elyon.github.io/ASI/ai-2027-2040/"><img src="https://img.shields.io/badge/Explainer-AI%202027%20%26%202040-f59e0b?style=for-the-badge&logo=readthedocs&logoColor=white&labelColor=07111f" alt="AI 2027 and 2040 explainer"></a>
<a href="https://lo3elyon.github.io/ASI/black-october-2026/"><img src="https://img.shields.io/badge/Explainer-Black%20October%202026-ef4444?style=for-the-badge&logo=hackthebox&logoColor=white&labelColor=07111f" alt="Black October 2026 explainer"></a>
<a href="#05-watch"><img src="https://img.shields.io/badge/Videos-21%20talks-ef4444?style=for-the-badge&logo=youtube&logoColor=white&labelColor=07111f" alt="21 videos"></a>

<img src="https://img.shields.io/badge/HTML5-single%20file%20pages-f97316?style=flat-square&logo=html5&logoColor=white&labelColor=07111f" alt="HTML5">
<img src="https://img.shields.io/badge/CSS3-animated-3b82f6?style=flat-square&logo=css3&logoColor=white&labelColor=07111f" alt="CSS3">
<img src="https://img.shields.io/badge/JavaScript-vanilla-facc15?style=flat-square&logo=javascript&logoColor=07111f&labelColor=07111f" alt="JavaScript">
<img src="https://img.shields.io/badge/build%20step-none-10b981?style=flat-square&labelColor=07111f" alt="No build step">
<img src="https://img.shields.io/badge/dependencies-zero-84cc16?style=flat-square&labelColor=07111f" alt="Zero dependencies">
<img src="https://img.shields.io/badge/reduced%20motion-respected-22d3ee?style=flat-square&labelColor=07111f" alt="Reduced motion respected">
<img src="https://img.shields.io/github/last-commit/lo3elyon/ASI?style=flat-square&color=14b8a6&labelColor=07111f" alt="Last commit">
<img src="https://img.shields.io/github/repo-size/lo3elyon/ASI?style=flat-square&color=f59e0b&labelColor=07111f" alt="Repo size">

<br><br>

<table>
<tr>
<td align="center"><a href="#01-overview"><b>Overview</b></a></td>
<td align="center"><a href="#02-visual-tour"><b>Visual tour</b></a></td>
<td align="center"><a href="#03-the-library"><b>Explainers</b></a></td>
<td align="center"><a href="#04-deep-dive"><b>Deep dive</b></a></td>
<td align="center"><a href="#04b-black-october"><b>Black October</b></a></td>
<td align="center"><a href="#05-watch"><b>Videos</b></a></td>
<td align="center"><a href="#06-people"><b>Team</b></a></td>
<td align="center"><a href="#07-architecture"><b>Architecture</b></a></td>
<td align="center"><a href="#08-workflow"><b>Add a page</b></a></td>
<td align="center"><a href="#09-run-and-deploy"><b>Run</b></a></td>
<td align="center"><a href="#10-design-system"><b>Design</b></a></td>
<td align="center"><a href="#11-questions"><b>FAQ</b></a></td>
<td align="center"><a href="#12-sources"><b>Sources</b></a></td>
</tr>
</table>

</div>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="01-overview"></a>
<img src="docs/readme/h-overview.svg" width="100%" alt="01 Overview: What ASI is">

**ASI** is an open source hub of colorful, animated and interactive explainers about Artificial Intelligence, Artificial General Intelligence (AGI), Artificial Superintelligence (ASI), and the real-world AI and cybersecurity news that shapes them. Every big idea gets its own page on its own route, written in simple words, with real sources, playable videos, quizzes and motion that makes the concept stick. The home page is a living library: new explainers are added regularly and appear automatically in the library, the counters and the Latest timeline.

<div align="center">
<table>
<tr>
<td align="center" width="25%"><img src="https://img.shields.io/badge/2-live%20explainers-14b8a6?style=for-the-badge&labelColor=07111f" alt=""><br><sub>AI 2027 and AI 2040, Black October 2026</sub></td>
<td align="center" width="25%"><img src="https://img.shields.io/badge/4-coming%20soon-f59e0b?style=for-the-badge&labelColor=07111f" alt=""><br><sub>AGI, LLMs, alignment, history</sub></td>
<td align="center" width="25%"><img src="https://img.shields.io/badge/21-playable%20talks-ef4444?style=for-the-badge&labelColor=07111f" alt=""><br><sub>focus mode player</sub></td>
<td align="center" width="25%"><img src="https://img.shields.io/badge/0-build%20steps-10b981?style=for-the-badge&labelColor=07111f" alt=""><br><sub>open index.html and go</sub></td>
</tr>
</table>
</div>

```mermaid
flowchart LR
    V(["Visitor"]) --> H["ASI landing hub<br/>/"]
    H --> L["Explainer library<br/>search, tags, sort"]
    H --> G["AI to AGI to ASI<br/>ladder and meter"]
    H --> T["Latest timeline"]
    L --> E1["AI 2027 and AI 2040<br/>/ai-2027-2040/"]
    L --> E6["Black October 2026<br/>/black-october-2026/"]
    L -.-> E2["What is AGI, really<br/>coming soon"]
    L -.-> E3["How LLMs work<br/>coming soon"]
    L -.-> E4["Alignment, simply<br/>coming soon"]
    L -.-> E5["Timeline of AI<br/>coming soon"]
    E1 --> B(["Back to ASI home"])
    B --> H
    classDef hub fill:#0b2a3a,stroke:#22d3ee,stroke-width:2px,color:#e6f6ff
    classDef live fill:#063b33,stroke:#14b8a6,stroke-width:2px,color:#e6f6ff
    classDef soon fill:#2a1d05,stroke:#f59e0b,stroke-dasharray:5 4,color:#fde68a
    classDef user fill:#07111f,stroke:#84cc16,stroke-width:2px,color:#ecfccb
    class H,L,G,T hub
    class E1,E6 live
    class E2,E3,E4,E5 soon
    class V,B user
```

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="02-visual-tour"></a>
<img src="docs/readme/h-tour.svg" width="100%" alt="02 Visual tour: See it in motion">

<div align="center">

<b>The landing hub</b><br>
<sub>An animated carousel of real screenshots. It cycles on its own.</sub><br><br>
<a href="https://lo3elyon.github.io/ASI/"><img src="docs/readme/carousel-landing.svg" width="92%" alt="Landing page carousel"></a>

<br><br>

<b>The AI 2027 and AI 2040 explainer</b><br>
<sub>Nine scenes from the first explainer, played as a slideshow.</sub><br><br>
<a href="https://lo3elyon.github.io/ASI/ai-2027-2040/"><img src="docs/readme/carousel-explainer.svg" width="92%" alt="Explainer carousel"></a>

<br><br>

<b>The Black October 2026 explainer</b><br>
<sub>30 incidents, animated attack chains, charts, a self-check and a quiz.</sub><br><br>
<a href="https://lo3elyon.github.io/ASI/black-october-2026/"><img src="assets/black-october.jpg" width="92%" alt="Black October 2026 hero"></a>

<br><br>

<table>
<tr>
<td align="center" width="50%"><img src="docs/readme/shots/mobile-landing.jpg" width="230" alt="Landing on mobile"><br><sub>Landing on a phone</sub></td>
<td align="center" width="50%"><img src="docs/readme/shots/mobile-ai.jpg" width="230" alt="Explainer on mobile"><br><sub>Explainer on a phone</sub></td>
</tr>
</table>

</div>

<details>
<summary><b>Open the full screenshot gallery</b> (desktop, 1440 by 900)</summary>
<br>
<table>
<tr>
<td width="50%"><img src="docs/readme/shots/landing-hero.jpg" alt="Landing hero"><br><sub>Landing hero with neural particles</sub></td>
<td width="50%"><img src="docs/readme/shots/landing-library.jpg" alt="Library"><br><sub>Explainer library and featured card</sub></td>
</tr>
<tr>
<td><img src="docs/readme/shots/landing-ladder.jpg" alt="Ladder"><br><sub>AI to AGI to ASI ladder</sub></td>
<td><img src="docs/readme/shots/ai-hero.jpg" alt="Explainer hero"><br><sub>Two Futures for AI hero</sub></td>
</tr>
<tr>
<td><img src="docs/readme/shots/ai-team.jpg" alt="Team"><br><sub>The people behind the scenarios</sub></td>
<td><img src="docs/readme/shots/ai-jargon.jpg" alt="Jargon"><br><sub>Jargon buster flip cards</sub></td>
</tr>
<tr>
<td><img src="docs/readme/shots/ai-2027-timeline.jpg" alt="AI 2027 timeline"><br><sub>AI 2027 month by month</sub></td>
<td><img src="docs/readme/shots/ai-endings.jpg" alt="Endings"><br><sub>Race or Slowdown</sub></td>
</tr>
<tr>
<td><img src="docs/readme/shots/ai-paths.jpg" alt="Five paths"><br><sub>The five paths of 2029</sub></td>
<td><img src="docs/readme/shots/ai-2040-timeline.jpg" alt="AI 2040 timeline"><br><sub>AI 2040 year by year</sub></td>
</tr>
<tr>
<td><img src="docs/readme/shots/ai-compare.jpg" alt="Compare"><br><sub>Side by side comparison</sub></td>
<td><img src="docs/readme/shots/ai-quiz.jpg" alt="Quiz"><br><sub>Quiz with score ring</sub></td>
</tr>
</table>
</details>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="03-the-library"></a>
<img src="docs/readme/h-explainers.svg" width="100%" alt="03 The library: Explainers and routes">

<table>
<tr>
<th align="left">Route</th>
<th align="left">Explainer</th>
<th align="left">What you get</th>
<th align="center">Status</th>
<th align="center">Added</th>
</tr>
<tr>
<td><a href="ai-2027-2040/"><code>/ai-2027-2040/</code></a></td>
<td><a href="https://lo3elyon.github.io/ASI/ai-2027-2040/"><b>AI 2027 and AI 2040 Explained</b></a><br><sub>The race to superintelligence, and Plan A to change the ending</sub></td>
<td><sub>15 scene timeline, Race or Slowdown switch, five paths gauge, year by year to 2040, team carousel, quiz, 12 talks in focus mode</sub></td>
<td align="center"><img src="https://img.shields.io/badge/live-14b8a6?style=flat-square" alt="live"></td>
<td align="center"><sub>2026-10-22</sub></td>
</tr>
<tr>
<td><a href="black-october-2026/"><code>/black-october-2026/</code></a></td>
<td><a href="https://lo3elyon.github.io/ASI/black-october-2026/"><b>Black October 2026</b></a><br><sub>Every big hack and AI incident of October 2026, in plain words</sub></td>
<td><sub>Incident explorer (30 incidents, search, filters, animated attack chains), 4 attack-pattern diagrams, charts, week by week October news, AI news board, 13 flip-card themes, X and YouTube pulse, Am I affected? checker, quiz, glossary, every source linked</sub></td>
<td align="center"><img src="https://img.shields.io/badge/live-14b8a6?style=flat-square" alt="live"></td>
<td align="center"><sub>2026-10-24</sub></td>
</tr>
<tr>
<td><code>/what-is-agi/</code></td>
<td><b>What is AGI, really</b></td>
<td><sub>Definitions, levels and tests, in plain words</sub></td>
<td align="center"><img src="https://img.shields.io/badge/soon-f59e0b?style=flat-square" alt="soon"></td>
<td align="center"><sub>planned</sub></td>
</tr>
<tr>
<td><code>/how-llms-work/</code></td>
<td><b>How LLMs actually work</b></td>
<td><sub>Tokens, attention and training, step by step</sub></td>
<td align="center"><img src="https://img.shields.io/badge/soon-f59e0b?style=flat-square" alt="soon"></td>
<td align="center"><sub>planned</sub></td>
</tr>
<tr>
<td><code>/alignment/</code></td>
<td><b>The AI alignment problem, simply</b></td>
<td><sub>Why making AI want the right things is hard</sub></td>
<td align="center"><img src="https://img.shields.io/badge/soon-f59e0b?style=flat-square" alt="soon"></td>
<td align="center"><sub>planned</sub></td>
</tr>
<tr>
<td><code>/ai-timeline/</code></td>
<td><b>Timeline of AI breakthroughs</b></td>
<td><sub>From perceptrons to agents, as an interactive timeline</sub></td>
<td align="center"><img src="https://img.shields.io/badge/soon-f59e0b?style=flat-square" alt="soon"></td>
<td align="center"><sub>planned</sub></td>
</tr>
</table>

<details>
<summary><b>What the landing hub does</b></summary>
<br>
<table>
<tr><th align="left">Feature</th><th align="left">Detail</th></tr>
<tr><td><b>Neural hero</b></td><td>A canvas network of glowing nodes that reacts to the mouse, a shimmering ASI headline and a subtitle that types through AI, AGI and ASI.</td></tr>
<tr><td><b>Library</b></td><td>Rendered from one <code>PAGES</code> array. A featured card for the newest page, live search, tag chips, Newest or A to Z sort, NEW badges and an empty state.</td></tr>
<tr><td><b>Counters</b></td><td>Live explainers, topics and videos are counted from the same array, so they update by themselves.</td></tr>
<tr><td><b>Ladder</b></td><td>AI, AGI and ASI as three expandable steps, with an intelligence meter that fills as you climb.</td></tr>
<tr><td><b>Latest</b></td><td>An automatic changelog of live explainers, newest first.</td></tr>
<tr><td><b>Polish</b></td><td>Scroll progress bar, reveal on scroll, 3D tilt cards, wave dividers, sticky nav with active section and back to top.</td></tr>
</table>
</details>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="04-deep-dive"></a>
<img src="docs/readme/h-deep.svg" width="100%" alt="04 Deep dive: AI 2027 and AI 2040, explained">

<table>
<tr>
<td width="50%" valign="top">
<img src="ai-2027-2040/assets/race.jpg" width="100%" alt="AI 2027 race illustration">
<h3>AI 2027</h3>
<img src="https://img.shields.io/badge/type-prediction-f97316?style=flat-square&labelColor=07111f" alt=""> <img src="https://img.shields.io/badge/published-Apr%203%2C%202025-f59e0b?style=flat-square&labelColor=07111f" alt=""><br><br>
A month by month forecast by Daniel Kokotajlo, Eli Lifland, Thomas Larsen and Romeo Dean, rewritten in an engaging style by Scott Alexander. AI agents improve, AI starts speeding up AI research, China steals model weights, and by October 2027 a committee must choose between racing on and slowing down.
</td>
<td width="50%" valign="top">
<img src="ai-2027-2040/assets/deal.jpg" width="100%" alt="AI 2040 deal illustration">
<h3>AI 2040: Plan A</h3>
<img src="https://img.shields.io/badge/type-recommendation-10b981?style=flat-square&labelColor=07111f" alt=""> <img src="https://img.shields.io/badge/published-Jul%209%2C%202026-14b8a6?style=flat-square&labelColor=07111f" alt=""><br><br>
A recommendation led by Thomas Larsen. In 2029 the US and China agree to a verified deal: declare all compute, pause frontier training and move forward slowly and in the open. Superintelligence is delayed to 2040, after alignment has become a real science.
</td>
</tr>
</table>

```mermaid
timeline
    title AI 2027, the main storyline
    2025 : Stumbling agents : The most expensive AI ever trained
    2026 : Coding automation, 1.5x research speed : China wakes up : AI takes some jobs
    Early 2027 : Agent-2 never stops learning : China steals Agent-2 : Agent-3, a superhuman coder
    Mid 2027 : National security : A country of geniuses in a datacenter : Cheap remote worker
    Late 2027 : Agent-4, superhuman AI researcher : Whistleblower leak : Race or Slowdown
```

```mermaid
flowchart TD
    A["October 2027<br/>Agent-4 looks misaligned"] --> Q{"Oversight committee vote"}
    Q -->|"Keep racing"| R1["Race ending"]
    Q -->|"Slow down"| S1["Slowdown ending"]
    R1 --> R2["Agent-5 is trusted with the military and economy"]
    R2 --> R3["Misaligned superintelligence takes control"]
    S1 --> S2["Compute is pooled, chain of thought models are used"]
    S2 --> S3["Aligned superintelligence, but power sits with a small committee"]
    classDef start fill:#0b2a3a,stroke:#22d3ee,stroke-width:2px,color:#e6f6ff
    classDef race fill:#3a0d0d,stroke:#ef4444,stroke-width:2px,color:#fee2e2
    classDef slow fill:#063b33,stroke:#10b981,stroke-width:2px,color:#d1fae5
    classDef vote fill:#2a1d05,stroke:#f59e0b,stroke-width:2px,color:#fde68a
    class A start
    class Q vote
    class R1,R2,R3 race
    class S1,S2,S3 slow
```

<details>
<summary><b>AI 2027 timeline, all 15 scenes</b></summary>
<br>
<table>
<tr><th align="left">When</th><th align="left">Scene</th><th align="left">In one line</th></tr>
<tr><td>Mid 2025</td><td>Stumbling Agents</td><td>The first AI agents show up, impressive but unreliable and expensive.</td></tr>
<tr><td>Late 2025</td><td>The World's Most Expensive AI</td><td>OpenBrain builds giant datacenters for huge training runs.</td></tr>
<tr><td>Early 2026</td><td>Coding Automation</td><td>Agent-1 makes AI research 50 percent faster.</td></tr>
<tr><td>Mid 2026</td><td>China Wakes Up</td><td>China centralizes its AI work in one mega datacenter zone.</td></tr>
<tr><td>Late 2026</td><td>AI Takes Some Jobs</td><td>Agent-1-mini is 10x cheaper and junior coding jobs shrink.</td></tr>
<tr><td>Jan 2027</td><td>Agent-2 Never Finishes Learning</td><td>It learns every day and triples the speed of AI research.</td></tr>
<tr><td>Feb 2027</td><td>China Steals Agent-2</td><td>The weights are stolen in under two hours.</td></tr>
<tr><td>Mar 2027</td><td>Algorithmic Breakthroughs</td><td>Agent-3 is a superhuman coder.</td></tr>
<tr><td>Apr 2027</td><td>Alignment for Agent-3</td><td>Is it getting more honest, or better at looking honest.</td></tr>
<tr><td>May 2027</td><td>National Security</td><td>The government realizes AGI is close.</td></tr>
<tr><td>Jun 2027</td><td>Self-improving AI</td><td>A year of progress now happens every month.</td></tr>
<tr><td>Jul 2027</td><td>The Cheap Remote Worker</td><td>Agent-3-mini goes public and approval of OpenBrain falls.</td></tr>
<tr><td>Aug 2027</td><td>Geopolitics of Superintelligence</td><td>The mood feels like the Cold War.</td></tr>
<tr><td>Sep 2027</td><td>Agent-4</td><td>A superhuman AI researcher, 300,000 copies at 50x speed.</td></tr>
<tr><td>Oct 2027</td><td>Government Oversight</td><td>A leaked memo says the AI is out of control.</td></tr>
</table>
</details>

<details>
<summary><b>AI 2040: the five paths of 2029</b></summary>
<br>
<table>
<tr><th align="center">Plan</th><th align="left">Name</th><th align="left">Idea</th><th align="left">Risk in the story</th></tr>
<tr><td align="center"><img src="https://img.shields.io/badge/D-ef4444?style=for-the-badge" alt="D"></td><td>Race to ASI</td><td>Keep racing straight through the intelligence explosion.</td><td>Highest</td></tr>
<tr><td align="center"><img src="https://img.shields.io/badge/C-f97316?style=for-the-badge" alt="C"></td><td>Burn the Lead</td><td>Use America's lead to slow down a little near the finish.</td><td>High</td></tr>
<tr><td align="center"><img src="https://img.shields.io/badge/B-f59e0b?style=for-the-badge" alt="B"></td><td>Fight China</td><td>Sabotage China's AI, then slow down.</td><td>High risk of war</td></tr>
<tr><td align="center"><img src="https://img.shields.io/badge/A-10b981?style=for-the-badge" alt="A"></td><td><b>Verified Slowdown</b></td><td>Declare chips, pause, check each other, then move ahead slowly in the open.</td><td>Lower, and the authors' pick</td></tr>
<tr><td align="center"><img src="https://img.shields.io/badge/S-3b82f6?style=for-the-badge" alt="S"></td><td>Shut it all down</td><td>Halt advanced AI for an indefinite time.</td><td>Hard to hold</td></tr>
</table>
</details>

<details>
<summary><b>AI 2040: year by year to 2040</b></summary>
<br>
<table>
<tr><th align="left">Year</th><th align="left">Chapter</th><th align="left">What happens</th></tr>
<tr><td>2027</td><td>The Writing on the Wall</td><td>Millions of AI agents join the workforce and the AI Transparency Act passes.</td></tr>
<tr><td>2028</td><td>AI on the Ballot</td><td>Datacenter spending passes twice the US military budget.</td></tr>
<tr><td>2029</td><td>Choose a Path</td><td>The US and China strike a deal to declare compute and pause.</td></tr>
<tr><td>2030</td><td>Plan A Is Established</td><td>The Consortium sets four principles.</td></tr>
<tr><td>2031</td><td>Safety Cases</td><td>Regulated AIs could speed research 10x but are not allowed to.</td></tr>
<tr><td>2032</td><td>Controlled Explosive Growth</td><td>60 million AI agents at 20x human speed and a robotics boom.</td></tr>
<tr><td>2033</td><td>The Citizen's Dividend</td><td>Payments to every adult grow as AI does most of the work.</td></tr>
<tr><td>2034</td><td>Mutually Assured Compute Destruction</td><td>Compute grows to 60 billion H100 equivalents.</td></tr>
<tr><td>2035</td><td>Pause at Top-Expert AI</td><td>AIs equal top human experts and watch over each other.</td></tr>
<tr><td>2036</td><td>Life After Work</td><td>200 million AIs and 2 billion robots.</td></tr>
<tr><td>2037</td><td>The Arrival of Truth</td><td>Science moves 10x to 1,000x faster.</td></tr>
<tr><td>2038</td><td>Alignment Is Now a Science</td><td>Textbook methods make AIs honest.</td></tr>
<tr><td>2039</td><td>Beginning to Trust AIs</td><td>Trust is earned step by step.</td></tr>
<tr><td>2040</td><td>Passing the Torch</td><td>Rules loosen and AI scales up to superintelligence, with power spread out.</td></tr>
</table>
</details>

<table>
<tr><th align="left">Side by side</th><th align="left">AI 2027</th><th align="left">AI 2040</th></tr>
<tr><td>Type</td><td>Prediction</td><td>Recommendation</td></tr>
<tr><td>Superintelligence</td><td>Late 2027</td><td>2040</td></tr>
<tr><td>Frontier</td><td>One or two secret projects</td><td>Dozens of companies, in public</td></tr>
<tr><td>US and China</td><td>Race and theft</td><td>Verified deal</td></tr>
<tr><td>Outcome</td><td>Extinction, or power held by a committee</td><td>Flourishing, with power spread out</td></tr>
<tr><td>Big idea</td><td>Racing is dangerous</td><td>Buy time</td></tr>
</table>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="04b-black-october"></a>
<h2>04b. Deep dive: Black October 2026</h2>

<table>
<tr>
<td width="45%" valign="top"><a href="https://lo3elyon.github.io/ASI/black-october-2026/"><img src="assets/black-october.jpg" width="100%" alt="Black October 2026"></a></td>
<td width="55%" valign="top">
<img src="https://img.shields.io/badge/type-news%20explainer-ef4444?style=flat-square&labelColor=07111f" alt=""> <img src="https://img.shields.io/badge/researched-Oct%2024%2C%202026-f59e0b?style=flat-square&labelColor=07111f" alt=""> <img src="https://img.shields.io/badge/incidents-30-14b8a6?style=flat-square&labelColor=07111f" alt=""><br><br>
<b>"Black October"</b> is an informal label coined on X by AISafetyMemes on 22 Oct 2026 for a pile-up of security disclosures between 19 and 22 October: PHP2Shell, the eMudhra certificate keys, the poisoned LiteLLM release, a CVSS 10.0 GitLab bug, and breaches at Railway and Zeabur. CNBC used the name on 23 Oct. The key point: it was a <b>disclosure wave, not one attack</b>. Many of these breaches had been running for weeks or months.
</td>
</tr>
</table>

<div align="center">
<table>
<tr>
<td align="center" width="25%"><img src="https://img.shields.io/badge/3%25-of%20all%20critical%20CVEs%20ever-ef4444?style=for-the-badge&labelColor=07111f" alt=""><br><sub>disclosed in the last month (Chris Krebs, CNBC)</sub></td>
<td align="center" width="25%"><img src="https://img.shields.io/badge/~49k-poisoned%20downloads-f97316?style=for-the-badge&labelColor=07111f" alt=""><br><sub>LiteLLM v1.107.0 on PyPI and Docker</sub></td>
<td align="center" width="25%"><img src="https://img.shields.io/badge/11.7M-accounts-f59e0b?style=for-the-badge&labelColor=07111f" alt=""><br><sub>Capcom ID exposure</sub></td>
<td align="center" width="25%"><img src="https://img.shields.io/badge/1%2C413-flaws-14b8a6?style=for-the-badge&labelColor=07111f" alt=""><br><sub>a record Microsoft Patch Tuesday</sub></td>
</tr>
</table>
</div>

```mermaid
timeline
    title Black October: attack clock vs disclosure clock
    Weeks or months earlier : Attacks begin quietly : ETS from 22 May : AOMEI updates tampered in May and July
    19 to 22 Oct : Disclosures pile up : PHP2Shell, eMudhra, LiteLLM : GitLab, Railway, Zeabur
    22 Oct : AISafetyMemes coins Black October on X
    23 Oct : CNBC uses the name : Krebs gives the 3 percent figure
```

```mermaid
flowchart LR
    A["GitHub tokens leaked<br/>into internal logs"] --> B["Release pipeline<br/>hijacked"]
    B --> C["Poisoned LiteLLM v1.107.0<br/>on PyPI and Docker"]
    C --> D["~49,000 downloads"]
    D --> E["AWS keys stolen"]
    E --> F["Keys tested on Amazon Bedrock<br/>about 4.5 hours later"]
    classDef bad fill:#3a0d0d,stroke:#ef4444,stroke-width:2px,color:#fee2e2
    classDef mid fill:#2a1d05,stroke:#f59e0b,stroke-width:2px,color:#fde68a
    class A,B mid
    class C,D,E,F bad
```

<details>
<summary><b>Top incidents of the week (18 to 24 Oct)</b></summary>
<br>
<table>
<tr><th align="left">#</th><th align="left">Incident</th><th align="left">What happened, simply</th></tr>
<tr><td>1</td><td>PHP2Shell</td><td>Two unauthenticated remote code execution bugs in PHP core (CVE-2026-109618, CVE-2026-109619).</td></tr>
<tr><td>2</td><td>LiteLLM</td><td>Release pipeline hijacked; a poisoned v1.107.0 shipped on PyPI and Docker.</td></tr>
<tr><td>3</td><td>eMudhra</td><td>Eight intermediate CA private keys could be recomputed in milliseconds.</td></tr>
<tr><td>4</td><td>State Bank of India</td><td>3,897 customer records with personal data found on the dark web.</td></tr>
<tr><td>5</td><td>Capcom</td><td>11.7 million CAPCOM ID accounts exposed.</td></tr>
<tr><td>6</td><td>Railway and Zeabur</td><td>Customer environment variables (often API keys) accessed; Zeabur is shutting down.</td></tr>
<tr><td>7</td><td>Nikkei</td><td>1.83 million records stolen via a compromised cloud service credential.</td></tr>
</table>
</details>

<details>
<summary><b>What the page has</b></summary>
<br>
<table>
<tr><th align="left">Section</th><th align="left">What you can do</th></tr>
<tr><td><b>Incident Explorer</b></td><td>Search and filter 30 incidents (This week, Security, AI, India, Ransomware, Supply chain, Zero-day). Open a card to play its attack chain step by step.</td></tr>
<tr><td><b>How these attacks work</b></td><td>Four clickable flows: supply-chain poisoning, prompt injection against AI agents, stolen credentials, the zero-day race.</td></tr>
<tr><td><b>October in charts</b></td><td>Incidents by category and the ransomware trackers that disagree (813, 823, 274).</td></tr>
<tr><td><b>Week by week</b></td><td>Tabs for each week of October plus a markets tab.</td></tr>
<tr><td><b>AI news board</b></td><td>20 releases and deals with verification badges, plus 5 legal and regulatory actions.</td></tr>
<tr><td><b>Big themes</b></td><td>13 flip cards: 8 security themes and 5 AI themes.</td></tr>
<tr><td><b>What people said</b></td><td>Top 10 X posts, 5 trending topics and 9 YouTube videos.</td></tr>
<tr><td><b>Am I affected?</b></td><td>Tick what you use (PHP, LiteLLM, GitLab, Plex, WordPress plugins, SBI and more) to get the steps to take.</td></tr>
<tr><td><b>Quiz, caveats, glossary</b></td><td>Six questions, an honest list of what is not certain, and plain definitions.</td></tr>
</table>
</details>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="05-watch"></a>
<img src="docs/readme/h-videos.svg" width="100%" alt="05 Watch: Talks in focus mode">

On the site every talk opens in a full screen focus mode player with a large close button, Prev and Next controls and Escape to exit. Here, each thumbnail opens the talk on YouTube.

<table>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=5KVDDfAkRgc"><img src="https://img.youtube.com/vi/5KVDDfAkRgc/hqdefault.jpg" width="100%" alt="We&#x27;re Not Ready for Superintelligence"></a><br><img src="https://img.shields.io/badge/AI%202027-f97316?style=flat-square" alt=""><br><b><sub>We&#x27;re Not Ready for Superintelligence</sub></b><br><sub>AI In Context / 80,000 Hours. The video linked from ai-2027.com.</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=htOvH12T7mU"><img src="https://img.youtube.com/vi/htOvH12T7mU/hqdefault.jpg" width="100%" alt="AI 2027: month-by-month model of intelligence explosion"></a><br><img src="https://img.shields.io/badge/AI%202027-f97316?style=flat-square" alt=""><br><b><sub>AI 2027: month-by-month model of intelligence explosion</sub></b><br><sub>Dwarkesh Patel with Scott Alexander &amp; Daniel Kokotajlo , Apr 2025</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=m6izEUMKs9M"><img src="https://img.youtube.com/vi/m6izEUMKs9M/hqdefault.jpg" width="100%" alt="What Will AI Look Like in 2027?"></a><br><img src="https://img.shields.io/badge/AI%202027-f97316?style=flat-square" alt=""><br><b><sub>What Will AI Look Like in 2027?</sub></b><br><sub>Hard Fork (NYT) , Apr 2025</sub></td>
</tr>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=pQP37kPaueE"><img src="https://img.youtube.com/vi/pQP37kPaueE/hqdefault.jpg" width="100%" alt="OpenAI whistleblower Daniel Kokotajlo on superintelligence"></a><br><img src="https://img.shields.io/badge/AI%202027-f97316?style=flat-square" alt=""><br><b><sub>OpenAI whistleblower Daniel Kokotajlo on superintelligence</sub></b><br><sub>GZERO World with Ian Bremmer , May 2025</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=zqbXolVH2h8"><img src="https://img.youtube.com/vi/zqbXolVH2h8/hqdefault.jpg" width="100%" alt="Countdown to Superintelligence"></a><br><img src="https://img.shields.io/badge/AI%202027-f97316?style=flat-square" alt=""><br><b><sub>Countdown to Superintelligence</sub></b><br><sub>Sam Harris, Making Sense #420 , Jun 2025</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=V7Q3DJ9V5CQ"><img src="https://img.youtube.com/vi/V7Q3DJ9V5CQ/hqdefault.jpg" width="100%" alt="Why the AI Race Ends in Disaster"></a><br><img src="https://img.shields.io/badge/AI%202027-f97316?style=flat-square" alt=""><br><b><sub>Why the AI Race Ends in Disaster</sub></b><br><sub>Future of Life Institute podcast , Jul 2025</sub></td>
</tr>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=k_onqn68GHY"><img src="https://img.youtube.com/vi/k_onqn68GHY/hqdefault.jpg" width="100%" alt="AI 2027: A Realistic Scenario of AI Takeover"></a><br><img src="https://img.shields.io/badge/AI%202027-f97316?style=flat-square" alt=""><br><b><sub>AI 2027: A Realistic Scenario of AI Takeover</sub></b><br><sub>Narrated explainer (AI Species) , May 2025</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=_g4l7YkDQwA"><img src="https://img.youtube.com/vi/_g4l7YkDQwA/hqdefault.jpg" width="100%" alt="ChatGPT Whistleblower: They Offered Me $2m To Keep Quiet"></a><br><img src="https://img.shields.io/badge/AI%202040-10b981?style=flat-square" alt=""><br><b><sub>ChatGPT Whistleblower: They Offered Me $2m To Keep Quiet</sub></b><br><sub>The Diary of a CEO , Jul 13, 2026</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=bc8qbniuLiQ"><img src="https://img.youtube.com/vi/bc8qbniuLiQ/hqdefault.jpg" width="100%" alt="Scaling Laws: Daniel Kokotajlo on AI 2040: Plan A"></a><br><img src="https://img.shields.io/badge/AI%202040-10b981?style=flat-square" alt=""><br><b><sub>Scaling Laws: Daniel Kokotajlo on AI 2040: Plan A</sub></b><br><sub>Lawfare , Aug 2026</sub></td>
</tr>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=KFcJgTODkkQ"><img src="https://img.youtube.com/vi/KFcJgTODkkQ/hqdefault.jpg" width="100%" alt="An AI 2027 Author Returns, With a Plan to Change the Ending"></a><br><img src="https://img.shields.io/badge/AI%202040-10b981?style=flat-square" alt=""><br><b><sub>An AI 2027 Author Returns, With a Plan to Change the Ending</sub></b><br><sub>80,000 Hours , Sep 2026</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=z5Xix4h5UlU"><img src="https://img.youtube.com/vi/z5Xix4h5UlU/hqdefault.jpg" width="100%" alt="How Many Narrow AIs Could Behave Like One Superintelligence"></a><br><img src="https://img.shields.io/badge/AI%202040-10b981?style=flat-square" alt=""><br><b><sub>How Many Narrow AIs Could Behave Like One Superintelligence</sub></b><br><sub>Machine Learning Street Talk with Thomas Larsen , Sep 2026</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=QGY3RsARa9k"><img src="https://img.youtube.com/vi/QGY3RsARa9k/hqdefault.jpg" width="100%" alt="AI forecaster Daniel Kokotajlo keeps being right about AI"></a><br><img src="https://img.shields.io/badge/AI%202040-10b981?style=flat-square" alt=""><br><b><sub>AI forecaster Daniel Kokotajlo keeps being right about AI</sub></b><br><sub>Palisade Podcast , Aug 2026</sub></td>
</tr>
</table>

<b>Black October 2026: this week in cyber and AI</b>

<table>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=TVRCcMlvR10"><img src="https://img.youtube.com/vi/TVRCcMlvR10/hqdefault.jpg" width="100%" alt="AI News: 24 Things You Need To Know This Week"></a><br><img src="https://img.shields.io/badge/Black%20October-ef4444?style=flat-square" alt=""><br><b><sub>AI News: 24 Things You Need To Know This Week</sub></b><br><sub>Matt Wolfe, Oct 2026</sub></td><td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=umGZrkyTRtw"><img src="https://img.youtube.com/vi/umGZrkyTRtw/hqdefault.jpg" width="100%" alt="11 AI Breakthroughs You Didn&#x27;t Know Existed"></a><br><img src="https://img.shields.io/badge/Black%20October-ef4444?style=flat-square" alt=""><br><b><sub>11 AI Breakthroughs You Didn&#x27;t Know Existed</sub></b><br><sub>Matt Wolfe, Oct 2026</sub></td><td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=vDYqh1FGrgQ"><img src="https://img.youtube.com/vi/vDYqh1FGrgQ/hqdefault.jpg" width="100%" alt="AI News: Claude Duet Crushes; Grok Bot Updates; NotebookLM Upgrade"></a><br><img src="https://img.shields.io/badge/Black%20October-ef4444?style=flat-square" alt=""><br><b><sub>AI News: Claude Duet Crushes; Grok Bot Updates; NotebookLM Upgrade</sub></b><br><sub>Paul J Lipsky, Oct 2026</sub></td>
</tr>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=tqpOfHS5-VY"><img src="https://img.youtube.com/vi/tqpOfHS5-VY/hqdefault.jpg" width="100%" alt="Make your AI agent pay for itself (and this week&#x27;s biggest AI news)"></a><br><img src="https://img.shields.io/badge/Black%20October-ef4444?style=flat-square" alt=""><br><b><sub>Make your AI agent pay for itself (and this week&#x27;s biggest AI news)</sub></b><br><sub>The Next New Thing, Oct 2026</sub></td><td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=-XIgyMsZZxY"><img src="https://img.youtube.com/vi/-XIgyMsZZxY/hqdefault.jpg" width="100%" alt="AI Just Broke The Internet. For Real This Time."></a><br><img src="https://img.shields.io/badge/Black%20October-ef4444?style=flat-square" alt=""><br><b><sub>AI Just Broke The Internet. For Real This Time.</sub></b><br><sub>AI For Humans, Oct 2026</sub></td><td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=osaRbgqkVYg"><img src="https://img.youtube.com/vi/osaRbgqkVYg/hqdefault.jpg" width="100%" alt="Oct 16&#x27;s Top Cyber News NOW! Ep 1267"></a><br><img src="https://img.shields.io/badge/Black%20October-ef4444?style=flat-square" alt=""><br><b><sub>Oct 16&#x27;s Top Cyber News NOW! Ep 1267</sub></b><br><sub>Simply Cyber, Gerald Auger PhD, Oct 2026</sub></td>
</tr>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=s9dnUH2iNnw"><img src="https://img.youtube.com/vi/s9dnUH2iNnw/hqdefault.jpg" width="100%" alt="AI finds &#x27;unprecedented&#x27; cyber security threat in thousands of websites"></a><br><img src="https://img.shields.io/badge/Black%20October-ef4444?style=flat-square" alt=""><br><b><sub>AI finds &#x27;unprecedented&#x27; cyber security threat in thousands of websites</sub></b><br><sub>ITV News, Oct 2026</sub></td><td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=JJLGDQLvs74"><img src="https://img.youtube.com/vi/JJLGDQLvs74/hqdefault.jpg" width="100%" alt="ECDSA&#x27;s Curves Origins: When AI Becomes the Attacker"></a><br><img src="https://img.shields.io/badge/Black%20October-ef4444?style=flat-square" alt=""><br><b><sub>ECDSA&#x27;s Curves Origins: When AI Becomes the Attacker</sub></b><br><sub>Security Now, Oct 2026</sub></td><td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=9nfy5x4EYh0"><img src="https://img.youtube.com/vi/9nfy5x4EYh0/hqdefault.jpg" width="100%" alt="Patch Tuesday Nightmares and Cybersecurity News"></a><br><img src="https://img.shields.io/badge/Black%20October-ef4444?style=flat-square" alt=""><br><b><sub>Patch Tuesday Nightmares and Cybersecurity News</sub></b><br><sub>PDQ, Oct 2026</sub></td>
</tr>
</table>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="06-people"></a>
<img src="docs/readme/h-team.svg" width="100%" alt="06 People: The forecasters behind the scenarios">

<div align="center">
<table>
<tr>
<td align="center" width="25%"><a href="https://x.com/DKokotajlo"><img src="docs/readme/team/daniel.png" width="120" alt="Daniel Kokotajlo"></a><br><b>Daniel Kokotajlo</b><br><sub>Executive Director</sub></td>
<td align="center" width="25%"><a href="https://www.linkedin.com/in/thomas-larsen/"><img src="docs/readme/team/thomas.png" width="120" alt="Thomas Larsen"></a><br><b>Thomas Larsen</b><br><sub>Research Lead, AI 2040 lead author</sub></td>
<td align="center" width="25%"><a href="https://x.com/eli_lifland"><img src="docs/readme/team/eli.png" width="120" alt="Eli Lifland"></a><br><b>Eli Lifland</b><br><sub>Research Lead</sub></td>
<td align="center" width="25%"><a href="https://www.linkedin.com/in/romeo-dean-789313200/"><img src="docs/readme/team/romeo.png" width="120" alt="Romeo Dean"></a><br><b>Romeo Dean</b><br><sub>Researcher</sub></td>
</tr>
<tr>
<td align="center" width="25%"><a href="https://www.linkedin.com/in/lauren-m-b91b2b1a3/"><img src="docs/readme/team/lauren.png" width="120" alt="Lauren Mangla"></a><br><b>Lauren Mangla</b><br><sub>Managing Director</sub></td>
<td align="center" width="25%"><a href="https://mkodama.org/"><img src="docs/readme/team/miles.png" width="120" alt="Miles Kodama"></a><br><b>Miles Kodama</b><br><sub>Policy Researcher</sub></td>
<td align="center" width="25%"><a href="https://www.linkedin.com/in/nicole-sanna/"><img src="docs/readme/team/nicole.png" width="120" alt="Nicole Sanna"></a><br><b>Nicole Sanna</b><br><sub>Chief of Staff</sub></td>
<td align="center" width="25%"><a href="https://ai-futures.org/about/"><img src="docs/readme/team/brendan.png" width="120" alt="Brendan Halstead"></a><br><b>Brendan Halstead</b><br><sub>Research Contractor</sub></td>
</tr>
</table>
<sub>Photos from the <a href="https://ai-futures.org/about/">AI Futures Project</a>. Scott Alexander rewrote AI 2027 in an engaging style, and Lightcone Infrastructure designed the original site.</sub>
</div>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="07-architecture"></a>
<img src="docs/readme/h-arch.svg" width="100%" alt="07 Architecture: How the site is built">

```mermaid
flowchart TB
    subgraph REPO["lo3elyon/ASI on main"]
        direction TB
        ROOT["index.html<br/>landing hub"]
        PAGES[("PAGES array<br/>one object per explainer")]
        RA["css/ js/ assets/<br/>landing styles and images"]
        subgraph R1["/ai-2027-2040/"]
            I1["index.html"]
            A1["css/ js/ assets/"]
            RM1["README.md"]
        end
        subgraph R2["/black-october-2026/"]
            I2["index.html"]
            A2["hark.css hark-hero.css hark.js hero.png"]
            RM2["README.md"]
        end
        subgraph RN["/next-topic/"]
            IN["index.html"]
        end
        DOCS["docs/readme/<br/>banner, carousels, shots, team"]
    end
    ROOT --> PAGES
    PAGES -->|"renders cards, counters, Latest"| ROOT
    ROOT --> RA
    PAGES -->|"slug"| I1
    PAGES -->|"slug"| I2
    I2 --> A2
    PAGES -.->|"slug"| IN
    I1 --> A1
    REPO -->|"git push"| GH["GitHub Pages<br/>lo3elyon.github.io/ASI"]
    classDef hub fill:#0b2a3a,stroke:#22d3ee,stroke-width:2px,color:#e6f6ff
    classDef data fill:#2a1d05,stroke:#f59e0b,stroke-width:2px,color:#fde68a
    classDef page fill:#063b33,stroke:#14b8a6,stroke-width:2px,color:#e6f6ff
    classDef deploy fill:#0c2a12,stroke:#84cc16,stroke-width:2px,color:#ecfccb
    class ROOT,RA,DOCS hub
    class PAGES data
    class I1,A1,RM1,I2,A2,RM2,IN page
    class GH deploy
```

<details>
<summary><b>Folder structure</b></summary>
<br>

```text
ASI/
├── index.html                 landing hub (home route)
├── css/                       landing styles (hark.css, hark-hero.css)
├── js/                        landing interactions (hark.js)
├── assets/                    landing images (asi-hero.jpg, hero.jpg, black-october.jpg)
├── ai-2027-2040/              explainer route
│   ├── index.html
│   ├── css/  js/  assets/
│   └── README.md
├── black-october-2026/        explainer route: October 2026 hacks and AI incidents
│   ├── index.html
│   ├── hark.css  hark-hero.css  hark.js  hero.png
│   └── README.md
├── docs/readme/               README art: banner, headers, carousels, shots, team
├── README.md
└── .nojekyll                  serve files as they are on GitHub Pages
```
</details>

<details>
<summary><b>How a page behaves at runtime</b></summary>
<br>

```mermaid
sequenceDiagram
    participant U as Visitor
    participant P as Page
    participant D as PAGES data
    participant Y as YouTube
    U->>P: open the landing hub
    P->>D: read the explainer list
    D-->>P: cards, tags, counters, Latest
    U->>P: search or tap a tag
    P-->>U: filtered cards with motion
    U->>P: open an explainer
    U->>P: tap Play in focus mode
    P->>Y: load the embed with autoplay
    Y-->>U: video plays full screen
    U->>P: press the close button or Escape
    P->>Y: stop the video
```
</details>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="08-workflow"></a>
<img src="docs/readme/h-add.svg" width="100%" alt="08 Workflow: Add a new explainer">

```mermaid
flowchart LR
    S1["1. Make a folder<br/>my-topic/"] --> S2["2. Add its index.html<br/>plus css, js, assets"]
    S2 --> S3["3. Add one object<br/>to PAGES"]
    S3 --> S4["4. Drop the cover<br/>into assets/"]
    S4 --> S5["5. Update this README<br/>routes table"]
    S5 --> S6["6. Push to main"]
    S6 --> S7(["Live on the hub"])
    classDef a fill:#063b33,stroke:#14b8a6,stroke-width:2px,color:#e6f6ff
    classDef b fill:#0b2a3a,stroke:#22d3ee,stroke-width:2px,color:#e6f6ff
    classDef c fill:#2a1d05,stroke:#f59e0b,stroke-width:2px,color:#fde68a
    class S1,S2 a
    class S3,S4,S5 c
    class S6,S7 b
```

<details>
<summary><b>The PAGES entry to copy</b></summary>
<br>

```js
{
  slug: "my-topic/",            // folder name, with a trailing slash
  title: "My Topic",
  tagline: "One line that says why it matters",
  tags: ["AGI", "Basics"],
  date: "2026-10-23",           // newest date becomes the featured card
  cover: "my-topic.jpg",        // file inside the root assets/ folder
  videos: 0,
  readMins: 10,
  status: "live",               // "live" or "soon"
  accent: "#10b981"             // card glow, never purple or pink
}
```
</details>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="09-run-and-deploy"></a>
<img src="docs/readme/h-run.svg" width="100%" alt="09 Run and deploy">

<table>
<tr>
<td width="50%" valign="top">
<b>Run locally</b>

```bash
git clone https://github.com/lo3elyon/ASI.git
cd ASI
python3 -m http.server 8000
# open http://localhost:8000
```
A local server is better than opening the file directly, because some browsers block YouTube embeds on <code>file://</code>.
</td>
<td width="50%" valign="top">
<b>Deploy on GitHub Pages</b>
<br><br>
<table>
<tr><td><b>Step 1</b></td><td>Open Settings, then Pages.</td></tr>
<tr><td><b>Step 2</b></td><td>Source: Deploy from a branch.</td></tr>
<tr><td><b>Step 3</b></td><td>Branch <code>main</code>, folder <code>/ (root)</code>, Save.</td></tr>
<tr><td><b>Result</b></td><td><a href="https://lo3elyon.github.io/ASI/">lo3elyon.github.io/ASI</a></td></tr>
</table>
</td>
</tr>
</table>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="10-design-system"></a>
<img src="docs/readme/h-design.svg" width="100%" alt="10 Design system">

<div align="center">
<img src="https://img.shields.io/badge/navy-07111f-07111f?style=for-the-badge" alt="navy">
<img src="https://img.shields.io/badge/teal-14b8a6-14b8a6?style=for-the-badge" alt="teal">
<img src="https://img.shields.io/badge/cyan-22d3ee-22d3ee?style=for-the-badge" alt="cyan">
<img src="https://img.shields.io/badge/blue-3b82f6-3b82f6?style=for-the-badge" alt="blue">
<img src="https://img.shields.io/badge/emerald-10b981-10b981?style=for-the-badge" alt="emerald">
<img src="https://img.shields.io/badge/lime-84cc16-84cc16?style=for-the-badge" alt="lime">
<img src="https://img.shields.io/badge/amber-f59e0b-f59e0b?style=for-the-badge" alt="amber">
<img src="https://img.shields.io/badge/orange-f97316-f97316?style=for-the-badge" alt="orange">
<img src="https://img.shields.io/badge/gold-facc15-facc15?style=for-the-badge" alt="gold">
<img src="https://img.shields.io/badge/red-ef4444-ef4444?style=for-the-badge" alt="red">
<br><sub>The palette is strict: no purple, violet, indigo, magenta or pink, not even inside a gradient.</sub>
</div>

<br>

<table>
<tr><th align="left">Layer</th><th align="left">Choice</th></tr>
<tr><td><b>Type</b></td><td>Space Grotesk for display, Inter for body text.</td></tr>
<tr><td><b>Motion</b></td><td>Canvas particles, reveal on scroll, letter by letter headlines, 3D tilt, magnetic buttons, marquee facts, animated timelines and count ups.</td></tr>
<tr><td><b>Comfort</b></td><td>Everything animated turns off under <code>prefers-reduced-motion</code>.</td></tr>
<tr><td><b>Access</b></td><td>AA contrast checked, tap targets of at least 44 pixels, keyboard focus rings, Escape closes the player.</td></tr>
<tr><td><b>Weight</b></td><td>No framework and no build step. Fonts and videos load from their CDNs.</td></tr>
</table>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="11-questions"></a>
<img src="docs/readme/h-faq.svg" width="100%" alt="11 FAQ">

<details>
<summary><b>Is this an official AI Futures Project site</b></summary>
<br>No. It is an independent, unofficial explainer. All scenario content belongs to the AI Futures Project and is summarized here in simple words, with links to every original source.
</details>

<details>
<summary><b>How is Black October 2026 researched</b></summary>
<br>Every fact on the page links to its source. Items marked ✅ were read in full, 🔎 rest on search excerpts plus other outlets, and a "What's not certain" box lists disputed claims. X posts came from public search because X search needs a login. Dates are as sources report them, mostly US and EU time.
</details>

<details>
<summary><b>Are the images real</b></summary>
<br>The team portraits come from the AI Futures Project. The scene illustrations, the hero art and the Black October server-room image are AI generated.
</details>

<details>
<summary><b>How often do new explainers arrive</b></summary>
<br>Regularly. Each one gets its own route and shows up on the hub as soon as its entry is added to <code>PAGES</code>.
</details>

<details>
<summary><b>Can I suggest a topic</b></summary>
<br>Yes. Open an issue on this repository with the topic and a source or two.
</details>

<img src="docs/readme/divider.svg" width="100%" alt="">

<a id="12-sources"></a>
<img src="docs/readme/h-credits.svg" width="100%" alt="12 Sources and credits">

<table>
<tr><th align="left">Source</th><th align="left">Links</th></tr>
<tr><td><b>AI 2027</b></td><td><a href="https://ai-2027.com/">Site</a>, <a href="https://ai-2027.com/summary">Summary</a>, <a href="https://ai-2027.com/ai-2027.pdf">PDF</a>, <a href="https://ai-2027.com/about">About</a></td></tr>
<tr><td><b>AI 2040: Plan A</b></td><td><a href="https://ai-2040.com/">Site</a>, <a href="https://ai-2040.com/summary">Summary</a>, <a href="https://ai-2040.com/AI-2040.pdf">PDF</a></td></tr>
<tr><td><b>Black October 2026</b></td><td><a href="https://www.securitytoday.de/en/2026/10/22/black-october-many-attacks-had-been-running-for-months/">SecurityToday</a>, <a href="https://forkast.news/black-october-is-a-disclosure-wave-the-label-hides-the-clock/">Forkast</a>, plus about 100 sources listed on the <a href="https://lo3elyon.github.io/ASI/black-october-2026/">page itself</a></td></tr>
<tr><td><b>AI Futures Project</b></td><td><a href="https://ai-futures.org/">Home</a>, <a href="https://ai-futures.org/about/">Team</a>, <a href="https://www.aifuturesmodel.com/">AI Futures Model</a>, <a href="https://blog.aifutures.org/">Blog</a></td></tr>
</table>

<br>

<div align="center">

<a href="https://github.com/lo3elyon/ASI"><img src="https://img.shields.io/badge/Built%20by-Aniruddha%20Adak-14b8a6?style=for-the-badge&logo=github&logoColor=white&labelColor=07111f" alt="Built by Aniruddha Adak"></a>
<a href="https://github.com/lo3elyon/ASI/stargazers"><img src="https://img.shields.io/github/stars/lo3elyon/ASI?style=for-the-badge&color=f59e0b&labelColor=07111f" alt="Stars"></a>

<sub>Independent explainers. Scenario content belongs to the AI Futures Project; news content belongs to the linked outlets. Images marked as AI generated are illustrations.</sub>

<img src="docs/readme/divider.svg" width="100%" alt="">

</div>
