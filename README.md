# Pretext — Text flows around a moving figure

A browser demo inspired by [Cheng Lou's Pretext](https://github.com/chenglou/pretext).
Text is measured once with `canvas.measureText()` and re-laid out with pure arithmetic
every video frame — no DOM reflow, no layout thrash.

---

## How to run

ES modules require an HTTP server — you cannot open `index.html` directly as a `file://` URL.

**Python (no install):**
```bash
cd pretext-project
python3 -m http.server 8080
```
Then open **http://localhost:8080**

**Node.js:**
```bash
cd pretext-project
npx serve .
# or
npx http-server .
```

**VS Code:** Install [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), right-click `index.html` → Open with Live Server.

---

## Project structure

```
pretext-project/
├── index.html          Entry point
├── css/
│   └── style.css       All styling
├── js/
│   ├── config.js       Canvas size + static tree exclusion zones
│   ├── corpus.js       Text content that flows around the figure
│   ├── pretext.js      prepare() + layout() — the core engine
│   ├── detector.js     BFS blob detection → figure bounding box
│   ├── renderer.js     Canvas drawing: video frame + text overlay
│   └── main.js         Entry point, controls, animation loop
└── assets/
    └── snow-video.mp4  Source video
```

---

## How it works

### Phase 1 — `prepare()` (once at startup)
Splits the text into words, measures every word's pixel width with `canvas.measureText()`,
caches the results. Cost: ~15ms once. Never paid again.

### Phase 2 — `layout()` (every frame, ~0.1ms)
Receives cached word widths + list of obstacle rectangles (static tree zones + dynamic figure box).
For each line, computes blocked horizontal intervals, merges them, finds free spans,
and greedily fills spans with words using addition only. No DOM. No canvas reads.

### Figure detection
Every frame: scan zone → 1-bit dark map → BFS connected components →
filter by blob size/shape → tightest bounding box → exponential smoothing.

### Static exclusions
`TREE_ZONES` in `config.js` defines two fixed rectangles covering the
branch/trunk area in the top-left corner. These are permanent obstacles —
text never overlaps the visually noisy branch region.

---

## Customising

| Goal | File |
|---|---|
| Change the text | `js/corpus.js` |
| Adjust tree exclusion zones | `js/config.js` → `TREE_ZONES` |
| Tune detection (blob sizes, scan zone) | `js/detector.js` |
| Swap in a different video | `assets/` + `index.html` `src=` |
| Add more obstacle shapes | `js/pretext.js` → `getFreeSpans()` |

---

## GitHub Pages deployment

```bash
git init
git add .
git commit -m "initial: pretext text-flow video demo"
git remote add origin https://github.com/yourname/pretext-video.git
git push -u origin main
```

Enable **Settings → Pages → Deploy from branch (main / root)**.
The demo goes live at `https://yourname.github.io/pretext-video/`.

> Note: GitHub Pages serves over HTTPS so ES modules and video autoplay work fine.
