// src/ui/input.js — mouse handling on the canvas: orbit, zoom, curve editing.

import { intersectZPlane } from '../scene/cameras.js';
import { worldToUv } from '../scene/painting.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} app { camera, curve, layout: () => ({ main, inspect }), onError }
 */
export function attachInput(canvas, app) {
  const { camera, curve } = app;
  let mode = null, dragIndex = -1, last = null;

  const toPx = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
  };
  const inside = (p, vp) => vp && p[0] >= vp[0] && p[0] < vp[0] + vp[2] && p[1] >= vp[1] && p[1] < vp[1] + vp[3];

  /** Where does the pixel's ray hit the painting plane? (main view only) */
  const hitPainting = (p) => {
    const vp = app.layout().main;
    if (!inside(p, vp)) return null;
    const ndcX = ((p[0] - vp[0]) / vp[2]) * 2 - 1;
    const ndcY = 1 - ((p[1] - vp[1]) / vp[3]) * 2;
    return intersectZPlane(camera.ray(ndcX, ndcY, vp[2] / vp[3]), 0);
  };
  const clampUv = ([u, v]) => [Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v))];
  const safe = (fn) => (e) => { try { fn(e); } catch (err) { app.onError(err); } };

  canvas.addEventListener('pointerdown', safe((e) => {
    const p = toPx(e);
    if (!inside(p, app.layout().main)) return;
    canvas.setPointerCapture(e.pointerId);
    const hit = hitPainting(p);
    dragIndex = hit ? curve.pick(hit) : -1;
    mode = dragIndex >= 0 ? 'drag' : 'orbit';
    last = [e.clientX, e.clientY];
    canvas.classList.toggle('dragging', mode === 'orbit');
  }));

  canvas.addEventListener('pointermove', safe((e) => {
    const p = toPx(e);
    if (mode === 'drag') {
      const hit = hitPainting(p);
      if (hit) curve.move(dragIndex, clampUv(worldToUv(hit)));
    } else if (mode === 'orbit') {
      camera.orbit(e.clientX - last[0], e.clientY - last[1]);
      last = [e.clientX, e.clientY];
    } else {
      const hit = hitPainting(p);
      canvas.classList.toggle('over-point', !!hit && curve.pick(hit) >= 0);
    }
  }));

  const end = () => { mode = null; dragIndex = -1; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener('dblclick', safe((e) => {
    const hit = hitPainting(toPx(e));
    if (!hit) return;
    const uv = worldToUv(hit);
    if (uv[0] >= 0 && uv[0] <= 1 && uv[1] >= 0 && uv[1] <= 1) curve.appendSegment(uv);
  }));

  canvas.addEventListener('wheel', (e) => {
    if (!inside(toPx(e), app.layout().main)) return;
    e.preventDefault();
    camera.zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });
}
