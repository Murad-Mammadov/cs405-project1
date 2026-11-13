// src/main.js — wires maths, scene, rendering and UI into one application.
//
//   math/    your matrix, camera and curve code (+ unit tests in tests/)
//   scene/   scene graph, painting placement, cameras, curve state
//   render/  WebGPU device, pipelines, WGSL
//   ui/      side panel, mouse input

import * as mat4 from './math/mat4.js';
import { initGPU, srgb } from './render/gpu.js';
import { Renderer } from './render/renderer.js';
import * as geo from './scene/geometry.js';
import { buildScene } from './scene/build.js';
import { OrbitCamera, inspectionCamera } from './scene/cameras.js';
import { Curve } from './scene/curve.js';
import { paintingModel, setImageSize } from './scene/painting.js';
import { buildPanel } from './ui/panel.js';
import { fmtMat } from './ui/controls.js';
import { attachInput } from './ui/input.js';

const canvas = document.getElementById('gpu-canvas');
const statsEl = document.getElementById('stats');
const errorEl = document.getElementById('error');
const labelsEl = document.getElementById('view-labels');

const DEFAULTS = {
  view: 'split',
  showAxes: true, showFrustum: true, showGrid: true,
  showCasteljau: true, showPolygon: true, showOther: false,
  paused: false, animSpeed: 1,
  curveAnimate: true, curveSpeed: 0.08,
  selectedNode: 'lampHead',
  obj: { tx: -1.6, ty: 1.15, tz: 1.9, angle: 0.6, axis: 'y', s: 0.35, order: 'TRS' },
};
const state = structuredClone(DEFAULTS);

let stopped = false;
function showError(err) {
  stopped = true;
  console.error(err);
  const msg = String(err?.message ?? err);
  errorEl.hidden = false;
  errorEl.textContent = msg.startsWith('TODO')
    ? `Not implemented yet → ${msg}\n\nRun "npm test" to see which maths functions still fail, implement them, then reload this page.`
    : `Error: ${msg}`;
}

