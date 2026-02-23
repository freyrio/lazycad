/**
 * Viewport2D — Canvas pan/zoom/transform management.
 * Manages the stack of canvas layers and the shared viewport transform.
 */
import { Vec2 } from '../core/geometry/Vec2.js';

export class Viewport2D {
  /**
   * @param {HTMLElement} container - The viewport container element
   * @param {EventBus} eventBus
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;

    // Canvas layers
    this.layers = {
      bitmap: container.querySelector('#layer-bitmap'),
      grid: container.querySelector('#layer-grid'),
      vectors: container.querySelector('#layer-vectors'),
      interaction: container.querySelector('#layer-interaction'),
    };

    // Canvas 2D contexts
    this.ctx = {};
    for (const [name, canvas] of Object.entries(this.layers)) {
      this.ctx[name] = canvas.getContext('2d');
    }

    // Viewport transform state
    this._scale = 1;        // zoom level (pixels per world unit)
    this._offsetX = 0;      // pan offset in screen pixels
    this._offsetY = 0;      // pan offset in screen pixels
    this._rotation = 0;     // viewport rotation in radians

    // Zoom limits
    this.minScale = 0.1;
    this.maxScale = 200;

    // Canvas size (logical pixels)
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;

    // Dirty flags per layer
    this._dirty = {
      bitmap: true,
      grid: true,
      vectors: true,
      interaction: true,
    };

    // Renderers registered per layer
    this._renderers = {
      bitmap: [],
      grid: [],
      vectors: [],
      interaction: [],
    };

    // Initial resize
    this._resize();

    // Listen for window resize
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(container);
  }

  /**
   * Resize all canvases to match container.
   */
  _resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;

    for (const canvas of Object.values(this.layers)) {
      canvas.width = this.width * this.dpr;
      canvas.height = this.height * this.dpr;
      canvas.style.width = `${this.width}px`;
      canvas.style.height = `${this.height}px`;
    }

    this.markAllDirty();
    this.eventBus.emit('viewport:resize', { width: this.width, height: this.height });
  }

  /**
   * Register a renderer for a specific layer.
   * @param {string} layerName - "bitmap", "grid", "vectors", "interaction"
   * @param {{ render: Function }} renderer
   */
  addRenderer(layerName, renderer) {
    if (this._renderers[layerName]) {
      this._renderers[layerName].push(renderer);
      this._dirty[layerName] = true;
    }
  }

  /**
   * Remove a renderer from a layer.
   */
  removeRenderer(layerName, renderer) {
    const arr = this._renderers[layerName];
    if (arr) {
      const idx = arr.indexOf(renderer);
      if (idx !== -1) arr.splice(idx, 1);
    }
  }

  /**
   * Convert world coordinates to screen (CSS) pixels.
   */
  worldToScreen(wx, wy) {
    return {
      x: wx * this._scale + this._offsetX,
      y: wy * this._scale + this._offsetY,
    };
  }

  /**
   * Convert screen (CSS) pixels to world coordinates.
   */
  screenToWorld(sx, sy) {
    return {
      x: (sx - this._offsetX) / this._scale,
      y: (sy - this._offsetY) / this._scale,
    };
  }

  /**
   * Convert world distance to screen pixels.
   */
  worldToScreenDist(d) {
    return d * this._scale;
  }

  /**
   * Convert screen pixels to world distance.
   */
  screenToWorldDist(d) {
    return d / this._scale;
  }

  // --- Transform Getters/Setters ---

  get scale() { return this._scale; }
  get offsetX() { return this._offsetX; }
  get offsetY() { return this._offsetY; }

  /**
   * Set the viewport transform.
   */
  setTransform(scale, offsetX, offsetY) {
    this._scale = Math.max(this.minScale, Math.min(this.maxScale, scale));
    this._offsetX = offsetX;
    this._offsetY = offsetY;
    this.markAllDirty();
    this.eventBus.emit('viewport:transform', this.getTransform());
  }

  getTransform() {
    return {
      scale: this._scale,
      offsetX: this._offsetX,
      offsetY: this._offsetY,
    };
  }

  // --- Pan/Zoom Operations ---

  /**
   * Pan by delta screen pixels.
   */
  pan(dx, dy) {
    this.setTransform(this._scale, this._offsetX + dx, this._offsetY + dy);
  }

  /**
   * Zoom centered on a screen point.
   * @param {number} factor - Zoom multiplier (>1 = zoom in)
   * @param {number} cx - Screen x coordinate to zoom toward
   * @param {number} cy - Screen y coordinate to zoom toward
   */
  zoomAt(factor, cx, cy) {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this._scale * factor));
    const actualFactor = newScale / this._scale;

    const newOffsetX = cx - (cx - this._offsetX) * actualFactor;
    const newOffsetY = cy - (cy - this._offsetY) * actualFactor;

    this.setTransform(newScale, newOffsetX, newOffsetY);
  }

  /**
   * Zoom to fit a world-space bounding box in the viewport.
   * @param {{ minX, minY, maxX, maxY }} bounds
   * @param {number} [padding=40] - Screen pixel padding
   */
  fitBounds(bounds, padding = 40) {
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    if (bw <= 0 || bh <= 0) return;

    const vw = this.width - padding * 2;
    const vh = this.height - padding * 2;

    const scale = Math.min(vw / bw, vh / bh);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;

    const offsetX = this.width / 2 - cx * scale;
    const offsetY = this.height / 2 - cy * scale;

    this.setTransform(scale, offsetX, offsetY);
  }

  /**
   * Reset to default view (1:1, centered at origin).
   */
  resetView() {
    this.setTransform(1, this.width / 2, this.height / 2);
  }

  // --- Dirty/Render ---

  /**
   * Mark a specific layer as needing redraw.
   */
  markDirty(layerName) {
    this._dirty[layerName] = true;
  }

  /**
   * Mark all layers as needing redraw.
   */
  markAllDirty() {
    for (const key of Object.keys(this._dirty)) {
      this._dirty[key] = true;
    }
  }

  /**
   * Render all dirty layers.
   * Call this from the animation loop.
   */
  render() {
    for (const [name, dirty] of Object.entries(this._dirty)) {
      if (!dirty) continue;

      const ctx = this.ctx[name];
      const canvas = this.layers[name];

      // Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply DPR scaling
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      // Render each registered renderer
      for (const renderer of this._renderers[name]) {
        ctx.save();
        renderer.render(ctx, this);
        ctx.restore();
      }

      this._dirty[name] = false;
    }
  }

  /**
   * Force redraw of interaction layer (called every frame).
   */
  renderInteraction() {
    this._dirty.interaction = true;
    const ctx = this.ctx.interaction;
    const canvas = this.layers.interaction;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const renderer of this._renderers.interaction) {
      ctx.save();
      renderer.render(ctx, this);
      ctx.restore();
    }
    this._dirty.interaction = false;
  }

  /**
   * Apply the world-to-screen transform to a canvas context.
   * Call this before drawing world-space geometry.
   */
  applyWorldTransform(ctx) {
    ctx.translate(this._offsetX, this._offsetY);
    ctx.scale(this._scale, this._scale);
  }

  /**
   * Get the visible world bounds.
   */
  getVisibleBounds() {
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(this.width, this.height);
    return {
      minX: tl.x,
      minY: tl.y,
      maxX: br.x,
      maxY: br.y,
    };
  }

  /**
   * Destroy and clean up.
   */
  destroy() {
    this._resizeObserver.disconnect();
  }
}
