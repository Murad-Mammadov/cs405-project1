// Unit tests for the maths you write.   Run:  npm test
// (Node's built-in test runner; no dependencies.)
// The tests check PROPERTIES (where points must land), not one specific way
// of writing the code.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as vec3 from '../src/math/vec3.js';
import * as mat4 from '../src/math/mat4.js';
import { lookAt, perspective, orthographic } from '../src/math/camera.js';
import * as curves from '../src/math/curves.js';
import { Node } from '../src/scene/node.js';

const EPS = 1e-5;
const close = (a, b, msg = '') => {
  assert.equal(a.length, b.length, `${msg} length ${a.length} ≠ ${b.length}`);
  for (let i = 0; i < a.length; i++)
    assert.ok(Math.abs(a[i] - b[i]) < EPS, `${msg} [${i}]: got ${a[i]}, expected ${b[i]}\n  got      ${Array.from(a).map(x => +x.toFixed(4))}\n  expected ${Array.from(b).map(x => +x.toFixed(4))}`);
};
const num = (a, b, msg = '') => assert.ok(Math.abs(a - b) < EPS, `${msg}: got ${a}, expected ${b}`);
const I = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
// test-only helper: column-major M · [x,y,z,w]
const apply4 = (m, v) => [0, 1, 2, 3].map(r => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * v[3]);
const ndc = (m, p) => { const c = apply4(m, [...p, 1]); return [c[0] / c[3], c[1] / c[3], c[2] / c[3], c[3]]; };

