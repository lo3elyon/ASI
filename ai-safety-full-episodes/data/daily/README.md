# data/daily

Drop one JSON file per day here (same shape as `../episodes.json`: an array, or `{ "episodes": [...] }`), then list it in `../manifest.json`:

```json
{ "files": ["daily/2026-10-28.json"] }
```

The app merges listed files after `episodes.json` on every load; a later copy of the same `id` replaces the earlier one.
