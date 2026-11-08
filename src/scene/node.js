// src/scene/node.js — scene-graph node (Part B).
//
// A Node stores only its LOCAL transform (relative to its parent). Its WORLD
// matrix is derived by walking the tree from the root.
//
// `shape` is an extra matrix applied to this node's mesh ONLY (e.g. to make a
// unit cube look like a flat table top). It is NOT inherited by the children,
// so children are not squashed by their parent's mesh scale.

import * as mat4 from '../math/mat4.js';

export class Node {
  constructor(name, { local, mesh = null, shape = null, color = [1, 1, 1, 1] } = {}) {
    this.name = name;
    this.local = local ?? mat4.identity();
    this.world = mat4.identity();
    this.parent = null;
    this.children = [];
    this.mesh = mesh;     // mesh name registered in the renderer, or null (pure transform node)
    this.shape = shape;   // optional mesh-only matrix
    this.color = color;   // linear RGBA
  }

  /** Attach `child` under this node and return the child (so calls can be chained). */
  add(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  /** Visit this node and every descendant (depth first, parent before children). */
  traverse(fn, depth = 0) {
    fn(this, depth);
    for (const c of this.children) c.traverse(fn, depth + 1);
  }

  /**
   * *** STUDENT CODE ***
   * Recompute this.world for this node and ALL of its descendants.
   * `parentWorld` is the parent's world matrix (undefined for the root).
   * Think about the multiplication order: the local matrix is expressed in the
   * parent's frame.
   */
  updateWorld(parentWorld) {
    throw new Error('TODO: implement Node.updateWorld in src/scene/node.js');
  }
}
