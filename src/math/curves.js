// src/math/curves.js — Bézier and Catmull–Rom curves (Part D).  *** STUDENT CODE ***
//
// Points are arrays of any dimension ([u, v] in the app, but write the code so
// it works for [x, y, z] too). Functions return NEW arrays.
//
// Piecewise Bézier layout used by the app:  points = [K0, H, H, K1, H, H, K2, ...]
//   knots (on the curve) at indices 0, 3, 6, ...; two handles between knots.
//   A chain with n segments has 3n + 1 points. Segment i uses points[3i .. 3i+3].

const todo = (name) => { throw new Error(`TODO: implement ${name} in src/math/curves.js`); };

/** Linear interpolation (1 − t)·a + t·b, component-wise. */
export function lerp(a, b, t) {
  let res = [];
  for (let i = 0; i < a.length; i++) {
    res.push((1 - t) * a[i] + t * b[i]);
  }
  return res;
}

/** The four cubic Bernstein basis functions at t: [B0, B1, B2, B3]. */
export function bernstein3(t) {
  let u = 1 - t;
  let b0 = u * u * u;
  let b1 = 3 * u * u * t;
  let b2 = 3 * u * t * t;
  let b3 = t * t * t;
  return [b0, b1, b2, b3];
}

/** Point on the cubic Bézier with control points p0..p3 at parameter t ∈ [0,1]. */
export function bezier(p0, p1, p2, p3, t) {
  let [b0, b1, b2, b3] = bernstein3(t);
  let res = [];
  for (let i = 0; i < p0.length; i++) {
    res.push(b0 * p0[i] + b1 * p1[i] + b2 * p2[i] + b3 * p3[i]);
  }
  return res;
}

/** Derivative dB/dt of the same cubic at t (NOT normalised). */
export function bezierTangent(p0, p1, p2, p3, t) {
  let u = 1 - t;
  let c0 = 3 * u * u;
  let c1 = 6 * u * t;
  let c2 = 3 * t * t;
  let res = [];
  for (let i = 0; i < p0.length; i++) {
    res.push(c0 * (p1[i] - p0[i]) + c1 * (p2[i] - p1[i]) + c2 * (p3[i] - p2[i]));
  }
  return res;
}

/**
 * de Casteljau construction. Returns every level of the construction:
 *   [ [p0,p1,p2,p3],   // level 0: the control points
 *     [q0,q1,q2],      // level 1
 *     [r0,r1],         // level 2
 *     [B(t)] ]         // level 3: the point on the curve
 * The app draws levels 1–3 on top of the painting.
 */
export function deCasteljau(ctrl, t) {
  let levels = [ctrl.map(p => [...p])];
  let current = levels[0];
  while (current.length > 1) {
    let next = [];
    for (let i = 0; i < current.length - 1; i++) {
      next.push(lerp(current[i], current[i + 1], t));
    }
    levels.push(next);
    current = next;
  }
  return levels;
}

/**
 * Enforce C¹ continuity at every interior knot of a piecewise Bézier chain,
 * IN PLACE. `moved` is the index the user just dragged:
 *   - if it is a handle next to an interior knot, change the handle on the
 *     OTHER side of that knot so the C¹ condition holds;
 *   - otherwise (knot, end point, or −1 = "fix everything") make every interior
 *     knot satisfy the condition by adjusting the handle AFTER the knot.
 * Returns `points`.
 */
export function enforceC1(points, moved) {
  let last = points.length - 1;
  if (moved > 1 && moved < last - 1 && moved % 3 !== 0) {
    if (moved % 3 === 2) {
      let k = moved + 1;
      let k_after = k + 1;
      points[k_after] = points[k].map((val, d) => 2 * val - points[moved][d]);
    } else if (moved % 3 === 1) {
      let k = moved - 1;
      let k_before = k - 1;
      points[k_before] = points[k].map((val, d) => 2 * val - points[moved][d]);
    }
    return points;
  }
  for (let k = 3; k < last; k += 3) {
    points[k + 1] = points[k].map((val, d) => 2 * val - points[k - 1][d]);
  }
  return points;
}

/**
 * Evaluate a piecewise Bézier chain at a GLOBAL parameter t ∈ [0,1]
 * (t = 0 → first knot, t = 1 → last knot, each segment gets an equal share of t).
 * Returns { point, tangent, segment, localT }.
 *   tangent = derivative with respect to the LOCAL parameter of that segment.
 */
export function evalBezierChain(points, t) {
  let numSegs = Math.floor((points.length - 1) / 3);
  let ct = Math.max(0, Math.min(1, t));
  let scaled = ct * numSegs;
  let seg = Math.min(Math.floor(scaled), numSegs - 1);
  let localT = scaled - seg;

  let base = seg * 3;
  let p0 = points[base];
  let p1 = points[base + 1];
  let p2 = points[base + 2];
  let p3 = points[base + 3];

  return {
    point: bezier(p0, p1, p2, p3, localT),
    tangent: bezierTangent(p0, p1, p2, p3, localT),
    segment: seg,
    localT: localT
  };
}

/** Uniform Catmull–Rom segment between p1 and p2 (p0 and p3 are its neighbours). */
export function catmullRom(p0, p1, p2, p3, t) {
  let t2 = t * t;
  let t3 = t2 * t;
  let res = [];
  for (let i = 0; i < p1.length; i++) {
    let val = 0.5 * (
      (2 * p1[i]) +
      (-p0[i] + p2[i]) * t +
      (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 +
      (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3
    );
    res.push(val);
  }
  return res;
}

/** Derivative of the same Catmull–Rom segment at t. */
export function catmullRomTangent(p0, p1, p2, p3, t) {
  let t2 = t * t;
  let res = [];
  for (let i = 0; i < p1.length; i++) {
    let val = 0.5 * (
      (-p0[i] + p2[i]) +
      2 * (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t +
      3 * (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t2
    );
    res.push(val);
  }
  return res;
}

/**
 * Evaluate a Catmull–Rom spline through `knots` at global t ∈ [0,1].
 * The curve must pass through every knot: knot i is reached at t = i / (knots.length − 1).
 * The first and last segments have only one neighbour: decide how to handle the
 * missing p0 / p3 (repeat the end point, or reflect it) and say which in a comment.
 * Returns { point, tangent, segment, localT }.
 */
export function evalCatmullRomChain(knots, t) {
  // Missing endpoints handled by repeating the start and end knots.
  let numSegs = knots.length - 1;
  let ct = Math.max(0, Math.min(1, t));
  let scaled = ct * numSegs;
  let seg = Math.min(Math.floor(scaled), numSegs - 1);
  let localT = scaled - seg;

  let p0 = knots[Math.max(0, seg - 1)];
  let p1 = knots[seg];
  let p2 = knots[seg + 1];
  let p3 = knots[Math.min(knots.length - 1, seg + 2)];

  return {
    point: catmullRom(p0, p1, p2, p3, localT),
    tangent: catmullRomTangent(p0, p1, p2, p3, localT),
    segment: seg,
    localT: localT
  };
}