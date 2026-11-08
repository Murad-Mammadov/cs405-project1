// src/ui/controls.js — tiny DOM helpers for the side panel (no UI library).

export function el(tag, attrs = {}, parent) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  if (parent) parent.appendChild(e);
  return e;
}

/**
 * Builds controls bound to an object property. Every control registers a
 * `sync` function so the whole panel can be refreshed after a reset.
 */
export class Controls {
  constructor() { this.syncs = []; }
  refresh() { for (const s of this.syncs) s(); }

  section(parent, title, open = true) {
    const d = el('details', {}, parent);
    if (open) d.open = true;
    el('summary', { text: title }, d);
    return d;
  }

  slider(parent, label, obj, key, min, max, step, onChange) {
    const row = el('div', { class: 'row' }, parent);
    el('label', { text: label }, row);
    const input = el('input', { type: 'range', min, max, step }, row);
    const val = el('span', { class: 'val' }, row);
    const digits = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    const sync = () => { input.value = obj[key]; val.textContent = (+obj[key]).toFixed(digits); };
    input.addEventListener('input', () => { obj[key] = parseFloat(input.value); sync(); onChange?.(obj[key]); });
    this.syncs.push(sync); sync();
    return { sync };
  }

  toggle(parent, label, obj, key, onChange) {
    const b = el('button', { text: label }, parent);
    const sync = () => b.classList.toggle('on', !!obj[key]);
    b.addEventListener('click', () => { obj[key] = !obj[key]; sync(); onChange?.(obj[key]); });
    this.syncs.push(sync); sync();
    return b;
  }

  /** A group of mutually exclusive buttons: options = [[value, label], ...]. */
  choice(parent, obj, key, options, onChange) {
    const wrap = el('div', { class: 'buttons' }, parent);
    const btns = options.map(([value, label]) => {
      const b = el('button', { text: label }, wrap);
      b.addEventListener('click', () => { obj[key] = value; sync(); onChange?.(value); });
      return [value, b];
    });
    const sync = () => btns.forEach(([v, b]) => b.classList.toggle('on', obj[key] === v));
    this.syncs.push(sync); sync();
    return wrap;
  }

  select(parent, label, obj, key, options, onChange) {
    const row = el('div', { class: 'row' }, parent);
    el('label', { text: label }, row);
    const s = el('select', {}, row);
    for (const o of options) el('option', { value: o, text: o }, s);
    const sync = () => { s.value = obj[key]; };
    s.addEventListener('change', () => { obj[key] = s.value; onChange?.(s.value); });
    this.syncs.push(sync); sync();
    return s;
  }

  button(parent, label, onClick) {
    const b = el('button', { text: label }, parent);
    b.addEventListener('click', onClick);
    return b;
  }
}

/** Pretty-print a column-major 4×4 matrix row by row. */
export function fmtMat(m, digits = 2) {
  let s = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = m[c * 4 + r];
      s += (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits).padStart(digits + 5);
    }
    s += '\n';
  }
  return s.replace(/\n$/, '');
}
