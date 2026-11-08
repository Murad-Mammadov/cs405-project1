// src/math/mat4.js — 4×4 matrix library (Part A).            *** STUDENT CODE ***
//
// CONVENTIONS (fixed by the rest of the app — do not change them):
//   * A matrix is a Float32Array(16) in COLUMN-MAJOR order, exactly what WGSL's
//     mat4x4f expects in a uniform buffer:   m[col * 4 + row]
//       index layout:   | m0 m4 m8  m12 |
//                       | m1 m5 m9  m13 |
//                       | m2 m6 m10 m14 |
//                       | m3 m7 m11 m15 |
//     so a translation (tx, ty, tz) lives in m[12], m[13], m[14].
//   * Column vectors: a point p is transformed as  p' = M · p.
//     multiply(A, B) therefore means "apply B first, then A".
//   * Angles are in radians; rotations are counter-clockwise when looking
//     down the axis towards the origin (right-handed).
//
// Run `npm test` — tests/math.test.js tells you which function is wrong.

const todo = (name) => { throw new Error(`TODO: implement mat4.${name} in src/math/mat4.js`); };

/** The 4×4 identity. */
export function identity() { return todo('identity'); }

/** Matrix product A · B (a NEW matrix; A and B are unchanged). */
export function multiply(a, b) { return todo('multiply'); }

/** Translation by (tx, ty, tz). */
export function translate(tx, ty, tz) { return todo('translate'); }

/** Rotation by `rad` about the x axis. */
export function rotateX(rad) { return todo('rotateX'); }

/** Rotation by `rad` about the y axis. */
export function rotateY(rad) { return todo('rotateY'); }

/** Rotation by `rad` about the z axis. */
export function rotateZ(rad) { return todo('rotateZ'); }

/** Non-uniform scale by (sx, sy, sz). */
export function scale(sx, sy, sz) { return todo('scale'); }

/** Transpose of m. */
export function transpose(m) { return todo('transpose'); }

/**
 * Inverse of a RIGID transform M = T·R (rotation + translation only, no scale).
 * Do NOT write a general 4×4 inverse: use the structure of a rigid transform
 * (what is the inverse of a rotation matrix? where does the translation go?).
 */
export function invertRigid(m) { return todo('invertRigid'); }

/** M · [p, 1] → returns [x, y, z] (the transformed POINT; translation applies). */
export function transformPoint(m, p) { return todo('transformPoint'); }

/** M · [d, 0] → returns [x, y, z] (the transformed DIRECTION; translation ignored). */
export function transformDirection(m, d) { return todo('transformDirection'); }

// ---------------------------------------------------------------------------
// Convenience wrapper (provided, built on your multiply):
//   multiplyAll(A, B, C) === multiply(multiply(A, B), C) === A · B · C
export function multiplyAll(...ms) {
  return ms.reduce((acc, m) => multiply(acc, m));
}
