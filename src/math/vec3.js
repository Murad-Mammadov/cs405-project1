const todo = (name) => { throw new Error(`TODO: implement vec3.${name} in src/math/vec3.js`); };

/** a + b */
export function add(a, b) { 
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; 
}

/** a − b */
export function sub(a, b) { 
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** a · s  (s is a number) */
export function scale(a, s) { 
  return [s * a[0], s * a[1], s * a[2]]; 
}

/** Dot product a · b (a number). */
export function dot(a, b) { 
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; 
}

/** Cross product a × b (right-handed: cross([1,0,0],[0,1,0]) = [0,0,1]). */
export function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

/** Euclidean length |a|. */
export function length(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

/** a / |a|. Decide what to return for the zero vector (and say so in a comment). */
export function normalize(a) {
  const len = length(a);
  if (len === 0) {
    return [0, 0, 0];
  }
  return scale(a, 1 / len);
}
