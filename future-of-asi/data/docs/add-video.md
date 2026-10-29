# Add a video

## 1. Verify the ID

Every YouTube ID must pass YouTube's public oEmbed check. Replace ID with the video's ID.

```
curl -s -o /dev/null -w "%{http_code}" "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ID&format=json"
```

A `200` means the video exists and allows embedding. Anything else, leave it out.

## 2. Add the object

Append to `data/videos.json`:

```json
{
  "id": "ID",
  "title": "Exact title from YouTube",
  "channel": "Channel name",
  "date": "2026-10-29",
  "duration": "1:02:33",
  "category": "interview",
  "people": ["researcher-id"],
  "summary": "One simple sentence about what it covers.",
  "level": "beginner"
}
```

## 3. Optional: add it to a collection

Add the ID to the `video_ids` array of a playlist in `data/video-collections.json`.

## 4. Check it

Open `#/watch/ID`. The theater player should open, and the video should show in the library, the person's drawer and search.

Videos play from `youtube-nocookie.com`, YouTube's privacy enhanced mode, and thumbnails load lazily from `i.ytimg.com`.
