// src/scene/curve.js — the traced curve: state, editing and drawing (Part D).
//
// Control points are stored in NORMALISED painting coordinates (u, v), see
// painting.js. Curve evaluation is done by YOUR functions in math/curves.js.

import * as curves from '../math/curves.js';
import * as mat4 from '../math/mat4.js';
import { painting, uvToWorld } from './painting.js';
import { line, tri, square, thickLine } from './geometry.js';

// Default trace: upper contour of the melon, in image pixels (720 × 502).
// Retrace it yourself by dragging the points — this is only a starting point.
const DEFAULT_PX = [
  [190, 125], [240, 80], [300, 62],
  [360, 60], [420, 58], [500, 60],
  [560, 78], [620, 96], [640, 150],
  [632, 200],
];
const toUv = ([x, y]) => [x / 720, 1 - y / 502];

const Z_CURVE = 0.012, Z_CONSTRUCT = 0.02, Z_POINTS = 0.028;
const COL = {
  curve: [1.0, 0.72, 0.05, 1], cr: [0.25, 0.85, 1.0, 1], poly: [0.85, 0.85, 0.85, 1],
  knot: [0.86, 0.2, 0.05, 1], handle: [0.95, 0.95, 0.95, 1],
  levels: [[0.3, 0.6, 1.0, 1], [0.3, 0.9, 0.35, 1], [1.0, 0.35, 0.25, 1]],
};

export class Curve {
  constructor() { this.reset(); }

  /** Load control points from an exported curve.json (see toJSON). They become the reset state. */
  loadJSON(data) {
    const cps = data?.curve?.controlPoints;
    if (!Array.isArray(cps) || cps.length < 4 || (cps.length - 1) % 3 !== 0) throw new Error('curve.json: bad controlPoints');
    this.initial = cps.map((p) => [p.u, p.v]);
    this.points = this.initial.map((p) => p.slice());
  }

  reset() {
    this.points = (this.initial ?? DEFAULT_PX.map(toUv)).map((p) => p.slice());
    this.mode = 'bezier';        // 'bezier' (piecewise, C¹) | 'catmull' (through the knots)
    this.t = this.t ?? 0.35;     // global parameter for de Casteljau + follower
  }

  get segments() { return (this.points.length - 1) / 3; }
  knotIndices() { return this.points.map((_, i) => i).filter((i) => i % 3 === 0); }
  knots() { return this.knotIndices().map((i) => this.points[i]); }

  /** Evaluate the active curve at global t → { point, tangent, segment, localT } in (u, v). */
  evaluate(t) {
    return this.mode === 'bezier' ? curves.evalBezierChain(this.points, t) : curves.evalCatmullRomChain(this.knots(), t);
  }

  /** Indices that can be dragged in the current mode. */
  editable() { return this.mode === 'bezier' ? this.points.map((_, i) => i) : this.knotIndices(); }

