/**
 * InputManager — Unified pointer/touch/mouse abstraction.
 * Converts browser pointer events into a normalized InputEvent format.
 */
export class InputManager {
  /**
   * @param {HTMLElement} element - The element to listen on
   * @param {Viewport2D} viewport
   * @param {EventBus} eventBus
   * @param {Platform} platform
   */
  constructor(element, viewport, eventBus, platform) {
    this.element = element;
    this.viewport = viewport;
    this.eventBus = eventBus;
    this.platform = platform;

    // Active pointers tracking
    this._pointers = new Map();

    // Palm rejection: if pen is detected, ignore touch
    this._penActive = false;

    this._bindEvents();
  }

  _bindEvents() {
    const el = this.element;

    // Use pointer events for unified handling
    el.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    el.addEventListener('pointermove', (e) => this._onPointerMove(e));
    el.addEventListener('pointerup', (e) => this._onPointerUp(e));
    el.addEventListener('pointercancel', (e) => this._onPointerCancel(e));

    // Prevent default touch behavior (we handle everything)
    el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    el.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Mouse wheel for zoom
    el.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

    // Context menu prevention
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Create a normalized InputEvent from a pointer event.
   */
  _createInputEvent(type, e) {
    const rect = this.element.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = this.viewport.screenToWorld(sx, sy);

    return {
      type,
      position: { x: sx, y: sy },
      worldPosition: { x: world.x, y: world.y },
      pressure: e.pressure || (type === 'end' ? 0 : 1),
      isPrimary: e.isPrimary,
      pointerId: e.pointerId,
      pointerType: e.pointerType, // "mouse", "touch", "pen"
      button: e.button,
      modifiers: {
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey,
      },
      rawEvent: e,
    };
  }

  _onPointerDown(e) {
    // Palm rejection: ignore touch when pen is active
    if (e.pointerType === 'touch' && this._penActive) return;
    if (e.pointerType === 'pen') {
      this._penActive = true;
      this.platform.detectStylus();
    }

    this.element.setPointerCapture(e.pointerId);
    this._pointers.set(e.pointerId, {
      type: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    });

    const evt = this._createInputEvent('start', e);
    this.eventBus.emit('input:start', evt);
    this.eventBus.emit('input:pointers', this._pointers.size);
  }

  _onPointerMove(e) {
    if (e.pointerType === 'touch' && this._penActive) return;

    const ptr = this._pointers.get(e.pointerId);
    if (ptr) {
      ptr.lastX = e.clientX;
      ptr.lastY = e.clientY;
    }

    const evt = this._createInputEvent('move', e);

    if (this._pointers.has(e.pointerId)) {
      this.eventBus.emit('input:drag', evt);
    } else {
      this.eventBus.emit('input:hover', evt);
    }
    this.eventBus.emit('input:move', evt);
  }

  _onPointerUp(e) {
    if (e.pointerType === 'touch' && this._penActive && !this._pointers.has(e.pointerId)) return;

    this._pointers.delete(e.pointerId);

    if (e.pointerType === 'pen') {
      this._penActive = false;
    }

    try {
      this.element.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const evt = this._createInputEvent('end', e);
    this.eventBus.emit('input:end', evt);
    this.eventBus.emit('input:pointers', this._pointers.size);
  }

  _onPointerCancel(e) {
    this._pointers.delete(e.pointerId);

    if (e.pointerType === 'pen') {
      this._penActive = false;
    }

    const evt = this._createInputEvent('cancel', e);
    this.eventBus.emit('input:cancel', evt);
    this.eventBus.emit('input:pointers', this._pointers.size);
  }

  _onWheel(e) {
    e.preventDefault();

    const rect = this.element.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Determine zoom factor from wheel delta
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 1 / 1.1;

    this.eventBus.emit('input:wheel', { factor, screenX: sx, screenY: sy, rawEvent: e });
  }

  /**
   * Get the number of currently active pointers.
   */
  get pointerCount() { return this._pointers.size; }

  /**
   * Get all active pointer positions.
   * @returns {Array<{id, x, y, type}>}
   */
  getActivePointers() {
    const result = [];
    for (const [id, ptr] of this._pointers) {
      result.push({ id, x: ptr.lastX, y: ptr.lastY, type: ptr.type });
    }
    return result;
  }

  destroy() {
    // Pointer events are auto-cleaned if element is removed
    this._pointers.clear();
  }
}
