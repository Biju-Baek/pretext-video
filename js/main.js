/**
 * main.js
 *
 * Application entry point — wires controls, detection, and rendering.
 *
 * Frame pipeline (runs ~30fps, locked to video frame rate):
 *
 *   video element
 *     └─► renderFrame()  draws video to canvas, reads pixels, draws text
 *           └─► detect()   BFS blob analysis → smoothed bounding box
 *                 └─► layout()  Pretext arithmetic → word positions
 *                       └─► fillText() per word on textCanvas
 */

import { CORPUS }                          from "./corpus.js";
import { prepare }                         from "./pretext.js";
import { detect, resetDetector }           from "./detector.js";
import { initCanvases, renderFrame }       from "./renderer.js";
import { CANVAS_W }                        from "./config.js";

// ── DOM ───────────────────────────────────────────────────────────────────────
const video        = document.getElementById("video");
const videoCanvas  = document.getElementById("videoCanvas");
const textCanvas   = document.getElementById("textCanvas");
const playBtn      = document.getElementById("playBtn");
const resetBtn     = document.getElementById("resetBtn");
const fontSzEl     = document.getElementById("fontSz");
const textStyleEl  = document.getElementById("textStyle");
const padSlider    = document.getElementById("padSlider");
const padVal       = document.getElementById("padVal");
const threshSlider = document.getElementById("threshSlider");
const threshVal    = document.getElementById("threshVal");
const showBoxesEl  = document.getElementById("showBoxes");
const showTreeEl   = document.getElementById("showTree");
const ltEl         = document.getElementById("lt");
const lnEl         = document.getElementById("ln");
const figPosEl     = document.getElementById("figPos");
const fpsEl        = document.getElementById("fpsOut");

// ── Live config (mutated by controls) ────────────────────────────────────────
const cfg = {
  fontSize:   14,
  textStyle:  "white",
  obsPad:     18,
  lumThresh:  90,
  showBoxes:  true,
  showTree:   true,
};

// ── Init ──────────────────────────────────────────────────────────────────────
const { vx, tx } = initCanvases(videoCanvas, textCanvas);

let prepared = prepare(CORPUS, `${cfg.fontSize}px ui-sans-serif,system-ui,sans-serif`, tx);

function reprepare() {
  prepared = prepare(CORPUS, `${cfg.fontSize}px ui-sans-serif,system-ui,sans-serif`, tx);
}

// ── Loop state ────────────────────────────────────────────────────────────────
let running     = false;
let frameCount  = 0;
let lastFPSTime = performance.now();

// ── Main render loop ──────────────────────────────────────────────────────────
function loop() {
  if (!running) return;
  if (video.paused || video.ended) { requestAnimationFrame(loop); return; }

  const t0 = performance.now();

  // Draw frame + get pixels for detection
  const { pixels } = renderFrame(video, vx, tx, prepared, null, cfg);

  // Detect figure
  const figBox = detect(pixels, CANVAS_W, cfg.lumThresh);

  // Re-render with detected box (video redraw is cheap; layout is <1ms)
  const tLayout = performance.now();
  const { lines } = renderFrame(video, vx, tx, prepared, figBox, cfg);
  const layoutMs  = (performance.now() - tLayout).toFixed(2);

  // Stats
  ltEl.textContent = layoutMs;
  lnEl.textContent = lines;
  figPosEl.textContent = figBox
    ? `(${Math.round(figBox.x)}, ${Math.round(figBox.y)})  ${Math.round(figBox.w)}×${Math.round(figBox.h)}px`
    : "not in frame";

  frameCount++;
  const now = performance.now();
  if (now - lastFPSTime >= 1000) {
    fpsEl.textContent = Math.round(frameCount * 1000 / (now - lastFPSTime));
    frameCount  = 0;
    lastFPSTime = now;
  }

  requestAnimationFrame(loop);
}

// ── Controls ──────────────────────────────────────────────────────────────────
playBtn.addEventListener("click", () => {
  if (video.paused) {
    video.play();
    playBtn.textContent = "Pause";
    playBtn.classList.add("btn-primary");
    running     = true;
    frameCount  = 0;
    lastFPSTime = performance.now();
    requestAnimationFrame(loop);
  } else {
    video.pause();
    playBtn.textContent = "Play";
    playBtn.classList.remove("btn-primary");
    running = false;
  }
});

resetBtn.addEventListener("click", () => {
  video.currentTime = 0;
  resetDetector();
  if (!running) {
    video.play();
    playBtn.textContent = "Pause";
    playBtn.classList.add("btn-primary");
    running     = true;
    frameCount  = 0;
    lastFPSTime = performance.now();
    requestAnimationFrame(loop);
  }
});

fontSzEl.addEventListener("change", (e) => {
  cfg.fontSize = +e.target.value;
  reprepare();
});

textStyleEl.addEventListener("change", (e) => { cfg.textStyle = e.target.value; });

padSlider.addEventListener("input", (e) => {
  cfg.obsPad = +e.target.value;
  padVal.textContent = e.target.value;
});

threshSlider.addEventListener("input", (e) => {
  cfg.lumThresh = +e.target.value;
  threshVal.textContent = e.target.value;
});

showBoxesEl.addEventListener("change", (e) => { cfg.showBoxes = e.target.checked; });
showTreeEl.addEventListener("change",  (e) => { cfg.showTree  = e.target.checked; });

// Paint first frame thumbnail when video is ready
video.addEventListener("loadeddata", () => {
  vx.drawImage(video, 0, 0, 640, 360);
});
