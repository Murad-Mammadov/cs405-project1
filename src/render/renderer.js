// src/render/renderer.js — pipelines, buffers and the per-frame draw loop.
//
// The app describes a frame as a list of VIEWS (one per viewport):
//   {
//     viewport : [x, y, w, h]          // device pixels
//     viewProj : P · V                 // Float32Array(16), column-major
//     painting : model matrix | null   // textured quad
//     meshes   : [{ mesh, model, color, unlit }]
//     tris     : number[]              // world-space triangles, 7 floats/vertex (x y z r g b a)
//     lines    : number[]              // world-space line list, same layout
//   }
// and the renderer turns that into WebGPU commands. All uniforms of a frame go
// into one buffer with a 256-byte slot per draw (dynamic offsets).

import { WGSL } from './shaders.js';
import * as mat4 from '../math/mat4.js';

const SLOT = 256;                 // bytes per draw (minUniformBufferOffsetAlignment)
const MAX_SLOTS = 4096;
const MAX_DYN_VERTS = 400_000;    // lines + triangles per frame
const DYN_STRIDE = 7;             // floats per dynamic vertex
const SAMPLES = 4;                // MSAA

export class Renderer {
  constructor(gpu, canvas) {
    this.gpu = gpu;
    this.device = gpu.device;
    this.canvas = canvas;
    this.meshes = new Map();
    this.size = [0, 0];
    this.clearColor = { r: 0.035, g: 0.037, b: 0.045, a: 1 };
    this.#createPipelines();
    this.uniformCPU = new Float32Array(MAX_SLOTS * SLOT / 4);
    this.uniformGPU = this.device.createBuffer({ size: MAX_SLOTS * SLOT, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.uniformBG = this.device.createBindGroup({
      layout: this.uniformLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformGPU, size: 160 } }],
    });
    this.dynCPU = new Float32Array(MAX_DYN_VERTS * DYN_STRIDE);
    this.dynGPU = this.device.createBuffer({ size: this.dynCPU.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    // unit painting quad in the xy-plane, centred, facing +z: pos(3) + uv(2)
    const q = new Float32Array([
      -0.5, -0.5, 0, 0, 1,   0.5, -0.5, 0, 1, 1,   0.5, 0.5, 0, 1, 0,
      -0.5, -0.5, 0, 0, 1,   0.5, 0.5, 0, 1, 0,   -0.5, 0.5, 0, 0, 0,
    ]);
    this.quad = this.#vertexBuffer(q);
  }

  #vertexBuffer(data) {
    const b = this.device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.device.queue.writeBuffer(b, 0, data);
    return b;
  }

