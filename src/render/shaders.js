// src/render/shaders.js — all WGSL in one module.
//
// Every draw gets one 256-byte slot of a uniform buffer (dynamic offset):
//   mvp    : projection · view · model  (clip-space transform)
//   model  : model matrix (for normals)
//   color  : linear RGBA
//   params : x = 1 → unlit (flat colour), otherwise simple Lambert lighting

export const WGSL = /* wgsl */ `
struct Uniforms {
  mvp    : mat4x4f,
  model  : mat4x4f,
  color  : vec4f,
  params : vec4f,
};
@group(0) @binding(0) var<uniform> u : Uniforms;

// ---- lit meshes: position + normal -------------------------------------
struct MeshOut {
  @builtin(position) pos : vec4f,
  @location(0) n : vec3f,
};
@vertex fn vsMesh(@location(0) p : vec3f, @location(1) n : vec3f) -> MeshOut {
  var o : MeshOut;
  o.pos = u.mvp * vec4f(p, 1.0);
  o.n = (u.model * vec4f(n, 0.0)).xyz;
  return o;
}
@fragment fn fsMesh(i : MeshOut) -> @location(0) vec4f {
  if (u.params.x > 0.5) { return u.color; }
  let L = normalize(vec3f(0.35, 0.8, 0.55));
  let d = abs(dot(normalize(i.n), L));          // two-sided, so winding never matters
  return vec4f(u.color.rgb * (0.28 + 0.72 * d), u.color.a);
}

// ---- per-vertex coloured lines / triangles: position + colour ----------
struct ColOut {
  @builtin(position) pos : vec4f,
  @location(0) c : vec4f,
};
@vertex fn vsColor(@location(0) p : vec3f, @location(1) c : vec4f) -> ColOut {
  var o : ColOut;
  o.pos = u.mvp * vec4f(p, 1.0);
  o.c = c;
  return o;
}
@fragment fn fsColor(i : ColOut) -> @location(0) vec4f { return i.c; }

// ---- the painting: position + uv, sampled from an sRGB texture ---------
@group(1) @binding(0) var paintSampler : sampler;
@group(1) @binding(1) var paintTex : texture_2d<f32>;
struct TexOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};
@vertex fn vsTex(@location(0) p : vec3f, @location(1) uv : vec2f) -> TexOut {
  var o : TexOut;
  o.pos = u.mvp * vec4f(p, 1.0);
  o.uv = uv;
  return o;
}
@fragment fn fsTex(i : TexOut) -> @location(0) vec4f {
  // the texture is rgba8unorm-srgb → sampling returns LINEAR colour;
  // the render target is an -srgb view → the hardware re-encodes on write.
  return vec4f(textureSample(paintTex, paintSampler, i.uv).rgb, 1.0);
}
`;
