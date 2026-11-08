// src/scene/painting.js — where the painting hangs, and the mapping between
// normalised painting coordinates (u, v) and world space.
//
//   (u, v) ∈ [0,1]², origin at the painting's BOTTOM-LEFT corner, u → right, v → up.
//   The painting is an upright quad in the plane z = 0, facing +z.

import * as mat4 from '../math/mat4.js';

export const painting = {
  artist: 'Şeker Ahmed Paşa',
  title: 'Kavunlu Natürmort (Still Life with Melon)',
  collection: 'Sakıp Sabancı Museum',
  width: 4.0,
  height: 4.0 * 502 / 720,   // updated from the real image size in setImageSize()
  bottom: 1.05,             // world y of the lower edge
};

export function setImageSize(w, h) { painting.height = painting.width * h / w; }

/** Model matrix of the painting quad (the quad mesh is a unit square centred at 0). */
export function paintingModel() {
  return mat4.multiply(
    mat4.translate(0, painting.bottom + painting.height / 2, 0),
    mat4.scale(painting.width, painting.height, 1));
}

/** Normalised (u, v) → world point, lifted `z` units off the canvas. */
export function uvToWorld([u, v], z = 0) {
  return [(u - 0.5) * painting.width, painting.bottom + v * painting.height, z];
}

/** World point on the painting plane → normalised (u, v). */
export function worldToUv([x, y]) {
  return [x / painting.width + 0.5, (y - painting.bottom) / painting.height];
}