async function main() {
  let gpu;
  try { gpu = await initGPU(canvas); } catch (e) { showError(e); return; }

  const renderer = new Renderer(gpu, canvas);
  renderer.addMesh('cube', geo.cube());
  renderer.addMesh('sphere', geo.sphere());
  renderer.addMesh('cylinder', geo.cylinder());
  renderer.addMesh('cone', geo.cone());
  const [iw, ih] = await renderer.loadPainting(`${import.meta.env.BASE_URL}painting.jpg`);
  setImageSize(iw, ih);

  let scene, camera, curve, panel;
  try {
    scene = buildScene();
    camera = new OrbitCamera();
    curve = new Curve();
  } catch (e) { showError(e); return; }

  let animTime = 0;
  const actions = {
    reset() {
      for (const k of Object.keys(DEFAULTS)) {
        if (k === 'obj') Object.assign(state.obj, DEFAULTS.obj); else state[k] = DEFAULTS[k];
      }
      camera.reset(); curve.reset(); animTime = 0;
    },
    exportJSON() {
      const text = JSON.stringify(curve.toJSON(), null, 2);
      panel.json.value = text;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = 'curve.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
  };
  panel = buildPanel(document.getElementById('panel'), { state, camera, curve, scene, actions });

  // viewports in device pixels
  const layout = () => {
    const [w, h] = renderer.size;
    if (state.view === 'main') return { main: [0, 0, w, h], inspect: null };
    if (state.view === 'inspect') return { main: null, inspect: [0, 0, w, h] };
    const half = Math.floor(w / 2);
    return { main: [0, 0, half - 1, h], inspect: [half + 1, 0, w - half - 1, h] };
  };
  attachInput(canvas, { camera, curve, layout,
    onError: (e) => (String(e?.message).startsWith('TODO') ? console.warn(e.message) : showError(e)) });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === '1') state.view = 'main';
    else if (k === '2') state.view = 'inspect';
    else if (k === '3') state.view = 'split';
    else if (k === 'p') camera.orthographic = !camera.orthographic;
    else if (k === 'o') state.obj.order = state.obj.order === 'TRS' ? 'SRT' : 'TRS';
    else if (k === 'x') state.showAxes = !state.showAxes;
    else if (k === 'r') actions.reset();
    else if (k === ' ') { state.paused = !state.paused; e.preventDefault(); }
    else return;
    panel.controls.refresh();
  });

  const COLORS = { object: srgb('#d0602c'), follower: srgb('#e8342a'), eye: srgb('#ff8a3d') };
  const ROT = { x: mat4.rotateX, y: mat4.rotateY, z: mat4.rotateZ };
  const perf = { frameMs: 16, cpuMs: 0, vertices: 0, draws: 0 };
  let lastNow = performance.now(), lastUi = 0;
  let curveTodo = null;   // message of the first unimplemented curve function, if any

  function frame(now) {
    if (stopped) return;
    try {
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      perf.frameMs += ((now - lastNow) - perf.frameMs) * 0.05;   // smoothed frame time
      lastNow = now;
      const t0 = performance.now();

      if (!state.paused) animTime += dt * state.animSpeed;
      if (state.curveAnimate) curve.t = (curve.t + dt * state.curveSpeed) % 1;
      renderer.resize();
      const lay = layout();

      // --- B: scene graph
      scene.animate(animTime);
      scene.root.updateWorld();

      // --- A: user-controlled object, both composition orders
      const o = state.obj;
      const T = mat4.translate(o.tx, o.ty, o.tz), R = ROT[o.axis](o.angle), S = mat4.scale(o.s, o.s, o.s);
      const TRS = mat4.multiplyAll(T, R, S), SRT = mat4.multiplyAll(S, R, T);
      const objM = o.order === 'TRS' ? TRS : SRT;

      // --- world content shared by both views
      const meshes = [];
      scene.root.traverse((n) => {
        if (n.mesh) meshes.push({ mesh: n.mesh, model: n.shape ? mat4.multiply(n.world, n.shape) : n.world, color: n.color });
      });
      meshes.push({ mesh: 'cube', model: objM, color: COLORS.object });

      // --- D: curve on the painting + follower
      // (while curves.js is unfinished, skip the curve instead of stopping the app)
      let tris = [], lines = [];
      try {
        const follower = curve.draw(tris, lines, state);
        meshes.push({ mesh: 'cone', model: follower, color: COLORS.follower });
        curveTodo = null;
      } catch (e) {
        if (!String(e?.message).startsWith('TODO')) throw e;
        curveTodo = e.message; tris = []; lines = [];
      }

      if (state.showGrid) geo.grid(lines);
      if (state.showAxes) {
        geo.axes(lines, mat4.identity(), 1.0);
        scene.root.traverse((n) => { if (n !== scene.root) geo.axes(lines, n.world, 0.35); });
        geo.axes(lines, objM, 1.2);
      }

      const views = [];
      if (lay.main) {
        const a = lay.main[2] / lay.main[3];
        views.push({ viewport: lay.main, viewProj: mat4.multiply(camera.projection(a), camera.view()),
          painting: paintingModel(), meshes, tris, lines });
      }
      if (lay.inspect) {
        const a = lay.inspect[2] / lay.inspect[3];
        const extra = lines.slice();
        const extraMeshes = meshes.slice();
        if (state.showFrustum) {
          const aMain = lay.main ? lay.main[2] / lay.main[3] : a;
          const { near, far } = camera.frustumCorners(aMain);
          const cN = [1, 0.55, 0.2, 1], cF = [1, 0.75, 0.3, 1], cS = [1, 0.45, 0.15, 1];
          for (let k = 0; k < 4; k++) {
            geo.line(extra, near[k], near[(k + 1) % 4], cN);
            geo.line(extra, far[k], far[(k + 1) % 4], cF);
            geo.line(extra, near[k], far[k], cS);
          }
          geo.line(extra, camera.eye, camera.target, [0.8, 0.8, 0.8, 1]);
          geo.axes(extra, mat4.invertRigid(camera.view()), 0.6);   // the camera's own frame
          extraMeshes.push({ mesh: 'cube', model: mat4.multiply(mat4.translate(...camera.eye), mat4.scale(0.2, 0.2, 0.2)), color: COLORS.eye, unlit: true });
        }
        views.push({ viewport: lay.inspect, viewProj: mat4.multiply(inspectionCamera.projection(a), inspectionCamera.view()),
          painting: paintingModel(), meshes: extraMeshes, tris, lines: extra });
      }

      const r = renderer.render(views);
      perf.vertices = r.vertices; perf.draws = r.draws;
      perf.cpuMs += ((performance.now() - t0) - perf.cpuMs) * 0.05;

      statsEl.textContent = `frame ${perf.frameMs.toFixed(2)} ms  (${(1000 / perf.frameMs).toFixed(0)} fps)\n` +
        `vertices/frame ${perf.vertices.toLocaleString()}   draws ${perf.draws}`;

      if (now - lastUi > 120) {      // text readouts at ~8 Hz
        lastUi = now;
        updateReadouts({ TRS, SRT, lay });
        if (state.curveAnimate) panel.controls.refresh();
      }
    } catch (e) { showError(e); return; }
    requestAnimationFrame(frame);
  }

  function updateReadouts({ TRS, SRT, lay }) {
    // A
    panel.trs.textContent = fmtMat(TRS);
    panel.srt.textContent = fmtMat(SRT);
    panel.trs.classList.toggle('active', state.obj.order === 'TRS');
    panel.srt.classList.toggle('active', state.obj.order === 'SRT');
    // B
    let tree = '';
    scene.root.traverse((n, d) => { tree += `${'   '.repeat(d)}${d ? '└─ ' : ''}${n.name.padEnd(12)} ${scene.describe(n)}\n`; });
    panel.tree.textContent = tree.trimEnd();
    const sel = scene.byName.get(state.selectedNode) ?? scene.leaf;
    const chain = []; for (let n = sel; n; n = n.parent) chain.unshift(n.name);
    const p = mat4.transformPoint(sel.world, [0, 0, 0]);
    panel.nodeMats.textContent = `world(${sel.name}) = ${chain.slice(1).map((c) => `L_${c}`).join(' · ') || 'I'}\n\n` +
      `local:\n${fmtMat(sel.local, 3)}\n\nworld:\n${fmtMat(sel.world, 3)}\n\norigin in world: (${p.map((x) => x.toFixed(3)).join(', ')})`;
    // C
    const aspect = lay.main ? lay.main[2] / lay.main[3] : renderer.size[0] / renderer.size[1];
    panel.camera.textContent = camera.describe();
    panel.viewMat.textContent = `V = lookAt(eye, target, up)\n${fmtMat(camera.view(), 3)}`;
    panel.projMat.textContent = `P = ${camera.orthographic ? 'orthographic' : 'perspective'}   (aspect ${aspect.toFixed(3)})\n${fmtMat(camera.projection(aspect), 3)}`;
    // D
    if (curveTodo) {
      panel.curve.textContent = `Curve not drawn yet:\n${curveTodo}`;
    } else {
    const ev = curve.evaluate(curve.t);
    const P = curve.points;
    let joints = '';
    for (let k = 3; k < P.length - 1; k += 3) {
      const e = Math.hypot(P[k + 1][0] - 2 * P[k][0] + P[k - 1][0], P[k + 1][1] - 2 * P[k][1] + P[k - 1][1]);
      joints += `  joint K${k / 3}: |P${k + 1} − 2P${k} + P${k - 1}| = ${e.toExponential(1)}\n`;
    }
    panel.curve.textContent =
      `curve      ${curve.mode === 'bezier' ? 'piecewise cubic Bézier' : 'Catmull–Rom through the knots'}\n` +
      `segments   ${curve.mode === 'bezier' ? curve.segments : curve.knots().length - 1}\n` +
      `t          ${curve.t.toFixed(3)}  → segment ${ev.segment}, local t ${ev.localT.toFixed(3)}\n` +
      `C(t)       (${ev.point.map((x) => x.toFixed(4)).join(', ')})  normalised\n` +
      `C'(t)      (${ev.tangent.map((x) => x.toFixed(3)).join(', ')})\n` +
      (curve.mode === 'bezier' ? `C¹ check (0 = continuous):\n${joints}` : '');
    }
    // E
    panel.perf.textContent =
      `frame time   ${perf.frameMs.toFixed(2)} ms  (${(1000 / perf.frameMs).toFixed(1)} fps)\n` +
      `CPU / frame  ${perf.cpuMs.toFixed(2)} ms\n` +
      `vertices     ${perf.vertices.toLocaleString()} per frame\n` +
      `draw calls   ${perf.draws}\n` +
      `canvas       ${renderer.size[0]} × ${renderer.size[1]} px, 4× MSAA\n` +
      `GPU          ${gpu.gpuName}`;
    // view labels (CSS pixels)
    const dpr = renderer.size[0] / canvas.clientWidth;
    labelsEl.innerHTML = '';
    for (const [key, name] of [['main', `Main camera (${camera.orthographic ? 'orthographic' : 'perspective'})`], ['inspect', 'Inspection camera']]) {
      const vp = lay[key]; if (!vp) continue;
      const s = document.createElement('span'); s.textContent = name; s.style.left = `${vp[0] / dpr + 8}px`;
      labelsEl.appendChild(s);
    }
  }

  requestAnimationFrame(frame);
}

main();
