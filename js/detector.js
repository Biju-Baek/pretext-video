/**
 * detector.js
 *
 * Detects the moving figure in each video frame using connected-component
 * blob analysis — no machine learning, no external libraries.
 *
 * Why this works:
 *   The person wears dark clothing (~65 luminance) against bright white
 *   snow (~230 luminance). Absolute luminance thresholding is a strong,
 *   camera-shake-robust signal for this scene.
 *
 * Algorithm (runs on raw Uint8ClampedArray pixel data every frame):
 *   1. Build a 1-bit dark map over the scan zone
 *   2. BFS flood-fill to label connected components
 *   3. Filter blobs by pixel count and bounding-box shape
 *   4. Return tightest bbox of best candidate, exponentially smoothed
 *
 * Static tree/branch zones are defined in config.js and handled
 * separately by the layout engine — detector focuses only on the person.
 */

// ── Scan zone (640×360 canvas space) ─────────────────────────────────────────
// Chosen to exclude the static tree top-left and road bottom strip.
const SCAN_X1 = 80,  SCAN_X2 = 610;
const SCAN_Y1 = 155, SCAN_Y2 = 330;

// ── Blob filter thresholds (calibrated from actual video frames) ──────────────
const BLOB_MIN_SIZE = 600;   // px² — ignore speckle noise
const BLOB_MAX_SIZE = 9000;  // px² — ignore large merged regions
const BLOB_MIN_W    = 25;    // px
const BLOB_MAX_W    = 160;   // px
const BLOB_MIN_H    = 45;    // px
const BLOB_MAX_H    = 175;   // px
const BLOB_MIN_CX   = 100;   // exclude far-left bleed from tree
const BLOB_MIN_CY   = 155;   // exclude top of frame
const BLOB_MAX_CY   = 320;   // exclude road/bottom strip

// ── Smoothing ─────────────────────────────────────────────────────────────────
const LERP = 0.25; // 0 = frozen, 1 = instant snap

let smoothBox = null;

/**
 * Detect the figure bounding box from raw RGBA pixel data.
 *
 * @param {Uint8ClampedArray} pixels       Raw RGBA from getImageData()
 * @param {number}            canvasW      Canvas width (640)
 * @param {number}            lumThreshold Darkness cutoff (default 90)
 * @returns {{ x, y, w, h } | null}
 */
export function detect(pixels, canvasW, lumThreshold = 90) {
  const zW = SCAN_X2 - SCAN_X1;
  const zH = SCAN_Y2 - SCAN_Y1;

  // 1. Build dark map for scan zone
  const dark = new Uint8Array(zW * zH);
  for (let y = 0; y < zH; y++) {
    for (let x = 0; x < zW; x++) {
      const px  = ((y + SCAN_Y1) * canvasW + (x + SCAN_X1)) * 4;
      const lum = pixels[px] * 0.299 + pixels[px + 1] * 0.587 + pixels[px + 2] * 0.114;
      if (lum < lumThreshold) dark[y * zW + x] = 1;
    }
  }

  // 2. BFS connected-component labeling (4-connectivity)
  const label = new Int32Array(zW * zH);
  const queue = new Int32Array(zW * zH); // pre-allocated — no GC pressure
  const blobs = []; // { minX, maxX, minY, maxY, size }
  let nextLabel = 1;

  for (let startIdx = 0; startIdx < dark.length; startIdx++) {
    if (!dark[startIdx] || label[startIdx]) continue;

    const lid = nextLabel++;
    let qHead = 0, qTail = 0;
    queue[qTail++] = startIdx;
    label[startIdx] = lid;

    let minX = zW, maxX = 0, minY = zH, maxY = 0, size = 0;

    while (qHead < qTail) {
      const cur = queue[qHead++];
      const cx  = cur % zW;
      const cy  = (cur - cx) / zW;

      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
      size++;

      // 4-connected neighbors
      const neighbors = [cur - 1, cur + 1, cur - zW, cur + zW];
      for (const nb of neighbors) {
        if (nb < 0 || nb >= dark.length) continue;
        // Wrap guard: left/right neighbors must be on the same row
        if (Math.abs((nb % zW) - cx) > 1) continue;
        if (!dark[nb] || label[nb]) continue;
        label[nb] = lid;
        queue[qTail++] = nb;
      }
    }

    blobs.push({ minX, maxX, minY, maxY, size });
  }

  // 3. Filter to find person blob
  let best = null;

  for (const b of blobs) {
    if (b.size < BLOB_MIN_SIZE || b.size > BLOB_MAX_SIZE) continue;

    const w  = b.maxX - b.minX;
    const h  = b.maxY - b.minY;
    const cx = (b.minX + b.maxX) / 2 + SCAN_X1;
    const cy = (b.minY + b.maxY) / 2 + SCAN_Y1;

    if (w < BLOB_MIN_W || w > BLOB_MAX_W) continue;
    if (h < BLOB_MIN_H || h > BLOB_MAX_H) continue;
    if (cx < BLOB_MIN_CX) continue;
    if (cy < BLOB_MIN_CY || cy > BLOB_MAX_CY) continue;

    if (!best || b.size > best.size) {
      best = {
        x:    b.minX + SCAN_X1,
        y:    b.minY + SCAN_Y1,
        w, h,
        size: b.size,
      };
    }
  }

  if (!best) {
    smoothBox = null;
    return null;
  }

  // 4. Exponential smooth
  if (!smoothBox) {
    smoothBox = { x: best.x, y: best.y, w: best.w, h: best.h };
  } else {
    smoothBox.x += (best.x - smoothBox.x) * LERP;
    smoothBox.y += (best.y - smoothBox.y) * LERP;
    smoothBox.w += (best.w - smoothBox.w) * LERP;
    smoothBox.h += (best.h - smoothBox.h) * LERP;
  }

  return { x: smoothBox.x, y: smoothBox.y, w: smoothBox.w, h: smoothBox.h };
}

/**
 * Reset smoothing state — call when video is restarted.
 */
export function resetDetector() {
  smoothBox = null;
}
