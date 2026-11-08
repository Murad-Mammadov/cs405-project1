// src/scene/build.js — the scene graph in front of the painting (Part B).
//
//   root
//   ├─ table                       (the painted table, pulled into 3D)
//   │  ├─ plate
//   │  │  ├─ melon
//   │  │  └─ melonSlice
//   │  └─ lampBase
//   │     └─ lampArm1      ← animated joint
//   │        └─ lampArm2   ← animated joint
//   │           └─ lampHead          (leaf: 5 levels below the root)
//
// Each node's `local` is relative to its parent; `shape` only resizes its mesh.

import * as mat4 from '../math/mat4.js';
import { Node } from './node.js';
import { srgb } from '../render/gpu.js';

const { translate: T, scale: S, rotateY: Ry, rotateZ: Rz, multiply: mul, multiplyAll } = mat4;

export function buildScene() {
  const root = new Node('root');

  const table = root.add(new Node('table', {
    local: T(0, 0, 1.15), mesh: 'cube', color: srgb('#6b5a48'),
    shape: mul(T(0, 0.4, 0), S(4.4, 0.8, 1.7)) }));

  const plate = table.add(new Node('plate', {
    local: T(-0.75, 0.8, 0.15), mesh: 'cylinder', color: srgb('#cfc8b8'),
    shape: S(1.15, 0.05, 1.15) }));
  plate.add(new Node('melon', {
    local: T(0, 0.05, -0.05), mesh: 'sphere', color: srgb('#c9a33a'),
    shape: mul(T(0, 0.3, 0), S(1.0, 0.6, 0.6)) }));
  plate.add(new Node('melonSlice', {
    local: mul(T(0.1, 0.05, 0.38), Ry(0.25)), mesh: 'sphere', color: srgb('#a9c35a'),
    shape: mul(T(0, 0.06, 0), S(0.85, 0.13, 0.26)) }));

  const lampBase = table.add(new Node('lampBase', {
    local: T(1.55, 0.8, -0.35), mesh: 'cylinder', color: srgb('#2f3036'),
    shape: S(0.45, 0.06, 0.45) }));
  const arm1 = lampBase.add(new Node('lampArm1', {
    mesh: 'cylinder', color: srgb('#8c8f96'), shape: S(0.07, 0.95, 0.07) }));
  const arm2 = arm1.add(new Node('lampArm2', {
    mesh: 'cylinder', color: srgb('#a3a6ad'), shape: S(0.06, 0.75, 0.06) }));
  const head = arm2.add(new Node('lampHead', {
    local: mul(T(0, 0.75, 0), Rz(-2.1)), mesh: 'cone', color: srgb('#e0b94c'),
    shape: S(0.35, 0.3, 0.3) }));

  const byName = new Map();
  root.traverse((n) => byName.set(n.name, n));

  const joints = { arm1: 0, arm2: 0 };
  /** Animate the lamp joints. `time` in seconds. */
  function animate(time) {
    joints.arm1 = 0.35 + 0.35 * Math.sin(1.1 * time);
    joints.arm2 = -1.0 + 0.45 * Math.sin(1.7 * time + 1.0);
    arm1.local = multiplyAll(T(0, 0.06, 0), Rz(joints.arm1));
    arm2.local = multiplyAll(T(0, 0.95, 0), Rz(joints.arm2));
  }
  animate(0);

  /** Human-readable description of each node's local transform (for the UI / report). */
  function describe(n) {
    const f = (x) => x.toFixed(2);
    switch (n.name) {
      case 'root': return 'I';
      case 'table': return 'T(0, 0, 1.15)';
      case 'plate': return 'T(−0.75, 0.8, 0.15)';
      case 'melon': return 'T(0, 0.05, −0.05)';
      case 'melonSlice': return 'T(0.1, 0.05, 0.38) · Ry(0.25)';
      case 'lampBase': return 'T(1.55, 0.8, −0.35)';
      case 'lampArm1': return `T(0, 0.06, 0) · Rz(${f(joints.arm1)})`;
      case 'lampArm2': return `T(0, 0.95, 0) · Rz(${f(joints.arm2)})`;
      case 'lampHead': return 'T(0, 0.75, 0) · Rz(−2.10)';
      default: return '';
    }
  }

  return { root, byName, animate, describe, leaf: head };
}
