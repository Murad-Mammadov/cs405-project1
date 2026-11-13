// src/math/camera.js — view and projection matrices (Part C).  *** STUDENT CODE ***
//
// Same conventions as mat4.js: column-major Float32Array(16), column vectors.
// Camera space is right-handed: the camera sits at the origin, looks down −z,
// +y is up and +x is right.
//
// WebGPU clip space (NOT OpenGL's):
//   after the perspective divide  ndc = clip.xyz / clip.w
//   x ∈ [−1, 1], y ∈ [−1, 1] (y up), and  z ∈ [0, 1]  (near → 0, far → 1).

import * as vec3 from './vec3.js';

const todo = (name) => { throw new Error(`TODO: implement ${name} in src/math/camera.js`); };

/**
 * View matrix V that maps world space → camera space.
 *  - V · eye    = (0, 0, 0)
 *  - V · target lies on the −z axis
 *  - `up` only needs to be roughly up; build an orthonormal basis using TWO
 *    cross products.
 *  - If `up` is (nearly) parallel to the viewing direction the first cross
 *    product is ~0 and the basis collapses: detect that and choose another up.
 * @param {number[]} eye    [x,y,z]
 * @param {number[]} target [x,y,z]
 * @param {number[]} up     [x,y,z]
 */
export function lookAt(eye, target, up) {

  let w = vec3.normalize(vec3.sub(eye, target));

  let upHelper = up;
  let crossUpW = vec3.cross(upHelper, w);

  if (vec3.length(crossUpW) < 1e-6) {
    upHelper = Math.abs(w[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    crossUpW = vec3.cross(upHelper, w);
  }
  let u = vec3.normalize(crossUpW);

  let v = vec3.cross(w, u);

  return new Float32Array([
    u[0], v[0], w[0], 0,  u[1], v[1], w[1], 0,  u[2], v[2], w[2], 0, 
    -vec3.dot(u, eye), -vec3.dot(v, eye), -vec3.dot(w, eye), 1 
  ]);
}

export function perspective(fovY, aspect, near, far) { return todo('perspective'); }

/**
 * Orthographic projection for WebGPU, same near/far behaviour as perspective():
 *  camera-space box [left,right] × [bottom,top] × [−near, −far]
 *  → ndc [−1,1] × [−1,1] × [0,1], with clip.w = 1.
 */
export function orthographic(left, right, bottom, top, near, far) { return todo('orthographic'); }
