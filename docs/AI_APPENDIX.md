# Appendix — Use of AI assistants

**Tool:** Claude Code (Anthropic, model Claude Opus 5.5), used 8–13 November 2026.
The full log is in `docs/AI_USE.md`; AI-generated commits are marked `Co-Authored-By: Claude` in the git history.

## 1. What the AI generated (kept, as application scaffolding)
The course provided only the handout and the specification page, not a starter repository, so the
infrastructure the handout describes as "starter code" was generated with the AI:

- Vite project setup, WebGPU device/canvas setup with sRGB handling, WGSL shaders, the renderer
  (pipelines, uniform buffer, draw loop) — `src/render/`
- Side panel, mouse/keyboard input, frame-time and vertex readouts — `src/ui/`, `src/main.js`
- Procedural meshes, scene layout, camera state and ray picking, curve editing/drawing and JSON
  export, all of which **call** my maths functions — `src/scene/` (except `Node.updateWorld`)
- Function signatures (stubs) and the unit tests for the maths modules — `tests/math.test.js`
- README skeleton; later small UI additions (de Casteljau close-up, follower toggle, loading `curve.json`)

## 2. What I wrote myself (the graded matrix, camera and curve code)
`src/math/vec3.js` (except the `add` example below), `src/math/mat4.js`, `Node.updateWorld` in
`src/scene/node.js`, `src/math/camera.js` and `src/math/curves.js`. I also traced the curve,
exported `curve.json`, took the screenshots and wrote this report.

## 3. How the AI helped with that code — explanation and debugging only
| What I asked | What I kept |
|---|---|
| An example of how to write a vector function | The one-line `vec3.add`; I wrote the other vec3 functions |
| Column-major storage, matrix multiplication, rotation matrices, rigid inverse | The explanations; I wrote `mat4.js` |
| Why `world = parentWorld · local` (with a fill-in-the-blanks outline) | The explanation; I wrote `updateWorld` |
| The lookAt construction; deriving the WebGPU perspective depth row and the orthographic matrix (the AI worked the x row of the orthographic derivation as an example) | The derivations; I wrote `camera.js` |
| Bernstein basis, Bézier derivative, de Casteljau, the C¹ condition | The explanations; I wrote `curves.js` |
| Reading test failures and syntax errors (e.g. `];)`, `vec3.subtract` vs `sub`, `dot` returning an array) | The bug reports; I made the fixes |
| Which screenshots the report needs, and checking them | The checklist |
| A report template: headings, my screenshots with captions, my measured performance table, prompts for each section | The layout; I wrote the text and derivations |

The AI did not write the matrix, camera or curve code assessed in Parts A–D.