describe('vec3', () => {
  test('add / sub / scale / dot', () => {
    close(vec3.add([1, 2, 3], [4, 5, 6]), [5, 7, 9]);
    close(vec3.sub([1, 2, 3], [4, 5, 6]), [-3, -3, -3]);
    close(vec3.scale([1, -2, 3], 2), [2, -4, 6]);
    num(vec3.dot([1, 2, 3], [4, 5, 6]), 32);
  });
  test('cross is right-handed and anti-commutative', () => {
    close(vec3.cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
    close(vec3.cross([0, 1, 0], [0, 0, 1]), [1, 0, 0]);
    close(vec3.cross([0, 1, 0], [1, 0, 0]), [0, 0, -1]);
  });
  test('length / normalize', () => {
    num(vec3.length([3, 4, 12]), 13);
    close(vec3.normalize([0, 3, 4]), [0, 0.6, 0.8]);
    const z = vec3.normalize([0, 0, 0]);
    assert.ok(z.every(Number.isFinite), 'normalize([0,0,0]) must not return NaN');
  });
  test('functions do not modify their inputs', () => {
    const a = [1, 2, 3], b = [4, 5, 6];
    vec3.add(a, b); vec3.cross(a, b); vec3.normalize(a);
    close(a, [1, 2, 3]); close(b, [4, 5, 6]);
  });
});

describe('mat4 (Part A)', () => {
  test('identity, column-major Float32Array', () => {
    const m = mat4.identity();
    assert.ok(m instanceof Float32Array && m.length === 16, 'must be a Float32Array(16)');
    close(m, I);
  });
  test('translate stores tx,ty,tz in m[12..14]', () => {
    const m = mat4.translate(1, 2, 3);
    close(m, [1,0,0,0, 0,1,0,0, 0,0,1,0, 1,2,3,1]);
  });
  test('scale', () => close(mat4.scale(2, 3, 4), [2,0,0,0, 0,3,0,0, 0,0,4,0, 0,0,0,1]));
  test('multiply: identity is neutral', () => {
    const a = mat4.translate(1, 2, 3);
    close(mat4.multiply(mat4.identity(), a), a);
    close(mat4.multiply(a, mat4.identity()), a);
  });
  test('multiply: a general (non-symmetric) product', () => {
    // A has columns (1..4), (5..8), (9..12), (13..16); B likewise with 17..32
    const A = Float32Array.from({ length: 16 }, (_, i) => i + 1);
    const B = Float32Array.from({ length: 16 }, (_, i) => i + 17);
    // expected computed by hand / independent code (column-major)
    close(mat4.multiply(A, B), [538,612,686,760, 650,740,830,920, 762,868,974,1080, 874,996,1118,1240]);
  });
  test('multiply: translations add', () => close(mat4.multiply(mat4.translate(1, 2, 3), mat4.translate(4, 5, 6)), mat4.translate(5, 7, 9)));
  test('order matters: T·S vs S·T', () => {
    const T = mat4.translate(1, 2, 3), S = mat4.scale(2, 2, 2);
    close(mat4.transformPoint(mat4.multiply(T, S), [1, 1, 1]), [3, 4, 5], 'T·S (scale first)');
    close(mat4.transformPoint(mat4.multiply(S, T), [1, 1, 1]), [4, 6, 8], 'S·T (translate first)');
  });
  test('rotations by 90° (right-handed)', () => {
    const q = Math.PI / 2;
    close(mat4.transformPoint(mat4.rotateZ(q), [1, 0, 0]), [0, 1, 0], 'rotateZ: x → y');
    close(mat4.transformPoint(mat4.rotateX(q), [0, 1, 0]), [0, 0, 1], 'rotateX: y → z');
    close(mat4.transformPoint(mat4.rotateY(q), [0, 0, 1]), [1, 0, 0], 'rotateY: z → x');
  });
  test('transpose', () => {
    const t = mat4.transpose(mat4.translate(1, 2, 3));
    close(t, [1,0,0,1, 0,1,0,2, 0,0,1,3, 0,0,0,1]);
    const A = Float32Array.from({ length: 16 }, (_, i) => i);
    close(mat4.transpose(mat4.transpose(A)), A, 'transpose twice');
  });
  test('invertRigid undoes a rotation + translation', () => {
    const M = mat4.multiplyAll(mat4.translate(1, -2, 3), mat4.rotateY(0.7), mat4.rotateX(-0.3), mat4.rotateZ(1.1));
    close(mat4.multiply(mat4.invertRigid(M), M), I, 'inv(M)·M');
    close(mat4.multiply(M, mat4.invertRigid(M)), I, 'M·inv(M)');
  });
  test('transformDirection ignores translation', () => {
    close(mat4.transformDirection(mat4.translate(5, 6, 7), [1, 2, 3]), [1, 2, 3]);
    close(mat4.transformPoint(mat4.translate(5, 6, 7), [1, 2, 3]), [6, 8, 10]);
  });
});

describe('camera (Part C)', () => {
  const eye = [3, 2, 5], target = [0, 1, 0], up = [0, 1, 0];
  test('lookAt: eye → origin, target → −z axis', () => {
    const V = lookAt(eye, target, up);
    close(mat4.transformPoint(V, eye), [0, 0, 0], 'V·eye');
    const d = vec3.length(vec3.sub(target, eye));
    close(mat4.transformPoint(V, target), [0, 0, -d], 'V·target');
  });
  test('lookAt: up stays up, result is rigid', () => {
    const V = lookAt(eye, target, up);
    assert.ok(mat4.transformDirection(V, [0, 1, 0])[1] > 0, 'world up should point up on screen');
    close(mat4.multiply(mat4.invertRigid(V), V), I, 'V must be a rigid transform');
  });
  test('lookAt: degenerate up (parallel to view direction) gives no NaN', () => {
    for (const [e, t] of [[[0, 5, 0], [0, 0, 0]], [[0, -4, 0], [0, 0, 0]]]) {
      const V = lookAt(e, t, [0, 1, 0]);
      assert.ok(Array.from(V).every(Number.isFinite), `lookAt(${e}, ${t}) produced NaN/Infinity`);
      close(mat4.transformPoint(V, t), [0, 0, -vec3.length(e)], 'target still on −z');
      close(mat4.multiply(mat4.invertRigid(V), V), I, 'still rigid');
    }
  });
  test('perspective maps near → z=0 and far → z=1 (WebGPU)', () => {
    const n = 0.5, f = 40, P = perspective(Math.PI / 3, 1.5, n, f);
    num(ndc(P, [0, 0, -n])[2], 0, 'near plane depth');
    num(ndc(P, [0, 0, -f])[2], 1, 'far plane depth');
    num(ndc(P, [0.3, 0.2, -7])[3], 7, 'clip.w = −z');
  });
  test('perspective: fov and aspect hit the frustum edges', () => {
    const fov = Math.PI / 3, a = 1.5, P = perspective(fov, a, 0.5, 40), z = 3, h = z * Math.tan(fov / 2);
    num(ndc(P, [0, h, -z])[1], 1, 'top edge');
    num(ndc(P, [a * h, 0, -z])[0], 1, 'right edge');
  });
  test('orthographic maps the box to [-1,1]² × [0,1]', () => {
    const O = orthographic(-2, 4, -1, 3, 0.5, 20);
    close(ndc(O, [-2, -1, -0.5]), [-1, -1, 0, 1], 'left-bottom-near');
    close(ndc(O, [4, 3, -20]), [1, 1, 1, 1], 'right-top-far');
  });
});

describe('curves (Part D)', () => {
  const P = [[0, 0], [0, 1], [1, 1], [1, 0]];
  test('lerp', () => close(curves.lerp([0, 2, 4], [10, 2, 0], 0.25), [2.5, 2, 3]));
  test('Bernstein basis sums to 1', () => {
    close(curves.bernstein3(0.5), [1 / 8, 3 / 8, 3 / 8, 1 / 8]);
    for (const t of [0, 0.1, 0.37, 0.9, 1]) num(curves.bernstein3(t).reduce((s, x) => s + x, 0), 1, `sum at t=${t}`);
  });
  test('Bézier starts at P0, ends at P3', () => {
    close(curves.bezier(...P, 0), P[0]);
    close(curves.bezier(...P, 1), P[3]);
    close(curves.bezier(...P, 0.5), [0.5, 0.75]);
  });
  test('Bézier tangent at the ends = 3(P1−P0) and 3(P3−P2)', () => {
    close(curves.bezierTangent(...P, 0), [0, 3]);
    close(curves.bezierTangent(...P, 1), [0, -3]);
  });
  test('works in 3D too', () => close(curves.bezier([0, 0, 0], [0, 0, 3], [3, 0, 3], [3, 3, 3], 1), [3, 3, 3]));
  test('de Casteljau levels', () => {
    const L = curves.deCasteljau(P, 0.3);
    assert.deepEqual(L.map(l => l.length), [4, 3, 2, 1]);
    close(L[1][0], [0, 0.3]);
    close(L[3][0], curves.bezier(...P, 0.3), 'last level = B(t)');
  });
  const chain = () => [[0, 0], [1, 1], [2, 1], [3, 0], [3.5, -1], [5, -1], [6, 0], [7, 1], [8, 1], [9, 0]];
  test('enforceC1: dragging a handle mirrors the opposite one', () => {
    const c = chain(); c[2] = [2, 2];
    curves.enforceC1(c, 2);
    close(c[4], [4, -2], 'P4 = 2·P3 − P2');
    c[7] = [7, 3];
    curves.enforceC1(c, 7);
    close(c[5], [5, -3], 'P5 = 2·P6 − P7');
  });
  test('enforceC1(points, −1) fixes every joint; chain tangent is continuous', () => {
    const c = curves.enforceC1(chain(), -1);
    for (const k of [3, 6]) close(curves.lerp(c[k - 1], c[k + 1], 0.5), c[k], `joint ${k} is the midpoint of its handles`);
    const a = curves.evalBezierChain(c, 1 / 3 - 1e-9), b = curves.evalBezierChain(c, 1 / 3 + 1e-9);
    close(a.tangent.map(x => +x.toFixed(3)), b.tangent.map(x => +x.toFixed(3)), 'tangent at joint');
  });
  test('evalBezierChain hits the knots', () => {
    const c = chain();
    close(curves.evalBezierChain(c, 0).point, c[0]);
    close(curves.evalBezierChain(c, 1).point, c[9]);
    const m = curves.evalBezierChain(c, 0.5);
    assert.equal(m.segment, 1); num(m.localT, 0.5, 'localT');
    close(m.point, curves.bezier(c[3], c[4], c[5], c[6], 0.5));
  });
  test('Catmull–Rom interpolates p1→p2; tangent = (p2−p0)/2 at t=0', () => {
    const [a, b, c, d] = [[0, 0], [1, 2], [3, 3], [4, 0]];
    close(curves.catmullRom(a, b, c, d, 0), b);
    close(curves.catmullRom(a, b, c, d, 1), c);
    close(curves.catmullRomTangent(a, b, c, d, 0), [1.5, 1.5]);
    close(curves.catmullRomTangent(a, b, c, d, 1), [1.5, -1]);
  });
  test('Catmull–Rom chain passes through every knot', () => {
    const K = [[0, 0], [1, 2], [3, 3], [4, 0], [6, 1]];
    K.forEach((k, i) => close(curves.evalCatmullRomChain(K, i / (K.length - 1)).point, k, `knot ${i}`));
    assert.ok(curves.evalCatmullRomChain(K, 0.6).tangent.every(Number.isFinite));
  });
});

describe('scene graph (Part B)', () => {
  test('world = parent.world · local, all the way down', () => {
    const root = new Node('root', { local: mat4.translate(0, 1, 0) });
    const arm = root.add(new Node('arm', { local: mat4.rotateZ(Math.PI / 2) }));
    const hand = arm.add(new Node('hand', { local: mat4.translate(2, 0, 0) }));
    root.updateWorld();
    close(mat4.transformPoint(hand.world, [0, 0, 0]), [0, 3, 0], 'hand origin in world');
    close(mat4.transformPoint(arm.world, [0, 0, 0]), [0, 1, 0], 'arm origin in world');
    arm.local = mat4.rotateZ(0);
    root.updateWorld();
    close(mat4.transformPoint(hand.world, [0, 0, 0]), [2, 1, 0], 'after changing a local matrix');
  });
});
