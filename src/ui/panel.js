// src/ui/panel.js — the side panel: one section per part of the project.

import { Controls, el } from './controls.js';

/**
 * @param {HTMLElement} root   the <aside> element
 * @param {object} app         { state, camera, curve, scene, actions }
 * @returns readout elements that main.js fills every few frames
 */
export function buildPanel(root, app) {
  const { state, camera, curve, scene, actions } = app;
  const C = new Controls();
  const out = {};

  // ---- E · views & debug ------------------------------------------------
  let s = C.section(root, 'View & debug (Part E)');
  C.choice(s, state, 'view', [['main', 'Main camera'], ['inspect', 'Inspection'], ['split', 'Split']]);
  let b = el('div', { class: 'buttons' }, s);
  C.toggle(b, 'Node axes', state, 'showAxes');
  C.toggle(b, 'Frustum', state, 'showFrustum');
  C.toggle(b, 'Grid', state, 'showGrid');
  C.toggle(b, 'Pause animation', state, 'paused');
  b = el('div', { class: 'buttons' }, s);
  C.button(b, 'Reset scene', () => { actions.reset(); C.refresh(); });
  el('p', { class: 'hint', html: 'Main view: drag = orbit, wheel = zoom, drag a curve point = move it, double-click the painting = add a segment.<br>Keys: <b>1</b>/<b>2</b>/<b>3</b> views · <b>P</b> projection · <b>O</b> T·R·S/S·R·T · <b>X</b> axes · <b>Space</b> pause · <b>R</b> reset.' }, s);

  // ---- A · transformations ---------------------------------------------
  s = C.section(root, 'A · Transformations');
  const o = state.obj;
  C.slider(s, 'translate x', o, 'tx', -3, 3, 0.05);
  C.slider(s, 'translate y', o, 'ty', -1, 4, 0.05);
  C.slider(s, 'translate z', o, 'tz', -2, 4, 0.05);
  C.slider(s, 'rotation (rad)', o, 'angle', -3.14, 3.14, 0.01);
  C.select(s, 'rotation axis', o, 'axis', ['x', 'y', 'z']);
  C.slider(s, 'scale', o, 's', 0.1, 2.5, 0.01);
  C.choice(s, o, 'order', [['TRS', 'M = T·R·S'], ['SRT', 'M = S·R·T']]);
  el('div', { class: 'hint', text: 'M = T · R · S' }, s);
  out.trs = el('pre', {}, s);
  el('div', { class: 'hint', text: 'M = S · R · T' }, s);
  out.srt = el('pre', {}, s);

  // ---- B · scene graph -------------------------------------------------
  s = C.section(root, 'B · Scene graph');
  const names = []; scene.root.traverse((n) => names.push(n.name));
  C.select(s, 'inspect node', state, 'selectedNode', names);
  C.slider(s, 'anim speed', state, 'animSpeed', 0, 3, 0.05);
  out.tree = el('pre', {}, s);
  out.nodeMats = el('pre', {}, s);

  // ---- C · camera ------------------------------------------------------
  s = C.section(root, 'C · Camera & projection');
  C.choice(s, camera, 'orthographic', [[false, 'Perspective'], [true, 'Orthographic']]);
  C.slider(s, 'fov Y (°)', camera, 'fovDeg', 10, 120, 1);
  C.slider(s, 'ortho height', camera, 'orthoHeight', 0.5, 15, 0.1);
  C.slider(s, 'near', camera, 'near', 0.01, 5, 0.01);
  C.slider(s, 'far', camera, 'far', 2, 200, 1);
  b = el('div', { class: 'buttons' }, s);
  C.button(b, 'Front view', () => { camera.yaw = 0; camera.pitch = 0; C.refresh(); });
  C.button(b, 'Top view (up ∥ view dir)', () => { camera.pitch = Math.PI / 2; C.refresh(); });
  C.button(b, 'Reset camera', () => { camera.reset(); C.refresh(); });
  out.camera = el('pre', {}, s);
  out.viewMat = el('pre', {}, s);
  out.projMat = el('pre', {}, s);

  // ---- D · curves ------------------------------------------------------
  s = C.section(root, 'D · Curves over the painting');
  C.choice(s, curve, 'mode', [['bezier', 'Bézier (C¹, piecewise)'], ['catmull', 'Catmull–Rom']]);
  C.slider(s, 'parameter t', curve, 't', 0, 1, 0.001);
  C.slider(s, 'follower speed', state, 'curveSpeed', 0, 0.5, 0.01);
  b = el('div', { class: 'buttons' }, s);
  C.toggle(b, 'Animate', state, 'curveAnimate');
  C.toggle(b, 'de Casteljau', state, 'showCasteljau');
  C.toggle(b, 'Control polygon', state, 'showPolygon');
  C.toggle(b, 'Show other curve', state, 'showOther');
  b = el('div', { class: 'buttons' }, s);
  C.button(b, 'Remove last segment', () => curve.removeLastSegment());
  C.button(b, 'Reset curve', () => { curve.reset(); C.refresh(); });
  C.button(b, 'Export JSON', () => actions.exportJSON());
  out.curve = el('pre', {}, s);
  out.json = el('textarea', { readonly: '', placeholder: 'Exported JSON appears here (and downloads as curve.json).' }, s);

  // ---- performance -----------------------------------------------------
  s = C.section(root, 'Performance', false);
  out.perf = el('pre', {}, s);

  out.controls = C;
  return out;
}
