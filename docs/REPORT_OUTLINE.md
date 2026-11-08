# report.pdf — outline (3–5 pages)

Write it in your own words; this is only a checklist of what the handout asks for.

## 1. Painting (first page)
- Şeker Ahmed Paşa — *Kavunlu Natürmort*, Sakıp Sabancı Museum.
- Why: strong organic contours (the melon's outline, the slice) → good for curve tracing.

## 2. Part A — Transformations
- [ ] Screenshot with `M = T·R·S` + both matrices visible.
- [ ] Screenshot with `M = S·R·T` + both matrices visible.
- [ ] Paragraph: why they differ (in S·R·T the translation is rotated and scaled too), and that the rest of
      the code uses T·R·S (+ column-major, column vectors).

## 3. Part B — Scene graph
- [ ] Diagram of the tree (root → table → lampBase → lampArm1 → lampArm2 → lampHead, plate → melon / melonSlice).
- [ ] World matrix of the leaf `lampHead` written out by hand as the product of the locals, compared with the
      value printed in the panel (pause the animation first so the angles are fixed).
- [ ] Screenshot with node axes on.

## 4. Part C — Camera and projection
- [ ] Derivation of lookAt: w = normalize(eye − target), u = normalize(up × w), v = w × u; V = R·T(−eye).
- [ ] How you handle up ∥ view direction (show the Top-view button).
- [ ] Derivation of the WebGPU perspective z-row (near → 0, far → 1) and the orthographic matrix.
- [ ] Screenshots: same scene, perspective vs orthographic; the frustum seen from the inspection camera.
- [ ] Near/far discussion: chosen near = 0.1, far = 20 → far/near = 200; what happens to depth precision
      when near → 0.001 (z-fighting between the painting and the curve drawn 0.012 in front of it).

## 5. Part D — Curves
- [ ] Bernstein basis functions B0..B3 (formula + a plot if you like).
- [ ] Proof B(0) = P0 and B(1) = P3.
- [ ] C¹ condition at a joint: P3 − P2 = P4 − P3 ⇔ P4 = 2P3 − P2 (from B'(1) = 3(P3−P2), B'(0) = 3(P1−P0)).
- [ ] Catmull–Rom: formula and how the end segments are handled.
- [ ] Screenshot of YOUR traced shape over the painting (+ de Casteljau construction).
- [ ] Appendix: exported `curve.json`.

## 6. Part E — Integration & performance
- [ ] Measured frame times (Performance section of the panel) for main / inspection / split, and the GPU name.
- [ ] Vertices per frame.

## 7. What went wrong and how I found it
- [ ] Honest list: e.g. row- vs column-major mix-up, OpenGL z ∈ [−1,1] projection, NaN in lookAt from
      above, wrong multiplication order in updateWorld… and which test or screenshot revealed it.

## Appendix
- [ ] AI-use (copy docs/AI_USE.md).
- [ ] curve.json.
