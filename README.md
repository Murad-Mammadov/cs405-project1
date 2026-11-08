# CS405 Project 1 — Transformations, Projection & Curves from Paintings

One WebGPU application that turns **Şeker Ahmed Paşa — *Kavunlu Natürmort* (Still Life with Melon)**,
Sakıp Sabancı Museum collection, into a small 3D scene: the painting hangs as a textured quad, a table
with objects and an animated lamp stands in front of it, two cameras look at it, and curves are traced
over the painted melon.

No graphics/maths libraries: WebGPU + WGSL, plain JavaScript, Vite as the dev server.

## Run

Requires Node.js 20+ and a browser with WebGPU (current Chrome / Edge / Safari / Firefox).

```bash
npm install
npm run dev        # open the printed http://localhost:5173 URL
npm test           # unit tests for the maths (vec3, mat4, camera, curves, scene graph)
```

## Controls

**Mouse (main camera view)**

| Action | Effect |
|---|---|
| drag on empty space | orbit the camera around its target |
| mouse wheel | zoom (distance; height in orthographic mode) |
| drag a curve point | move it in the plane of the painting (knots carry their handles; C¹ is re-enforced) |
| double-click on the painting | append a new Bézier segment ending at that point |

**Keyboard**

| Key | Effect |
|---|---|
| `1` / `2` / `3` | main camera / inspection camera / split view |
| `P` | perspective ↔ orthographic |
| `O` | composition order T·R·S ↔ S·R·T |
| `X` | toggle node axes |
| `Space` | pause the scene-graph animation |
| `R` | reset the whole scene |

**Side panel**

- **View & debug (E)** — view mode, node axes, frustum, grid, pause, reset.
- **A · Transformations** — translation x/y/z, rotation angle + axis and scale of the orange cube; switch
  between `M = T·R·S` and `M = S·R·T`; both matrices are printed live (the active one is highlighted).
- **B · Scene graph** — the tree with every local transform, animation speed, and the local + world matrix
  of any selected node (default: the leaf `lampHead`).
- **C · Camera & projection** — perspective/orthographic, fov, ortho height, near, far, front view,
  top view (exercises the *up ∥ view direction* case), reset; eye/target/up and the V and P matrices.
- **D · Curves** — piecewise C¹ Bézier or Catmull–Rom, parameter *t* (drives the de Casteljau drawing and
  the follower), follower speed, animate, de Casteljau / control-polygon / other-curve toggles, remove last
  segment, reset curve, **Export JSON** (downloads `curve.json`).
- **Performance** — frame time, fps, CPU time per frame, vertices and draw calls per frame, GPU.

The frame time and vertex count are also shown in the bottom-left corner of the canvas.

## Code structure

```
src/
  math/    vec3.js, mat4.js, camera.js, curves.js    — the maths (column-major, WebGPU clip space z∈[0,1])
  scene/   node.js       scene-graph node (local → world by traversal)
           build.js      the scene tree in front of the painting
           cameras.js    orbit camera, inspection camera, ray casting, frustum corners
           curve.js      traced curve: control points, editing, drawing, JSON export
           painting.js   painting placement and (u,v) ↔ world mapping
           geometry.js   procedural meshes and debug-line helpers
  render/  gpu.js        device / canvas setup (sRGB)
           renderer.js   pipelines, uniform slots, per-frame draw loop
           shaders.js    WGSL
  ui/      panel.js, controls.js, input.js, style.css
tests/     math.test.js  (node --test)
curve.json               exported curve (normalised painting coordinates)
docs/                    report material
```

## Conventions

- Matrices: `Float32Array(16)`, **column-major** (`m[col*4 + row]`), column vectors (`p' = M·p`).
- Composition used everywhere: `M = T · R · S` (scale, then rotate, then translate).
- Camera space: right-handed, camera looks down −z. Projection maps depth to **z ∈ [0, 1]** (WebGPU).
- Painting coordinates: `(u, v) ∈ [0,1]²`, origin bottom-left, `u` right, `v` up.
