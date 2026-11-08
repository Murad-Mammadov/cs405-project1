// src/scene/geometry.js — procedural meshes and helpers for debug lines.
//
// Meshes are non-indexed triangle lists, interleaved (px py pz nx ny nz).
// Dynamic lines/triangles are pushed as (x y z r g b a) per vertex.

import * as mat4 from '../math/mat4.js';

function pushTri(out, a, b, c, n) { for (const p of [a, b, c]) out.push(p[0], p[1], p[2], n[0], n[1], n[2]); }
function faceNormal(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** Unit cube centred at the origin (side 1). */
export function cube() {
  const out = [], s = 0.5;
  const faces = [ // normal, then the 4 corners counter-clockwise seen from outside
    [[1, 0, 0], [[s, -s, s], [s, -s, -s], [s, s, -s], [s, s, s]]],
    [[-1, 0, 0], [[-s, -s, -s], [-s, -s, s], [-s, s, s], [-s, s, -s]]],
    [[0, 1, 0], [[-s, s, s], [s, s, s], [s, s, -s], [-s, s, -s]]],
    [[0, -1, 0], [[-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s]]],
    [[0, 0, 1], [[-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]]],
    [[0, 0, -1], [[s, -s, -s], [-s, -s, -s], [-s, s, -s], [s, s, -s]]],
  ];
  for (const [n, [a, b, c, d]] of faces) { pushTri(out, a, b, c, n); pushTri(out, a, c, d, n); }
  return new Float32Array(out);
}

/** UV sphere of radius 0.5. */
export function sphere(seg = 28, rings = 18) {
  const out = [];
  const P = (i, j) => { const th = (j / rings) * Math.PI, ph = (i / seg) * 2 * Math.PI;
    return [0.5 * Math.sin(th) * Math.cos(ph), 0.5 * Math.cos(th), 0.5 * Math.sin(th) * Math.sin(ph)]; };
  const N = (p) => [p[0] * 2, p[1] * 2, p[2] * 2];
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    for (const p of [a, b, c, a, c, d]) out.push(...p, ...N(p));
  }
  return new Float32Array(out);
}

/** Cylinder of radius 0.5 from y = 0 to y = 1 (so it grows out of a joint). */
export function cylinder(seg = 24) {
  const out = [];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * 2 * Math.PI, a1 = ((i + 1) / seg) * 2 * Math.PI;
    const p0 = [0.5 * Math.cos(a0), 0.5 * Math.sin(a0)], p1 = [0.5 * Math.cos(a1), 0.5 * Math.sin(a1)];
    const n0 = [Math.cos(a0), 0, Math.sin(a0)], n1 = [Math.cos(a1), 0, Math.sin(a1)];
    const v = (p, y) => [p[0], y, p[1]];
    // side (smooth normals)
    for (const [p, y, n] of [[p0, 0, n0], [p1, 0, n1], [p1, 1, n1], [p0, 0, n0], [p1, 1, n1], [p0, 1, n0]]) out.push(...v(p, y), ...n);
    pushTri(out, [0, 1, 0], v(p1, 1), v(p0, 1), [0, 1, 0]);
    pushTri(out, [0, 0, 0], v(p0, 0), v(p1, 0), [0, -1, 0]);
  }
  return new Float32Array(out);
}

/** Cone pointing along +x: base (radius 0.5) at x = 0, tip at x = 1. Used as the curve follower. */
export function cone(seg = 24) {
  const out = [], tip = [1, 0, 0];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * 2 * Math.PI, a1 = ((i + 1) / seg) * 2 * Math.PI;
    const b0 = [0, 0.5 * Math.cos(a0), 0.5 * Math.sin(a0)], b1 = [0, 0.5 * Math.cos(a1), 0.5 * Math.sin(a1)];
    pushTri(out, b0, b1, tip, faceNormal(b0, b1, tip));
    pushTri(out, [0, 0, 0], b1, b0, [-1, 0, 0]);
  }
  return new Float32Array(out);
}

// ---------------------------------------------------------------------------
// dynamic line / triangle helpers (world space, colour per vertex)

export function line(out, a, b, c) {
  out.push(a[0], a[1], a[2], c[0], c[1], c[2], c[3] ?? 1, b[0], b[1], b[2], c[0], c[1], c[2], c[3] ?? 1);
}
export function tri(out, a, b, c, col) {
  for (const p of [a, b, c]) out.push(p[0], p[1], p[2], col[0], col[1], col[2], col[3] ?? 1);
}
/** Axis-aligned square marker in the xy-plane (the painting plane). */
export function square(out, p, r, col, diamond = false) {
  const q = diamond
    ? [[p[0], p[1] - r, p[2]], [p[0] + r, p[1], p[2]], [p[0], p[1] + r, p[2]], [p[0] - r, p[1], p[2]]]
    : [[p[0] - r, p[1] - r, p[2]], [p[0] + r, p[1] - r, p[2]], [p[0] + r, p[1] + r, p[2]], [p[0] - r, p[1] + r, p[2]]];
  tri(out, q[0], q[1], q[2], col); tri(out, q[0], q[2], q[3], col);
}
export const RED = [0.9, 0.12, 0.08, 1], GREEN = [0.1, 0.8, 0.15, 1], BLUE = [0.12, 0.35, 1, 1];

/** Draw the local x/y/z axes of frame M (red/green/blue). */
export function axes(out, M, len = 0.3) {
  const o = mat4.transformPoint(M, [0, 0, 0]);
  line(out, o, mat4.transformPoint(M, [len, 0, 0]), RED);
  line(out, o, mat4.transformPoint(M, [0, len, 0]), GREEN);
  line(out, o, mat4.transformPoint(M, [0, 0, len]), BLUE);
}

/** Ground grid on y = 0. */
export function grid(out, half = 6, step = 0.5, col = [0.22, 0.23, 0.26, 1]) {
  for (let x = -half; x <= half + 1e-6; x += step) {
    line(out, [x, 0, -half], [x, 0, half], col);
    line(out, [-half, 0, x], [half, 0, x], col);
  }
}