  /** Closest editable point to a world-space hit on the painting, within `radius` world units. */
  pick(hit, radius = 0.09) {
    let best = -1, bd = radius * radius;
    for (const i of this.editable()) {
      const p = uvToWorld(this.points[i]);
      const d = (p[0] - hit[0]) ** 2 + (p[1] - hit[1]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /** Move point i to `uv`. Knots carry their two handles along; then C¹ is restored. */
  move(i, uv) {
    const p = this.points[i], du = uv[0] - p[0], dv = uv[1] - p[1];
    if (i % 3 === 0) for (const j of [i - 1, i + 1]) {
      const h = this.points[j];
      if (h) { h[0] += du; h[1] += dv; }
    }
    this.points[i] = [uv[0], uv[1]];
    if (this.mode === 'bezier') curves.enforceC1(this.points, i);
  }

  /** Append a segment ending at `uv` (double-click on the painting). */
  appendSegment(uv) {
    const n = this.points.length, K = this.points[n - 1], H = this.points[n - 2];
    const h1 = [2 * K[0] - H[0], 2 * K[1] - H[1]];                 // mirrored → C¹ at K
    const h2 = [uv[0] + (h1[0] - uv[0]) / 3, uv[1] + (h1[1] - uv[1]) / 3];
    this.points.push(h1, h2, [uv[0], uv[1]]);
  }

  removeLastSegment() {
    if (this.segments > 1) this.points.splice(this.points.length - 3, 3);
  }

  /** JSON export: control points in normalised painting coordinates. */
  toJSON() {
    const r = (x) => +x.toFixed(4);
    return {
      painting: { artist: painting.artist, title: painting.title, collection: painting.collection },
      coordinates: 'normalised painting coordinates: u right, v up, origin at the bottom-left corner, both in [0, 1]',
      curve: {
        type: 'piecewise cubic Bezier',
        continuity: 'C1',
        segments: this.segments,
        layout: 'K0 H H K1 H H K2 ... (knots at indices 0, 3, 6, ...)',
        controlPoints: this.points.map(([u, v], i) => ({ u: r(u), v: r(v), role: i % 3 === 0 ? 'knot' : 'handle' })),
      },
      catmullRom: { type: 'uniform Catmull-Rom through the knots', knots: this.knots().map(([u, v]) => ({ u: r(u), v: r(v) })) },
    };
  }

  /**
   * Push the curve and its debug drawing into the frame's triangle / line lists.
   * Returns the follower's model matrix.
   */
  draw(tris, lines, { showPolygon, showCasteljau, showOther }) {
    const W = (p, z) => uvToWorld(p, z);
    const ribbon = (evalFn, col, width, z) => {
      const N = 80 * Math.max(1, this.segments);
      let prev = null;
      for (let k = 0; k <= N; k++) {
        const { point, tangent } = evalFn(k / N);
        const p = W(point, z);
        const tw = [tangent[0] * painting.width, tangent[1] * painting.height];
        const l = Math.hypot(tw[0], tw[1]) || 1;
        const n = [-tw[1] / l * width, tw[0] / l * width];
        const a = [p[0] + n[0], p[1] + n[1], z], b = [p[0] - n[0], p[1] - n[1], z];
        if (prev) { tri(tris, prev[0], prev[1], a, col); tri(tris, prev[1], b, a, col); }
        prev = [a, b];
      }
    };
    const bez = (t) => curves.evalBezierChain(this.points, t);
    const cr = (t) => curves.evalCatmullRomChain(this.knots(), t);
    const active = this.mode === 'bezier' ? bez : cr;
    ribbon(active, this.mode === 'bezier' ? COL.curve : COL.cr, 0.018, Z_CURVE);
    if (showOther) ribbon(this.mode === 'bezier' ? cr : bez, this.mode === 'bezier' ? [0.25, 0.85, 1, 0.9] : [1, 0.72, 0.05, 0.9], 0.007, Z_CURVE * 0.8);

    if (showPolygon && this.mode === 'bezier')
      for (let i = 0; i + 1 < this.points.length; i++) line(lines, W(this.points[i], Z_CONSTRUCT), W(this.points[i + 1], Z_CONSTRUCT), COL.poly);

    const ev = this.evaluate(this.t);
    if (showCasteljau && this.mode === 'bezier') {
      const s = ev.segment * 3;
      const levels = curves.deCasteljau(this.points.slice(s, s + 4), ev.localT);
      for (let d = 1; d < levels.length; d++) {
        const L = levels[d], col = COL.levels[d - 1];
        for (let k = 0; k + 1 < L.length; k++) thickLine(tris, W(L[k], Z_CONSTRUCT), W(L[k + 1], Z_CONSTRUCT), 0.006, col);
        for (const p of L) square(tris, W(p, Z_CONSTRUCT + 0.002), d === 3 ? 0.04 : 0.03, col, true);
      }
    }
    for (const i of this.editable()) square(tris, W(this.points[i], Z_POINTS), i % 3 === 0 ? 0.045 : 0.032, i % 3 === 0 ? COL.knot : COL.handle, i % 3 !== 0);

    // follower: translate to C(t), rotate so its +x axis follows the tangent
    const p = W(ev.point, 0.09);
    const angle = Math.atan2(ev.tangent[1] * painting.height, ev.tangent[0] * painting.width);
    return mat4.multiplyAll(mat4.translate(...p), mat4.rotateZ(angle), mat4.scale(0.26, 0.11, 0.11));
  }
}
