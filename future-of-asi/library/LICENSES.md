# Library licences and text decisions

This file records every decision about what text the Threshold library reproduces, links to, or leaves out. The rule is simple. Copyrighted book text is never reproduced. A full text appears only when its licence or public domain status allows it, and then it is shown with its notice. Everything else gets a link to the official free version, if there is one, and a chapter guide written in my own words.

Checked on 29 October 2026.

## Full texts reproduced in the reader

| Work | Status | Evidence | What is shown | Changes made |
| --- | --- | --- | --- | --- |
| Dan Hendrycks, *Introduction to AI Safety, Ethics, and Society* (arXiv:2411.01042v2, 2024) | CC BY-NC-ND 4.0 | The arXiv abstract page links the licence [creativecommons.org/licenses/by-nc-nd/4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). Source: [arxiv.org/abs/2411.01042](https://arxiv.org/abs/2411.01042) | Full text of the introduction and all ten chapters, in `texts/aises/`, with attribution and the licence at the start of the reader | Text unchanged. Figures and tables are not reproduced; their captions are kept with a note pointing to the official PDF. Maths is shown as its LaTeX source. Reference lists and acknowledgements are left out. Sharing the material in part is allowed by section 2(a)(1)(A) of the licence. No adapted version is made. The site is non commercial. |
| Vernor Vinge, *The Coming Technological Singularity: How to Survive in the Post-Human Era* (1993) | Permission notice | The page itself says: "(c) 1993 by Vernor Vinge (Verbatim copying/translation and distribution of this entire article is permitted in any medium, provided this notice is preserved.)" Source: [edoras.sdsu.edu/~vinge/misc/singularity.html](https://edoras.sdsu.edu/~vinge/misc/singularity.html) | The entire article, including the notice, in `texts/vinge-1993.json` | Only hard line breaks were joined into paragraphs and the plain text bullet markers were shown as list items. Every word is kept. A word count check matched (5,747 words in, 5,747 out). |
| Samuel Butler, *Darwin among the Machines* (letter to The Press, Christchurch, 13 June 1863) | Public domain | First published 1863. Butler died in 1902. Wikisource marks it PD-old. Source: [en.wikisource.org/wiki/Darwin_among_the_Machines](https://en.wikisource.org/wiki/Darwin_among_the_Machines) | Full letter in `texts/butler-1863.json` | Wiki markup removed. |

## Linked, not reproduced

| Work | Why not reproduced | Where readers go instead |
| --- | --- | --- |
| Alan Turing, *Computing Machinery and Intelligence*, Mind 59 (1950) | Turing died in 1954, so the text has been public domain in the UK since 1 January 2025. In the United States, where GitHub Pages serves this site, a 1950 publication stays protected for 95 years, to the end of 2045. To be safe, the text is not copied. | [Oxford Academic, Mind](https://academic.oup.com/mind/article/LIX/236/433/986238) |
| I. J. Good, *Speculations Concerning the First Ultraintelligent Machine*, Advances in Computers 6 (1965) | Under copyright (Academic Press, now Elsevier). One short quote is used, taken from Wikiquote with its source. | [Publisher page (DOI)](https://doi.org/10.1016/S0065-2458(08)60418-0) |
| Eliezer Yudkowsky, *Rationality: From AI to Zombies* (MIRI, 2015) | Free to read online, but no open licence was found on the MIRI or LessWrong pages. MIRI sells the e-book. | [LessWrong, Rationality: A to Z](https://www.lesswrong.com/rationality) and [MIRI](https://intelligence.org/rationality-ai-zombies/) |
| Stuart Armstrong, *Smarter Than Us* (MIRI, 2014) | MIRI says it is "published in its entirety online", but gives no licence to republish. | [smarterthanus.intelligence.org](https://smarterthanus.intelligence.org/) |
| Eliezer Yudkowsky, *Intelligence Explosion Microeconomics* (MIRI, 2013) | Free PDF, no open licence found. | [intelligence.org/files/IEM.pdf](https://intelligence.org/files/IEM.pdf) |
| Leopold Aschenbrenner, *Situational Awareness* (2024) | Free online, no open licence found. One short quote is used, with its source. | [situational-awareness.ai](https://situational-awareness.ai/) |
| AI Futures Project, *AI 2027* (2025) | Free online, no open licence found. | [ai-2027.com](https://ai-2027.com/) |
| Arvind Narayanan and Sayash Kapoor, *AI Snake Oil* (2024) | Under copyright. | The authors' free writing at [normaltech.ai](https://www.normaltech.ai/) |
| All other books in the catalogue | Under copyright. | Publisher pages, Open Library and WorldCat links on each book page |

## Covers

Covers were downloaded once into `covers/<id>.jpg` and checked by eye against the title and author. They are shown small, to identify the book, which is the usual practice for catalogues and reviews.

| Source | Books |
| --- | --- |
| Open Library Covers API (`covers.openlibrary.org/b/id/<cover id>-L.jpg`) | superintelligence, iabied, ai-uuu, human-compatible, life-3-0, alignment-problem, precipice, coming-wave, singularity-near, singularity-nearer, rationality-az, aises, uncontrollable, age-of-ai, genius-makers, empire-of-ai, supremacy, what-we-owe, tech-singularity, guide-thinking-humans, rebooting-ai, army-of-none, brief-answers, smarter-than-us |
| Publisher image (og:image on the publisher's own book page) | deep-utopia (Simon and Schuster CDN), ai-snake-oil (Princeton University Press), final-invention (Macmillan), the-optimist (W. W. Norton), artificial-superintelligence (Routledge) |
| Designed for Threshold (no published cover exists, or none could be verified) | situational-awareness, vinge-1993, butler-1863, turing-1950, good-1965, iem-2013, ai-2027. These are drawn in CSS and labelled "Threshold cover design". |

## Quotes

Book quotes are short, few, and always carry a source. The Superintelligence quotes come from Wikiquote with their chapter. The Good 1965, Vinge 1993 and Situational Awareness quotes come from the sources linked above. No other book text is quoted.

## Chapter guides

Chapter titles come from published contents: Open Library edition records, library catalogues (Library of Congress, Stanford SearchWorks, Penn State, East Carolina University, Alfaisal University), publisher pages, Google Books, Project MUSE or the work's own website. The source is linked on each book page. The one line guides, key ideas, arguments, discussion questions and quizzes are my own words. For *Uncontrollable* no full chapter list could be found, so the guide follows its three parts as described in reviews, and the page says so.
