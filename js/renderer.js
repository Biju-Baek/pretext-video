/**
 * renderer.js
 *
 * All canvas drawing for one frame:
 *   1. Copy video frame → videoCanvas
 *   2. Read pixels → returned to caller for detection
 *   3. Draw debug overlays (tree zones, figure box) → textCanvas
 *   4. Draw Pretext word layout → textCanvas
 */

import { layout }               from "./pretext.js";
import { CANVAS_W, CANVAS_H, TREE_ZONES } from "./config.js";

// ── Text color palettes ───────────────────────────────────────────────────────
const COLORS = {
  white:  (a) => `rgba(235,230,220,${a})`,
  teal:   (a) => `rgba(93,202,165,${a})`,
  amber:  (a) => `rgba(239,159,39,${a})`,
  purple: (a) => `rgba(175,169,236,${a})`,
};

/**
 * Initialise both canvases. Call once at startup.
 *
 * @param {HTMLCanvasElement} videoCanvas
 * @param {HTMLCanvasElement} textCanvas
 * @returns {{ vx, tx }}
 */
export function initCanvases(videoCanvas, textCanvas) {
  videoCanvas.width  = textCanvas.width  = CANVAS_W;
  videoCanvas.height = textCanvas.height = CANVAS_H;

  const vx = videoCanvas.getContext("2d", { willReadFrequently: true });
  const tx = textCanvas.getContext("2d");

  return { vx, tx };
}

/**
 * Render one frame.
 *
 * @param {HTMLVideoElement}         video
 * @param {CanvasRenderingContext2D} vx          Video canvas context
 * @param {CanvasRenderingContext2D} tx          Text overlay context
 * @param {{ segments }}             prepared    Pretext prepared handle
 * @param {{ x,y,w,h }|null}        figBox       Smoothed figure bbox (or null)
 * @param {{
 *   fontSize:   number,
 *   textStyle:  string,
 *   obsPad:     number,
 *   showBoxes:  boolean,
 *   showTree:   boolean,
 * }} cfg
 *
 * @returns {{ pixels: Uint8ClampedArray, lines: number }}
 */
export function renderFrame(video, vx, tx, prepared, figBox, cfg) {
  const { fontSize, textStyle, obsPad, showBoxes, showTree } = cfg;

  // ── 1. Video frame ───────────────────────────────────────────────────────
  vx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H);
  const { data: pixels } = vx.getImageData(0, 0, CANVAS_W, CANVAS_H);

  // ── 2. Clear overlay ─────────────────────────────────────────────────────
  tx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ── 3. Debug overlays ────────────────────────────────────────────────────
  if (showTree) {
    tx.save();
    tx.strokeStyle = "rgba(239,159,39,0.60)";
    tx.lineWidth   = 1;
    tx.setLineDash([4, 3]);
    for (const z of TREE_ZONES) {
      tx.strokeRect(z.x, z.y, z.w, z.h);
      tx.fillStyle = "rgba(239,159,39,0.06)";
      tx.fillRect(z.x, z.y, z.w, z.h);
    }
    tx.setLineDash([]);
    tx.restore();
  }

  if (showBoxes && figBox) {
    tx.save();
    tx.strokeStyle = "rgba(127,119,221,0.80)";
    tx.lineWidth   = 1.5;
    tx.setLineDash([5, 4]);
    tx.strokeRect(figBox.x, figBox.y, figBox.w, figBox.h);
    tx.setLineDash([]);
    tx.fillStyle = "rgba(83,74,183,0.10)";
    tx.fillRect(figBox.x, figBox.y, figBox.w, figBox.h);
    tx.restore();
  }

  // ── 4. Build full obstacle list: static tree zones + dynamic figure ──────
  const obstacles = TREE_ZONES.map((z) => ({ ...z }));
  if (figBox) obstacles.push({ ...figBox, pad: obsPad });

  // ── 5. Pretext layout pass ────────────────────────────────────────────────
  const font = `${fontSize}px ui-sans-serif,system-ui,sans-serif`;
  tx.font    = font;

  const { lines, words } = layout(prepared, obstacles, CANVAS_W, CANVAS_H, { fontSize });

  // ── 6. Draw words ─────────────────────────────────────────────────────────
  const colorFn = COLORS[textStyle] ?? COLORS.white;

  for (const { text, x, y } of words) {
    // Drop shadow for readability over video
    tx.fillStyle = "rgba(0,0,0,0.58)";
    tx.fillText(text, x + 1, y + 1);
    // Main text
    tx.fillStyle = colorFn(0.93);
    tx.fillText(text, x, y);
  }

  return { pixels, lines };
}
