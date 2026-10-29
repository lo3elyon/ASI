# How it works

Threshold is plain HTML, CSS and JavaScript modules. There is no build step and no framework. GitHub Pages serves the folder as it is.

## Folder layout

```
future-of-asi/
  index.html              app shell, meta tags, JSON-LD, nav, palette
  manifest.webmanifest    PWA manifest scoped to this route
  sw.js                   service worker scoped to this route
  sitemap.xml  robots.txt
  favicon.svg
  assets/
    css/app.css           the whole design system
    js/app.js             router, theme, command palette, service worker
    js/util.js            helpers, data loading, markdown renderer
    js/fx.js              canvas motion: neural horizon and particle morph
    js/views/*.js         one module per page, loaded on demand
    img/                  generated cover art and the dotted world map
    people/               local researcher photos from Wikimedia Commons
    brand/                logo, mark, icons, social image
    video/                launch film and poster
  data/
    researchers.json videos.json video-collections.json orgs.json
    timeline.json resources.json catastrophe-prep.json
    futures.json forecasts.json course.json glossary.json faq.json
    blog/  index.json and one markdown file per post
    docs/  index.json and one markdown file per page
```

## Routing

The site uses a hash router, so every deep link works on GitHub Pages without a 404 fallback. Examples: `#/researchers/geoffrey-hinton`, `#/watch/VIDEO_ID`, `#/watch/c/start-here-60-minutes`, `#/learn/u4/protocols`, `#/tools/pdoom`, `#/blog/why-i-built-threshold`, `#/docs/schemas`.

`app.js` reads the hash, imports `views/<page>.js` with a dynamic import and calls its `render(el, params, query)` function. A view can set `el._onParams` to handle sub paths in place, which is how drawers and the theater player open without a full re render.

## Data

`util.js` fetches each JSON file once per session and normalises researchers and videos so views can trust their shape. Views never assume optional fields exist.

## Offline

`sw.js` caches the app shell, views, data and images. Code and data are network first so updates show at once. Images are cache first. YouTube, thumbnails and Google Fonts always go to the network.

## Motion

`fx.js` draws the hero and the scroll story on canvas. Both pause when off screen or when the tab is hidden, and draw a single still frame when motion is off.
