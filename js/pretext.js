/**
 * pretext.js
 *
 * Core Pretext engine — two phases:
 *
 *   prepare(text, font, ctx)
 *     Runs ONCE. Measures every word with canvas.measureText().
 *     Returns an opaque handle { segments, font }.
 *
 *   layout(prepared, obstacles, canvasW, canvasH, options)
 *     Runs EVERY FRAME. Pure arithmetic over cached widths.
 *     Supports multiple obstacle rectangles (figure + static zones).
 *     Returns { lines, words: [{text, x, y}] }.
 *
 * Reference: https://github.com/chenglou/pretext
 */

/**
 * Phase 1 — prepare
 *
 * @param {string}                    text
 * @param {string}                    font   CSS font shorthand e.g. "14px Inter"
 * @param {CanvasRenderingContext2D}   ctx    Any 2D context — used only for measurement
 * @returns {{ segments: Array, font: string }}
 */
export function prepare(text, font, ctx) {
  ctx.font = font;
  const spaceWidth = ctx.measureText(" ").width;

  const segments = text.split(/\s+/).filter(Boolean).map((word) => ({
    word,
    width: ctx.measureText(word).width,
    spaceWidth,
  }));

  return { segments, font };
}

/**
 * Phase 2 — layout
 *
 * @param {{ segments: Array }}  prepared
 * @param {Array<{ x, y, w, h, pad? }>} obstacles  List of rectangles to avoid.
 *   Each may carry an optional `pad` field for extra clearance beyond the rect.
 * @param {number}  canvasW
 * @param {number}  canvasH
 * @param {{
 *   fontSize:    number,
 *   edgePad:     number,   horizontal margin from canvas edges (default 10)
 *   lineHeight:  number,   multiplier (default 1.72)
 * }} options
 *
 * @returns {{ lines: number, words: Array<{ text, x, y }> }}
 */
export function layout(prepared, obstacles, canvasW, canvasH, options = {}) {
  const {
    fontSize   = 14,
    edgePad    = 10,
    lineHeight = 1.72,
  } = options;

  const LH   = fontSize * lineHeight;
  const segs = prepared.segments;
  const words = [];

  let y         = edgePad + fontSize;
  let lineCount = 0;
  let i         = 0;

  while (i < segs.length && y < canvasH - edgePad) {
    const lineTop = y - fontSize;
    const lineBot = lineTop + LH;

    const spans = getFreeSpans(lineTop, lineBot, obstacles, canvasW, edgePad, fontSize);

    let advanced = false;

    for (const span of spans) {
      if (span.w < fontSize * 1.8) continue;

      let lineWords = [], lineW = 0, j = i;

      while (j < segs.length) {
        const needed = segs[j].width + (lineWords.length > 0 ? segs[j].spaceWidth : 0);
        if (lineW + needed > span.w + 0.5) break;
        lineWords.push(segs[j]);
        lineW += needed;
        j++;
      }

      // Force at least one word to avoid infinite loops on very narrow spans
      if (lineWords.length === 0 && i < segs.length) {
        lineWords = [segs[i]];
        j = i + 1;
      }

      if (lineWords.length > 0) {
        let x = span.x;
        for (const seg of lineWords) {
          words.push({ text: seg.word, x, y });
          x += seg.width + seg.spaceWidth;
        }
        i = j;
        advanced = true;
        break;
      }
    }

    if (!advanced) i++;
    y += LH;
    lineCount++;
  }

  return { lines: lineCount, words };
}

/**
 * Compute free horizontal spans on a line given a set of obstacle rects.
 * Blocked intervals are merged before computing the complement.
 * @private
 */
function getFreeSpans(lineTop, lineBot, obstacles, canvasW, edgePad, fontSize) {
  const blocked = [];

  for (const obs of obstacles) {
    const pad = obs.pad ?? 0;
    const by1 = obs.y - pad * 0.5;
    const by2 = obs.y + obs.h + pad * 0.5;

    if (lineBot < by1 || lineTop > by2) continue;

    const bx1 = Math.max(edgePad,         obs.x - pad);
    const bx2 = Math.min(canvasW - edgePad, obs.x + obs.w + pad);
    blocked.push([bx1, bx2]);
  }

  // Sort + merge overlapping intervals
  blocked.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const iv of blocked) {
    if (merged.length && iv[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1]);
    } else {
      merged.push([...iv]);
    }
  }

  // Free spans = complement within [edgePad, canvasW - edgePad]
  const spans  = [];
  let cursor   = edgePad;
  const minSpan = fontSize * 1.8;

  for (const [l, r] of merged) {
    if (l - cursor > minSpan) spans.push({ x: cursor, w: l - cursor });
    cursor = Math.max(cursor, r);
  }
  if (canvasW - edgePad - cursor > minSpan) {
    spans.push({ x: cursor, w: canvasW - edgePad - cursor });
  }

  return spans;
}
