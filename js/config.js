/**
 * config.js
 *
 * Shared constants for canvas dimensions and static scene geometry.
 *
 * TREE_ZONES defines the fixed top-left obstacle regions (branches/trunk).
 * These are added to the layout obstacle list every frame so text never
 * overlaps the visually noisy branch area, regardless of figure position.
 *
 * Calibrated from actual video frames at 640×360 resolution.
 */

export const CANVAS_W = 640;
export const CANVAS_H = 360;

/**
 * Static obstacle zones — always excluded from text layout.
 * Each rect is in 640×360 canvas coordinate space.
 * `pad` adds extra clearance beyond the rect boundary.
 *
 * To adjust visually: toggle "Show tree zone" in the UI,
 * then tweak x/y/w/h here until the amber boxes cover the branches.
 */
export const TREE_ZONES = [
  { x: 0, y:   0, w: 210, h: 120, pad: 4 }, // upper branch spread
  { x: 0, y: 100, w: 155, h: 135, pad: 4 }, // lower trunk + hanging branches
];
