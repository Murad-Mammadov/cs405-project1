# AI-use log (for the report appendix)

The handout requires citing every AI use: tool, what was asked, what was kept.
Keep this file up to date and copy it into the report's appendix.

| Date | Tool | What I asked | What I kept |
|---|---|---|---|
| 2026-11-08 | Claude Code (Claude Opus 5.5) | Summarise the project handout and plan the work. | The plan / checklist. |
| 2026-11-08 | Claude Code (Claude Opus 5.5) | Create the repository skeleton: Vite setup, WebGPU device/canvas setup, WGSL shaders, renderer (pipelines, uniform buffer, draw loop), procedural meshes, side-panel UI, mouse input, scene layout, README. Function **signatures** and unit tests for the maths modules. | All of it, as the application framework: `src/render/*`, `src/ui/*`, `src/scene/geometry.js`, `src/scene/build.js`, `src/scene/cameras.js` (orbit state, ray/frustum helpers that call my maths), `src/scene/curve.js` (editing/drawing that calls my curve functions), `src/scene/painting.js`, `src/main.js`, `tests/math.test.js`, `README.md`. |
| | | **Not AI-generated (written by me):** `src/math/vec3.js`, `src/math/mat4.js`, `src/math/camera.js`, `src/math/curves.js`, `Node.updateWorld` in `src/scene/node.js`. | |

| 2026-11-12 | Claude Code (Claude Opus 5.5) | Show an example of a vec3 function. | The `vec3.add` example; wrote the other vec3 functions myself. |
| 2026-11-12/13 | Claude Code (Claude Opus 5.5) | Explanations of column-major layout, scene-graph order, the lookAt construction and the perspective/orthographic derivations; reviewing my code against the unit tests. | The explanations; I wrote mat4, updateWorld, lookAt, perspective and orthographic myself. |
| 2026-11-13 | Claude Code (Claude Opus 5.5) | Change `src/main.js` so an unfinished curves.js doesn't stop the whole app. | That change (scaffolding only). |

<!-- Add a row every time you ask an AI assistant to explain something or help you debug. -->
