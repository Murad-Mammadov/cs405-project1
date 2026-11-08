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
export function lerp(a, b, t) { return todo('lerp'); }

/** The four cubic Bernstein basis functions at t: [B0, B1, B2, B3]. */
export function bernstein3(t) { return todo('bernstein3'); }

/** Point on the cubic Bézier with control points p0..p3 at parameter t ∈ [0,1]. */
export function bezier(p0, p1, p2, p3, t) { return todo('bezier'); }

/** Derivative dB/dt of the same cubic at t (NOT normalised). */
export function bezierTangent(p0, p1, p2, p3, t) { return todo('bezierTangent'); }

/**
 * de Casteljau construction. Returns every level of the construction:
 *   [ [p0,p1,p2,p3],   // level 0: the control points
 *     [q0,q1,q2],      // level 1
 *     [r0,r1],         // level 2
 *     [B(t)] ]         // level 3: the point on the curve
 * The app draws levels 1–3 on top of the painting.
 */
export function deCasteljau(ctrl, t) { return todo('deCasteljau'); }

/**
 * Enforce C¹ continuity at every interior knot of a piecewise Bézier chain,
 * IN PLACE. `moved` is the index the user just dragged:
 *   - if it is a handle next to an interior knot, change the handle on the
 *     OTHER side of that knot so the C¹ condition holds;
 *   - otherwise (knot, end point, or −1 = "fix everything") make every interior
 *     knot satisfy the condition by adjusting the handle AFTER the knot.
 * Returns `points`.
 */
export function enforceC1(points, moved) { return todo('enforceC1'); }

/**
 * Evaluate a piecewise Bézier chain at a GLOBAL parameter t ∈ [0,1]
 * (t = 0 → first knot, t = 1 → last knot, each segment gets an equal share of t).
 * Returns { point, tangent, segment, localT }.
 *   tangent = derivative with respect to the LOCAL parameter of that segment.
 */
export function evalBezierChain(points, t) { return todo('evalBezierChain'); }

/** Uniform Catmull–Rom segment between p1 and p2 (p0 and p3 are its neighbours). */
export function catmullRom(p0, p1, p2, p3, t) { return todo('catmullRom'); }

/** Derivative of the same Catmull–Rom segment at t. */
export function catmullRomTangent(p0, p1, p2, p3, t) { return todo('catmullRomTangent'); }

/**
 * Evaluate a Catmull–Rom spline through `knots` at global t ∈ [0,1].
 * The curve must pass through every knot: knot i is reached at t = i / (knots.length − 1).
 * The first and last segments have only one neighbour: decide how to handle the
 * missing p0 / p3 (repeat the end point, or reflect it) and say which in a comment.
 * Returns { point, tangent, segment, localT }.
 */
export function evalCatmullRomChain(knots, t) { return todo('evalCatmullRomChain'); }