  #createPipelines() {
    const d = this.device;
    const module = d.createShaderModule({ code: WGSL });
    this.uniformLayout = d.createBindGroupLayout({ entries: [{
      binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 160 } }] });
    this.textureLayout = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} }] });
    const basic = d.createPipelineLayout({ bindGroupLayouts: [this.uniformLayout] });
    const textured = d.createPipelineLayout({ bindGroupLayouts: [this.uniformLayout, this.textureLayout] });

    const target = { format: this.gpu.viewFormat };
    const depthStencil = { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less-equal' };
    const multisample = { count: SAMPLES };
    const make = (layout, vs, fs, buffers, topology) => d.createRenderPipeline({
      layout, vertex: { module, entryPoint: vs, buffers },
      fragment: { module, entryPoint: fs, targets: [target] },
      primitive: { topology, cullMode: 'none' }, depthStencil, multisample });

    const meshLayout = [{ arrayStride: 24, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] }];
    const colLayout = [{ arrayStride: DYN_STRIDE * 4, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x4' }] }];
    const texLayout = [{ arrayStride: 20, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x2' }] }];

    this.pMesh = make(basic, 'vsMesh', 'fsMesh', meshLayout, 'triangle-list');
    this.pTris = make(basic, 'vsColor', 'fsColor', colLayout, 'triangle-list');
    this.pLines = make(basic, 'vsColor', 'fsColor', colLayout, 'line-list');
    this.pTex = make(textured, 'vsTex', 'fsTex', texLayout, 'triangle-list');
  }

  /** Register an interleaved (position, normal) triangle list under `name`. */
  addMesh(name, data) {
    this.meshes.set(name, { buffer: this.#vertexBuffer(data), count: data.length / 6 });
  }

  /** Load the painting into an sRGB texture. Returns its pixel size. */
  async loadPainting(url) {
    const blob = await (await fetch(url)).blob();
    const img = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    const tex = this.device.createTexture({
      size: [img.width, img.height], format: 'rgba8unorm-srgb',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    this.device.queue.copyExternalImageToTexture({ source: img }, { texture: tex }, [img.width, img.height]);
    const sampler = this.device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    this.paintingBG = this.device.createBindGroup({ layout: this.textureLayout, entries: [
      { binding: 0, resource: sampler }, { binding: 1, resource: tex.createView() }] });
    return [img.width, img.height];
  }

  /** Match the canvas backing store to its CSS size × devicePixelRatio. */
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (w === this.size[0] && h === this.size[1]) return false;
    this.canvas.width = w; this.canvas.height = h; this.size = [w, h];
    this.depthTex?.destroy(); this.msaaTex?.destroy();
    this.depthTex = this.device.createTexture({ size: [w, h], format: 'depth24plus', sampleCount: SAMPLES, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    this.msaaTex = this.device.createTexture({ size: [w, h], format: this.gpu.viewFormat, sampleCount: SAMPLES, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    return true;
  }

  /** Draw one frame. Returns { vertices, draws } actually submitted. */
  render(views) {
    let slot = 0, dynVerts = 0, vertices = 0, draws = 0;
    const U = this.uniformCPU, D = this.dynCPU;
    const putSlot = (mvp, model, color, unlit) => {
      if (slot >= MAX_SLOTS) throw new Error('Too many draws in one frame (raise MAX_SLOTS).');
      const o = slot * SLOT / 4;
      U.set(mvp, o); U.set(model, o + 16); U.set(color, o + 32);
      U[o + 36] = unlit ? 1 : 0;
      return slot++;
    };
    const putDyn = (arr) => {
      const n = arr.length / DYN_STRIDE, first = dynVerts;
      if (first + n > MAX_DYN_VERTS) throw new Error('Too many dynamic vertices (raise MAX_DYN_VERTS).');
      D.set(arr, first * DYN_STRIDE); dynVerts += n;
      return { first, count: n };
    };
    const I = mat4.identity(), white = [1, 1, 1, 1];

    // 1) pack uniforms and dynamic geometry for every view
    const plans = views.map((v) => ({
      v,
      painting: v.painting ? putSlot(mat4.multiply(v.viewProj, v.painting), v.painting, white, true) : -1,
      meshes: v.meshes.map((m) => ({ m, slot: putSlot(mat4.multiply(v.viewProj, m.model), m.model, m.color, m.unlit) })),
      dynSlot: putSlot(v.viewProj, I, white, true),
      tris: putDyn(v.tris ?? []),
      lines: putDyn(v.lines ?? []),
    }));
    const q = this.device.queue;
    q.writeBuffer(this.uniformGPU, 0, U.buffer, 0, slot * SLOT);
    if (dynVerts) q.writeBuffer(this.dynGPU, 0, D.buffer, 0, dynVerts * DYN_STRIDE * 4);

    // 2) one render pass, one viewport per view
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.msaaTex.createView(),
        resolveTarget: this.gpu.context.getCurrentTexture().createView({ format: this.gpu.viewFormat }),
        clearValue: this.clearColor, loadOp: 'clear', storeOp: 'discard' }],
      depthStencilAttachment: { view: this.depthTex.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    for (const p of plans) {
      const [x, y, w, h] = p.v.viewport;
      pass.setViewport(x, y, w, h, 0, 1);
      pass.setScissorRect(x, y, w, h);
      if (p.painting >= 0 && this.paintingBG) {
        pass.setPipeline(this.pTex);
        pass.setBindGroup(0, this.uniformBG, [p.painting * SLOT]);
        pass.setBindGroup(1, this.paintingBG);
        pass.setVertexBuffer(0, this.quad);
        pass.draw(6); vertices += 6; draws++;
      }
      pass.setPipeline(this.pMesh);
      for (const { m, slot: s } of p.meshes) {
        const mesh = this.meshes.get(m.mesh);
        if (!mesh) continue;
        pass.setBindGroup(0, this.uniformBG, [s * SLOT]);
        pass.setVertexBuffer(0, mesh.buffer);
        pass.draw(mesh.count); vertices += mesh.count; draws++;
      }
      pass.setVertexBuffer(0, this.dynGPU);
      pass.setBindGroup(0, this.uniformBG, [p.dynSlot * SLOT]);
      if (p.tris.count) { pass.setPipeline(this.pTris); pass.draw(p.tris.count, 1, p.tris.first); vertices += p.tris.count; draws++; }
      if (p.lines.count) { pass.setPipeline(this.pLines); pass.draw(p.lines.count, 1, p.lines.first); vertices += p.lines.count; draws++; }
    }
    pass.end();
    q.submit([encoder.finish()]);
    return { vertices, draws };
  }
}
