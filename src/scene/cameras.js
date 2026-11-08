// src/scene/cameras.js — the orbit camera and the fixed inspection camera (Part C).
//
// The camera state is (yaw, pitch, distance) around a target. View and
// projection matrices come from YOUR lookAt / perspective / orthographic.

import * as mat4 from '../math/mat4.js';
import { lookAt, perspective, orthographic } from '../math/camera.js';

const DEG = Math.PI / 180;

export class OrbitCamera {
  constructor() { this.reset(); }

  reset() {
    this.target = [0, 2.05, 0.6];
    this.yaw = 0.3;            // radians around +y (0 = straight in front of the painting)
    this.pitch = 0.18;         // radians above the horizon
    this.dist = 8;
    this.fovDeg = 50;
    this.near = 0.1;
    this.far = 20;
    this.orthographic = false;
    this.orthoHeight = 4.5;    // world units visible vertically in orthographic mode
    this.up = [0, 1, 0];
  }

  /** Spherical (yaw, pitch, dist) around the target → eye position. */
  get eye() {
    const cp = Math.cos(this.pitch);
    return [
      this.target[0] + this.dist * cp * Math.sin(this.yaw),
      this.target[1] + this.dist * Math.sin(this.pitch),
      this.target[2] + this.dist * cp * Math.cos(this.yaw),
    ];
  }

  orbit(dx, dy) {
    this.yaw -= dx * 0.008;
    // allow exactly ±90° so the degenerate "up ∥ view direction" case can be reached
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch + dy * 0.008));
  }

  zoom(factor) {
    this.dist = Math.max(0.5, Math.min(30, this.dist * factor));
    this.orthoHeight = Math.max(0.5, Math.min(30, this.orthoHeight * factor));
  }

  view() { return lookAt(this.eye, this.target, this.up); }

  projection(aspect) {
    if (!this.orthographic) return perspective(this.fovDeg * DEG, aspect, this.near, this.far);
    const h = this.orthoHeight / 2, w = h * aspect;
    return orthographic(-w, w, -h, h, this.near, this.far);
  }

  /** Half extents (w, h) of the view volume at camera-space depth d. */
  halfExtents(d, aspect) {
    const h = this.orthographic ? this.orthoHeight / 2 : d * Math.tan(this.fovDeg * DEG / 2);
    return [h * aspect, h];
  }

  /** The 8 frustum corners in WORLD space: { near: [4 points], far: [4 points] }. */
  frustumCorners(aspect) {
    const camToWorld = mat4.invertRigid(this.view());
    const ring = (d) => {
      const [w, h] = this.halfExtents(d, aspect);
      return [[-w, -h, -d], [w, -h, -d], [w, h, -d], [-w, h, -d]].map((p) => mat4.transformPoint(camToWorld, p));
    };
    return { near: ring(this.near), far: ring(this.far) };
  }

  /** World-space ray through normalised device coords (ndcX, ndcY) ∈ [−1,1]². */
  ray(ndcX, ndcY, aspect) {
    const camToWorld = mat4.invertRigid(this.view());
    const [w, h] = this.halfExtents(1, aspect);
    if (this.orthographic) {
      return { origin: mat4.transformPoint(camToWorld, [ndcX * w, ndcY * h, 0]),
               dir: mat4.transformDirection(camToWorld, [0, 0, -1]) };
    }
    return { origin: this.eye, dir: mat4.transformDirection(camToWorld, [ndcX * w, ndcY * h, -1]) };
  }

  /** Text block for the on-screen readout. */
  describe() {
    const v = (p) => `(${p.map((x) => x.toFixed(2)).join(', ')})`;
    return `eye    ${v(this.eye)}\ntarget ${v(this.target)}\nup     ${v(this.up)}\n` +
      `proj   ${this.orthographic ? `orthographic, height ${this.orthoHeight.toFixed(2)}` : `perspective, fovY ${this.fovDeg.toFixed(0)}°`}\n` +
      `near   ${this.near.toFixed(2)}   far ${this.far.toFixed(1)}   (far/near = ${(this.far / this.near).toFixed(0)})`;
  }
}

/** A fixed camera looking at the whole set from the side, used to inspect the frustum. */
export const inspectionCamera = {
  eye: [10.5, 7, 9.5],
  target: [0, 1.6, 1.5],
  up: [0, 1, 0],
  fovDeg: 45, near: 0.5, far: 120,
  view() { return lookAt(this.eye, this.target, this.up); },
  projection(aspect) { return perspective(this.fovDeg * DEG, aspect, this.near, this.far); },
};

/** Intersect a ray with the plane z = z0; returns the hit point or null. */
export function intersectZPlane({ origin, dir }, z0 = 0) {
  if (Math.abs(dir[2]) < 1e-9) return null;
  const s = (z0 - origin[2]) / dir[2];
  if (s <= 0) return null;
  return [origin[0] + s * dir[0], origin[1] + s * dir[1], z0];
}
