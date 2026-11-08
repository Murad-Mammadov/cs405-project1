// src/render/gpu.js — WebGPU device + canvas setup.

export async function initGPU(canvas) {
  if (!('gpu' in navigator)) {
    throw new Error('WebGPU is not available in this browser.\nUse a current Chrome, Edge, Safari or Firefox (with WebGPU enabled).');
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('No WebGPU adapter found (is hardware acceleration disabled?).');
  const device = await adapter.requestDevice();
  device.lost.then((info) => console.error('WebGPU device lost:', info.message));

  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();   // bgra8unorm or rgba8unorm
  const viewFormat = `${format}-srgb`;                        // write through an sRGB view
  context.configure({ device, format, viewFormats: [viewFormat], alphaMode: 'opaque' });

  const info = adapter.info ?? {};
  const gpuName = [info.vendor, info.architecture, info.description].filter(Boolean).join(' ') || 'unknown GPU';
  return { device, context, format, viewFormat, gpuName };
}

/** sRGB hex colour (#rrggbb) → linear RGBA array, for the uniform colour. */
export function srgb(hex, alpha = 1) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255), alpha];
}
