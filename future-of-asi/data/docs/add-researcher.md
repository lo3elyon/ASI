# Add a researcher

1. Open `data/researchers.json`.
2. Copy the template below to the end of the array.
3. Fill in only what you can source. Leave a field empty rather than guessing.
4. If there is a free photo on Wikimedia Commons, save a 400 pixel wide JPG to `assets/people/<id>.jpg` and set `photo` to that path. Fill `photo_credit` with the author, licence and file page.
5. Reload the site. The person appears in the directory, the spectrum if they have a p(doom), the voices wall, search and their organisation card.

```json
{
  "id": "first-last",
  "name": "First Last",
  "role": "Research scientist",
  "org": "Example Lab",
  "group": "alignment",
  "photo": "",
  "photo_credit": "",
  "pdoom": "",
  "pdoom_source": "",
  "agi_year": "",
  "bio": "Two short sentences in simple words.",
  "warning": "Their main warning in one line.",
  "quotes": [
    { "text": "Exact words, copied from the source.", "source": "Where they said it", "url": "https://", "date": "2026-10" }
  ],
  "links": [ { "label": "Website", "url": "https://" } ],
  "video_ids": []
}
```

The p(doom) badge and spectrum read numbers like `10%`, `10% to 20%`, `>90%` or `1 in 10` from the text. Keep their own wording.
