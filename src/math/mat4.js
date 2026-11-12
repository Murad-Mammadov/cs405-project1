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
export function identity() { 
  return Float32Array.from([
    1, 0, 0, 0, 
    0, 1, 0, 0, 
    0, 0, 1, 0, 
    0, 0, 0, 1
  ]); 
}

/** Matrix product A · B (a NEW matrix; A and B are unchanged). */
export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    const ai0 = a[i], ai1 = a[i + 4], ai2 = a[i + 8], ai3 = a[i + 12];
    out[i] = ai0 * b[0]  + ai1 * b[1]  + ai2 * b[2]  + ai3 * b[3];
    out[i + 4] = ai0 * b[4]  + ai1 * b[5]  + ai2 * b[6]  + ai3 * b[7];
    out[i + 8] = ai0 * b[8]  + ai1 * b[9]  + ai2 * b[10] + ai3 * b[11];
    out[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
  }
  return out;
}

/** Translation by (tx, ty, tz). */
export function translate(tx, ty, tz) {
  return Float32Array.from([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1
  ]);
}

/** Rotation by `rad` about the x axis. */
export function rotateX(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return Float32Array.from([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ]);
}

/** Rotation by `rad` about the y axis. */
export function rotateY(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return Float32Array.from([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ]);
}

/** Rotation by `rad` about the z axis. */
export function rotateZ(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return Float32Array.from([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

/** Non-uniform scale by (sx, sy, sz). */
export function scale(sx, sy, sz) {
  return Float32Array.from([
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1
  ]);
}

/** Transpose of m. */
export function transpose(m) {
  return Float32Array.from([
    m[0], m[4], m[8],  m[12],
    m[1], m[5], m[9],  m[13],
    m[2], m[6], m[10], m[14],
    m[3], m[7], m[11], m[15]
  ]);
}

/**
 * Inverse of a RIGID transform M = T·R (rotation + translation only, no scale).
 * Do NOT write a general 4×4 inverse: use the structure of a rigid transform
 * (what is the inverse of a rotation matrix? where does the translation go?).
 */
export function invertRigid(m) {
  const m00 = m[0], m01 = m[1], m02 = m[2];
  const m10 = m[4], m11 = m[5], m12 = m[6];
  const m20 = m[8], m21 = m[9], m22 = m[10];
  const tx = m[12], ty = m[13], tz = m[14];

  const itx = -(m00 * tx + m01 * ty + m02 * tz);
  const ity = -(m10 * tx + m11 * ty + m12 * tz);
  const itz = -(m20 * tx + m21 * ty + m22 * tz);

  return Float32Array.from([
    m00, m10, m20, 0,
    m01, m11, m21, 0,
    m02, m12, m22, 0,
    itx, ity, itz, 1
  ]);
}

/** M · [p, 1] → returns [x, y, z] (the transformed POINT; translation applies). */
export function transformPoint(m, p) {
  const x = p[0], y = p[1], z = p[2];
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14]
  ];
}

/** M · [d, 0] → returns [x, y, z] (the transformed DIRECTION; translation ignored). */
export function transformDirection(m, d) {
  const x = d[0], y = d[1], z = d[2];
  return [
    m[0] * x + m[4] * y + m[8] * z,
    m[1] * x + m[5] * y + m[9] * z,
    m[2] * x + m[6] * y + m[10] * z
  ];
}

// ---------------------------------------------------------------------------
// Convenience wrapper (provided, built on your multiply):
//   multiplyAll(A, B, C) === multiply(multiply(A, B), C) === A · B · C
export function multiplyAll(...ms) {
  return ms.reduce((acc, m) => multiply(acc, m));
}
