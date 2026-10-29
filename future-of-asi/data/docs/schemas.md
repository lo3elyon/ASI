# Data schemas

All data lives in `data/` as JSON. Text fields use simple words. Dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.

## researchers.json

An array of people.

| Field | Type | Meaning |
| --- | --- | --- |
| id | string | Lowercase slug, used in URLs, for example `geoffrey-hinton` |
| name | string | Full name |
| role, org | string | Current role and organisation |
| group | string | One of pioneer, lab-leader, alignment, control, governance, forecasting, critic, doomer, optimist |
| photo | string | Local path like `assets/people/x.jpg`, a direct image URL, or empty |
| photo_credit | string | Author, licence and file page |
| pdoom, pdoom_source | string | Their own stated risk estimate and where they said it, or empty |
| agi_year | string | Their stated timeline in words, or empty |
| bio, warning | string | Two short sentences, and one line on their main warning |
| quotes | array | Objects with text, source, url, date |
| links | array | Objects with label and url |
| video_ids | array | YouTube IDs that feature them |

## videos.json

An array of verified YouTube videos.

| Field | Type | Meaning |
| --- | --- | --- |
| id | string | YouTube ID, verified with oEmbed |
| title, channel | string | As on YouTube |
| date | string | Publish date |
| duration | string | `H:MM:SS` or empty |
| category | string | warning, explainer, documentary, interview, debate, lecture, control, alignment, governance, catastrophe-prep, forecast or course |
| people | array | Researcher ids who appear |
| summary | string | One simple sentence |
| level | string | beginner, intermediate or advanced |

## video-collections.json

An array of playlists with id, title, description and video_ids.

## orgs.json

An array of organisations with id, name, type, what, focus (array), founded, country, url, logo, logo_credit, wikipedia and people (researcher ids).

## timeline.json

An array of events with id, date, title, summary, category, url and people. Categories include warning, statement, research, model, governance, summit, incident, organization, book, resignation, forecast and report.

## resources.json

An array of items with id, type (course, paper, book, blog, podcast, fellowship, newsletter, career, video), title, line, url, by, level, year, people and free.

## catastrophe-prep.json

An object with intro and intro_source, risk_categories (id, name, simple, examples, evidence), proposals (id, name, who, simple, evidence, limits) and what_you_can_do (id, group, title, steps, source_url). Evidence items are exact lines with a url.

## futures.json

An object with note, sliders (id, label, help, value) and scenarios (id, name, c, tagline, summary, weights per slider, signals, timeline of y, t, d). The weights drive the toy model: each scenario's score is the sum of weight times slider position, and a softmax turns scores into shares.

## forecasts.json

An array of AGI or ASI forecasts with who, person, org, what, year, low, high, said, text, source, url and colour c.

## course.json

An object with title, subtitle and units. Each unit has id, title, c, summary, lessons (id, title, key, body in markdown, mins) and quiz (q, o options, a answer index, why).

## glossary.json and faq.json

Arrays of term and def, and of q and a.

## blog and docs

Each folder has an `index.json` and one markdown file per page. Blog posts start with a small front matter block: title, excerpt, date, tags and cover.
