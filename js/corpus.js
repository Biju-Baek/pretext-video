/**
 * corpus.js
 * The text that flows around the detected figure.
 * Edit freely — Pretext measures and reflows any content.
 */

export const CORPUS = [
  "Reflow cascade initiated across seventeen parallel glyph segments.",
  "The segmenter yields orthographic boundaries at every Unicode codepoint junction,",
  "threading ligatures through the kern table without once touching the layout engine.",
  "Pretext accumulates advance widths from the canvas rasterizer,",
  "building an opaque PreparedText handle that encodes the full metric graph of the input string.",
  "On the resize hot path, layout receives that handle and a container width,",
  "then emits line boundaries through pure floating-point arithmetic —",
  "no allocation, no DOM query, no style recalculation.",
  "Each character finds its resting place on a line determined entirely by addition and comparison.",
  "The figure moves. The bounding box updates.",
  "Free spans are recomputed from the complement of the obstacle interval on each scan line.",
  "Words pour into the left column, the right column,",
  "or the full-width band above and below the obstruction,",
  "whichever geometry the current frame provides.",
  "Frame delta: 0.08 milliseconds.",
  "The text has no memory of where it was.",
  "It simply reappears, perfectly arranged, sixty times per second,",
  "around whatever shape the detection layer reports.",
  "Background luminance sits near two hundred and forty.",
  "The figure's jacket absorbs light down to sixty-five.",
  "The difference is a reliable signal — robust to camera shake because it is absolute, not differential.",
  "Blob analysis finds connected dark-pixel regions,",
  "filters by size and aspect ratio, and returns the tightest possible bounding box.",
  "Pretext does the rest.",
  "No layout engine was harmed in the making of this demo.",
  "Cheng Lou spent months in the depths of browser font internals",
  "to produce a library that weighs fifteen kilobytes and has zero dependencies.",
  "It works with React, Vue, Svelte, or vanilla JavaScript.",
  "Text and video, unified at last.",
].join(" ");
